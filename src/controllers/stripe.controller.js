import { stripe } from "../app.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    return;
  }
  console.log(event);

  const session = event.data.object;
  console.log({ session });

  if (event.type === "checkout.session.completed") {
    console.log("INSIDE STRIPE WEBHOOK SUBSCRIPTIONs");
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    console.log({ subscription });

    if (!session?.metadata?.userId) {
      throw new ApiError(404, "User ID is required with stripe metadata");
    }

    await Subscription.create({
      userId: session.metadata.userId,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    // user updated their credentials or cancelled the subscription
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    await Subscription.findOneAndUpdate(
      {
        stripeSubscriptionId: subscription.id,
      },
      {
        $set: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      }
    );
  }

  // Return a 200 response to acknowledge receipt of the event
  return res.status(200);
});

export { stripeWebhook };
