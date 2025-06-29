import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize Stripe
export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
  appInfo: {
    name: 'Accessibility Scanner',
    version: '1.0.0',
    url: 'https://accessibility-scanner.com',
  },
});

// Product and Price IDs (these would be actual IDs from Stripe Dashboard)
export const STRIPE_PRODUCTS = {
  PRO: 'prod_pro_monthly', // Replace with actual product ID
  ENTERPRISE: 'prod_enterprise', // Replace with actual product ID
} as const;

export const STRIPE_PRICES = {
  PRO_MONTHLY: 'price_pro_monthly', // Replace with actual price ID
  PRO_ANNUAL: 'price_pro_annual',   // Replace with actual price ID
  ENTERPRISE: 'price_enterprise',   // Replace with actual price ID
} as const;

// Create customer
export async function createCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata || {},
    });
    
    logger.info('Stripe customer created', { customerId: customer.id, email: params.email });
    return customer;
  } catch (error) {
    logger.error('Failed to create Stripe customer', { error: error.message, email: params.email });
    throw error;
  }
}

// Create subscription
export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
}): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      metadata: params.metadata || {},
      trial_period_days: params.trialPeriodDays,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
    
    logger.info('Stripe subscription created', { 
      subscriptionId: subscription.id, 
      customerId: params.customerId,
      priceId: params.priceId 
    });
    
    return subscription;
  } catch (error) {
    logger.error('Failed to create Stripe subscription', { 
      error: error.message, 
      customerId: params.customerId,
      priceId: params.priceId 
    });
    throw error;
  }
}

// Update subscription
export async function updateSubscription(
  subscriptionId: string,
  params: {
    priceId?: string;
    quantity?: number;
    metadata?: Record<string, string>;
    proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
  }
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updateParams: Stripe.SubscriptionUpdateParams = {
      metadata: params.metadata,
      proration_behavior: params.proration_behavior || 'create_prorations',
    };
    
    if (params.priceId) {
      updateParams.items = [{
        id: subscription.items.data[0].id,
        price: params.priceId,
        quantity: params.quantity || 1,
      }];
    }
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, updateParams);
    
    logger.info('Stripe subscription updated', { 
      subscriptionId,
      priceId: params.priceId 
    });
    
    return updatedSubscription;
  } catch (error) {
    logger.error('Failed to update Stripe subscription', { 
      error: error.message, 
      subscriptionId 
    });
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  try {
    const subscription = immediately
      ? await stripe.subscriptions.cancel(subscriptionId)
      : await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
    
    logger.info('Stripe subscription canceled', { 
      subscriptionId,
      immediately,
      cancelAt: subscription.cancel_at 
    });
    
    return subscription;
  } catch (error) {
    logger.error('Failed to cancel Stripe subscription', { 
      error: error.message, 
      subscriptionId 
    });
    throw error;
  }
}

// Create billing portal session
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    logger.info('Billing portal session created', { 
      customerId,
      sessionId: session.id 
    });
    
    return session;
  } catch (error) {
    logger.error('Failed to create billing portal session', { 
      error: error.message, 
      customerId 
    });
    throw error;
  }
}

// Create checkout session
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
}): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata || {},
      subscription_data: params.trialPeriodDays ? {
        trial_period_days: params.trialPeriodDays,
      } : undefined,
      tax_id_collection: {
        enabled: true,
      },
      automatic_tax: {
        enabled: true,
      },
    });
    
    logger.info('Checkout session created', { 
      sessionId: session.id,
      customerId: params.customerId,
      priceId: params.priceId 
    });
    
    return session;
  } catch (error) {
    logger.error('Failed to create checkout session', { 
      error: error.message, 
      customerId: params.customerId,
      priceId: params.priceId 
    });
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripeWebhookSecret
    );
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: error.message });
    throw error;
  }
}

// Get usage for metered billing (if needed for PR count)
export async function recordUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number
): Promise<Stripe.UsageRecord> {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      }
    );
    
    logger.info('Usage recorded', { 
      subscriptionItemId,
      quantity,
      usageRecordId: usageRecord.id 
    });
    
    return usageRecord;
  } catch (error) {
    logger.error('Failed to record usage', { 
      error: error.message, 
      subscriptionItemId,
      quantity 
    });
    throw error;
  }
}

// Health check for Stripe
export async function checkStripeHealth(): Promise<boolean> {
  try {
    // Test Stripe connection by retrieving account info
    await stripe.accounts.retrieve();
    return true;
  } catch (error) {
    logger.error('Stripe health check failed', error);
    return false;
  }
}