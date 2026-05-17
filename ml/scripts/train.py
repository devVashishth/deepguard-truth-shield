"""Train EfficientNetB3 deepfake detector with 2-stage transfer learning + fine-tuning."""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

import sys
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.model import build_model, unfreeze_for_finetune


def build_datasets(data_dir: str, img_size: int, batch_size: int):
    # Directory layout: data_dir/real/*.jpg, data_dir/fake/*.jpg
    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        labels="inferred",
        label_mode="binary",
        class_names=["real", "fake"],  # fake -> 1
        validation_split=0.15,
        subset="training",
        seed=1337,
        image_size=(img_size, img_size),
        batch_size=batch_size,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        labels="inferred",
        label_mode="binary",
        class_names=["real", "fake"],
        validation_split=0.15,
        subset="validation",
        seed=1337,
        image_size=(img_size, img_size),
        batch_size=batch_size,
    )

    augment = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomBrightness(0.1),
        tf.keras.layers.RandomContrast(0.1),
    ], name="augment")

    from tensorflow.keras.applications.efficientnet import preprocess_input

    def _prep(x, y):
        return preprocess_input(tf.cast(x, tf.float32)), y

    train_ds = train_ds.map(lambda x, y: (augment(x, training=True), y),
                            num_parallel_calls=tf.data.AUTOTUNE)
    train_ds = train_ds.map(_prep, num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.map(_prep, num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)
    return train_ds, val_ds


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="data")
    p.add_argument("--img-size", type=int, default=300)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--head-epochs", type=int, default=8)
    p.add_argument("--finetune-epochs", type=int, default=12)
    p.add_argument("--output", default="models/deepguard_effnetb3.keras")
    args = p.parse_args()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    train_ds, val_ds = build_datasets(args.data_dir, args.img_size, args.batch_size)
    model = build_model(img_size=args.img_size)

    cbs = [
        EarlyStopping(patience=4, restore_best_weights=True, monitor="val_auc", mode="max"),
        ReduceLROnPlateau(patience=2, factor=0.5, monitor="val_loss"),
        ModelCheckpoint(args.output, monitor="val_auc", mode="max", save_best_only=True),
    ]

    print("\n=== Stage 1: train head (backbone frozen) ===")
    model.fit(train_ds, validation_data=val_ds, epochs=args.head_epochs, callbacks=cbs)

    print("\n=== Stage 2: fine-tune top blocks of EfficientNetB3 ===")
    unfreeze_for_finetune(model, top_n_layers=40, lr=1e-5)
    model.fit(train_ds, validation_data=val_ds, epochs=args.finetune_epochs, callbacks=cbs)

    model.save(args.output)
    print(f"\n✅ Saved: {args.output}")


if __name__ == "__main__":
    main()
