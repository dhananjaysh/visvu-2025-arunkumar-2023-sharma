"""
Step 5: Combine all processed data into final format.
Creates the final tasks_processed.json with all fields needed for visualization.

Usage: python create_final_data.py
Input: processed/tasks_basic.json, processed/coords_3d.npy, processed/similarities.json
Output: processed/tasks_processed.json, processed/categories.json, processed/summary.json
"""

import json
import numpy as np

def main():
    # Load all data
    print("Loading tasks...")
    with open("processed/tasks_basic.json", "r", encoding="utf-8") as f:
        tasks = json.load(f)
    print(f"Loaded {len(tasks)} tasks")
    
    print("Loading 3D coordinates...")
    coords_3d = np.load("processed/coords_3d.npy")
    print(f"Coordinates shape: {coords_3d.shape}")
    
    print("Loading similarities...")
    with open("processed/similarities.json", "r") as f:
        similarities = json.load(f)
    print(f"Loaded similarities for {len(similarities)} tasks")
    
    # Add 3D coordinates to tasks
    print("Adding coordinates to tasks...")
    for i, task in enumerate(tasks):
        task["x"] = float(coords_3d[i, 0])
        task["y"] = float(coords_3d[i, 1])
        task["z"] = float(coords_3d[i, 2])
    
    # Save final tasks
    print("Saving tasks_processed.json...")
    with open("processed/tasks_processed.json", "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2, ensure_ascii=False)
    
    # Extract and save categories
    categories = sorted(list(set(task["category"] for task in tasks)))
    print(f"Found {len(categories)} unique categories")
    with open("processed/categories.json", "w") as f:
        json.dump(categories, f, indent=2)
    
    # Extract domains
    domains = sorted(list(set(task["domain"] for task in tasks)))
    
    # Extract source datasets
    sources = sorted(list(set(task["source_dataset"] for task in tasks)))
    
    # Create summary
    summary = {
        "num_tasks": len(tasks),
        "num_categories": len(categories),
        "num_domains": len(domains),
        "num_sources": len(sources),
        "categories": categories,
        "domains": domains,
        "sources": sources
    }
    
    print("Saving summary.json...")
    with open("processed/summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print("\n" + "=" * 50)
    print("Done! Final files created:")
    print("  - processed/tasks_processed.json")
    print("  - processed/categories.json")
    print("  - processed/summary.json")
    print("=" * 50)
    print(f"\nSummary:")
    print(f"  Tasks: {len(tasks)}")
    print(f"  Categories: {len(categories)}")
    print(f"  Domains: {len(domains)}")
    print(f"  Source datasets: {len(sources)}")


if __name__ == "__main__":
    main()