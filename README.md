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

### Receipt OCR

The mobile receipt flow can call any OCR model served behind a secure endpoint. Set the endpoint before starting Expo:

```bash
EXPO_PUBLIC_OCR_ENDPOINT=https://your-domain.example/ocr npm start
```

Spendly sends a `POST` request with multipart form data under the `image` field. The endpoint can return plain text or JSON with one of these shapes:

```json
{ "text": "Milk 4.29\nBread 3.49" }
```

```json
{ "lines": ["Milk 4.29", "Bread 3.49"] }
```

Keep provider API keys on that backend endpoint instead of embedding them in the mobile app.

Build for app stores with EAS:

```bash
npm run build:android
npm run build:ios
```
