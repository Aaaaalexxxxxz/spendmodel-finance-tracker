import re

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from model import load_model


app = FastAPI(title="Spendly OCR Server")
model = load_model()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ocr")
async def ocr(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file under the 'image' field.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        text = model.recognize(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"text": text, "items": parse_receipt_items(text)}


def parse_receipt_items(text: str):
    items = []
    for line in text.splitlines():
        match = re.match(r"(.+?)\s+\$?(-?\d+(?:\.\d{2})?)$", line.strip())
        if not match:
            continue
        description = re.sub(r"\s{2,}", " ", match.group(1)).strip()
        amount = abs(float(match.group(2)))
        if not description or not amount:
            continue
        if re.search(r"subtotal|total|tax|visa|cash|credit|debit", description, re.IGNORECASE):
            continue
        items.append(
            {
                "description": description,
                "amount": amount,
                "category": suggest_category(description),
            }
        )
    return items


def suggest_category(description: str) -> str:
    text = description.lower()
    if re.search(r"coffee|milk|bread|egg|fruit|rice|chicken|beef|snack|pizza|grocery|food", text):
        return "Food"
    if re.search(r"gas|fuel|parking|uber|lyft|taxi|transit|train|bus", text):
        return "Transport"
    if re.search(r"pharmacy|medicine|vitamin|clinic|drug|health", text):
        return "Health"
    if re.search(r"movie|ticket|game|book|music|concert", text):
        return "Entertainment"
    if re.search(r"shirt|shoe|clothes|device|charger|headphone|home|kitchen", text):
        return "Shopping"
    return "Other"
