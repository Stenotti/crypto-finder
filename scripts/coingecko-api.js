const CoinGecko = require("coingecko-api");
const rp = require("request-promise");
const fs = require("fs");
const CoinGeckoClient = new CoinGecko();
const allCoinsFilePath = `${appRoot}/data/all-coins.json`;
const allCoinsFileData = require(allCoinsFilePath);

function delay(t, val) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(val);
    }, t);
  });
}

const fetchAllData = async (
  method,
  params = {},
  firstParam = null,
  propertyToRead = null
) => {
  const allResults = [];
  let finished = false;
  const paginationData = {
    page: 0,
    per_page: params.per_page ? params.per_page : 250,
  };
  try {
    while (finished === false) {
      await delay(400);
      let data;
      if (firstParam) {
        const result = await method(firstParam, {
          ...paginationData,
          ...params,
        });
        data = result.data[propertyToRead];
      } else {
        const result = await method({ ...paginationData, params });
        data = result.data;
      }
      console.log(
        `🚀 ~ calling method for page ${paginationData.page}. (Total ${allResults.length})`
      );
      allResults.push(...data);
      if (data.length < paginationData.per_page) {
        console.log(`finished!`);
        finished = true;
      }
      paginationData.page++;
    }
  } catch (err) {
    console.log(`error: `, err);
  }

  return allResults;
};

function onlyUnique(value, index, self) {
  return self.findIndex((v) => v.id === value.id) === index;
}

exports.saveAllCoinsMarketData = async () => {
  const coins = await fetchAllData(CoinGeckoClient.coins.markets, {
    vs_currency: "usd",
    order: "market_cap_desc",
    price_change_percentage: "1h,24h,7d,14d,30d",
    per_page: 250,
  });
  fs.writeFileSync(allCoinsFilePath, JSON.stringify(coins));
};

exports.saveExchangeData = async (exchange) => {
  const data = await fetchAllData(
    CoinGeckoClient.exchanges.fetchTickers,
    { per_page: 100 },
    exchange,
    "tickers"
  );
  const exchangeFilePath = `${appRoot}/data/exchange-${exchange}.json`;
  fs.writeFileSync(exchangeFilePath, JSON.stringify(data));
};

exports.coinsNotToAthYet = async () => {
  const ath_days_diff = 365;

  return allCoinsFileData
    .filter(onlyUnique)
    .filter(
      (c) =>
        c.market_cap_rank !== null &&
        c.id &&
        c.id.indexOf("x-long") < 0 &&
        c.id.indexOf("x-short") < 0
    )
    .reduce((acc, coin) => {
      const { symbol, name, ath_change_percentage, ath_date } = coin;
      const eur_ath_date = new Date(ath_date);

      const date_to_check = new Date();
      date_to_check.setDate(date_to_check.getDate() - ath_days_diff);

      if (
        ath_change_percentage < 0 &&
        eur_ath_date.getTime() < date_to_check.getTime()
      ) {
        return [...acc, coin];
      }
      return acc;
    }, []);
};

const isCoinOnExchange = (exports.isCoinOnExchange = (exchange, coin) => {
  const exchangeFilePath = `${appRoot}/data/exchange-${exchange}.json`;
  const tickers = require(exchangeFilePath);
  return (
    tickers.findIndex(
      (t) => t.coin_id === coin.id || t.target_coin_id === coin.id
    ) > -1
  );
});

exports.coinsNotListedYetOn = async (exchange = "binance") => {
  const coins = allCoinsFileData
    .filter(onlyUnique)
    .filter(
      (c) =>
        c.market_cap_rank !== null &&
        c.id &&
        c.id.indexOf("x-long") < 0 &&
        c.id.indexOf("x-short") < 0
    );

  return coins.reduce((acc, coin) => {
    const exists = isCoinOnExchange(exchange, coin);
    if (!exists) {
      return [...acc, coin];
    }
    return acc;
  }, []);
};
