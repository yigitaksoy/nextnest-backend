const cron = require("node-cron");
const { syncListings } = require("../controllers/apiController");

async function syncJob() {
  console.log("Running a job every 10 minutes between 7 am and 2 am.");
  await syncListings();
  console.log("Done! Thank you for using NextNest! 🚀");
}

// Schedule the job to run every 10 minutes between 7 am and 08:59 pm
cron.schedule("*/10 7-20 * * *", syncJob);

// Schedule the job to run every 15 minutes between 08:59 pm and 11:59 pm
cron.schedule("*/15 20-23 * * *", syncJob);

// Schedule the job to run every 30 minutes between 12 am and 2 am
cron.schedule("*/30 0-2 * * *", syncJob);
