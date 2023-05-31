const puppeteer = require("puppeteer");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");

puppeteer.use(StealthPlugin());

const getHeaders = async (url) => {
  const response = await axios.get(url, { validateStatus: false });
  const headers = {
    "User-Agent": response.headers["user-agent"],
    Cookie: response.headers["set-cookie"],
  };
  return headers;
};

const scrapeListings = async (url) => {
  console.log("Scraping listings for URL:", url);

  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });
  const page = await browser.newPage();

  const headers = await getHeaders(url);
  await page.setUserAgent(headers["User-Agent"]);

  const options = {
    headers: {
      "User-Agent": headers["User-Agent"],
      Cookie: headers.Cookie,
    },
  };

  // Rest of your existing code...

  await page.setViewport({ width: 1080, height: 1024 });

  let currentPage = 1;
  const allListings = [];

  while (true) {
    console.log("Scraping page:", currentPage);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const listings = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll(".search-result"));

      return elements.map((element) => {
        const image = element?.querySelector(".search-result-image img")?.src;
        const title = element
          ?.querySelector(".search-result__header-title")
          ?.textContent.trim();
        const linkElement = element.querySelector(
          ".search-result-main a[data-object-url-tracking='resultlist']"
        );
        const url = linkElement
          ?.getAttribute("href")
          ?.replace(/(\?.*)$/, "");
        const price = element
          ?.querySelector(".search-result-price")
          ?.textContent.trim();
        const details = Array.from(
          element?.querySelectorAll(".search-result-kenmerken li")
        ).map((li) => li.textContent.trim());

        return {
          image,
          title,
          url: url.startsWith("https://www.funda.nl")
            ? url
            : `https://www.funda.nl${url}`, // Add base URL to the scraped URL if necessary
          price,
          details,
        };
      });
    });

    allListings.push(...listings);

    const nextPageButton = await page.$(
      ".pagination-pages a[aria-current='page'] + a"
    );
    if (!nextPageButton || currentPage >= 28) {
      break; // Exit the loop if there's no next page button or reached the end of pagination
    }

    const nextPageUrl = await page.evaluate(
      (nextPageButton) => nextPageButton.href,
      nextPageButton
    );
    currentPage++;
    await page.goto(nextPageUrl, { waitUntil: "domcontentloaded" });
  }

  await browser.close();

  allListings.forEach((listing) => {
    console.log("Listing URL:", listing.url);
  });

  return allListings;
};

module.exports = {
  scrapeListings,
};
