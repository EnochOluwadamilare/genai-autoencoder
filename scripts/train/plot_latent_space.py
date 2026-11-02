import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
import plotly.express as px

# -------------------------------------------------------------------
# 1. Load or Mock Latent Vectors (e.g., N samples x 16 latent dims)
# -------------------------------------------------------------------
def generate_mock_vae_latents(num_samples=500, latent_dim=16):
    """
    Simulates VAE mu vectors clustered around different shape concepts 
    (e.g., Star, Square, Circle, Noise).
    """
    np.random.seed(42)
    
    # 4 shape cluster centers in 16D space
    centers = {
        'Star': np.random.normal(loc=2.0, scale=1.0, size=latent_dim),
        'Square': np.random.normal(loc=-2.0, scale=1.0, size=latent_dim),
        'Circle': np.random.normal(loc=0.0, scale=2.0, size=latent_dim),
        'Noise': np.random.normal(loc=0.0, scale=0.5, size=latent_dim),
    }
    
    data = []
    labels = []
    
    samples_per_class = num_samples // len(centers)
    for shape_name, center in centers.items():
        # Generate samples with Gaussian noise around cluster centers
        cluster_samples = center + np.random.normal(0, 0.8, (samples_per_class, latent_dim))
        data.append(cluster_samples)
        labels.extend([shape_name] * samples_per_class)
        
    return np.vstack(data), np.array(labels)

# Replace this with your actual exported latent mu vectors:
# mu_vectors = np.load('latent_mu_dataset.npy') 
mu_vectors, ground_truth_labels = generate_mock_vae_latents()

# -------------------------------------------------------------------
# 2. Perform Dimensionality Reduction (t-SNE or PCA)
# -------------------------------------------------------------------
# Use t-SNE to project 16D -> 2D space
tsne = TSNE(n_components=2, perplexity=30, random_state=42)
latent_2d = tsne.fit_transform(mu_vectors)

# -------------------------------------------------------------------
# 3. K-Means Clustering on 16D Latent Space
# -------------------------------------------------------------------
num_clusters = 4
kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
cluster_ids = kmeans.fit_predict(mu_vectors)

# Create structured DataFrame
df = pd.DataFrame({
    'Latent_Dim_1': latent_2d[:, 0],
    'Latent_Dim_2': latent_2d[:, 1],
    'GroundTruth': ground_truth_labels,
    'Cluster': [f'Cluster {c}' for c in cluster_ids]
})

# -------------------------------------------------------------------
# 4. Static 2D Plotting with Seaborn / Matplotlib
# -------------------------------------------------------------------
plt.figure(figsize=(10, 6))
sns.scatterplot(
    data=df, 
    x='Latent_Dim_1', 
    y='Latent_Dim_2', 
    hue='GroundTruth', 
    style='Cluster',
    palette='viridis', 
    s=70, 
    alpha=0.8
)
plt.title("VAE Latent Space Projection (16D -> 2D t-SNE)")
plt.xlabel("t-SNE Component 1")
plt.ylabel("t-SNE Component 2")
plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig("vae_latent_clusters.png", dpi=300)
plt.show()

# -------------------------------------------------------------------
# 5. Interactive Visualizer with Plotly
# -------------------------------------------------------------------
fig = px.scatter(
    df,
    x='Latent_Dim_1',
    y='Latent_Dim_2',
    color='GroundTruth',
    symbol='Cluster',
    title='Interactive VAE Latent Clusters (16D → 2D)',
    hover_data=['GroundTruth', 'Cluster']
)
fig.update_traces(marker=dict(size=8))
fig.show()