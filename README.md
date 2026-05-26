# Spendly Finance Tracker

A local-first financial tracking app for summarizing spending habits, modeling recurring bills, and forecasting near-term spending.

## Features

- Add income and expense transactions
- Track recurring bills like rent, phone payments, car insurance, and car payments
- Import and export CSV transaction data
- View monthly cash flow and category breakdown charts
- Model 30-day spending forecasts
- Track savings goal progress

## Run Locally

### Web prototype

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173/`.

### Mobile app

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Build for app stores with EAS:

```bash
npm run build:android
npm run build:ios
```
