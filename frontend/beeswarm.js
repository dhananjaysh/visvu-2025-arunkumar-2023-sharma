/**
 * Panel D: Model Results (Beeswarm Plot)
 * 
 * Shows GPT-3 accuracy on task instances grouped by similarity bins.
 * - X-axis: Tasks T1-T10
 * - Y-axis: Bin-wise accuracy (0-1)
 * - Point size: Number of instances in bin
 * - Colors: T1=red, T2-T10=blue gradient
 */

/**
 * Main render function for beeswarm plot
 */
function renderBeeswarmPlot() {
    var container = d3.select('#beeswarm-plot');
    container.selectAll('*').remove();
    
    if (!STATE.modelResults || STATE.modelResults.length === 0) {
        container.append('p')
            .attr('class', 'placeholder')
            .style('text-align', 'center')
            .style('padding', '80px 20px')
            .style('color', '#999')
            .text('No model results available');
        return;
    }
    
    var maxAccuracy = 0;
    STATE.modelResults.forEach(function(result) {
        (result.bins || []).forEach(function(bin) {
            if (bin.accuracy > maxAccuracy) {
                maxAccuracy = bin.accuracy;
            }
        });
    });
    maxAccuracy = Math.ceil(maxAccuracy * 10) / 10;
    
    var width = container.node().clientWidth;
    var height = container.node().clientHeight;
    var margin = { top: 20, right: 20, bottom: 45, left: 45 };
    
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;
    
    var svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    // Task labels
    var taskLabels = STATE.modelResults.map(function(d, i) {
        return 'T' + (i + 1);
    });
    
    // X Scale
    var xScale = d3.scaleBand()
        .domain(taskLabels)
        .range([0, plotWidth])
        .padding(0.15);
    
    // Y Scale (accuracy 0-1)
    var yScale = d3.scaleLinear()
        .domain([0, maxAccuracy])
        .range([plotHeight, 0]);
    
    // Size scale for points
    var sizeScale = d3.scaleSqrt()
        .domain([1, 200])
        .range([3, 14]);
    
    // Draw Y axis
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(function(d) { return d.toFixed(1); }))
        .selectAll('text')
        .attr('font-size', '9px');
    
    // Y axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -plotHeight / 2)
        .attr('y', -32)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text('Bin-wise Accuracy');
    
    // Draw grid lines
    g.selectAll('.grid-line')
        .data([0.2, 0.4, 0.6, 0.8])
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', plotWidth)
        .attr('y1', function(d) { return yScale(d); })
        .attr('y2', function(d) { return yScale(d); })
        .attr('stroke', '#eee')
        .attr('stroke-dasharray', '3,3');
    
    // Get color for task
    function getTaskColor(idx) {
        if (idx === 0) return '#e74c3c';
        return getBlueGradient(idx - 1);
    }
    
    // Draw beeswarm for each task
    STATE.modelResults.forEach(function(result, taskIdx) {
        var label = 'T' + (taskIdx + 1);
        var centerX = xScale(label) + xScale.bandwidth() / 2;
        var taskColor = getTaskColor(taskIdx);
        
        var bins = result.bins || [];
        
        // Filter to non-empty bins
        var activeBins = bins.filter(function(b) {
            return b.num_instances > 0;
        });
        
        // Create points with jittered positions
        var points = activeBins.map(function(bin) {
            // Jitter x position within band
            var jitterX = (Math.random() - 0.5) * xScale.bandwidth() * 0.6;
            
            return {
                x: centerX + jitterX,
                y: yScale(bin.accuracy),
                size: sizeScale(bin.num_instances),
                accuracy: bin.accuracy,
                count: bin.num_instances,
                simRange: bin.sim_range,
                taskIdx: taskIdx,
                taskLabel: label
            };
        });
        
        // Draw points
        g.selectAll('.beeswarm-point-' + taskIdx)
            .data(points)
            .enter()
            .append('circle')
            .attr('class', 'beeswarm-point')
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .attr('r', function(d) { return d.size; })
            .attr('fill', taskColor)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8)
            .attr('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 2)
                    .attr('opacity', 1);
                
                var content = '<strong>' + d.taskLabel + '</strong>';
                content += '<br>Similarity Bin: ' + d.simRange[0].toFixed(2) + ' - ' + d.simRange[1].toFixed(2);
                content += '<br>Instances: ' + d.count;
                content += '<br>Accuracy: ' + (d.accuracy * 100).toFixed(1) + '%';
                showTooltip(event, content);
                
                // Update side panels
                updateExamplesPanel(d.taskIdx);
                updateInstancesPanel(d.taskIdx, d.simRange);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1)
                    .attr('opacity', 0.8);
                hideTooltip();
            });
        
        // Draw task label below
        g.append('text')
            .attr('x', centerX)
            .attr('y', plotHeight + 14)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('fill', taskColor)
            .text(label);
        
        // Draw overall accuracy below label
        g.append('text')
            .attr('x', centerX)
            .attr('y', plotHeight + 26)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('fill', '#666')
            .text(result.overall_accuracy.toFixed(2));
    });
}

