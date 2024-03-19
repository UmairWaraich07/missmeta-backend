import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Stripe from "stripe";

const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
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

// Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/verification", verificationRouter);
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/webhook", stripeRouter);

export { app, stripe };
