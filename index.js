const express = require("express");

const athCoins = require("./data/ath.json");
const unlistedCoins = require("./data/unlisted.json");
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

app.get("/ath", async (req, res) => {
  console.log("[/ath] returning cached data ", athCoins.length);
  res.json(athCoins);
});

app.get("/unlisted-coins", async (req, res) => {
  console.log("[/unlisted-coins] returning cached data ", unlistedCoins.length);
  res.json(unlistedCoins);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
