/**
 * LINGO Main Application
 * Handles initialization, data loading, and coordination between panels
 */

// Global state object
const STATE = {
    tasks: [],
    allTasks: [],
    selectedTask: null,
    selectedTaskId: null,
    similarTasks: [],
    coords3d: [],
    embeddings: [],
    similarities: {},
    modelResults: {},
    taskMetrics: {},
    threshold: 0.7,
    chordThreshold: 0.6,
    colorBy: 'category',
    activeTab: 'definition',
    pairwiseSimilarities: null
};

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing LINGO Dashboard...');
    
    try {
        // Load all data from Google Drive
        const data = await loadAllData();
        
        // Handle both array and object formats for tasks
        if (Array.isArray(data.tasks)) {
            STATE.tasks = data.tasks;
        } else if (typeof data.tasks === 'object') {
            STATE.tasks = Object.values(data.tasks);
        } else {
            throw new Error('Invalid tasks data format');
        }
        
        STATE.allTasks = STATE.tasks;
        STATE.coords3d = data.coords;
        STATE.embeddings = data.embeddings;
        STATE.similarities = data.similarities;
        STATE.modelResults = data.modelResults;
        STATE.taskMetrics = data.taskMetrics;
        
        console.log(`Loaded ${STATE.tasks.length} tasks`);
        
        if (STATE.tasks.length === 0) {
            throw new Error('No tasks loaded from Google Drive');
        }
        
        // Initialize color scale
        updateColorScale();
        
        // Render initial scatter plot (Panel A)
        renderScatterPlot();
        
        // Show placeholders for other panels
        showPlaceholders();
        
        // Setup UI controls
        setupControls();
        
        console.log('LINGO Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Initialization failed:', error);
        showError('Failed to load data from Google Drive: ' + error.message);
    }
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
    
    // Load similar tasks from similarity data
    loadSimilarTasks(taskId);
}

/**
 * Load similar tasks for the selected task
 */
function loadSimilarTasks(taskId) {
    // Get similarities from loaded data
    var taskSims = STATE.similarities[taskId] || {};
    
    // Sort by similarity and take top K
    var simPairs = [];
    for (var otherTaskId in taskSims) {
        if (otherTaskId !== taskId) {
            simPairs.push({
                id: otherTaskId,
                similarity: taskSims[otherTaskId]
            });
        }
    }
    
    simPairs.sort(function(a, b) { return b.similarity - a.similarity; });
    var topK = simPairs.slice(0, 9); // Get top 9 similar tasks
    
    // Get full task objects
    STATE.similarTasks = topK.map(function(pair) {
        var task = STATE.tasks.find(function(t) { return t.id === pair.id; });
        if (task) {
            task.similarity = pair.similarity;
        }
        return task;
    }).filter(function(t) { return t !== undefined; });
    
    console.log('Similar tasks loaded:', STATE.similarTasks.length);
    
    if (STATE.similarTasks.length > 0) {
        console.log('First similar task:', STATE.similarTasks[0].task_name);
    }
    
    // Calculate pairwise similarities
    STATE.pairwiseSimilarities = {};
    var allTaskIds = [STATE.selectedTaskId].concat(STATE.similarTasks.map(function(t) { return t.id; }));
    
    allTaskIds.forEach(function(id1) {
        if (!STATE.pairwiseSimilarities[id1]) {
            STATE.pairwiseSimilarities[id1] = {};
        }
        allTaskIds.forEach(function(id2) {
            if (STATE.similarities[id1] && STATE.similarities[id1][id2]) {
                STATE.pairwiseSimilarities[id1][id2] = STATE.similarities[id1][id2];
            }
        });
    });
    
    // Update Panel A with new colors
    renderScatterPlot();
    
    // Render Panel B (Network)
    renderNetworkGraph();
    
    // Render Panel C (Chord)
    if (typeof renderChordDiagram === 'function') {
        renderChordDiagram();
    }
    
    // Render Panel E (Bias Metrics)
    if (typeof renderBiasPanel === 'function') {
        renderBiasPanel();
    }
    
    // Render Panel D (Model Results)
    if (typeof renderBeeswarmPlot === 'function') {
        renderBeeswarmPlot();
    }
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
 * Show error message
 */
function showError(message) {
    hideLoading();
    document.body.innerHTML = '<div style="color:#721c24;background:#f8d7da;padding:20px;margin:20px;border:1px solid #f5c6cb;border-radius:5px;">' +
        '<h3>Error Loading Dashboard</h3>' +
        '<p><strong>' + message + '</strong></p>' +
        '<p>Please check browser console (F12) for details.</p>' +
        '<p>Try refreshing the page or clearing browser cache.</p>' +
        '</div>';
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);