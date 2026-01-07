"""
Flask Backend for LINGO Visualization
Serves task data, similarities, and model results via REST API.
"""

import json
import os
import math
import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Setup Flask
app = Flask(__name__, static_folder='../frontend')
CORS(app)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
PROCESSED_DIR = os.path.join(PROJECT_ROOT, "processed")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

# Data storage
tasks_data = []
embeddings = None
similarities = []
model_results = []


class NpEncoder(json.JSONEncoder):
    """Custom encoder for NumPy data types"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)


def sanitize_obj(obj):
    """Replace NaN/Infinity with None, convert NumPy types"""
    if isinstance(obj, (np.generic, np.ndarray)):
        if isinstance(obj, np.generic):
            return sanitize_obj(obj.item())
        return [sanitize_obj(x) for x in obj.tolist()]
    
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_obj(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_obj(v) for v in obj]
    return obj


def load_data():
    """Load all data files on startup"""
    global tasks_data, embeddings, similarities, model_results
    
    print(f"Loading data from: {PROCESSED_DIR}")
    
    # 1. Load Tasks
    tasks_path = os.path.join(PROCESSED_DIR, "tasks_basic.json")
    if os.path.exists(tasks_path):
        with open(tasks_path, 'r', encoding='utf-8') as f:
            tasks_data = json.load(f)
        print(f" - Loaded {len(tasks_data)} tasks")
    else:
        print("WARNING: tasks_basic.json not found")
        tasks_data = []
    
    # 2. Load and merge 3D coordinates
    coords_path = os.path.join(PROCESSED_DIR, "coords_3d.npy")
    if os.path.exists(coords_path):
        coords = np.load(coords_path)
        print(f" - Loaded 3D coords: {coords.shape}")
        for i, task in enumerate(tasks_data):
            if i < len(coords):
                task['x'] = float(coords[i, 0])
                task['y'] = float(coords[i, 1])
                task['z'] = float(coords[i, 2])
    else:
        print("WARNING: coords_3d.npy not found")
    
    # 3. Load embeddings
    emb_path = os.path.join(PROCESSED_DIR, "embeddings.npy")
    if os.path.exists(emb_path):
        embeddings = np.load(emb_path)
        print(f" - Loaded embeddings: {embeddings.shape}")
    
    # 4. Load similarities
    sim_path = os.path.join(PROCESSED_DIR, "similarities.json")
    if os.path.exists(sim_path):
        with open(sim_path, 'r', encoding='utf-8') as f:
            similarities = json.load(f)
        print(f" - Loaded similarities for {len(similarities)} tasks")
    
    # 5. Load model results
    results_path = os.path.join(PROCESSED_DIR, "model_results.json")
    if os.path.exists(results_path):
        with open(results_path, 'r', encoding='utf-8') as f:
            model_results = json.load(f)
        print(f" - Loaded model results for {len(model_results)} tasks")


# ============================================
# API Routes
# ============================================

@app.route('/')
def index():
    """Serve frontend"""
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory(FRONTEND_DIR, filename)


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    Get all tasks (lightweight - excludes instances for performance).
    Returns: id, task_name, category, source_dataset, domain, x, y, z, definition
    """
    summary = []
    for t in tasks_data:
        summary.append({
            'id': t.get('id'),
            'task_name': t.get('task_name'),
            'category': t.get('category'),
            'source_dataset': t.get('source_dataset'),
            'domain': t.get('domain', t.get('category')),
            'x': t.get('x', 0.0),
            'y': t.get('y', 0.0),
            'z': t.get('z', 0.0),
            'definition': t.get('definition', '')[:300]
        })
    
    return json.dumps(sanitize_obj(summary), cls=NpEncoder), 200, {'Content-Type': 'application/json'}


@app.route('/api/task/<int:task_id>', methods=['GET'])
def get_task_detail(task_id):
    """Get full details for a single task including examples and instances"""
    task = next((t for t in tasks_data if t.get('id') == task_id), None)
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    return json.dumps(sanitize_obj(task), cls=NpEncoder), 200, {'Content-Type': 'application/json'}


