"""
Since we don't have actual GPT-3 evaluation results, this script generates
simulated model performance data based on similarity to instruction examples.

The simulation follows the pattern observed in the LINGO paper:
- Higher similarity to examples > higher accuracy
- Some random variation to make it realistic

"""

import json
import os
import numpy as np

PROCESSED_DIR = "processed"
np.random.seed(42)


def load_tasks():
    tasks_path = os.path.join(PROCESSED_DIR, "tasks_processed.json")
    with open(tasks_path, 'r') as f:
        return json.load(f)


def generate_task_instances(task, num_instances=100):
    """
    Generate simulated task instances with similarity scores and accuracy.
    
    - Instances are grouped into similarity bins based on word overlap with examples
    - Higher similarity bins tend to have higher accuracy (instruction bias pattern)
    """
    instances = []
    
    for i in range(num_instances):
        # Generate similarity score (0.0 to 1.0)
        # Use beta distribution to create realistic spread
        similarity = np.random.beta(2, 2)
        
        # Generate accuracy based on similarity
        # Higher similarity -> higher accuracy (with noise)
        # This simulates instruction bias effect
        base_accuracy = 0.3 + (similarity * 0.5)
        noise = np.random.normal(0, 0.1)
        accuracy = np.clip(base_accuracy + noise, 0, 1)
        
        instances.append({
            'instance_id': i,
            'similarity_to_examples': round(similarity, 3),
            'accuracy': round(accuracy, 3)
        })
    
    return instances


def bin_instances(instances, num_bins=20):
    """
    Group instances into similarity bins as done in LINGO.
    Bins: [0.00-0.05], [0.05-0.10], ..., [0.95-1.00]
    """
    bin_edges = np.linspace(0, 1, num_bins + 1)
    binned_data = []
    
    for i in range(num_bins):
        bin_min = bin_edges[i]
        bin_max = bin_edges[i + 1]
        
        bin_instances = [
            inst for inst in instances 
            if bin_min <= inst['similarity_to_examples'] < bin_max
        ]
        
        if bin_instances:
            avg_accuracy = np.mean([inst['accuracy'] for inst in bin_instances])
            binned_data.append({
                'bin_min': round(bin_min, 2),
                'bin_max': round(bin_max, 2),
                'bin_label': f"{bin_min:.2f}-{bin_max:.2f}",
                'count': len(bin_instances),
                'avg_accuracy': round(avg_accuracy, 3)
            })
    
    return binned_data


def generate_model_results(tasks):
    """Generate model performance data for all tasks."""
    results = []
    
    for task in tasks:
        instances = generate_task_instances(task)
        binned = bin_instances(instances)
        
        # Calculate overall accuracy
        all_accuracies = [inst['accuracy'] for inst in instances]
        overall_accuracy = np.mean(all_accuracies)
        
        results.append({
            'task_id': task['id'],
            'task_name': task['task_name'],
            'category': task['category'],
            'overall_accuracy': round(overall_accuracy, 3),
            'num_instances': len(instances),
            'binned_results': binned,
            'instances': instances
        })
    
    return results


def save_results(results, output_dir):
    """Save model results to JSON."""
    output_path = os.path.join(output_dir, 'model_results.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Saved model results for {len(results)} tasks")


def main():
    print("Loading tasks...")
    tasks = load_tasks()
    
    print("Generating model performance data...")
    results = generate_model_results(tasks)
    
    print("Saving results...")
    save_results(results, PROCESSED_DIR)
    
    print("Done.")


if __name__ == "__main__":
    main()