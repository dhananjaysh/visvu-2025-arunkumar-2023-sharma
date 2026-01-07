"""
Generate sentence embeddings for all tasks.
Uses Sentence-Transformers to create embeddings from definition + examples.

Usage: python generate_embeddings.py
Input: processed/tasks_basic.json
Output: processed/embeddings.npy
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer

def create_embedding_text(task):
    """Create text for embedding from task definition and examples."""
    parts = [task["definition"]]
    
    # Add positive examples
    for ex in task.get("positive_examples", []):
        if ex.get("input"):
            parts.append(ex["input"])
        if ex.get("output"):
            parts.append(ex["output"])
        if ex.get("explanation"):
            parts.append(ex["explanation"])
    
    # Add negative examples
    for ex in task.get("negative_examples", []):
        if ex.get("input"):
            parts.append(ex["input"])
        if ex.get("output"):
            parts.append(ex["output"])
        if ex.get("explanation"):
            parts.append(ex["explanation"])
    
    return " ".join(parts)


def main():
    # Load tasks
    print("Loading tasks...")
    with open("processed/tasks_basic.json", "r", encoding="utf-8") as f:
        tasks = json.load(f)
    print(f"Loaded {len(tasks)} tasks")
    
    # Load model
    print("Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # Create texts for embedding
    print("Creating embedding texts...")
    texts = [create_embedding_text(task) for task in tasks]
    
    # Check average text length
    avg_len = sum(len(t) for t in texts) / len(texts)
    print(f"Average text length: {avg_len:.0f} characters")
    
    # Generate embeddings
    print("Generating embeddings (this may take a few minutes)...")
    embeddings = model.encode(texts, show_progress_bar=True)
    
    print(f"Embeddings shape: {embeddings.shape}")
    
    # Save
    np.save("processed/embeddings.npy", embeddings)
    print("Saved embeddings to processed/embeddings.npy")


if __name__ == "__main__":
    main()