"""
Parse all task JSON files and extract relevant fields.
Run this from your project root where data/natural-instructions/tasks/ exists.

Usage: python process_tasks.py
Output: processed/tasks_basic.json
"""

import os
import json
from pathlib import Path

def parse_task_file(filepath):
    """Parse a single task JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    task_name = Path(filepath).stem
    
    # Definition - can be string or list
    definition = data.get("Definition", [""])
    if isinstance(definition, list):
        definition = " ".join(definition)
    
    # Categories
    categories = data.get("Categories", ["Unknown"])
    category = categories[0] if categories else "Unknown"
    
    # Domains
    domains = data.get("Domains", ["Unknown"])
    domain = domains[0] if domains else "Unknown"
    
    # Source
    source = data.get("Source", ["Unknown"])
    if isinstance(source, list):
        source = source[0] if source else "Unknown"
    
    # Positive examples
    positive_examples = []
    for ex in data.get("Positive Examples", []):
        positive_examples.append({
            "input": ex.get("input", ""),
            "output": ex.get("output", ""),
            "explanation": ex.get("explanation", "")
        })
    
    # Negative examples
    negative_examples = []
    for ex in data.get("Negative Examples", []):
        negative_examples.append({
            "input": ex.get("input", ""),
            "output": ex.get("output", ""),
            "explanation": ex.get("explanation", "")
        })
    
    # Instances
    
    # strip 'id' to save space, keeping only input/output needed for similarity metrics.
    instances = []
    raw_instances = data.get("Instances", [])
    # Used 1000 is a safe balance between the paper's 6.5k and memory constraints
    limit = 1000 
    
    for inst in raw_instances[:limit]:
        instances.append({
            "input": inst.get("input", ""),
            "output": inst.get("output", [])
        })
    
    # Language
    input_lang = data.get("Input_language", ["English"])
    input_lang = input_lang[0] if input_lang else "English"
    
    return {
        "task_name": task_name,
        "definition": definition,
        "category": category,
        "domain": domain,
        "source_dataset": source,
        "input_language": input_lang,
        "positive_examples": positive_examples,
        "negative_examples": negative_examples,
        "instances": instances,
        "num_instances": len(raw_instances) # Keep track of total available
    }

def main():
    # Path to tasks folder - adjust if needed
    tasks_dir = "data/tasks"
    output_dir = "processed"
    
    if not os.path.exists(tasks_dir):
        # Try alternative path
        tasks_dir = "natural-instructions-master/tasks"
    
    if not os.path.exists(tasks_dir):
        return
    
    os.makedirs(output_dir, exist_ok=True)
    
    task_files = sorted(Path(tasks_dir).glob("task*.json"))
    
    tasks = []
    for i, filepath in enumerate(task_files):
        if (i + 1) % 200 == 0:
            print(f"Processing {i + 1}/{len(task_files)}...")
        
        try:
            task = parse_task_file(str(filepath))
            task["id"] = i
            tasks.append(task)
        except Exception as e:
            print(f"Error parsing {filepath.name}: {e}")
    
    # Save
    output_path = os.path.join(output_dir, "tasks_basic.json")
    print(f"Saving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()