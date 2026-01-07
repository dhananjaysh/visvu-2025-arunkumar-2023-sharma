/**
 * LINGO Main Application
 * Handles initialization, data loading, and coordination between panels
 */

document.addEventListener('DOMContentLoaded', function() {
    init();
});

/**
 * Initialize the application
 */
function init() {
    console.log('Initializing LINGO Dashboard...');
    
    // Load tasks data
    fetch(CONFIG.API_BASE + '/tasks')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Server returned ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            if (!data || data.length === 0) {
                throw new Error('No tasks loaded. Run data processing scripts first.');
            }
            
            STATE.tasks = data;
            console.log('Loaded ' + data.length + ' tasks');
            
            // Initialize color scale
            updateColorScale();
            
            // Render initial scatter plot (Panel A)
            renderScatterPlot();
            
            // Show placeholders for other panels
            showPlaceholders();
        })
        .catch(function(error) {
            console.error('Failed to load data:', error);
            showError(error.message);
        });
    
    // Setup UI controls
    setupControls();
}

/**
 * Setup event listeners for UI controls
 */
function setupControls() {
    // Color by selector (Panel A)
    var colorSelect = document.getElementById('color-by-select');
    if (colorSelect) {
        colorSelect.addEventListener('change', function(e) {
            STATE.colorBy = e.target.value;
            updateColorScale();
            renderScatterPlot();
        });
    }
    
    // Link threshold slider (Panel B)
    var linkSlider = document.getElementById('link-threshold');
    var linkValue = document.getElementById('link-threshold-value');
    if (linkSlider) {
        linkSlider.addEventListener('input', function(e) {
            if (linkValue) linkValue.textContent = e.target.value;
        });
        linkSlider.addEventListener('change', function(e) {
            STATE.threshold = parseFloat(e.target.value);
            if (STATE.selectedTaskId !== null) {
                renderNetworkGraph();
            }
        });
    }
    
    // Chord threshold slider (Panel C)
    var chordSlider = document.getElementById('chord-threshold');
    var chordValue = document.getElementById('chord-threshold-value');
    if (chordSlider) {
        chordSlider.addEventListener('input', function(e) {
            if (chordValue) chordValue.textContent = e.target.value;
        });
        chordSlider.addEventListener('change', function(e) {
            STATE.chordThreshold = parseFloat(e.target.value);
            if (STATE.similarTasks.length > 0) {
                renderChordDiagram();
            }
        });
    }
    
    // Comparison tabs
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            STATE.activeTab = e.target.dataset.tab;
            // Update all tab buttons
            document.querySelectorAll('.tab-btn').forEach(function(b) {
                b.classList.remove('active');
                if (b.dataset.tab === STATE.activeTab) {
                    b.classList.add('active');
                }
            });
            updateComparisonBoxes();
        });
    });
    
    // Chord component selector
    var chordComponent = document.getElementById('chord-component-select');
    if (chordComponent) {
        chordComponent.addEventListener('change', function() {
            if (STATE.similarTasks.length > 0) {
                renderChordDiagram();
            }
        });
    }
    
    // Bias metric selector
    var biasMetric = document.getElementById('bias-metric-select');
    if (biasMetric) {
        biasMetric.addEventListener('change', function() {
            if (STATE.similarTasks.length > 0) {
                renderBiasPanel();
            }
        });
    }
    
    // Chord threshold input (Panel C)
    var chordThresholdInput = document.getElementById('chord-threshold-input');
    if (chordThresholdInput) {
        chordThresholdInput.addEventListener('change', function() {
            if (STATE.similarTasks.length > 0) {
                renderChordDiagram();
            }
        });
    }
    
    // Bias component selector
    var biasComponent = document.getElementById('bias-component-select');
    if (biasComponent) {
        biasComponent.addEventListener('change', function() {
            if (STATE.similarTasks.length > 0) {
                renderBiasPanel();
            }
        });
    }
}

/**
 * Select a task and load its similar tasks
 */
function selectTask(taskId) {
    STATE.selectedTaskId = taskId;
    STATE.selectedTask = STATE.tasks.find(function(t) { return t.id === taskId; });
    
    if (!STATE.selectedTask) {
        console.error('Task not found:', taskId);
        return;
    }
    
    console.log('Selected task:', STATE.selectedTask.task_name);
    
    // Update info box
    updateInfoBox(STATE.selectedTask);
    
    // Load similar tasks from API - this includes the selected task with full details
    loadSimilarTasks(taskId);
}

