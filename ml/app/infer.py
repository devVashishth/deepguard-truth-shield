"""Inference helpers — loads the trained model once and exposes predict()."""
from __future__ import annotations

import os
import threading
from typing import Union

import numpy as np
import tensorflow as tf

from .model import build_model
from .preprocess import preprocess

_MODEL: tf.keras.Model | None = None
_LOCK = threading.Lock()


def load_model() -> tf.keras.Model:
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    with _LOCK:
        if _MODEL is not None:
            return _MODEL
        path = os.getenv("MODEL_PATH", "models/deepguard_effnetb3.keras")
        if os.path.exists(path):
            _MODEL = tf.keras.models.load_model(path)
        else:
            # Cold start with ImageNet weights only — useful for smoke-testing before training.
            print(f"[infer] WARNING: {path} not found, using untrained EfficientNetB3 head.")
            _MODEL = build_model()
        return _MODEL


def predict(src: Union[str, bytes]) -> dict:
    model = load_model()
    x = preprocess(src)
    prob_fake = float(model.predict(x, verbose=0)[0, 0])
    is_fake = prob_fake >= 0.5
    confidence = prob_fake if is_fake else (1.0 - prob_fake)
    return {
        "label": "AI Generated" if is_fake else "Real",
        "verdict": "fake" if is_fake else "real",
        "confidence": round(confidence * 100, 2),
        "ai_generated_likelihood": round(prob_fake * 100, 2),
        "model": "EfficientNetB3",
        "input_size": 300,
    }
