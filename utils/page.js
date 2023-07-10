require("dotenv").config();
const { UA } = require("../helper/userAgents");
const useProxy = require("puppeteer-page-proxy");

const initializePage = async (browser, url) => {
  const page = await browser.newPage();

  await page.authenticate({
    username: process.env.PROXY_USER,
    password: process.env.PROXY_PASSWORD,
  });

  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": UA(),
  });

  await page.setViewport({ width: 1920, height: 1080 });

  page.on("console", (msg) => {
    for (let i = 0; i < msg.args().length; ++i) {
      console.log(`${i}: ${msg.args()[i]}`);
    }
  });

  await page.goto(url);

  try {
    const data = await useProxy.lookup(page);
    console.log("Page IP:", data.ip);
  } catch (error) {
    console.log("⛔ Failed to look up the proxy IP:", error);
  }

  return page;
};

module.exports = { initializePage };
