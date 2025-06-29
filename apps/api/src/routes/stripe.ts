import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { 
  createCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  verifyWebhookSignature,
  STRIPE_PRICES 
} from '../services/stripe';
import { config } from '../config';

const router = Router();

// Create checkout session
router.post('/create-checkout-session', asyncHandler(async (req, res) => {
  const { priceId, customerId, successUrl, cancelUrl, trialPeriodDays } = req.body;
  
  // Validate price ID
  if (!Object.values(STRIPE_PRICES).includes(priceId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid price ID',
    });
  }
  
  const session = await createCheckoutSession({
    customerId,
    priceId,
    successUrl: successUrl || `${config.allowedOrigins[0]}/dashboard?success=true`,
    cancelUrl: cancelUrl || `${config.allowedOrigins[0]}/pricing?canceled=true`,
    trialPeriodDays,
    metadata: {
      userId: req.user?.id || '', // Assuming auth middleware sets req.user
    },
  });
  
  res.json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url,
    },
  });
}));

// Create billing portal session
router.post('/create-portal-session', asyncHandler(async (req, res) => {
  const { customerId, returnUrl } = req.body;
  
  const session = await createBillingPortalSession(
    customerId,
    returnUrl || `${config.allowedOrigins[0]}/dashboard/billing`
  );
  
  res.json({
    success: true,
    data: {
      url: session.url,
    },
  });
}));

// Webhook endpoint for Stripe events
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing stripe-signature header',
    });
  }
  
  try {
    const event = verifyWebhookSignature(req.body, signature);
    
    logger.info('Stripe webhook received', { 
      type: event.type,
      id: event.id 
    });
    
    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', { error: error.message });
    return res.status(400).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
}));

// Get available prices
router.get('/prices', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      prices: STRIPE_PRICES,
      products: {
        pro: {
          name: 'Pro',
          description: 'For teams serious about accessibility',
          features: [
            '1 repository',
            'Unlimited PRs',
            'Full WCAG 2.2 AA/AAA',
            'Priority support',
          ],
        },
        enterprise: {
          name: 'Enterprise',
          description: 'For organizations with multiple teams',
          features: [
            'Multiple repositories',
            'Unlimited PRs',
            'Priority support & SLA',
            'Custom integrations',
          ],
        },
      },
    },
  });
}));

// Webhook event handlers
async function handleSubscriptionCreated(subscription: any) {
  logger.info('Subscription created', { 
    subscriptionId: subscription.id,
    customerId: subscription.customer 
  });
  
  // TODO: Update user subscription status in database
  // await updateUserSubscription(customerId, subscription);
}

async function handleSubscriptionUpdated(subscription: any) {
  logger.info('Subscription updated', { 
    subscriptionId: subscription.id,
    status: subscription.status 
  });
  
  // TODO: Update user subscription status in database
  // await updateUserSubscription(subscription.customer, subscription);
}

async function handleSubscriptionDeleted(subscription: any) {
  logger.info('Subscription deleted', { 
    subscriptionId: subscription.id 
  });
  
  // TODO: Handle subscription cancellation
  // await handleSubscriptionCancellation(subscription.customer);
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  logger.info('Invoice payment succeeded', { 
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription 
  });
  
  // TODO: Reset user quotas, send confirmation email
  // await resetUserQuotas(invoice.customer);
  // await sendPaymentConfirmation(invoice);
}

async function handleInvoicePaymentFailed(invoice: any) {
  logger.error('Invoice payment failed', { 
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription 
  });
  
  // TODO: Handle failed payment, send dunning emails
  // await handleFailedPayment(invoice.customer, invoice);
}

export { router as stripeRoutes };