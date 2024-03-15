import twilio from "twilio";
import readline from "readline"; // Import readline separately for later use

const accountSid = process.env.TWILLIO_ACCOUNT_SID;
const authToken = process.env.TWILLIO_AUTH_TOKEN;
const verifySid = process.env.TWILLIO_VERIFY_SID;

const client = new twilio(accountSid, authToken); // Create the client using imported Twilio

export const verifyPhoneNumber = async () => {
  let otpCode;
  try {
    const verification = await client.verify.v2.services(verifySid).verifications.create({
      to: "+923116035107",
      channel: "whatsapp",
      body: "Verfication code for MissMeta is: ",
    });
    console.log(verification.status);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise((resolve) => {
      rl.question("Please enter the OTP:", (otpCode) => {
        otpCode = otpCode;
        rl.close(); // Close readline after input
        resolve(otpCode);
      });
    });

    const verificationCheck = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: "+923116035107",
      code: otpCode,
    });
    console.log(verificationCheck.status);
  } catch (error) {
    console.error("Error during verification:", error);
  }
};
