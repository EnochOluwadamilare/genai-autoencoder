import os
import torch
import torch.nn as nn
from train_beta_vae import BetaVAE  # Imports your existing model definition

def export_to_onnx():
    checkpoint_path = "checkpoints/beta_vae_32x32.pth"
    output_dir = "checkpoints/onnx"
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Could not find {checkpoint_path}. Ensure training is completed.")

    # 1. Load trained PyTorch model
    latent_dim = 16
    device = torch.device("cpu")  # Export on CPU for clean ONNX graph tracing
    model = BetaVAE(latent_dim=latent_dim)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()

    print("Loaded PyTorch checkpoint successfully.")

    # 2. Export Encoder
    # Dummy input: Single batch of 1-channel 32x32 image [Batch, 1, 32, 32]
    dummy_input_img = torch.randn(1, 1, 32, 32, dtype=torch.float32)
    encoder_path = os.path.join(output_dir, "encoder.onnx")

    # Wrap encoder to output mean vector mu directly for deterministic inference
    class EncoderWrapper(nn.Module):
        def __init__(self, vae):
            super().__init__()
            self.encoder = vae.encoder
            self.fc_mu = vae.fc_mu
        def forward(self, x):
            h = self.encoder(x)
            return self.fc_mu(h)

    encoder_model = EncoderWrapper(model)

    torch.onnx.export(
        encoder_model,
        dummy_input_img,
        encoder_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input_image"],
        output_names=["mu"],
        dynamic_axes={
            "input_image": {0: "batch_size"},
            "mu": {0: "batch_size"}
        }
    )
    print(f"Exported Encoder to {encoder_path}")

    # 3. Export Decoder
    # Dummy input: Single batch of latent vector [Batch, 16]
    dummy_input_z = torch.randn(1, latent_dim, dtype=torch.float32)
    decoder_path = os.path.join(output_dir, "decoder.onnx")

    class DecoderWrapper(nn.Module):
        def __init__(self, vae):
            super().__init__()
            self.decoder_input = vae.decoder_input
            self.decoder = vae.decoder
        def forward(self, z):
            h = self.decoder_input(z)
            h = h.view(-1, 256, 4, 4)
            return self.decoder(h)

    decoder_model = DecoderWrapper(model)

    torch.onnx.export(
        decoder_model,
        dummy_input_z,
        decoder_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["latent_z"],
        output_names=["output_image"],
        dynamic_axes={
            "latent_z": {0: "batch_size"},
            "output_image": {0: "batch_size"}
        }
    )
    print(f"Exported Decoder to {decoder_path}")

    # 4. Verify Export with ONNX Checker
    try:
        import onnx
        onnx_encoder = onnx.load(encoder_path)
        onnx.checker.check_model(onnx_encoder)
        onnx_decoder = onnx.load(decoder_path)
        onnx.checker.check_model(onnx_decoder)
        print("\nONNX model validation successful! Graph structure is clean.")
    except ImportError:
        print("\nInstall 'onnx' via pip to run automated graph validation checks.")

if __name__ == "__main__":
    export_to_onnx()