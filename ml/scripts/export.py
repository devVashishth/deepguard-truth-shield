"""Convenience: re-save a trained model into the canonical models/ path."""
import argparse
import tensorflow as tf

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--src", required=True)
    p.add_argument("--dst", default="models/deepguard_effnetb3.keras")
    a = p.parse_args()
    m = tf.keras.models.load_model(a.src)
    m.save(a.dst)
    print(f"Saved -> {a.dst}")