@app.route('/api/similar/<int:task_id>', methods=['GET'])
def get_similar_tasks(task_id):
    """
    Get similar tasks for a given task.
    Query params:
      - k: number of similar tasks (default 9)
      - threshold: minimum similarity (default 0)
    """
    k = request.args.get('k', default=9, type=int)
    threshold = request.args.get('threshold', default=0.0, type=float)
    
    # Find similarity record for this task
    sim_record = next((s for s in similarities if s.get('task_id') == task_id), None)
    
    if not sim_record:
        return jsonify({
            'root_task': None,
            'similar_tasks': []
        })
    
    # Get root task (full data)
    root_task = next((t for t in tasks_data if t.get('id') == task_id), None)
    
    # Filter and get top k similar tasks
    neighbors = []
    for n in sim_record.get('similar_tasks', []):
        if n['similarity'] >= threshold:
            neighbors.append(n)
        if len(neighbors) >= k:
            break
    
    # Hydrate neighbor data (include full task info)
    hydrated = []
    for n in neighbors:
        task = next((t for t in tasks_data if t.get('id') == n['id']), None)
        if task:
            task_copy = task.copy()
            task_copy['similarity'] = n['similarity']
            hydrated.append(task_copy)
    
    result = {
        'root_task': root_task,
        'similar_tasks': hydrated
    }
    
    return json.dumps(sanitize_obj(result), cls=NpEncoder), 200, {'Content-Type': 'application/json'}


@app.route('/api/pairwise_similarity', methods=['POST'])
def get_pairwise_similarity():
    """
    Compute pairwise similarities between a list of task IDs.
    Used for inter-task links in Panel B.
    """
    data = request.get_json()
    task_ids = data.get('task_ids', [])
    
    if embeddings is None or len(task_ids) < 2:
        return jsonify({'task_ids': task_ids, 'matrix': []})
    
    # Get embeddings for these tasks
    emb_list = []
    valid_ids = []
    
    for tid in task_ids:
        if tid < len(embeddings):
            emb_list.append(embeddings[tid])
            valid_ids.append(tid)
    
    if len(emb_list) < 2:
        return jsonify({'task_ids': valid_ids, 'matrix': []})
    
    # Compute pairwise cosine similarities
    emb_array = np.array(emb_list)
    
    # Normalize embeddings
    norms = np.linalg.norm(emb_array, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = emb_array / norms
    
    # Compute similarity matrix
    sim_matrix = np.dot(normalized, normalized.T)
    
    result = {
        'task_ids': valid_ids,
        'matrix': sim_matrix.tolist()
    }
    
    return json.dumps(sanitize_obj(result), cls=NpEncoder), 200, {'Content-Type': 'application/json'}


@app.route('/api/model_results/<int:task_id>', methods=['GET'])
def get_model_results(task_id):
    """Get model results for a single task"""
    result = next((r for r in model_results if r.get('task_id') == task_id), None)
    
    if not result:
        # Return simulated results if not available
        result = generate_simulated_results(task_id)
    
    return json.dumps(sanitize_obj(result), cls=NpEncoder), 200, {'Content-Type': 'application/json'}


@app.route('/api/model_results_batch', methods=['POST'])
def get_model_results_batch():
    """Get model results for multiple tasks"""
    data = request.get_json()
    task_ids = data.get('task_ids', [])
    
    results = []
    for tid in task_ids:
        result = next((r for r in model_results if r.get('task_id') == tid), None)
        if result:
            results.append(result)
        else:
            results.append(generate_simulated_results(tid))
    
    return json.dumps(sanitize_obj(results), cls=NpEncoder), 200, {'Content-Type': 'application/json'}


def generate_simulated_results(task_id):
    """Generate simulated model results when real data not available"""
    import random
    random.seed(task_id)
    
    bins = []
    for i in range(20):
        low = i * 0.05
        high = (i + 1) * 0.05
        
        # Simulate: higher similarity bins have higher accuracy
        base_acc = 0.15 + (low * 0.6)
        acc = max(0.05, min(0.95, base_acc + random.gauss(0, 0.08)))
        
        # More instances in middle bins
        count = int(50 + 100 * (1 - abs(0.5 - low) * 2) + random.randint(-20, 20))
        count = max(5, count)
        
        bins.append({
            'sim_range': [round(low, 2), round(high, 2)],
            'accuracy': round(acc, 3),
            'num_instances': count
        })
    
    overall = sum(b['accuracy'] * b['num_instances'] for b in bins) / sum(b['num_instances'] for b in bins)
    
    return {
        'task_id': task_id,
        'overall_accuracy': round(overall, 3),
        'bins': bins
    }


# ============================================
# Main
# ============================================

if __name__ == '__main__':
    load_data()
    print("\n" + "=" * 50)
    print("LINGO Backend Server")
    print("=" * 50)
    print(f"Frontend: http://127.0.0.1:5000")
    print(f"API Base: http://127.0.0.1:5000/api")
    print("=" * 50 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)
