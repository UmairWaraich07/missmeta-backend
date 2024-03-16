import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

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

// Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/verification", verificationRouter);

export { app };
