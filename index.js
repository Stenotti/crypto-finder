const express = require("express");

const ath1 = require("./data/ath1.json");
const unlistedBinance = require("./data/unlisted-binance.json");
const unlistedCoinbase = require("./data/unlisted-coinbase.json");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 5000;

const ejs = require("ejs");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
const {
  ping,
  coinsNotToAthYet,
  coinsNotListedYetOn,
  coinsNotListedYetOnBinance,
} = require("./coingecko-api");

const toExclude = [
  "usdt",
  "usdc",
  "cro",
  "cel",
  "bnb",
  "busd",
  "cusdc",
  "bsv",
  "ust",
  "bat", // manually removed
  "sc", // manually removed
];

const toExcludeBinance = ["bat"];

app.get("/", async (req, res) => {
  try {
    res.render("index");
  } catch (error) {
    console.log(error);
  }
});

app.get("/ath", async (req, res) => {
  const result = await coinsNotToAthYet();
  res.json(result);
});

function onlyUnique(value, index, self) {
  return self.findIndex((v) => v.id === value.id) === index;
}

app.get("/ath-data", async (req, res) => {
  const result = ath1
    .filter(onlyUnique)
    .filter((c) => c.market_cap_rank && c.market_cap_rank < 250)
    .map((c) => ({
      ath_change_percentage: c.ath_change_percentage,
      id: c.symbol,
      name: c.name,
    }))
    .sort((a, b) =>
      a.ath_change_percentage > b.ath_change_percentage ? 1 : -1
    )
    .map((c) => c.name);
  res.json(result);
});

app.get("/unlisted-coins", async (req, res) => {
  let binanceCoins = await coinsNotListedYetOn("binance");
  binanceCoins = binanceCoins.map((c) =>
    Object.assign({}, c, { exchange: "Binance" })
  );
  const coinbaseCoins = await coinsNotListedYetOn("gdax");
  const coins = coinbaseCoins.reduce((acc, coin) => {
    const coinBinanceIndex = binanceCoins.findIndex((c) => c.id === coin.id);
    if (coinBinanceIndex > -1) {
      acc[coinBinanceIndex].exchange = "Binance, Coinbase";
      return acc;
    }
    coin.exchange = "Coinbase";
    return [...acc, coin];
  }, binanceCoins);

  const result = coins
    // .filter(onlyUnique)
    // .filter(
    //   (c) =>
    //     c.market_data.market_cap_rank && c.market_data.market_cap_rank < 2000
    // )
    .filter((c) => !toExclude.includes(c.symbol))
    .map((c) => {
      const toATH = c.ath - c.current_price;
      const toATHPercentage = toATH / (c.ath / 100);
      let action = "-";
      if (toATH > 0) {
        action = "-";
      }
      // console.log(c)
      return {
        id: c.id,
        image: c.image,
        symbol: c.symbol,
        name: c.name,
        current_price: c.current_price,
        market_cap_rank: c.market_cap_rank,
        ath: c.ath,
        price_change_percentage_24h:
          Math.round((c.price_change_percentage_24h + Number.EPSILON) * 100) /
          100,
        price_change_percentage_7d_in_currency:
          Math.round(
            (c.price_change_percentage_7d_in_currency + Number.EPSILON) * 100
          ) / 100,
        exchange: c.exchange,
        toATH: toATH,
        toATHPercentage:
          Math.round((toATHPercentage + Number.EPSILON) * 100) / 100,
        action,
      };
    });
  res.json(result);
});

// app.get("/unlisted-coinbase-data", async (req, res) => {
//   const result = unlistedCoinbase
//     .filter(onlyUnique)
//     .filter((c) => c.market_cap_rank && c.market_cap_rank < 250)
//     .map((c) => ({
//       ath_change_percentage: c.ath_change_percentage,
//       id: c.symbol,
//       name: c.name,
//     }))
//     .sort((a, b) =>
//       a.ath_change_percentage > b.ath_change_percentage ? 1 : -1
//     );
//   res.json(result);
// });

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