/**
 * Update examples panel when hovering beeswarm point
 */
function updateExamplesPanel(taskIdx) {
    var panel = document.getElementById('examples-panel');
    if (!panel) return;
    
    var task = taskIdx === 0 ? STATE.selectedTask : STATE.similarTasks[taskIdx - 1];
    if (!task) return;
    
    var content = panel.querySelector('.side-content');
    if (!content) return;
    
    var examples = task.positive_examples || [];
    if (examples.length === 0) {
        content.innerHTML = '<p style="color:#999;">No examples</p>';
        return;
    }
    
    var html = '';
    examples.slice(0, 2).forEach(function(ex) {
        html += '<div style="margin-bottom:6px;padding:4px;background:#f5f5f5;border-radius:3px;">';
        html += '<div><strong>In:</strong> ' + truncateText(ex.input || '', 60) + '</div>';
        html += '<div><strong>Out:</strong> ' + truncateText(ex.output || '', 40) + '</div>';
        html += '</div>';
    });
    
    content.innerHTML = html;
}

/**
 * Update instances panel when hovering beeswarm point
 */
function updateInstancesPanel(taskIdx, simRange) {
    var panel = document.getElementById('instances-panel');
    if (!panel) return;
    
    var task = taskIdx === 0 ? STATE.selectedTask : STATE.similarTasks[taskIdx - 1];
    if (!task) return;
    
    var content = panel.querySelector('.side-content');
    if (!content) return;
    
    var instances = task.instances || [];
    if (instances.length === 0) {
        content.innerHTML = '<p style="color:#999;">No instances</p>';
        return;
    }
    
    var html = '<div style="color:#888;margin-bottom:4px;">Bin: ' + 
               simRange[0].toFixed(2) + '-' + simRange[1].toFixed(2) + '</div>';
    
    instances.slice(0, 2).forEach(function(inst) {
        html += '<div style="margin-bottom:4px;padding:3px;background:#f9f9f9;border-radius:2px;">';
        html += '<div><strong>In:</strong> ' + truncateText(inst.input || '', 50) + '</div>';
        var output = Array.isArray(inst.output) ? inst.output[0] : inst.output;
        html += '<div><strong>Out:</strong> ' + truncateText(output || '', 30) + '</div>';
        html += '</div>';
    });
    
    content.innerHTML = html;
}

/**
 * Clear beeswarm plot
 */
function clearBeeswarmPlot() {
    var container = d3.select('#beeswarm-plot');
    container.selectAll('*').remove();
    container.append('p')
        .attr('class', 'placeholder')
        .style('text-align', 'center')
        .style('padding', '80px 20px')
        .style('color', '#999')
        .text('Select a task to see model results');
}
