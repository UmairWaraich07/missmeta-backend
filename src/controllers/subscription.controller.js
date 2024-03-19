import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { stripe } from "../app.js";
import { CONTESTANT_SUBSCRIPTION_FEE } from "../constants.js";

const DAY_IN_MS = 86_400_000;

const SubscribeAsContestant = asyncHandler(async (req, res) => {
  const userId = String(req.user?._id);
  // check if the user is already subscribed
  const userSubscription = await Subscription.findOne({
    user: userId,
  });

  console.log(userId);

  if (userSubscription && userSubscription.stripeCustomerId) {
    // user is already have subscription
    // take the user to the billing page
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: userSubscription.stripeCustomerId,
      return_url: `${process.env.PUBLIC_APP_URL}/`,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          url: stripeSession.url,
        },
        "Stripe session created successfully"
      )
    );
  }

  const stripeSession = await stripe.checkout.sessions.create({
    success_url: `${process.env.PUBLIC_APP_URL}`,
    cancel_url: `${process.env.PUBLIC_APP_URL}/payment`,
    payment_method_types: ["card"],
    customer_email: req.user?.email,
    line_items: [
      {
        price_data: {
          currency: "USD",
          product_data: {
            name: "Miss Meta Universe Contestant",
            description: "Get noticed by comapanies looking for influencers",
          },
          unit_amount: CONTESTANT_SUBSCRIPTION_FEE,
          // recurring: {
          //   interval: "year",
          // },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      userId,
    },
  });

  return res.status(201).json(
    new ApiResponse(
      200,
      {
        url: stripeSession.url,
      },
      "Stripe checkout session created"
    )
  );
});

const checkSubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(404, "Invalid User ID");
  }

  const userSubscription = await Subscription.findOne({
    user: userId,
  });

  if (!userSubscription) {
    res.status(200).json(new ApiResponse(200, false, "User is not subscribed"));
  }

  const isValid =
    userSubscription?.stripeCustomerId &&
    userSubscription?.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

  new ApiResponse(200, isValid, "User subscription status fetched successfully");
});

export { SubscribeAsContestant, checkSubscription };
