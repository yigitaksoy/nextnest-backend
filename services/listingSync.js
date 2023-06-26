const cron = require("node-cron");
const { syncListings } = require("../controllers/apiController");

cron.schedule("*/15 * * * *", async function () {
  console.log("Running a job every 15 minutes.");
  await syncListings();
  console.log("Done! Thank you for using NextNest! 🚀");
});
