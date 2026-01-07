/**
 * Panel B: Correlation (Node-Link Diagram)
 * 
 * Shows similarity network between T1 (root) and similar tasks.
 * - ONLY links from T1 to other tasks (no inter-task links)
 * - Nodes are NOT draggable
 * - T1 = RED (top), T2-T10 = BLUE gradient (below)
 * - Only shows tasks above threshold
 */

/**
 * Main render function for the network graph
 */
function renderNetworkGraph() {
    var container = d3.select('#network-graph');
    container.selectAll('*').remove();
    
    if (!STATE.selectedTask || !STATE.similarTasks || STATE.similarTasks.length === 0) {
        container.append('p')
            .attr('class', 'placeholder')
            .style('text-align', 'center')
            .style('padding', '80px 20px')
            .style('color', '#999')
            .text('Select a task from Panel A');
        return;
    }
    
    var width = container.node().clientWidth;
    var height = container.node().clientHeight;
    
    var svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    var g = svg.append('g');
    
    // Filter tasks above threshold first
    var tasksAboveThreshold = STATE.similarTasks.filter(function(task) {
        return task.similarity >= STATE.threshold;
    });
    
    // If no tasks above threshold, show message
    if (tasksAboveThreshold.length === 0) {
        container.selectAll('*').remove();
        container.append('p')
            .attr('class', 'placeholder')
            .style('text-align', 'center')
            .style('padding', '80px 20px')
            .style('color', '#999')
            .text('No tasks above threshold (' + STATE.threshold.toFixed(2) + '). Try lowering it.');
        return;
    }
    
    // Build nodes array: T1 (root) + tasks above threshold
    var nodes = [];
    
    // T1 - root task
    nodes.push({
        id: STATE.selectedTask.id,
        label: 'T1',
        task: STATE.selectedTask,
        isRoot: true,
        rank: -1,
        similarity: 1.0
    });
    
    // Only add tasks above threshold, but keep original index for label
    tasksAboveThreshold.forEach(function(task) {
        var originalIdx = STATE.similarTasks.findIndex(function(t) { return t.id === task.id; });
        nodes.push({
            id: task.id,
            label: 'T' + (originalIdx + 2),
            task: task,
            isRoot: false,
            rank: originalIdx,
            similarity: task.similarity
        });
    });
    
    // Build links - ONLY from T1 to each similar task
    var links = [];
    tasksAboveThreshold.forEach(function(task) {
        var originalIdx = STATE.similarTasks.findIndex(function(t) { return t.id === task.id; });
        links.push({
            source: STATE.selectedTask.id,
            target: task.id,
            similarity: task.similarity,
            sourceLabel: 'T1',
            targetLabel: 'T' + (originalIdx + 2)
        });
    });
    
    // Circular layout - T1 in center, similar tasks in circle based on similarity
    var centerX = width / 2;
    var centerY = height / 2;
    var nonRootNodes = nodes.filter(function(n) { return !n.isRoot; });
    var numNonRoot = nonRootNodes.length;

    // Calculate radius based on similarity (closer = more similar)
    var baseRadius = Math.min(width, height) * 0.35;

    nodes.forEach(function(node) {
        if (node.isRoot) {
            // T1 in center
            node.x = centerX;
            node.y = centerY;
        } else {
            // Similar tasks arranged in circle
            // Similarity affects distance from center
            var idx = nonRootNodes.indexOf(node);
            var angle = (idx / numNonRoot) * 2 * Math.PI - Math.PI / 2; // Start from top
            
            // Distance based on similarity: high similarity = closer to center
            // Similarity ranges from STATE.threshold to 1.0
            var normalizedSim = (node.similarity - STATE.threshold) / (1.0 - STATE.threshold);
            var distanceFactor = 1.0 - (normalizedSim * 0.4); // 0.6 to 1.0 range
            var radius = baseRadius * distanceFactor;
            
            node.x = centerX + Math.cos(angle) * radius;
            node.y = centerY + Math.sin(angle) * radius;
        }
    });
    
    // Create node map for link drawing
    var nodeMap = {};
    nodes.forEach(function(n) { nodeMap[n.id] = n; });
    
    // Draw links
    var linkSelection = g.selectAll('.network-link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'network-link')
        .attr('x1', function(d) { return nodeMap[d.source].x; })
        .attr('y1', function(d) { return nodeMap[d.source].y; })
        .attr('x2', function(d) { return nodeMap[d.target].x; })
        .attr('y2', function(d) { return nodeMap[d.target].y; })
        .attr('stroke', '#999')
        .attr('stroke-width', function(d) {
            // Higher similarity = thicker line
            var normalizedSim = (d.similarity - STATE.threshold) / (1.0 - STATE.threshold);
            return 1.5 + normalizedSim * 4; // Range: 1.5px to 5.5px
        })
        .attr('stroke-opacity', 0.6);
    
    // Invisible wider lines for easier clicking
    g.selectAll('.network-link-click')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'network-link-click')
        .attr('x1', function(d) { return nodeMap[d.source].x; })
        .attr('y1', function(d) { return nodeMap[d.source].y; })
        .attr('x2', function(d) { return nodeMap[d.target].x; })
        .attr('y2', function(d) { return nodeMap[d.target].y; })
        .attr('stroke', 'transparent')
        .attr('stroke-width', 15)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            linkSelection.filter(function(l) { return l === d; })
                .attr('stroke', '#e74c3c')
                .attr('stroke-opacity', 1);
            
            var content = '<strong>' + d.sourceLabel + ' ↔ ' + d.targetLabel + '</strong>';
            content += '<br>Similarity: ' + d.similarity.toFixed(3);
            showTooltip(event, content);
        })
        .on('mouseout', function(event, d) {
            linkSelection.filter(function(l) { return l === d; })
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6);
            hideTooltip();
        })
        .on('click', function(event, d) {
            event.stopPropagation();
            STATE.comparisonTask1 = nodeMap[d.source].task;
            STATE.comparisonTask2 = nodeMap[d.target].task;
            updateComparisonBoxes();
        });
    
    // Draw nodes (NOT draggable)
    var nodeSelection = g.selectAll('.network-node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'network-node')
        .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
        .attr('cursor', 'pointer');
    
    // Node circles
    nodeSelection.append('circle')
        .attr('r', function(d) { return d.isRoot ? 18 : 14; })
        .attr('fill', function(d) {
            if (d.isRoot) return '#e74c3c';
            return getBlueGradient(d.rank);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
    
    // Node labels
    nodeSelection.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', '#fff')
        .attr('font-size', function(d) { return d.isRoot ? '12px' : '10px'; })
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(function(d) { return d.label; });
    
    // Node interactions
    nodeSelection
        .on('mouseover', function(event, d) {
            d3.select(this).select('circle')
                .attr('stroke', '#333')
                .attr('stroke-width', 3);
            
            var content = '<strong>' + d.label + '</strong>: ' + truncateText(d.task.task_name, 35);
            if (!d.isRoot) {
                content += '<br>Similarity to T1: ' + d.similarity.toFixed(3);
            }
            content += '<br>Category: ' + d.task.category;
            showTooltip(event, content);
        })
        .on('mouseout', function(event, d) {
            d3.select(this).select('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
            hideTooltip();
        })
        .on('click', function(event, d) {
            event.stopPropagation();
            if (d.isRoot) {
                STATE.comparisonTask1 = d.task;
            } else {
                STATE.comparisonTask1 = STATE.selectedTask;
                STATE.comparisonTask2 = d.task;
            }
            updateComparisonBoxes();
        });
    
    // Initialize comparison boxes with T1 and first task above threshold
    STATE.comparisonTask1 = STATE.selectedTask;
    if (tasksAboveThreshold.length > 0) {
        STATE.comparisonTask2 = tasksAboveThreshold[0];
    }
    updateComparisonBoxes();
}

/**
 * Update comparison text boxes
 */
function updateComparisonBoxes() {
    updateComparisonBox('comparison-content-1', STATE.comparisonTask1);
    updateComparisonBox('comparison-content-2', STATE.comparisonTask2);
}

function updateComparisonBox(elementId, task) {
    var container = document.getElementById(elementId);
    if (!container) return;
    
    if (!task) {
        container.innerHTML = '<p class="placeholder" style="color:#999;text-align:center;padding:20px;">Click a node or link</p>';
        return;
    }
    
    console.log('Task:', task.task_name);
    console.log('Positive examples:', task.positive_examples);
    console.log('Negative examples:', task.negative_examples);


    var label = getTaskLabel(task);
    var color = getTaskColor(task);
    
    var html = '<div style="border-left:4px solid ' + color + ';padding-left:8px;margin-bottom:8px;">';
    html += '<div style="font-weight:bold;color:' + color + ';font-size:13px;">' + label + '</div>';
    html += '<div style="font-size:11px;color:#666;">' + truncateText(task.task_name, 40) + '</div>';
    html += '</div>';
    
    var activeTab = STATE.activeTab || 'definition';
    
    if (activeTab === 'definition') {
        html += '<div style="font-size:11px;line-height:1.5;max-height:150px;overflow-y:auto;">';
        html += task.definition || 'No definition available';
        html += '</div>';
    } else if (activeTab === 'positive') {
        // Check for positive_examples
        var positiveExamples = task.positive_examples || [];
        if (positiveExamples.length > 0) {
            html += renderExamples(positiveExamples, '#4caf50');
        } else {
            html += '<p style="color:#999;font-size:11px;padding:10px;">No positive examples available</p>';
        }
    } else if (activeTab === 'negative') {
        // Check for negative_examples
        var negativeExamples = task.negative_examples || [];
        if (negativeExamples.length > 0) {
            html += renderExamples(negativeExamples, '#f44336');
        } else {
            html += '<p style="color:#999;font-size:11px;padding:10px;">No negative examples available</p>';
        }
    }
    
    container.innerHTML = html;
}

function renderExamples(examples, borderColor) {
    if (!examples || examples.length === 0) {
        return '<p style="color:#999;font-size:11px;">No examples available</p>';
    }
    
    var html = '';
    examples.slice(0, 1).forEach(function(ex) {
        html += '<div style="margin-bottom:6px;padding:6px;background:#f9f9f9;border-left:3px solid ' + borderColor + ';border-radius:3px;font-size:10px;">';
        if (ex.input) {
            html += '<div style="margin-bottom:4px;"><strong>Input:</strong> ' + truncateText(ex.input, 150) + '</div>';
        }
        if (ex.output) {
            var output = Array.isArray(ex.output) ? ex.output[0] : ex.output;
            html += '<div style="margin-bottom:4px;"><strong>Output:</strong> ' + truncateText(output, 100) + '</div>';
        }
        if (ex.explanation) {
            html += '<div style="color:#666;font-style:italic;margin-top:4px;"><strong>Explanation:</strong> ' + truncateText(ex.explanation, 120) + '</div>';
        }
        html += '</div>';
    });
    return html;
}

function getTaskLabel(task) {
    if (task.id === STATE.selectedTaskId) return 'T1';
    for (var i = 0; i < STATE.similarTasks.length; i++) {
        if (STATE.similarTasks[i].id === task.id) {
            return 'T' + (i + 2);
        }
    }
    return 'Task';
}

function getTaskColor(task) {
    if (task.id === STATE.selectedTaskId) return '#e74c3c';
    for (var i = 0; i < STATE.similarTasks.length; i++) {
        if (STATE.similarTasks[i].id === task.id) {
            return getBlueGradient(i);
        }
    }
    return '#666';
}

/**
 * Clear the network graph
 */
function clearNetworkGraph() {
    var container = d3.select('#network-graph');
    container.selectAll('*').remove();
    container.append('p')
        .attr('class', 'placeholder')
        .style('text-align', 'center')
        .style('padding', '80px 20px')
        .style('color', '#999')
        .text('Select a task from Panel A');
}