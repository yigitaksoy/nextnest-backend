require("dotenv").config();
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const useProxy = require("puppeteer-page-proxy");
const Listing = require("../models/listing");
const { listingDetails } = require("./listingDetails");

puppeteer.use(StealthPlugin());

const scrapeListings = async (url, listingType) => {
  console.log("Scraping listings for URL:", url);

  const browser = await puppeteer.launch({
    // headless: "new",
    slowMo: 500,
    args: [
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
      `--proxy-server=${process.env.PROXY}`,
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  try {
    const page = await browser.newPage();

    page.on("console", (msg) => {
      for (let i = 0; i < msg.args().length; ++i) {
        console.log(`${i}: ${msg.args()[i]}`);
      }
    });

    await page.setViewport({ width: 1080, height: 1024 });

    let currentPage = 1;
    const allListings = [];

    await useProxy(page, process.env.PROXY);

    const data = await useProxy.lookup(page);
    console.log("Page IP:", data.ip);

    while (true) {
      console.log("Scraping page:", currentPage);

      let navigationAttempts = 0;
      while (navigationAttempts < 5) {
        // Maximum 5 attempts
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          break; // break the loop if navigation succeeds
        } catch (error) {
          navigationAttempts++;
          console.error(
            `Error during navigation attempt ${navigationAttempts}: ${error}`
          );
          if (navigationAttempts >= 5) throw error; // if all attempts fail, throw the error
          await page.waitForTimeout(5000); // wait for 5 seconds before next attempt
        }
      }

      // Wait for a progressive amount of time
      await page.waitForTimeout(currentPage * 1000);

      let rawListings;
      try {
        rawListings = await page.evaluate(() => {
          const extractListingDetails = (element) => {
            const image =
              element?.querySelector(".search-result-image img")?.src ||
              element?.querySelector(".promo-thumbnail img")?.src;
            const title = element
              ?.querySelector(".search-result__header-title")
              ?.textContent.trim();
            const linkElement = element.querySelector(
              "a[data-object-url-tracking='resultlist']"
            );
            const url = linkElement
              ?.getAttribute("href")
              ?.replace(/(\?.*)$/, "");
            const postal_code = element
              ?.querySelector(".search-result__header-subtitle")
              ?.textContent.trim();
            const price = (
              element
                ?.querySelector(".search-result-price")
                ?.textContent.trim() || ""
            ).replace(/\s*k\.k\.\s*$/, "");
            const details = Array.from(
              element?.querySelectorAll(".search-result-kenmerken li")
            ).map((li) => li.textContent.trim());

            return {
              image,
              title,
              url:
                url && url.startsWith("https://www.funda.nl")
                  ? url
                  : `https://www.funda.nl${url}`,
              postal_code,
              price,
              details,
            };
          };

          const elements = Array.from(
            document.querySelectorAll(".search-result")
          );
          return elements.map(extractListingDetails);
        });
      } catch (error) {
        console.error("Error during page evaluation:", error);
        // Implement your own error handling logic here...
      }

      // Scrape details for each listing
      for (let i = 0; i < rawListings.length; i++) {
        try {
          // Handle errors for individual listings
          const listing = rawListings[i];

          // Check if a listing with the same title already exists in the "Listing" collection
          let existingListingInListings = await Listing.findOne({
            title: listing.title,
          });

          // If the listing does not exist in the "Listing" collection, fetch details
          if (!existingListingInListings) {
            const details = await listingDetails(
              page,
              listing.url,
              listingType
            );
            listing.details = details;

            // Add listingType and neighborhood
            listing.listingType = listingType;
            listing.neighbourhood = details.neighbourhood;
          }
        } catch (error) {
          console.error(
            `Error scraping details for listing ${i} at ${listing.url}:`,
            error
          );
          console.log("Listing:", listing);
          throw error;
        }
      }

      allListings.push(...rawListings);

      const nextPageButton = await page.$(
        ".pagination-pages a[aria-current='page'] + a"
      );
      if (!nextPageButton || currentPage >= 28) {
        break;
      }

      currentPage++;
      url = await page.evaluate(
        (nextPageButton) => nextPageButton.href,
        nextPageButton
      );
    }

    allListings.forEach((listing) => {
      console.log("Listing URL:", listing.url);
    });

    return allListings;
  } catch (error) {
    console.error("Error scraping listings:", error);
    throw error;
  } finally {
    await browser.close();
  }
};

module.exports = {
  scrapeListings,
};
