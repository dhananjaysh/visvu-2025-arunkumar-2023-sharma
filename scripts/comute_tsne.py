"""
Compute 3D t-SNE projection of embeddings.
Creates coordinates for the 3D sphere visualization.

Usage: python compute_tsne.py
Input: processed/embeddings.npy
Output: processed/coords_3d.npy
"""

import numpy as np
from sklearn.manifold import TSNE

def main():
    # Load embeddings
    print("Loading embeddings...")
    embeddings = np.load("processed/embeddings.npy")
    print(f"Embeddings shape: {embeddings.shape}")
    
    # Compute t-SNE with 3 components
    print("Computing t-SNE 3D projection...")
    print("Parameters: n_components=3, perplexity=30, n_iter=1000")
    print("This may take a few minutes...")
    
    tsne = TSNE(
        n_components=3,
        perplexity=30,
        max_iter=1000,
        random_state=12230006,
        verbose=1
    )
    
    coords_3d = tsne.fit_transform(embeddings)
    print(f"t-SNE output shape: {coords_3d.shape}")
    
    # Normalize coordinates to [-1, 1] range for sphere visualization
    coords_min = coords_3d.min(axis=0)
    coords_max = coords_3d.max(axis=0)
    coords_normalized = 2 * (coords_3d - coords_min) / (coords_max - coords_min) - 1
    
    print(f"Normalized range: [{coords_normalized.min():.2f}, {coords_normalized.max():.2f}]")
    
    # Save
    np.save("processed/coords_3d.npy", coords_normalized)
    print("Saved 3D coordinates to processed/coords_3d.npy")


if __name__ == "__main__":
    main()