"""FastAPI inference server for the EfficientNetB3 deepfake detector."""
from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .infer import load_model, predict

API_KEY = os.getenv("API_KEY")  # optional bearer token

app = FastAPI(
    title="DeepGuard AI — EfficientNetB3",
    description="Deepfake / AI-generated image detector. Replaces the previous basic CNN.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictBody(BaseModel):
    image_url: Optional[str] = Field(None, description="data: URL or base64 image string")
    image_b64: Optional[str] = Field(None, description="raw base64-encoded image")


def _check_auth(authorization: Optional[str]) -> None:
    if not API_KEY:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    if authorization.split(" ", 1)[1] != API_KEY:
        raise HTTPException(401, "Invalid API key")


@app.on_event("startup")
def _warmup() -> None:
    load_model()


@app.get("/")
def health() -> dict:
    return {"status": "ok", "model": "EfficientNetB3", "input_size": 300}


@app.post("/predict")
async def predict_json(body: PredictBody, authorization: Optional[str] = Header(None)) -> dict:
    _check_auth(authorization)
    src = body.image_url or body.image_b64
    if not src:
        raise HTTPException(400, "Provide image_url or image_b64")
    try:
        return predict(src)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Inference failed: {exc}") from exc


@app.post("/predict/file")
async def predict_file(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
) -> dict:
    _check_auth(authorization)
    data = await file.read()
    try:
        return predict(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Inference failed: {exc}") from exc
