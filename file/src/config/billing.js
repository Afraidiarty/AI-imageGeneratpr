import { env } from './env.js';

const creditPackCandidates = [
  {
    id: 'credits-small',
    name: '50 extra credits',
    priceId: env.stripe.creditPackSmallPriceId,
    price: 19000, 
    credits: 50,
    description: 'Great for quick top-ups before the monthly reset.'
  },
  {
    id: 'credits-medium',
    name: '120 extra credits',
    priceId: env.stripe.creditPackMediumPriceId,
    price: 39000, 
    credits: 120,
    description: 'Covers a busy launch week with additional generations.'
  },
  {
    id: 'credits-large',
    name: '300 extra credits',
    priceId: env.stripe.creditPackLargePriceId,
    price: 89000, 
    credits: 300,
    description: 'Best value when collaborating across teams.'
  }
].filter((pack) => !!pack.priceId);

export const billingConfig = {
  monthlyPlan: {
    id: 'pro-monthly-200',
    name: 'Pro Monthly',
    includedCredits: 200,
    priceId: env.stripe.monthlyPriceId,
    price: 9900, 
    description: '200 image credits per month, unlimited storage, and Stripe-protected billing.',
  },
  creditPacks: creditPackCandidates
};

export const creditCosts = {
  analyze_image: 1,
  generate_ideas: 1,
  enhance_prompt: 1,
  generate_scene: 2,
  edit_image: 2,
  variation: 2
};

export const CREDIT_ACTION_LABELS = {
  analyze_image: 'Image analysis',
  generate_ideas: 'Scene idea generation',
  enhance_prompt: 'Prompt enhancement',
  generate_scene: 'New scene generation',
  edit_image: 'Image edit',
  variation: 'Variation generation'
};
