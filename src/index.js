import dotenv from "dotenv";
import { connectToDB } from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectToDB()
  .then(() => {
    app.listen(process.env.PORT || 8282, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(`Error connecting to the database, ${error}`);
  });