/**
 * Load similar tasks for the selected task
 */
function loadSimilarTasks(taskId) {
    var url = CONFIG.API_BASE + '/similar/' + taskId + '?k=' + CONFIG.DEFAULT_K + '&threshold=0';
    
    fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            STATE.similarTasks = data.similar_tasks || [];
            
            console.log('Similar tasks loaded:', STATE.similarTasks.length);
            
            // IMPORTANT: The /similar endpoint returns the ROOT task with full details
            // Check if the API returned the selected task details
            if (data.root_task && data.root_task.id === STATE.selectedTaskId) {
                // Update selected task with full details including examples
                STATE.selectedTask = data.root_task;
                console.log('Updated selected task with full details from API');
            } else {
                // Fallback: Copy examples from similar tasks if they match
                var matchingTask = STATE.similarTasks.find(function(t) { return t.id === taskId; });
                if (matchingTask && matchingTask.positive_examples) {
                    STATE.selectedTask.positive_examples = matchingTask.positive_examples;
                    STATE.selectedTask.negative_examples = matchingTask.negative_examples;
                    console.log('Copied examples from similar tasks');
                }
            }
            
            console.log('Selected task positive examples:', STATE.selectedTask.positive_examples);
            console.log('Selected task negative examples:', STATE.selectedTask.negative_examples);
            
            if (STATE.similarTasks.length > 0) {
                console.log('First similar task:', STATE.similarTasks[0].task_name);
                console.log('First similar task positive examples:', STATE.similarTasks[0].positive_examples);
            }
            
            // Update Panel A with new colors
            renderScatterPlot();
            
            // Load pairwise similarities for Panel B inter-task links
            return loadPairwiseSimilarities();
        })
        .then(function() {
            // Render Panel B (Network) - this will now have examples
            renderNetworkGraph();
            
            // Render Panel C (Chord)
            if (typeof renderChordDiagram === 'function') {
                renderChordDiagram();
            }
            
            // Render Panel E (Bias Metrics)
            if (typeof renderBiasPanel === 'function') {
                renderBiasPanel();
            }
            
            // Load and render Panel D (Model Results)
            loadModelResults();
        })
        .catch(function(error) {
            console.error('Error loading similar tasks:', error);
        });
}

/**
 * Load pairwise similarities between all selected tasks
 */
function loadPairwiseSimilarities() {
    var allIds = [STATE.selectedTaskId];
    STATE.similarTasks.forEach(function(t) {
        allIds.push(t.id);
    });
    
    return fetch(CONFIG.API_BASE + '/pairwise_similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: allIds })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        STATE.pairwiseSimilarities = data;
    })
    .catch(function(error) {
        console.warn('Could not load pairwise similarities:', error);
        STATE.pairwiseSimilarities = null;
    });
}

/**
 * Load model results for selected tasks
 */
function loadModelResults() {
    var taskIds = [STATE.selectedTaskId];
    STATE.similarTasks.forEach(function(t) {
        taskIds.push(t.id);
    });
    
    console.log('Loading model results for:', taskIds);
    
    fetch(CONFIG.API_BASE + '/model_results_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: taskIds })
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        console.log('Model results received:', data);
        STATE.modelResults = data;
        if (typeof renderBeeswarmPlot === 'function') {
            renderBeeswarmPlot();
        }
    })
    .catch(function(error) {
        console.warn('Could not load model results:', error);
        STATE.modelResults = [];
    });
}

/**
 * Show placeholder messages in panels
 */
function showPlaceholders() {
    var placeholderHTML = '<p class="placeholder" style="text-align:center;padding:60px 20px;color:#999;">Select a task from Panel A</p>';
    
    var panels = ['#network-graph', '#chord-diagram', '#beeswarm-plot', '#heatmap', '#bar-chart'];
    panels.forEach(function(selector) {
        var el = document.querySelector(selector);
        if (el) el.innerHTML = placeholderHTML;
    });
}

/**
 * Show error message new
 */
function showError(message) {
    document.body.innerHTML = '<div style="color:#721c24;background:#f8d7da;padding:20px;margin:20px;border:1px solid #f5c6cb;border-radius:5px;">' +
        '<h3>Error Loading Dashboard</h3>' +
        '<p><strong>' + message + '</strong></p>' +
        '<p>1. Check if Flask backend is running: <a href="http://127.0.0.1:5000/api/tasks">http://127.0.0.1:5000/api/tasks</a></p>' +
        '<p>2. Check browser console (F12) for details.</p>' +
        '</div>';
}