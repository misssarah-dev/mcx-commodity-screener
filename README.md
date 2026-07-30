# MCX Commodity Screener

Dark-themed Indian commodity market screener dashboard with live MCX data, TradingView Lightweight Charts™, and tick-by-tick backend data collection.

## Features

- **Live MCX Data** — Real-time prices for Gold, Silver, Crude Oil, and Natural Gas
- **Tick-by-Tick Polling** — Frontend polls backend every 3 seconds for live price updates
- **TradingView Lightweight Charts** — Candlestick charts with volume bars
- **Bottom Navigation Bar** — Home, Chart, AI Signal, News with hover glow effect
- **Top Nav Tabs** — Filter by All, Metals, or Energy with glowing hover transition
- **Screener Table** — LTP, Open, Close, High, Previous Close, % Change, and inline sparklines
- **AI Trading Signals** — BUY/SELL/HOLD signals with RSI, MACD, confidence bars
- **Market News** — Latest commodity market headlines with category tags
- **Historical Data Storage** — Auto-collected every 5 min via scheduled workflow

## Architecture

```
mcx-commodity-screener/
├── index.html              # Frontend dashboard (single-file HTML/CSS/JS)
├── README.md                # This file
└── functions/
    ├── fetchMcxTicks.ts     # Backend: fetch live ticks (read-only, returns JSON)
    └── storeMcxTicks.ts     # Backend: fetch + store ticks in McxTick entity
```

### Backend Functions

| Function | Purpose | Endpoint |
|---|---|---|
| `fetchMcxTicks` | Fetch live commodity prices, convert to MCX-equivalent INR | `GET /functions/fetchMcxTicks` |
| `storeMcxTicks` | Fetch + store ticks in database for historical tracking | `GET /functions/storeMcxTicks` |

**Data Source:** Yahoo Finance API (GC=F, SI=F, CL=F, NG=F) → converted to MCX-equivalent INR using USD→INR × troy oz conversion.

### Scheduled Workflow

- **Name:** MCX Tick Collector
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Timezone:** Asia/Calcutta
- **Action:** Calls `storeMcxTicks` to fetch and store live commodity prices

### Database Entity

**McxTick** — Stores historical commodity price ticks:
- `commodity`, `symbol`, `ltp`, `open`, `high`, `low`, `close`
- `prevClose`, `change`, `pctChange`, `lot`
- `source` (yahoo-finance / simulated)
- `timestamp`

## Data

| Commodity | Yahoo Symbol | MCX Symbol | Conversion |
|---|---|---|---|
| Gold | GC=F | MCX:GOLD1! | USD/oz → ₹/10g |
| Silver | SI=F | MCX:SILVER1! | USD/oz → ₹/kg |
| Crude Oil | CL=F | MCX:CRUDEOIL1! | USD/bbl → ₹/bbl |
| Natural Gas | NG=F | MCX:NATURALGAS1! | USD/MMBtu → ₹/MMBtu |

## Tech Stack

- [TradingView Lightweight Charts™](https://www.tradingview.com/lightweight-charts/) v4.2.0
- [Base44 Backend](https://base44.com) — Deno serverless functions + entity storage
- Yahoo Finance API — Live commodity futures data
- Pure HTML/CSS/JS frontend — no build step, no dependencies
- Dark theme with amber/gold (#f59e0b) accent
- Responsive layout

## Live Demo

**GitHub Pages:** [misssarah-dev.github.io/mcx-commodity-screener](https://misssarah-dev.github.io/mcx-commodity-screener/)

## Disclaimer

For informational purposes only. Not investment advice.
