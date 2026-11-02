import os
import random
import numpy as np
import matplotlib.pyplot as plt

# Configuration
DATASET_PATH = "shape_dataset/shapes_80k_32x32.npz"

def main():
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Could not find dataset at {DATASET_PATH}")
        return

    # 1. Load the compressed dataset
    print(f"Loading {DATASET_PATH}...")
    with np.load(DATASET_PATH, allow_pickle=True) as data:
        X = data["images"]       # Shape: (80000, 1, 32, 32)
        y = data["labels"]       # Shape: (80000,)
        classes = data["class_names"]

    # 2. Print metadata check
    print("\n=== DATASET STATISTICS ===")
    print(f"Total Samples:   {X.shape[0]}")
    print(f"Image Structure: {X.shape[2]}x{X.shape[3]} pixels ({X.shape[1]} channel)")
    print(f"Pixel Range:     Min = {X.min()}, Max = {X.max()}")
    print(f"Class Names:     {', '.join(classes)}")
    
    # Check class distribution
    unique, counts = np.unique(y, return_counts=True)
    print("\nSamples per class:")
    for idx, count in zip(unique, counts):
        print(f" - {classes[idx]}: {count} samples")

    # 3. Plot a grid of random samples
    print("\nDisplaying visual grid window...")
    rows, cols = 4, 6
    fig, axes = plt.subplots(rows, cols, figsize=(10, 7))
    fig.suptitle("Random Samples from Generated Shape Dataset", fontsize=14, fontweight="bold")
    
    # Pick random indices across the entire dataset
    num_total = X.shape[0]
    random_indices = random.sample(range(num_total), rows * cols)

    for i, idx in enumerate(random_indices):
        ax = axes[i // cols, i % cols]
        
        # Pull image array and squeeze out the channel dimension (1, 32, 32) -> (32, 32)
        img = np.squeeze(X[idx])
        label_idx = y[idx]
        class_name = classes[label_idx]
        
        # Display using grayscale map
        ax.imshow(img, cmap="gray", vmin=0.0, vmax=1.0)
        ax.set_title(f"{class_name}\n(ID: {idx})", fontsize=9)
        ax.axis("off")

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main()
