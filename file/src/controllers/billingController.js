import { billingConfig } from '../config/billing.js';
import { env } from '../config/env.js';
import {
  createSubscriptionCheckoutSession,
  createCreditPackCheckoutSession,
  getSubscriptionForUser,
  cancelSubscription as cancelSubscriptionService,
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  stripeClient
} from '../services/stripeService.js';
import { AppError, ValidationError } from '../utils/errors.js';

/**
 * Возвращает доступные тарифы и пакеты кредитов
 */
export const getPlans = (req, res) => {
  res.json({
    publishableKey: env.stripe.publishableKey,
    monthlyPlan: billingConfig.monthlyPlan,
    creditPacks: billingConfig.creditPacks
  });
};

/**
 * Создаёт Stripe Checkout Session для подписки
 */
export const createSubscriptionSessionHandler = async (req, res) => {
  const userId = req.user.id;
  const session = await createSubscriptionCheckoutSession(userId);
  res.json(session);
};

/**
 * Создаёт Stripe Checkout Session для покупки кредитов
 */
export const createCreditPackSessionHandler = async (req, res) => {
  const userId = req.user.id;
  const { packId } = req.body ?? {};
  if (!packId) {
    throw new ValidationError('packId is required');
  }
  const session = await createCreditPackCheckoutSession(userId, packId);
  res.json(session);
};

/**
 * Возвращает активную подписку пользователя
 */
export const getSubscription = async (req, res) => {
  const subscription = await getSubscriptionForUser(req.user.id);
  res.json({ subscription });
};

/**
 * Отменяет активную подписку пользователя
 */
export const cancelSubscription = async (req, res) => {
  const data = await cancelSubscriptionService(req.user.id);
  res.json({ subscription: data });
};

/**
 * Webhook для обработки событий Stripe
 */
export const stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    throw new AppError('Missing Stripe signature header', 400);
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, signature, env.stripe.webhookSecret);
  } catch (err) {
    throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Stripe webhook processing error', error);
    throw new AppError('Failed to process webhook', 500);
  }

  res.json({ received: true });
};
