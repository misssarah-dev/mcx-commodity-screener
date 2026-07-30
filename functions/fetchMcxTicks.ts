import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// Base MCX prices (fallback if Yahoo Finance is unreachable)
const basePrices: Record<string, any> = {
  gold:        { name: "Gold",        symbol: "MCX:GOLD1!",        ltp: 141689, open: 141850, high: 141925, prevClose: 141781, expiry: "5 Aug 2026",  lot: "100",  cat: "metals", icon: "Au", bg: "#b45309", fg: "#fef3c7" },
  silver:      { name: "Silver",      symbol: "MCX:SILVER1!",      ltp: 215912, open: 217500, high: 217850, prevClose: 217479, expiry: "4 Sep 2026",  lot: "30",   cat: "metals", icon: "Ag", bg: "#475569", fg: "#e2e8f0" },
  crudeOil:    { name: "Crude Oil",   symbol: "MCX:CRUDEOIL1!",    ltp: 8144,   open: 8098,   high: 8188,   prevClose: 8114,   expiry: "19 Aug 2026", lot: "100",  cat: "energy", icon: "CL", bg: "#78350f", fg: "#fed7aa" },
  naturalGas:  { name: "Natural Gas", symbol: "MCX:NATURALGAS1!",  ltp: 264.10, open: 262.50, high: 264.50, prevClose: 262.80, expiry: "26 Aug 2026", lot: "1250", cat: "energy", icon: "NG", bg: "#1e3a5f", fg: "#bfdbfe" }
};

// Yahoo Finance symbol mapping (international futures)
const yahooSymbols: Record<string, string> = {
  gold: "GC=F",
  silver: "SI=F",
  crudeOil: "CL=F",
  naturalGas: "NG=F"
};

// USD to INR exchange rate (approximate)
const USD_INR = 83.5;

// Conversion: international → MCX equivalent (INR)
function convertToMcx(key: string, usdPrice: number): number {
  const troyOz = 31.1034768;
  switch (key) {
    case "gold":       return (usdPrice * USD_INR / troyOz) * 10;     // USD/oz → ₹/10g
    case "silver":     return (usdPrice * USD_INR / troyOz) * 1000;   // USD/oz → ₹/kg
    case "crudeOil":    return usdPrice * USD_INR;                     // USD/bbl → ₹/bbl
    case "naturalGas": return usdPrice * USD_INR;                     // USD/MMBtu → ₹/MMBtu
    default:           return usdPrice;
  }
}

// Small random tick movement (±0.01% to ±0.05%)
function tickMovement(baseLtp: number): number {
  const volatility = 0.0004;
  return (Math.random() - 0.5) * 2 * volatility * baseLtp;
}

function r2(n: number): number { return Math.round(n * 100) / 100; }

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);

  try {
    const results: any[] = [];

    for (const [key, base] of Object.entries(basePrices)) {
      let ltp = base.ltp;
      let open = base.open;
      let high = base.high;
      let prevClose = base.prevClose;
      let source = "simulated";

      // Try to fetch live price from Yahoo Finance
      try {
        const yahooSym = yahooSymbols[key];
        const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=1m&range=1d`, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }
        });

        if (resp.ok) {
          const data = await resp.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta?.regularMarketPrice) {
            // Convert international prices to MCX equivalent
            const intlLtp = meta.regularMarketPrice;
            const intlPrevClose = meta.chartPreviousClose || meta.previousClose || intlLtp;

            ltp = r2(convertToMcx(key, intlLtp) + tickMovement(convertToMcx(key, intlLtp)));
            prevClose = r2(convertToMcx(key, intlPrevClose));
            open = r2(convertToMcx(key, intlPrevClose));
            high = Math.max(ltp, open, r2(convertToMcx(key, intlLtp * 1.003)));
            source = "yahoo-finance";
          }
        }
      } catch (e) {
        // Yahoo fetch failed — simulate tick from base price
        ltp = r2(base.ltp + tickMovement(base.ltp));
        high = Math.max(base.high, ltp);
      }

      // If still simulated, apply tick movement
      if (source === "simulated") {
        ltp = r2(base.ltp + tickMovement(base.ltp));
        high = Math.max(base.high, ltp);
      }

      const change = r2(ltp - prevClose);
      const pctChange = r2((change / prevClose) * 100);

      results.push({
        name: base.name,
        symbol: base.symbol,
        ltp,
        open,
        high,
        prevClose,
        change,
        pctChange,
        expiry: base.expiry,
        lot: base.lot,
        cat: base.cat,
        icon: base.icon,
        bg: base.bg,
        fg: base.fg,
        source,
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: results.length,
      data: results
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});
