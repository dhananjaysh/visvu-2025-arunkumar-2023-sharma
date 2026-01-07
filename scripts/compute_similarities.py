 """
Computes pairwise cosine similarities between task embeddings.
Generates: processed/similarities.json
"""

import json
import numpy as np
import os
from sklearn.metrics.pairwise import cosine_similarity

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(os.path.dirname(BASE_DIR), "processed")

def main():
    print("Loading data...")
    
    # 1. Load Embeddings
    emb_path = os.path.join(PROCESSED_DIR, "embeddings.npy")
    if not os.path.exists(emb_path):
        print(f"Error: {emb_path} not found. Run generate_embeddings.py first.")
        return
    embeddings = np.load(emb_path)
    
    # 2. Load Tasks (for IDs)
    tasks_path = os.path.join(PROCESSED_DIR, "tasks_basic.json")
    if not os.path.exists(tasks_path):
        print(f"Error: {tasks_path} not found.")
        return
    with open(tasks_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    if len(tasks) != len(embeddings):
        print(f"Error: Mismatch! {len(tasks)} tasks vs {len(embeddings)} embeddings.")
        return

    print(f"Computing similarity matrix for {len(embeddings)} tasks...")
    
    # 3. Compute Cosine Similarity (Vectorized = Fast)
    # Result is a square matrix [N x N] where cell [i][j] is similarity between task i and j
    sim_matrix = cosine_similarity(embeddings)

    # 4. Extract Top Neighbors for each task
    # We store the top 20 neighbors to keep the JSON file size manageable
    final_output = []
    
    print("Extracting top neighbors...")
    for i, task in enumerate(tasks):
        # Get similarity scores for task i
        scores = sim_matrix[i]
        
        # Get indices of top 21 scores (including itself at index 0)
        # argsort sorts ascending, so we take the last 21 and reverse
        top_indices = np.argsort(scores)[-21:][::-1]
        
        similar_tasks = []
        for idx in top_indices:
            if idx == i: continue # Skip self
            
            similar_tasks.append({
                "id": tasks[idx]["id"],
                "similarity": float(scores[idx]) # Convert numpy float to standard float
            })

        final_output.append({
            "task_id": task["id"],
            "similar_tasks": similar_tasks
        })

    # 5. Save
    out_path = os.path.join(PROCESSED_DIR, "similarities.json")
    print(f"Saving to {out_path}...")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f)
    
    print("Done! Similarity calculation complete.")

if __name__ == "__main__":
    main()