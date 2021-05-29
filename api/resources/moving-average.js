var yahooFinance = require("yahoo-finance");
const { SMA } = require("technicalindicators");
const nse_symbols = require("./data/nse-500.json");

function roundToFiveCents(v) {
  return Number((Math.round(v * 20) / 20).toFixed(2));
}

function isAscending(averages) {
  return averages
    .slice(1)
    .map((e, i) => e > averages[i])
    .every((x) => x);
}

function relDiff(a, b) {
  return 100 * Math.abs((a - b) / ((a + b) / 2));
}

async function fetchStocks() {
  const today = new Date();

  const from = new Date();
  from.setDate(from.getDate() - 100);

  const quotes = await yahooFinance.historical({
    symbols: nse_symbols.map((symbol) => `${symbol}.NS`),
    from: from.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
    period: "d", // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  });

  const uptrend = [];

  for (const [key, value] of Object.entries(quotes)) {
    try {
      const closes = value.map((q) => ({
        date: q.date.toISOString().split("T")[0],
        close: q.close,
      }));

      const sma = SMA.calculate({
        period: 44,
        values: closes.map((c) => c.close),
      });

      const data = [];

      closes.forEach((c, i) => {
        if (i < 6) {
          data.push({
            date: c.date,
            close: roundToFiveCents(c.close),
            avg: roundToFiveCents(sma[i]),
          });
        }
      });

      const copydata = [...data];

      if (isAscending(data.reverse().map((a) => a.avg))) {
        uptrend.push({
          ticker: key.substr(0, key.length - 3),
          average: copydata[0].avg,
          close: copydata[0].close,
          variation: roundToFiveCents(
            relDiff(copydata[0].avg, copydata[0].close)
          ),
        });
      }
    } catch (e) {
      console.log(`Error in ticker: ${key}`);
    }
  }

  return uptrend.sort(function (a, b) {
    return a.variation - b.variation;
  });
}

module.exports = { fetchStocks };
