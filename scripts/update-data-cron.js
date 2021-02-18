const fs = require("fs");
const {
  coinsNotListedYetOn,
  coinsNotToAthYet,
  saveAllCoinsMarketData,
  saveExchangeData,
  isCoinOnExchange,
  getBtcEthPrices,
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

const formatCoinData = (c, btcEthPrices) => {
  let toATH_usd = c.ath - c.current_price;
  let toATHPercentage = toATH_usd / (c.ath / 100);
  let action = "-";
  const current_price_btc = c.current_price / btcEthPrices.bitcoin.usd;
  const current_price_eth = c.current_price / btcEthPrices.ethereum.usd;
  const ath_btc = c.ath / btcEthPrices.bitcoin.usd;
  const ath_eth = c.ath / btcEthPrices.ethereum.usd;
  let toATH_btc = ath_btc - current_price_btc;
  let toATH_eth = ath_eth - current_price_eth;
  if (toATH_usd > 0) {
    action = "-";
  } else {
    toATHPercentage = toATH_btc = toATH_eth = 0;
    toATH_usd = c.current_price;
    toATH_btc = current_price_btc;
    toATH_eth = current_price_eth;
  }
  return {
    id: c.id,
    image: c.image,
    symbol: c.symbol,
    name: c.name,
    current_price_usd: c.current_price,
    current_price_btc: current_price_btc,
    current_price_eth: current_price_eth,
    market_cap_rank: c.market_cap_rank,
    ath_usd: c.ath,
    ath_btc: ath_btc,
    ath_eth: ath_eth,
    price_change_percentage_24h:
      Math.round((c.price_change_percentage_24h + Number.EPSILON) * 100) / 100,
    price_change_percentage_7d_in_currency:
      Math.round(
        (c.price_change_percentage_7d_in_currency + Number.EPSILON) * 100
      ) / 100,
    price_change_percentage_14d_in_currency:
      Math.round(
        (c.price_change_percentage_14d_in_currency + Number.EPSILON) * 100
      ) / 100,
    price_change_percentage_30d_in_currency:
      Math.round(
        (c.price_change_percentage_30d_in_currency + Number.EPSILON) * 100
      ) / 100,
    exchange: c.exchange,
    toATHPercentage: Math.round((toATHPercentage + Number.EPSILON) * 100) / 100,
    toATH_usd,
    toATH_btc,
    toATH_eth,
    action,
    exchange: c.exchange,
    date: Date(),
  };
};

async function notToToAthYet() {
  console.log("Refreshing data notToToAthYet");
  const coins = await coinsNotToAthYet();
  const btcEthPrices = await getBtcEthPrices();
  const result = coins
    .filter((c) => !coinsToExclude.includes(c.symbol))
    .map((c) => {
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
      c.exchange = exchange;
      return formatCoinData(c, btcEthPrices.data);
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

  const btcEthPrices = await getBtcEthPrices();
  const result = coins
    .filter((c) => !coinsToExclude.includes(c.symbol))
    .map((c) => {
      return formatCoinData(c, btcEthPrices.data);
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
