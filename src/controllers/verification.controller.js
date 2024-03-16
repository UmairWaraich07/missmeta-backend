import twilio from "twilio";
import { asyncHandler } from "../utils/asyncHandler.js";
const accountSid = process.env.TWILLIO_ACCOUNT_SID;
const authToken = process.env.TWILLIO_AUTH_TOKEN;
const verifySid = process.env.TWILLIO_VERIFY_SID;
const client = new twilio(accountSid, authToken);

const sendVerificationCode = asyncHandler(async (req, res) => {
  const { phoneNumber, channel = "whatsapp" } = req.body;

  if (!phoneNumber) {
    throw new ApiError(404, "Phone number is required for verification");
  }

  const verification = await client.verify.v2.services(verifySid).verifications.create({
    to: "+923116035107",
    channel: channel,
    body: "Verfication code for MissMeta is: ",
  });
  console.log(verification);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { otpCode } = req.body;

  const verificationCheck = await client.verify.v2.services(verifySid).verificationChecks.create({
    to: "+923116035107",
    code: otpCode,
  });
  console.log(verificationCheck);
});

export { sendVerificationCode, verifyOtp };