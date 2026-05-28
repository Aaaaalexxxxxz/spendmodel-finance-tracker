# Spendly OCR Server

Small FastAPI service for receipt OCR. The mobile app uploads receipt images to
`POST /ocr` as multipart form data under the `image` field.

## Run

```bash
cd ocr_server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8787
```

Then start the app with:

```bash
EXPO_PUBLIC_OCR_ENDPOINT=http://127.0.0.1:8787/ocr npm start
```

For an iOS simulator, `127.0.0.1` maps to your Mac. For a physical phone, use
your Mac's LAN IP address instead.

## Response Shape

`POST /ocr` returns raw text plus parsed line items:

```json
{
  "text": "Milk 4.29\nBread 3.49",
  "items": [
    { "description": "Milk", "amount": 4.29, "category": "Food" },
    { "description": "Bread", "amount": 3.49, "category": "Food" }
  ]
}
```

Spendly lets users correct those items before they become transactions. Those
corrections are the examples you will eventually want to save for fine-tuning.

## Model Modes

The server currently defaults to `stub` mode, which returns sample receipt text
so the app integration can be tested immediately.

Set `OCR_MODEL_MODE=donut` when you are ready to load a pretrained or fine-tuned
Donut model:

```bash
OCR_MODEL_MODE=donut OCR_MODEL_NAME=naver-clova-ix/donut-base uvicorn server:app --host 0.0.0.0 --port 8787
```

For production, point `OCR_MODEL_NAME` at your fine-tuned model directory or
Hugging Face model id.
