# DeepGuard AI — EfficientNetB3 Deepfake Detector

Standalone Python service that replaces the previous CNN with an **EfficientNetB3** transfer-learning
model for detecting AI-generated images (GAN, Stable Diffusion, Midjourney, DALL·E).

The DeepGuard web app (Lovable Cloud edge function) calls this service over HTTP when the
`DEEPFAKE_API_URL` secret is configured. If the secret is unset, the app falls back to the existing
Gemini-based analyzer — so you can ship the ML model independently.

## Layout

```
ml/
├── app/
│   ├── main.py        FastAPI inference server
│   ├── model.py       EfficientNetB3 builder (transfer learning + fine-tune)
│   ├── preprocess.py  OpenCV preprocessing (resize, normalize, artifact enhance)
│   └── infer.py       Load + predict helpers
├── scripts/
│   ├── train.py       Two-stage train (head, then fine-tune)
│   └── export.py
├── data/{real,fake}/  put training images here
├── models/            trained weights land here
├── Dockerfile
└── requirements.txt
```

## 1. Install

```
cd ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Data

Drop images into `data/real/` and `data/fake/`. Include a balanced mix for best generalization:

- GAN: StyleGAN2/3, thispersondoesnotexist
- Stable Diffusion 1.5 / SDXL / Flux
- Midjourney v5/v6
- DALL·E 3
- Real photos: FFHQ, COCO, OpenImages

Target ≥ 5k images per class.

## 3. Train

```
python scripts/train.py \
  --data-dir data \
  --img-size 300 \
  --batch-size 32 \
  --head-epochs 8 \
  --finetune-epochs 12 \
  --output models/deepguard_effnetb3.keras
```

The script:

1. Loads EfficientNetB3 with ImageNet weights (`include_top=False`).
2. Adds `GlobalAveragePooling2D → Dropout(0.4) → Dense(256, relu) → Dropout(0.3) → Dense(1, sigmoid)`.
3. Stage 1: trains the head with the backbone frozen (Adam 1e-3).
4. Stage 2: fine-tunes the top 40 layers (Adam 1e-5, BatchNorm kept in inference mode).
5. Uses `binary_crossentropy` + `accuracy` + `AUC`.
6. Applies flip/rotate/zoom/brightness augmentation + EarlyStopping + ReduceLROnPlateau.

## 4. Run the API

```
export MODEL_PATH=models/deepguard_effnetb3.keras
export API_KEY=choose-a-long-random-string   # optional
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### POST /predict

Request: `{ "image_url": "data:image/jpeg;base64,..." }` (or `image_b64`, or multipart `/predict/file`).

Response:

```
{
  "label": "AI Generated",
  "verdict": "fake",
  "confidence": 92.4,
  "ai_generated_likelihood": 92.4,
  "model": "EfficientNetB3",
  "input_size": 300
}
```

When `API_KEY` is set, clients must send `Authorization: Bearer <API_KEY>`.

## 5. Deploy

```
docker build -t deepguard-ml .
docker run -p 8000:8000 -e API_KEY=xxx -v $PWD/models:/app/models deepguard-ml
```

Easy hosts: Hugging Face Spaces (Docker), Render, Fly.io, Railway, or any container runtime.

## 6. Wire into DeepGuard

In **Lovable Cloud → Settings → Secrets**, add:

- `DEEPFAKE_API_URL` → e.g. `https://your-host.com/predict`
- `DEEPFAKE_API_KEY` → same value as `API_KEY` above (optional)

The `analyze` edge function automatically routes `image` and `webcam` requests to your
EfficientNetB3 service when these are present. Video / fakenews / emotion still use the
multimodal Gemini path.

## Accuracy notes

EfficientNetB3 at 300×300 typically reaches **94–97 %** on a clean balanced AI-vs-real
dataset — well above a vanilla CNN. Re-fine-tune as new generators (Flux, SD4, MJ v7…) ship.
