const express = require("express");

const app = express();
const path = require("path");
const PORT = process.env.PORT || 5000;
global.appRoot = path.resolve(__dirname);

require("./scripts/update-data-cron");

const ejs = require("ejs");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const toExcludeBinance = ["bat"];

app.get("/", async (req, res) => {
  try {
    res.render("index");
  } catch (error) {
    console.log(error);
  }
});

app.get("/about", async (req, res) => {
  try {
    res.render("about");
  } catch (error) {
    console.log(error);
  }
});

app.get("/ath", async (req, res) => {
  let days = req.query.days;
  console.log("🚀 ~ app.get ~ days", days);
  if (days !== "182" && days !== "365") {
    days = 365;
  }
  const athCoins = require(`./data/ath${days}.json`);
  console.log(
    `[/ath] returning cached data ./data/ath${days}.json: ${athCoins.length}`
  );
  return res.json(athCoins);
});

app.get("/unlisted-coins", async (req, res) => {
  const unlistedCoins = require("./data/unlisted.json");
  console.log("[/unlisted-coins] returning cached data ", unlistedCoins.length);
  res.json(unlistedCoins);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
