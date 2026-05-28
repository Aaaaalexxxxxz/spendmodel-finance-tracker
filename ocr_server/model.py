import os
from dataclasses import dataclass
from io import BytesIO
from typing import Protocol

from PIL import Image


class ReceiptOcrModel(Protocol):
    def recognize(self, image_bytes: bytes) -> str:
        ...


@dataclass
class StubReceiptOcrModel:
    """Development model used until a trained OCR model is configured."""

    def recognize(self, image_bytes: bytes) -> str:
        Image.open(BytesIO(image_bytes)).verify()
        return "\n".join(
            [
                "Milk 4.29",
                "Bread 3.49",
                "Coffee 5.25",
                "Subtotal 13.03",
                "Tax 0.91",
                "Total 13.94",
            ]
        )


class DonutReceiptOcrModel:
    """Adapter for pretrained or fine-tuned Donut-style receipt models."""

    def __init__(self, model_name: str):
        try:
            import torch
            from transformers import DonutProcessor, VisionEncoderDecoderModel
        except ImportError as exc:
            raise RuntimeError(
                "Donut mode requires torch, transformers, and sentencepiece. "
                "Install the optional packages listed in requirements.txt."
            ) from exc

        self.torch = torch
        self.processor = DonutProcessor.from_pretrained(model_name)
        self.model = VisionEncoderDecoderModel.from_pretrained(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        self.model.eval()

        self.task_prompt = os.getenv("OCR_TASK_PROMPT", "<s_cord-v2>")

    def recognize(self, image_bytes: bytes) -> str:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        pixel_values = self.processor(image, return_tensors="pt").pixel_values.to(self.device)
        decoder_input_ids = self.processor.tokenizer(
            self.task_prompt,
            add_special_tokens=False,
            return_tensors="pt",
        ).input_ids.to(self.device)

        with self.torch.no_grad():
            outputs = self.model.generate(
                pixel_values,
                decoder_input_ids=decoder_input_ids,
                max_length=int(os.getenv("OCR_MAX_LENGTH", "768")),
                early_stopping=True,
                pad_token_id=self.processor.tokenizer.pad_token_id,
                eos_token_id=self.processor.tokenizer.eos_token_id,
                use_cache=True,
                num_beams=int(os.getenv("OCR_NUM_BEAMS", "1")),
                bad_words_ids=[[self.processor.tokenizer.unk_token_id]],
            )

        sequence = self.processor.batch_decode(outputs, skip_special_tokens=True)[0]
        sequence = sequence.replace(self.processor.tokenizer.eos_token, "").strip()
        return sequence


def load_model() -> ReceiptOcrModel:
    mode = os.getenv("OCR_MODEL_MODE", "stub").lower()
    if mode == "donut":
        return DonutReceiptOcrModel(os.getenv("OCR_MODEL_NAME", "naver-clova-ix/donut-base"))
    if mode == "stub":
        return StubReceiptOcrModel()
    raise ValueError(f"Unsupported OCR_MODEL_MODE: {mode}")
