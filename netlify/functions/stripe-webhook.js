const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe not configured' }),
    };
  }

  const stripe = Stripe(secretKey);

  const sig = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook error: ${err.message}` }),
    };
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;
      // session.customer_email has the email if you pass customer_creation or collect_email
      // session.subscription is the subscription ID
      // Add your fulfillment logic here (e.g., update database, send welcome email)
      console.log('New subscription:', session.subscription, session.customer_email);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object;
      // Handle cancellation — revoke premium access for this customer
      console.log('Subscription cancelled:', subscription.id, subscription.customer);
      break;
    }
    default:
      // Ignore other event types
      break;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true }),
  };
};
