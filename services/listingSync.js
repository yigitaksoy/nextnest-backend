const cron = require("node-cron");
const { syncListings } = require("../controllers/apiController");

function syncJob() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("📡 Sync in progress...   ");
      await syncListings();
      console.log("Done! Thank you for using NextNest! 🚀");
      resolve();
    } catch (error) {
      console.error("⛔ Synchronization Error: ", error);
      reject({
        body: JSON.stringify({
          error: error.message,
        }),
      });
    }
  });
}

// Schedule the job to run every 15 minutes
cron.schedule("*/20 * * * *", syncJob);
