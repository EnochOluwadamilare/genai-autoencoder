import os
import math
import random
import numpy as np
from PIL import Image, ImageDraw

# Configuration
NUM_SAMPLES = 80000
IMAGE_SIZE = 32
OUTPUT_DIR = "shape_dataset"
CLASSES = [
    "star_4", "star_5", "star_8",
    "box", "circle", "pentagon", "triangle",
    "cross", "hexagon", "crescent", "scribble"
]

def create_blank_image():
    # White background (255)
    return Image.new("L", (IMAGE_SIZE, IMAGE_SIZE), 255)

def get_random_stroke():
    # Stroke width between 1 and 3 pixels (matching canvas UI)
    return random.choice([1, 2, 3])

def get_transform_params():
    # Rotation (0-360 deg), scale (50-85% of grid), translation shift (-2 to +2 px)
    angle = random.uniform(0, 360)
    scale = random.uniform(0.5, 0.85) * (IMAGE_SIZE / 2)
    offset_x = random.randint(-2, 2)
    offset_y = random.randint(-2, 2)
    center = (IMAGE_SIZE / 2 + offset_x, IMAGE_SIZE / 2 + offset_y)
    return center, scale, angle

def generate_polygon(num_vertices, star_factor=1.0):
    img = create_blank_image()
    draw = ImageDraw.Draw(img)
    center, scale, angle_deg = get_transform_params()
    stroke = get_random_stroke()
    
    points = []
    total_points = num_vertices * (2 if star_factor != 1.0 else 1)
    
    for i in range(total_points):
        a = math.radians(i * 360.0 / total_points + angle_deg)
        r = scale if (i % 2 == 0 or star_factor == 1.0) else (scale * star_factor)
        x = center[0] + r * math.cos(a)
        y = center[1] + r * math.sin(a)
        points.append((x, y))
        
    draw.polygon(points, outline=0, width=stroke)
    return img

def generate_box():
    img = create_blank_image()
    draw = ImageDraw.Draw(img)
    center, scale, angle_deg = get_transform_params()
    stroke = get_random_stroke()

    # Define base box relative to origin
    w, h = scale, scale * random.uniform(0.7, 1.0)
    corners = [(-w, -h), (w, -h), (w, h), (-w, h)]
    
    # Rotate and translate corners
    rad = math.radians(angle_deg)
    transformed = []
    for x, y in corners:
        rx = x * math.cos(rad) - y * math.sin(rad) + center[0]
        ry = x * math.sin(rad) + y * math.cos(rad) + center[1]
        transformed.append((rx, ry))
        
    draw.polygon(transformed, outline=0, width=stroke)
    return img

def generate_circle():
    img = create_blank_image()
    draw = ImageDraw.Draw(img)
    center, scale, _ = get_transform_params()
    stroke = get_random_stroke()
    
    aspect = random.uniform(0.7, 1.0)
    rx, ry = scale, scale * aspect
    bbox = [center[0] - rx, center[1] - ry, center[0] + rx, center[1] + ry]
    draw.ellipse(bbox, outline=0, width=stroke)
    return img

def generate_cross():
    img = create_blank_image()
    draw = ImageDraw.Draw(img)
    center, scale, angle_deg = get_transform_params()
    stroke = get_random_stroke()
    
    rad = math.radians(angle_deg)
    lines = [((-scale, 0), (scale, 0)), ((0, -scale), (0, scale))]
    
    for (x1, y1), (x2, y2) in lines:
        rx1 = x1 * math.cos(rad) - y1 * math.sin(rad) + center[0]
        ry1 = x1 * math.sin(rad) + y1 * math.cos(rad) + center[1]
        rx2 = x2 * math.cos(rad) - y2 * math.sin(rad) + center[0]
        ry2 = x2 * math.sin(rad) + y2 * math.cos(rad) + center[1]
        draw.line([(rx1, ry1), (rx2, ry2)], fill=0, width=stroke)
        
    return img

def generate_crescent():
    img = create_blank_image()
    draw = ImageDraw.Draw(img)
    center, scale, angle_deg = get_transform_params()
    stroke = get_random_stroke()
    
    bbox = [center[0] - scale, center[1] - scale, center[0] + scale, center[1] + scale]
    draw.arc(bbox, start=angle_deg, end=angle_deg + 240, fill=0, width=stroke)
    return img

def generate_scribble():
    img = create_blank_image()
    draw = ImageDraw.Draw(img)
    center, scale, _ = get_transform_params()
    stroke = get_random_stroke()
    
    num_points = random.randint(4, 7)
    points = []
    for _ in range(num_points):
        x = center[0] + random.uniform(-scale, scale)
        y = center[1] + random.uniform(-scale, scale)
        points.append((x, y))
        
    draw.line(points, fill=0, width=stroke, joint="curve")
    return img

def generate_sample(shape_type):
    if shape_type == "star_4": return generate_polygon(4, star_factor=0.35)
    elif shape_type == "star_5": return generate_polygon(5, star_factor=0.4)
    elif shape_type == "star_8": return generate_polygon(8, star_factor=0.45)
    elif shape_type == "box": return generate_box()
    elif shape_type == "circle": return generate_circle()
    elif shape_type == "pentagon": return generate_polygon(5, star_factor=1.0)
    elif shape_type == "triangle": return generate_polygon(3, star_factor=1.0)
    elif shape_type == "cross": return generate_cross()
    elif shape_type == "hexagon": return generate_polygon(6, star_factor=1.0)
    elif shape_type == "crescent": return generate_crescent()
    elif shape_type == "scribble": return generate_scribble()

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    images_per_class = NUM_SAMPLES // len(CLASSES)
    
    all_images = []
    all_labels = []
    
    print(f"Generating {NUM_SAMPLES} samples on a {IMAGE_SIZE}x{IMAGE_SIZE} canvas...")

    label_idx = 0
    for shape_name in CLASSES:
        print(f"Generating class '{shape_name}' ({images_per_class} samples)...")
        for i in range(images_per_class):
            img = generate_sample(shape_name)
            
            # Convert to numpy array normalized to [0.0, 1.0]
            # White background = 1.0, Black drawing line = 0.0
            img_arr = np.array(img, dtype=np.float32) / 255.0
            
            all_images.append(img_arr)
            all_labels.append(label_idx)

        label_idx += 1

    # Shuffle dataset
    combined = list(zip(all_images, all_labels))
    random.shuffle(combined)
    all_images, all_labels = zip(*combined)

    X = np.array(all_images, dtype=np.float32).reshape(-1, 1, IMAGE_SIZE, IMAGE_SIZE)
    y = np.array(all_labels, dtype=np.int64)

    # Save as compressed NumPy file for fast PyTorch loading
    save_path = os.path.join(OUTPUT_DIR, "shapes_80k_32x32.npz")
    np.savez_compressed(save_path, images=X, labels=y, class_names=CLASSES)
    
    print(f"\nDataset generation complete!")
    print(f"Saved: {save_path}")
    print(f"Tensor shape: {X.shape} (Range: min={X.min()}, max={X.max()})")

if __name__ == "__main__":
    main()