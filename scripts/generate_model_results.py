"""
Step 6: Generate mock model results for visualization.
Creates simulated GPT-3 performance data for the beeswarm plot.

Usage: python generate_model_results.py
Input: processed/tasks_processed.json
Output: processed/model_results.json
"""

import json
import numpy as np

def main():
    # Load tasks
    print("Loading tasks...")
    with open("processed/tasks_processed.json", "r", encoding="utf-8") as f:
        tasks = json.load(f)
    print(f"Loaded {len(tasks)} tasks")
    
    # Generate mock results
    print("Generating mock model results...")
    np.random.seed(42)
    
    results = []
    for task in tasks:
        # Create bins based on similarity to examples
        # Each bin represents instances grouped by word similarity to instruction examples
        bins = []
        
        for bin_idx in range(20):
            sim_low = bin_idx * 0.05
            sim_high = (bin_idx + 1) * 0.05
            
            # Higher similarity bins tend to have higher accuracy (simulating bias)
            # This matches the paper's finding about instruction bias
            base_accuracy = 0.2 + (bin_idx / 20) * 0.6
            accuracy = base_accuracy + np.random.normal(0, 0.08)
            accuracy = max(0, min(1, accuracy))
            
            # Random number of instances in each bin
            # More instances in middle bins, fewer at extremes
            if bin_idx < 5:
                num_instances = np.random.randint(5, 40)
            elif bin_idx < 15:
                num_instances = np.random.randint(20, 100)
            else:
                num_instances = np.random.randint(10, 60)
            
            bins.append({
                "sim_range": [round(sim_low, 2), round(sim_high, 2)],
                "accuracy": round(accuracy, 3),
                "num_instances": int(num_instances)
            })
        
        # Overall accuracy
        total_instances = sum(b["num_instances"] for b in bins)
        overall_accuracy = sum(b["accuracy"] * b["num_instances"] for b in bins) / total_instances
        
        results.append({
            "task_id": task["id"],
            "task_name": task["task_name"],
            "overall_accuracy": round(overall_accuracy, 3),
            "bins": bins
        })
    
    # Save
    print("Saving model_results.json...")
    with open("processed/model_results.json", "w") as f:
        json.dump(results, f)
    
    print(f"Saved model results for {len(results)} tasks")
    
    # Sample output
    print(f"\nSample - Task 0 results:")
    print(f"  Overall accuracy: {results[0]['overall_accuracy']}")
    print(f"  Bins with data: {len([b for b in results[0]['bins'] if b['num_instances'] > 0])}")


if __name__ == "__main__":
    main()