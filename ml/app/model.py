"""EfficientNetB3-based deepfake detector (transfer learning + fine-tuning)."""
from __future__ import annotations

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import EfficientNetB3

IMG_SIZE = 300


def build_model(img_size: int = IMG_SIZE, dropout: float = 0.4) -> tf.keras.Model:
    """EfficientNetB3 backbone (ImageNet) + GAP + Dropout + Dense + Sigmoid."""
    base = EfficientNetB3(
        include_top=False,
        weights="imagenet",
        input_shape=(img_size, img_size, 3),
        pooling=None,
    )
    base.trainable = False  # stage 1: freeze backbone

    inputs = layers.Input(shape=(img_size, img_size, 3))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(dropout, name="head_dropout_1")(x)
    x = layers.Dense(256, activation="relu", name="head_dense")(x)
    x = layers.Dropout(dropout * 0.75, name="head_dropout_2")(x)
    outputs = layers.Dense(1, activation="sigmoid", name="ai_fake_prob")(x)

    model = models.Model(inputs, outputs, name="DeepGuard_EfficientNetB3")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def unfreeze_for_finetune(model: tf.keras.Model, top_n_layers: int = 40, lr: float = 1e-5) -> None:
    """Unfreeze the top N layers of the backbone and recompile with a low LR."""
    base = model.get_layer(index=1)  # the EfficientNetB3 functional model
    base.trainable = True
    for layer in base.layers[:-top_n_layers]:
        layer.trainable = False
    # Keep BatchNorm layers in inference mode
    for layer in base.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
