import puppeteer from "puppeteer";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console({})],
});

const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

let sleep_for = async (page, min, max) => {
  const sleep_duration = randomIntFromInterval(min, max);
  logger.info(`Waiting for ${sleep_duration / 1000} seconds`);
  await page.waitForTimeout(sleep_duration); // simulate human behavior
};

// select a random book from user preferred genre
const processUserInput = async (page) => {
  try {
    const userInputs = await page.$x(`//input[@name="q"]`);
    if (userInputs.length > 0) {
      await userInputs[0].focus();
      await page.keyboard.type("Fiction", { delay: 10 }); // change user genre of choice here.
    }

    await page.waitForSelector(".gr-bookSearchResults"); // ensures the html element is loaded before next steps
    let texts = await page.evaluate(() => {
      let books = [];
      let titles = document.getElementsByClassName("gr-book__title");
      for (let title of titles) books.push(title.textContent);
      return books;
    });
    const randomBook = texts[Math.floor(Math.random() * texts.length)]; // pick a random book from array of book titles
    return randomBook;
  } catch (error) {
    logger.error(`Error processing user input: ${error}`);
  }
};
// find book on amazon and add to cart
const searchAmazon = async (page, bookName) => {
  try {
    const bookSearch = await page.$x(`//input[@name="field-keywords"]`);
    if (bookSearch.length > 0) {
      await bookSearch[0].focus();
      await page.keyboard.type(bookName, { delay: 10 });
    }
    await page.click("#nav-search-submit-button");
    await page.waitForSelector("h2 > a"); // wait for search results to be fully loaded
    await page.click("h2 > a");
    let addToCartBtn = (await page.$("#add-to-cart-button")) || ""; // check if add to cart button is present on page (not present for audio books)
    if (addToCartBtn !== "") {
      await page.click("#add-to-cart-button");
    } else {
      await page.waitForSelector("a.a-button-text.a-text-left");
      await page.click("a.a-button-text.a-text-left");
    }
  } catch (error) {
    logger.error(`Error finding book on amazon: ${error}`);
  }
};

const main = async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const URL = "https://www.goodreads.com/choiceawards/best-books-2020";
    await page.goto(URL, { timeout: 0 });
    await page.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    });

    await page.goto(URL, { waitUntil: "networkidle2" }); // wait for url to be loaded
    await sleep_for(page, 1000, 2000);
    const book = await processUserInput(page); // get random book
    await page.goto("https://www.amazon.com/", { timeout: 0 });
    await searchAmazon(page, book); // find book and add to cart on amazon
  } catch (error) {
    logger.error(`System error: ${error}`);
  }
};

let app = async () => {
  await main();
};

app();
