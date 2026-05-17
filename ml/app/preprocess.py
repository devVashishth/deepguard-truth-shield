"""OpenCV-based preprocessing for EfficientNetB3 deepfake detection."""
from __future__ import annotations

import base64
import io
from typing import Union

import cv2
import numpy as np
from PIL import Image

IMG_SIZE = 300  # EfficientNetB3 native input


def decode_image(src: Union[str, bytes]) -> np.ndarray:
    """Decode an image from raw bytes, base64 string, or data URL into BGR uint8."""
    if isinstance(src, str):
        if src.startswith("data:"):
            src = src.split(",", 1)[1]
        src = base64.b64decode(src)
    arr = np.frombuffer(src, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        # Fallback via PIL (handles WebP / odd formats)
        img = np.array(Image.open(io.BytesIO(src)).convert("RGB"))[:, :, ::-1]
    return img


def enhance_artifacts(img_bgr: np.ndarray) -> np.ndarray:
    """Mild high-pass + CLAHE to surface GAN/diffusion artifacts the network can latch onto."""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # Subtle unsharp mask — emphasises frequency-domain residuals
    blur = cv2.GaussianBlur(enhanced, (0, 0), sigmaX=1.0)
    enhanced = cv2.addWeighted(enhanced, 1.25, blur, -0.25, 0)
    return enhanced


def preprocess(src: Union[str, bytes], size: int = IMG_SIZE, enhance: bool = True) -> np.ndarray:
    """Decode -> resize -> (optional) artifact enhance -> EfficientNet preprocess.

    Returns a float32 tensor of shape (1, size, size, 3) ready for model.predict.
    """
    img_bgr = decode_image(src)
    img_bgr = cv2.resize(img_bgr, (size, size), interpolation=cv2.INTER_AREA)
    if enhance:
        img_bgr = enhance_artifacts(img_bgr)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    from tensorflow.keras.applications.efficientnet import preprocess_input
    x = preprocess_input(img_rgb)
    return np.expand_dims(x, axis=0)
