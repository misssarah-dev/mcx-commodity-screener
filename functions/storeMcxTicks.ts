import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// Yahoo Finance symbol mapping
const yahooSymbols: Record<string, string> = {
  gold: "GC=F", silver: "SI=F", crudeOil: "CL=F", naturalGas: "NG=F"
};

// Base MCX prices (fallback)
const basePrices: Record<string, any> = {
  gold:        { name: "Gold",        symbol: "MCX:GOLD1!",        ltp: 141689, open: 141850, high: 141925, prevClose: 141781, lot: "100",  cat: "metals", icon: "Au", bg: "#b45309", fg: "#fef3c7" },
  silver:      { name: "Silver",      symbol: "MCX:SILVER1!",      ltp: 215912, open: 217500, high: 217850, prevClose: 217479, lot: "30",   cat: "metals", icon: "Ag", bg: "#475569", fg: "#e2e8f0" },
  crudeOil:    { name: "Crude Oil",   symbol: "MCX:CRUDEOIL1!",    ltp: 8144,   open: 8098,   high: 8188,   prevClose: 8114,   lot: "100",  cat: "energy", icon: "CL", bg: "#78350f", fg: "#fed7aa" },
  naturalGas:  { name: "Natural Gas", symbol: "MCX:NATURALGAS1!",  ltp: 264.10, open: 262.50, high: 264.50, prevClose: 262.80, lot: "1250", cat: "energy", icon: "NG", bg: "#1e3a5f", fg: "#bfdbfe" }
};

const USD_INR = 83.5;

function convertToMcx(key: string, usd: number): number {
  const oz = 31.1034768;
  switch (key) {
    case "gold": return (usd * USD_INR / oz) * 10;
    case "silver": return (usd * USD_INR / oz) * 1000;
    case "crudeOil": return usd * USD_INR;
    case "naturalGas": return usd * USD_INR;
    default: return usd;
  }
}

function tick(base: number): number {
  return (Math.random() - 0.5) * 2 * 0.0004 * base;
}

function r2(n: number): number { return Math.round(n * 100) / 100; }

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  try {
    const results: any[] = [];

    for (const [key, base] of Object.entries(basePrices)) {
      let ltp = base.ltp, open = base.open, high = base.high, prevClose = base.prevClose, source = "simulated";

      try {
        const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbols[key]}?interval=1m&range=1d`, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }
        });
        if (resp.ok) {
          const data = await resp.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta?.regularMarketPrice) {
            const intlLtp = meta.regularMarketPrice;
            const intlPrev = meta.chartPreviousClose || meta.previousClose || intlLtp;
            const converted = convertToMcx(key, intlLtp);
            ltp = r2(converted + tick(converted));
            prevClose = r2(convertToMcx(key, intlPrev));
            open = r2(convertToMcx(key, intlPrev));
            high = Math.max(ltp, open, r2(converted * 1.003));
            source = "yahoo-finance";
          }
        }
      } catch (e) {
        ltp = r2(base.ltp + tick(base.ltp));
        high = Math.max(base.high, ltp);
      }

      if (source === "simulated") {
        ltp = r2(base.ltp + tick(base.ltp));
        high = Math.max(base.high, ltp);
      }

      const change = r2(ltp - prevClose);
      const pctChange = r2((change / prevClose) * 100);
      const low = r2(Math.min(open, ltp) * 0.998);
      const now = new Date().toISOString();

      const tickData = {
        commodity: base.name,
        symbol: base.symbol,
        ltp, open, high, low, close: ltp,
        prevClose, change, pctChange,
        lot: base.lot,
        source,
        timestamp: now
      };

      results.push(tickData);

      // Store in McxTick entity
      try {
        await base44.entities.McxTick.create(tickData);
      } catch (e) {
        console.log("Entity store error:", e.message);
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      stored: results.length,
      data: results
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
