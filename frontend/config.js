/**
 * LINGO Configuration and Shared State
 * Contains global state, constants, and utility functions
 */

var CONFIG = {
    API_BASE: 'http://127.0.0.1:5000/api',
    DEFAULT_K: 9,
    DEFAULT_THRESHOLD: 0.7
};

// Global application state
var STATE = {
    tasks: [],
    selectedTaskId: null,
    selectedTask: null,
    similarTasks: [],
    colorBy: 'category',
    threshold: 0.7,
    chordThreshold: 0.5,
    colorScale: null,
    pairwiseSimilarities: null,
    modelResults: [],
    comparisonTask1: null,
    comparisonTask2: null,
    activeTab: 'definition'
};

// Category color palette (matches LINGO paper style)
var CATEGORY_COLORS = [
    '#9b59b6', '#3498db', '#1abc9c', '#f39c12', '#e74c3c',
    '#2ecc71', '#e91e63', '#00bcd4', '#ff9800', '#795548',
    '#607d8b', '#8bc34a', '#ffeb3b', '#9c27b0', '#03a9f4',
    '#ff5722', '#673ab7', '#4caf50', '#ffc107', '#00bcd4'
];

/**
 * Initialize color scale based on current colorBy field
 */
function updateColorScale() {
    var categories = [];
    STATE.tasks.forEach(function(t) {
        var val = t[STATE.colorBy];
        if (val && categories.indexOf(val) === -1) {
            categories.push(val);
        }
    });
    
    STATE.colorScale = d3.scaleOrdinal()
        .domain(categories)
        .range(CATEGORY_COLORS);
}

/**
 * Blue gradient for similar tasks
 * Rank 0 (T2) = darkest blue, Rank 8 (T10) = lightest blue
 */
function getBlueGradient(rank) {
    var colors = [
        '#1a5276', // T2 - darkest
        '#1f618d', // T3
        '#2471a3', // T4
        '#2980b9', // T5
        '#3498db', // T6
        '#5dade2', // T7
        '#7fb3d5', // T8
        '#a9cce3', // T9
        '#aed6f1'  // T10 - lightest
    ];
    return colors[Math.min(rank, colors.length - 1)];
}

/**
 * Show tooltip at mouse position
 */
function showTooltip(event, content) {
    var tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    
    tooltip.innerHTML = content;
    tooltip.style.left = (event.pageX + 12) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
    tooltip.classList.add('visible');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    var tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Calculate word overlap (Jaccard similarity)
 */
function calculateWordOverlap(text1, text2) {
    if (!text1 || !text2) return 0;
    
    // Tokenize and filter short words
    var words1 = text1.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 2; });
    var words2 = text2.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 2; });
    
    var set1 = new Set(words1);
    var set2 = new Set(words2);
    
    var intersection = 0;
    set1.forEach(function(w) {
        if (set2.has(w)) intersection++;
    });
    
    var union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
}
