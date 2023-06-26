const { fetchListings } = require("../services/fetchListings");
const User = require("../models/user");

exports.scrapeListings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const queryParams = req.query;

    const result = await fetchListings(userId, queryParams);

    // The fetchListings function now returns an object containing 'listings', so we can directly return it
    res.json(result);
  } catch (error) {
    console.error("Error occurred in /scrape-listings route:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
};

exports.syncListings = async () => {
  try {
    const users = await User.find({});
    for (const user of users) {
      const userId = user.uid;
      const queryParams = user.userSearch;

      // We're not doing anything with the return value in this function,
      // so there's no need to assign the result to a variable
      await fetchListings(userId, queryParams);
    }
  } catch (error) {
    console.error("Error occurred in cronFetchListings:", error);
    throw error; // This will allow the error to propagate up to your cron job manager
  }
};
