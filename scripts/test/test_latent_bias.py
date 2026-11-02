import os
import json
import math
import numpy as np
import torch
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw

# Import your trained model definition
from train_beta_vae import BetaVAE

# Configuration
IMAGE_SIZE = 32
CHECKPOINT_PATH = "checkpoints/beta_vae_32x32.pth"
V_STAR_PATH = "checkpoints/v_star.json"
OUTPUT_IMAGE = "latent_bias_test_results.png"

# ==========================================
# 1. Shape Generation Functions (32x32)
# ==========================================
def create_canvas():
    return Image.new("L", (IMAGE_SIZE, IMAGE_SIZE), 255)

def draw_polygon(num_vertices, star_factor=1.0, aspect=1.0):
    img = create_canvas()
    draw = ImageDraw.Draw(img)
    center = (16, 16)
    scale = 11.0
    
    points = []
    total_points = num_vertices * (2 if star_factor != 1.0 else 1)
    
    for i in range(total_points):
        a = math.radians(i * 360.0 / total_points - 90)
        r = scale if (i % 2 == 0 or star_factor == 1.0) else (scale * star_factor)
        x = center[0] + r * math.cos(a) * aspect
        y = center[1] + r * math.sin(a)
        points.append((x, y))
        
    draw.polygon(points, outline=0, width=2)
    return img

def draw_box(aspect=1.0):
    img = create_canvas()
    draw = ImageDraw.Draw(img)
    center = (16, 16)
    w, h = 10.0 * aspect, 10.0
    bbox = [center[0] - w, center[1] - h, center[0] + w, center[1] + h]
    draw.rectangle(bbox, outline=0, width=2)
    return img

def draw_ellipse(aspect=1.0):
    img = create_canvas()
    draw = ImageDraw.Draw(img)
    center = (16, 16)
    rx, ry = 10.0 * aspect, 10.0
    bbox = [center[0] - rx, center[1] - ry, center[0] + rx, center[1] + ry]
    draw.ellipse(bbox, outline=0, width=2)
    return img

def draw_moon():
    img = create_canvas()
    draw = ImageDraw.Draw(img)
    bbox = [5, 5, 27, 27]
    draw.arc(bbox, start=30, end=270, fill=0, width=2)
    return img

def generate_test_shapes():
    """Generates the 10 requested test shapes."""
    shapes = {
        "1. 5-Point Star": draw_polygon(5, star_factor=0.4),
        "2. Box (Square)": draw_box(aspect=1.0),
        "3. Circle": draw_ellipse(aspect=1.0),
        "4. Oval": draw_ellipse(aspect=1.4),
        "5. Pentagon": draw_polygon(5, star_factor=1.0),
        "6. Triangle": draw_polygon(3, star_factor=1.0),
        "7. 6-Point Star": draw_polygon(6, star_factor=0.45),
        "8. Moon": draw_moon(),
        "9. Rectangle": draw_box(aspect=1.4),
        "10. 7-Sided Polygon": draw_polygon(7, star_factor=1.0)
    }
    return shapes

# ==========================================
# 2. Main Test & Visualization Pipeline
# ==========================================
def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Check paths
    if not os.path.exists(CHECKPOINT_PATH) or not os.path.exists(V_STAR_PATH):
        raise FileNotFoundError("Missing checkpoint or v_star.json. Ensure model training complete.")

    # Load Model
    latent_dim = 16
    model = BetaVAE(latent_dim=latent_dim).to(device)
    model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=device))
    model.eval()

    # Load v_star Vector
    with open(V_STAR_PATH, "r") as f:
        v_star_data = json.load(f)
    v_star = torch.tensor(v_star_data["v_star"], dtype=torch.float32).to(device)

    # Prepare Test Shapes
    test_shapes = generate_test_shapes()
    alphas = [0.0, 0.3, 0.6, 1.0]  # Original, Low Bias, Mid Bias, High Bias
    
    fig, axes = plt.subplots(len(test_shapes), len(alphas) + 1, figsize=(12, 22))
    fig.suptitle("VAE Latent Star-Bias Morphing Results across 10 Test Inputs", fontsize=16, y=0.995)

    row_idx = 0
    with torch.no_grad():
        for shape_name, pil_img in test_shapes.items():
            # Normalize to [0.0, 1.0] tensor: [1, 1, 32, 32]
            img_np = np.array(pil_img, dtype=np.float32) / 255.0
            img_tensor = torch.tensor(img_np).unsqueeze(0).unsqueeze(0).to(device)

            # 1. Display Original Input Canvas
            axes[row_idx, 0].imshow(img_np, cmap="gray", vmin=0.0, vmax=1.0)
            axes[row_idx, 0].set_title(f"{shape_name}\n(Input)", fontsize=9)
            axes[row_idx, 0].axis("off")

            # 2. Encode to mu
            mu, _ = model.encode(img_tensor)

            # 3. Apply Star Bias & Decode across Alphas
            for col_idx, alpha in enumerate(alphas, start=1):
                # z_biased = mu + alpha * v_star
                z_biased = mu + (alpha * v_star.unsqueeze(0))
                recon_img = model.decode(z_biased).squeeze().cpu().numpy()

                axes[row_idx, col_idx].imshow(recon_img, cmap="gray", vmin=0.0, vmax=1.0)
                axes[row_idx, col_idx].set_title(f"α = {alpha}", fontsize=9)
                axes[row_idx, col_idx].axis("off")

            row_idx += 1

    plt.tight_layout()
    plt.savefig(OUTPUT_IMAGE, dpi=200, bbox_inches="tight")
    print(f"\nTest completed successfully!")
    print(f"Rendered output grid saved to: {OUTPUT_IMAGE}")

if __name__ == "__main__":
    main()