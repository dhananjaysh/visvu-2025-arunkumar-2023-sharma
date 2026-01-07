"""
Script 01: Explore Dataset Structure
=====================================
This script loads tasks_unique.json and explores its structure.
Run this first to understand what data we're working with.

Usage: python scripts/01_explore_dataset.py
"""

import json
import os
DATA_PATH = "data/full_dataset/tasks_unique.json"

def load_dataset(path):
    """Load the JSON dataset."""
    print(f"Loading dataset from: {path}")
    
    if not os.path.exists(path):
        print(f"ERROR: File not found at {path}")
        print("Make sure tasks_unique.json is in data/full_dataset/")
        return None
    
    file_size = os.path.getsize(path) / (1024 * 1024)  # mb
    print(f"File size: {file_size:.2f} MB")
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data

def explore_structure(data):
    """Explore the structure of the dataset."""
    print("\n" + "="*50)
    print("DATASET STRUCTURE EXPLORATION")
    print("="*50)
    
    # Check if it's a dict or list
    print(f"\nTop-level type: {type(data).__name__}")
    
    if isinstance(data, dict):
        print(f"Number of keys: {len(data)}")
        print(f"\nFirst 5 keys:")
        keys = list(data.keys())[:5]
        for key in keys:
            print(f"  - {key}")
        
        # Explore first task
        first_key = list(data.keys())[0]
        first_task = data[first_key]
        print(f"\n--- Exploring first task: '{first_key}' ---")
        explore_task(first_task, first_key)
        
    elif isinstance(data, list):
        print(f"Number of items: {len(data)}")
        if len(data) > 0:
            print(f"\nFirst item type: {type(data[0]).__name__}")
            explore_task(data[0], "item_0")

def explore_task(task, task_name):
    """Explore a single task's structure."""
    print(f"\nTask structure for '{task_name}':")
    print(f"  Type: {type(task).__name__}")
    
    if isinstance(task, dict):
        print(f"  Fields ({len(task)}):")
        for key, value in task.items():
            val_type = type(value).__name__
            if isinstance(value, str):
                preview = value[:80] + "..." if len(value) > 80 else value
                print(f"    - {key}: ({val_type}) \"{preview}\"")
            elif isinstance(value, list):
                print(f"    - {key}: ({val_type}) [{len(value)} items]")
                if len(value) > 0:
                    print(f"        First item type: {type(value[0]).__name__}")
                    if isinstance(value[0], dict):
                        print(f"        First item keys: {list(value[0].keys())}")
            elif isinstance(value, dict):
                print(f"    - {key}: ({val_type}) {{{len(value)} keys}}")
                print(f"        Keys: {list(value.keys())[:5]}")
            else:
                print(f"    - {key}: ({val_type}) {value}")

def get_sample_tasks(data, n=3):
    """Get sample tasks for inspection."""
    print("\n" + "="*50)
    print(f"SAMPLE TASKS (first {n})")
    print("="*50)
    
    if isinstance(data, dict):
        keys = list(data.keys())[:n]
        for i, key in enumerate(keys):
            print(f"\n--- Task {i+1}: {key} ---")
            task = data[key]
            if isinstance(task, dict):
                # Print definition if exists
                if 'Definition' in task:
                    defn = task['Definition']
                    if isinstance(defn, list):
                        defn = defn[0] if defn else ""
                    print(f"Definition: {defn[:200]}...")
                elif 'definition' in task:
                    defn = task['definition']
                    if isinstance(defn, list):
                        defn = defn[0] if defn else ""
                    print(f"Definition: {defn[:200]}...")

def count_categories(data):
    """Count task categories if available."""
    print("\n" + "="*50)
    print("CATEGORY DISTRIBUTION")
    print("="*50)
    
    categories = {}
    
    if isinstance(data, dict):
        for key, task in data.items():
            if isinstance(task, dict):
                # Try different possible field names
                cat = task.get('Categories', task.get('categories', 
                      task.get('Category', task.get('category', 'Unknown'))))
                
                if isinstance(cat, list):
                    for c in cat:
                        categories[c] = categories.get(c, 0) + 1
                else:
                    categories[cat] = categories.get(cat, 0) + 1
    
    if categories:
        print(f"\nFound {len(categories)} unique categories:")
        sorted_cats = sorted(categories.items(), key=lambda x: -x[1])[:15]
        for cat, count in sorted_cats:
            print(f"  {cat}: {count} tasks")
    else:
        print("No category field found in tasks")

def main():
    data = load_dataset(DATA_PATH)
    
    if data is None:
        return
    
    explore_structure(data)
    
    get_sample_tasks(data, n=3)

    count_categories(data)

    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    if isinstance(data, dict):
        print(f"Total tasks: {len(data)}")
    elif isinstance(data, list):
        print(f"Total tasks: {len(data)}")
    
    print("\nNext step: Run 02_process_tasks.py to extract and structure the data")

if __name__ == "__main__":
    main()