import Stripe from 'stripe';
import { env } from '../config/env.js';
import { billingConfig } from '../config/billing.js';
import { getUserById, getUserByStripeCustomerId, updateStripeCustomerId } from './userService.js';
import { addCredits } from './creditService.js';
import { pool, query } from './db.js';
import { AppError } from '../utils/errors.js';

export const stripeClient = new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' });

export const ensureStripeCustomer = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }
  const customer = await stripeClient.customers.create({
    email: user.email,
    metadata: { userId: String(user.id) }
  });
  await updateStripeCustomerId(user.id, customer.id);
  return customer.id;
};

export const createSubscriptionCheckoutSession = async (userId) => {
  const customerId = await ensureStripeCustomer(userId);
  const successUrl = `${env.frontendUrl}/subscriptions?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.frontendUrl}/subscriptions`;
  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      userId: String(userId),
      intent: 'subscription',
      planId: billingConfig.monthlyPlan.id
    },
    subscription_data: {
      metadata: {
        userId: String(userId),
        planId: billingConfig.monthlyPlan.id
      }
    },
    line_items: [
      {
        price: billingConfig.monthlyPlan.priceId,
        quantity: 1
      }
    ]
  });
  return { id: session.id, url: session.url };
};

export const createCreditPackCheckoutSession = async (userId, packId) => {
  const pack = billingConfig.creditPacks.find((item) => item.id === packId);
  if (!pack) {
    throw new AppError('Credit pack not found', 404);
  }
  const customerId = await ensureStripeCustomer(userId);
  const successUrl = `${env.frontendUrl}/subscriptions?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.frontendUrl}/subscriptions`;
  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(userId),
      intent: 'credit_pack',
      packId: pack.id
    },
    line_items: [
      {
        price: pack.priceId,
        quantity: 1
      }
    ]
  });
  return { id: session.id, url: session.url };
};

export const getSubscriptionForUser = async (userId) => {
  const rows = await query(
    `SELECT plan_id AS planId, status, current_period_end AS currentPeriodEnd, cancel_at_period_end AS cancelAtPeriodEnd,
            stripe_subscription_id AS stripeSubscriptionId
     FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
};

export const cancelSubscription = async (userId) => {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription?.stripeSubscriptionId) {
    throw new AppError('No active subscription found to cancel', 400);
  }
  const updated = await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true
  });
  await pool.execute(
    'UPDATE subscriptions SET cancel_at_period_end = ?, status = ? WHERE stripe_subscription_id = ?',
    [updated.cancel_at_period_end ? 1 : 0, updated.status, subscription.stripeSubscriptionId]
  );
  return {
    status: updated.status,
    cancelAtPeriodEnd: updated.cancel_at_period_end,
    currentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : null
  };
};

const upsertSubscription = async ({ userId, subscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd, lastInvoiceId }) => {
  await pool.execute(
    `INSERT INTO subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end, last_invoice_id)
     VALUES (?, ?, ?, ?, FROM_UNIXTIME(?), ?, ?)
     ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        current_period_end = VALUES(current_period_end),
        cancel_at_period_end = VALUES(cancel_at_period_end),
        last_invoice_id = COALESCE(VALUES(last_invoice_id), last_invoice_id),
        updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      billingConfig.monthlyPlan.id,
      subscriptionId,
      status,
      currentPeriodEnd ?? null,
      cancelAtPeriodEnd ? 1 : 0,
      lastInvoiceId ?? null
    ]
  );
};

export const handleCheckoutSessionCompleted = async (session) => {
  if (session.metadata?.intent === 'credit_pack') {
    const pack = billingConfig.creditPacks.find((item) => item.id === session.metadata.packId);
    if (!pack) {
      return;
    }
    const userId = Number(session.metadata.userId);
    if (!Number.isFinite(userId) || session.payment_status !== 'paid') {
      return;
    }
    await addCredits(userId, pack.credits, 'Credit pack purchase', {
      sessionId: session.id,
      packId: pack.id
    });
    return;
  }

  if (session.mode === 'subscription' && session.subscription) {
    const userId = Number(session.metadata?.userId);
    if (!Number.isFinite(userId)) {
      return;
    }
    await upsertSubscription({
      userId,
      subscriptionId: session.subscription,
      status: 'active',
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: false
    });
  }
};

export const handleInvoicePaid = async (invoice) => {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    return;
  }
  const customerId = invoice.customer;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    return;
  }
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
  const periodEnd = subscription.current_period_end;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  const existingRows = await query('SELECT last_invoice_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1', [subscriptionId]);
  if (existingRows[0]?.last_invoice_id === invoice.id) {
    return;
  }

  await upsertSubscription({
    userId: user.id,
    subscriptionId,
    status: subscription.status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
    lastInvoiceId: invoice.id
  });

  await addCredits(user.id, billingConfig.monthlyPlan.includedCredits, 'Monthly subscription refresh', {
    invoiceId: invoice.id,
    subscriptionId
  });
};

export const handleSubscriptionUpdated = async (subscription) => {
  const user = await getUserByStripeCustomerId(subscription.customer);
  if (!user) {
    return;
  }
  await upsertSubscription({
    userId: user.id,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
};

export const handleSubscriptionDeleted = async (subscription) => {
  const user = await getUserByStripeCustomerId(subscription.customer);
  if (!user) {
    return;
  }
  await upsertSubscription({
    userId: user.id,
    subscriptionId: subscription.id,
    status: 'canceled',
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
};




