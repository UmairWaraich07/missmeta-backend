import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Stripe from "stripe";

const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, //TODO: change the cors origin to your own domain
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  urlencoded({
    limit: "16kb",
    extended: true,
  })
);
app.use(cookieParser());
app.use(express.static("public"));

// import routes
import userRouter from "./routes/user.route.js";
import verificationRouter from "./routes/verification.route.js";
import healthCheckRouter from "./routes/healthcheck.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import stripeRouter from "./routes/stripe.route.js";
import voteRouter from "./routes/vote.route.js";
import followRouter from "./routes/follow.route.js";

// Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/verifications", verificationRouter);
app.use("/api/v1/healthchecks", healthCheckRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/votes", voteRouter);
app.use("/api/v1/follows", followRouter);
app.use("/webhook", stripeRouter);

export { app, stripe };
