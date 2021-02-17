const fs = require("fs");
const {
  coinsNotListedYetOn,
  coinsNotToAthYet,
  saveAllCoinsMarketData,
  saveExchangeData,
  isCoinOnExchange,
} = require("./coingecko-api");

const unlistedFilePath = `${appRoot}/data/unlisted.json`;
const athFilePath = `${appRoot}/data/ath.json`;

const coinsToExclude = [
  "usdt",
  "usdc",
  "cro",
  "cel",
  "bnb",
  "busd",
  "cusdc",
  "ausdc",
  "bsv",
  "ust",
  "bat", // manually removed
  "sc", // manually removed
];

async function notToToAthYet() {
  console.log("Refreshing data notToToAthYet");
  const coins = await coinsNotToAthYet();
  const result = coins
    .filter((c) => !coinsToExclude.includes(c.symbol))
    .map((c) => {
      const toATH = c.ath - c.current_price;
      const toATHPercentage = toATH / (c.ath / 100);
      let action = "-";
      if (toATH > 0) {
        action = "-";
      }
      const isCoinOnBinance = isCoinOnExchange("binance", c);
      const isCoinOnCoinbase = isCoinOnExchange("gdax", c);
      // console.log(
      //   `coin ${c.id} is on binance? ${isCoinOnBinance}. isOnCoinbase? ${isCoinOnCoinbase}`
      // );
      const exchange =
        isCoinOnBinance && isCoinOnCoinbase
          ? ""
          : isCoinOnBinance && !isCoinOnCoinbase
          ? "Coinbase"
          : !isCoinOnBinance && isCoinOnCoinbase
          ? "Binance"
          : "Binance, Coinbase";
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
        toATHPercentage:
          Math.round((toATHPercentage + Number.EPSILON) * 100) / 100,
        toATH,
        action,
        exchange,
      };
    });
  fs.writeFileSync(athFilePath, JSON.stringify(result));
  console.log("Refreshed data notToToAthYet", result.length);
}

async function unlistedCoins() {
  console.log("Refreshing data unlistedCoins");
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
    .filter((c) => !coinsToExclude.includes(c.symbol))
    .map((c) => {
      let toATH = c.ath - c.current_price;
      let toATHPercentage = toATH / (c.ath / 100);
      let action = "-";
      if (toATH > 0) {
        action = "-";
      } else {
        toATHPercentage = 0;
        toATH = c.current_price;
      }
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
  fs.writeFileSync(unlistedFilePath, JSON.stringify(result));
  console.log("Refreshed data unlistedCoins", result.length);
}

function updateDataEveryNSeconds() {
  setInterval(unlistedCoins, 30 * 1000);
  setInterval(saveAllCoinsMarketData, 120 * 1000);
  setInterval(() => saveExchangeData("binance"), 125 * 1000);
  setInterval(() => saveExchangeData("gdax"), 125 * 1000);
  setInterval(notToToAthYet, 125 * 1000);
}
// saveAllCoinsMarketData();
// saveExchangeData("binance");
// saveExchangeData("gdax");
// unlistedCoins();
// notToToAthYet();

updateDataEveryNSeconds();
