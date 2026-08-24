import os
import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, random_split

# ==========================================
# 1. Dataset Loader
# ==========================================
class ShapeDataset(Dataset):
    def __init__(self, npz_path):
        data = np.load(npz_path)
        self.images = torch.tensor(data['images'], dtype=torch.float32) # [N, 1, 32, 32]
        self.labels = torch.tensor(data['labels'], dtype=torch.long)
        self.class_names = list(data['class_names'])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        return self.images[idx], self.labels[idx]

# ==========================================
# 2. Beta-VAE Architecture
# ==========================================
class BetaVAE(nn.Module):
    def __init__(self, latent_dim=16):
        super(BetaVAE, self).__init__()
        self.latent_dim = latent_dim

        # Encoder: [1, 32, 32] -> [256, 4, 4]
        self.encoder = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=4, stride=2, padding=1),   # [32, 16, 16]
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2),
            nn.Conv2d(32, 64, kernel_size=4, stride=2, padding=1),  # [64, 8, 8]
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2),
            nn.Conv2d(64, 128, kernel_size=4, stride=2, padding=1), # [128, 4, 4]
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2),
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),# [256, 4, 4]
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2),
            nn.Flatten()
        )

        self.fc_mu = nn.Linear(4096, latent_dim)
        self.fc_logvar = nn.Linear(4096, latent_dim)

        # Decoder
        self.decoder_input = nn.Linear(latent_dim, 4096)
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(256, 128, kernel_size=4, stride=2, padding=1), # [128, 8, 8]
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2),
            nn.ConvTranspose2d(128, 64, kernel_size=4, stride=2, padding=1),  # [64, 16, 16]
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2),
            nn.ConvTranspose2d(64, 32, kernel_size=4, stride=2, padding=1),   # [32, 32, 32]
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2),
            nn.Conv2d(32, 1, kernel_size=3, stride=1, padding=1),             # [1, 32, 32]
            nn.Sigmoid()
        )

    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z):
        h = self.decoder_input(z)
        h = h.view(-1, 256, 4, 4)
        return self.decoder(h)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        return self.decode(z), mu, logvar

# ==========================================
# 3. Disentangled Beta-Loss
# ==========================================
def beta_vae_loss(recon_x, x, mu, logvar, beta=3.0):
    # Binary Cross Entropy over 32x32 pixels
    recon_loss = F.binary_cross_entropy(recon_x, x, reduction='sum')
    # KL Divergence
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    total_loss = recon_loss + (beta * kl_loss)
    return total_loss, recon_loss, kl_loss

# ==========================================
# 4. Training & Validation Pipeline
# ==========================================
def run_pipeline():
    # Setup Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load Dataset
    npz_path = "shape_dataset/shapes_80k_32x32.npz"
    if not os.path.exists(npz_path):
        raise FileNotFoundError(f"Could not find {npz_path}. Run generate_dataset.py first!")
    
    full_dataset = ShapeDataset(npz_path)
    total_samples = len(full_dataset)

    # 80/20 Train/Val Split (64,000 train / 16,000 val)
    train_size = int(0.8 * total_samples)
    val_size = total_samples - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=128, shuffle=False)

    print(f"Loaded {total_samples} images | Train: {train_size} | Val: {val_size}")

    # Initialize Model & Optimizer
    latent_dim = 16
    beta_param = 3.0
    epochs = 20
    model = BetaVAE(latent_dim=latent_dim).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2)

    # Training Loop
    print("\n--- Starting Training Loop ---")
    for epoch in range(1, epochs + 1):
        # TRAIN PHASE
        model.train()
        train_total_loss, train_recon_loss, train_kl_loss = 0.0, 0.0, 0.0

        for x_batch, _ in train_loader:
            x_batch = x_batch.to(device)
            optimizer.zero_grad()

            recon_batch, mu, logvar = model(x_batch)
            loss, recon, kl = beta_vae_loss(recon_batch, x_batch, mu, logvar, beta=beta_param)

            loss.backward()
            optimizer.step()

            train_total_loss += loss.item()
            train_recon_loss += recon.item()
            train_kl_loss += kl.item()

        # VALIDATION PHASE
        model.eval()
        val_total_loss, val_recon_loss, val_kl_loss = 0.0, 0.0, 0.0

        with torch.no_grad():
            for x_val, _ in val_loader:
                x_val = x_val.to(device)
                recon_val, mu_val, logvar_val = model(x_val)
                val_loss, val_recon, val_kl = beta_vae_loss(recon_val, x_val, mu_val, logvar_val, beta=beta_param)

                val_total_loss += val_loss.item()
                val_recon_loss += val_recon.item()
                val_kl_loss += val_kl.item()

        # Compute Averages Per Sample
        avg_train_loss = train_total_loss / train_size
        avg_val_loss = val_total_loss / val_size
        avg_val_recon = val_recon_loss / val_size
        avg_val_kl = val_kl_loss / val_size

        scheduler.step(avg_val_loss)

        print(f"Epoch {epoch:02d}/{epochs:02d} | "
              f"Train Loss: {avg_train_loss:.2f} | "
              f"Val Loss: {avg_val_loss:.2f} (Recon: {avg_val_recon:.2f}, KL: {avg_val_kl:.2f})")

    # Save Model Checkpoint
    os.makedirs("checkpoints", exist_ok=True)
    torch.save(model.state_dict(), "checkpoints/beta_vae_32x32.pth")
    print("\nModel saved to checkpoints/beta_vae_32x32.pth")

    # ==========================================
    # 5. Compute & Save Global Star Vector (v_star)
    # ==========================================
    print("\nExtracting Global Star Latent Vector (v_star)...")
    model.eval()
    
    star_class_indices = [full_dataset.class_names.index(c) for c in ["star_4", "star_5", "star_8"]]
    
    star_mus = []
    global_mus = []

    with torch.no_grad():
        full_loader = DataLoader(full_dataset, batch_size=256, shuffle=False)
        for x_all, y_all in full_loader:
            x_all = x_all.to(device)
            mu, _ = model.encode(x_all)
            global_mus.append(mu)

            # Mask star samples
            star_mask = torch.tensor([lbl.item() in star_class_indices for lbl in y_all])
            if star_mask.any():
                star_mus.append(mu[star_mask])

    z_global = torch.cat(global_mus, dim=0).mean(dim=0)
    z_star = torch.cat(star_mus, dim=0).mean(dim=0)
    v_star = (z_star - z_global).cpu().numpy().tolist()

    with open("checkpoints/v_star.json", "w") as f:
        json.dump({"v_star": v_star, "latent_dim": latent_dim}, f, indent=2)

    print(f"Saved v_star ({latent_dim} dimensions) to checkpoints/v_star.json")
    print("v_star values:", [round(x, 4) for x in v_star])

if __name__ == "__main__":
    run_pipeline()