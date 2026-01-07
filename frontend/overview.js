/**
 * Panel A: Overview (3D Sphere Projection)
 * 
 * Displays task instructions as points on a rotatable 3D sphere.
 * - Before selection: colored by category (task type, source dataset)
 * - After selection: T1=red, T2-T10=blue gradient, others=grey
 */

// Sphere rotation state
var sphereRotation = { x: -20, y: 0 };

/**
 * Main render function for the scatter plot / sphere
 */
function renderScatterPlot() {
    var container = d3.select('#scatter-plot');
    container.selectAll('*').remove();
    
    var width = container.node().clientWidth;
    var height = container.node().clientHeight;
    var centerX = width / 2;
    var centerY = height / 2;
    var radius = Math.min(width, height) / 2 - 40;
    
    var svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // Build a map of similar task IDs to their rank (for coloring)
    var similarRankMap = {};
    if (STATE.similarTasks && STATE.similarTasks.length > 0) {
        STATE.similarTasks.forEach(function(t, idx) {
            similarRankMap[t.id] = idx; // 0 = T2 (darkest), 8 = T10 (lightest)
        });
    }
    
    // Project all tasks onto sphere
    var projectedPoints = STATE.tasks.map(function(task) {
        // Get 3D coordinates (should be normalized to [-1, 1])
        var x = task.x || 0;
        var y = task.y || 0;
        var z = task.z || 0;
        
        // Normalize to unit sphere surface
        var len = Math.sqrt(x*x + y*y + z*z);
        if (len > 0.001) {
            x = x / len;
            y = y / len;
            z = z / len;
        } else {
            // Random point on sphere if no coords
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            x = Math.sin(phi) * Math.cos(theta);
            y = Math.sin(phi) * Math.sin(theta);
            z = Math.cos(phi);
        }
        
        // Apply rotation (Y-axis first, then X-axis)
        var rotY = sphereRotation.y * Math.PI / 180;
        var rotX = sphereRotation.x * Math.PI / 180;
        
        // Rotate around Y axis
        var x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        var z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        
        // Rotate around X axis
        var y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        var z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        
        // Project to 2D (orthographic projection)
        var screenX = centerX + x1 * radius;
        var screenY = centerY + y1 * radius;
        
        // Size based on depth (closer = larger)
        var depthFactor = (z2 + 1) / 2; // 0 to 1, where 1 is front
        var baseSize = 2 + depthFactor * 3;
        
        return {
            task: task,
            x: screenX,
            y: screenY,
            z: z2,
            size: baseSize,
            depthFactor: depthFactor
        };
    });
    
    // Sort by z for proper layering (back to front)
    projectedPoints.sort(function(a, b) { return a.z - b.z; });
    
    // Draw points
    svg.selectAll('.task-point')
        .data(projectedPoints)
        .enter()
        .append('circle')
        .attr('class', 'task-point')
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; })
        .attr('r', function(d) {
            // All points same size - only color changes
            return 3.5;
        })
        .attr('fill', function(d) {
            return getPointColor(d.task, similarRankMap);
        })
        .attr('opacity', function(d) {
            // If a task is selected
            if (STATE.selectedTaskId !== null) {
                if (d.task.id === STATE.selectedTaskId) return 1.0;
                if (similarRankMap[d.task.id] !== undefined) return 0.9;
                // Grey out unrelated - still show depth
                return 0.15 + d.depthFactor * 0.1;
            }
            // No selection - show depth-based opacity
            return 0.3 + d.depthFactor * 0.5;
        })
        .attr('stroke', function(d) {
            if (d.task.id === STATE.selectedTaskId) return '#fff';
            if (similarRankMap[d.task.id] !== undefined) return '#fff';
            return 'none';
        })
        .attr('stroke-width', function(d) {
            if (d.task.id === STATE.selectedTaskId) return 2;
            if (similarRankMap[d.task.id] !== undefined) return 1.5;
            return 0;
        })
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke', '#333')
                .attr('stroke-width', 2);
            
            var content = '<strong>' + truncateText(d.task.task_name, 40) + '</strong>';
            content += '<br>Category: ' + d.task.category;
            content += '<br>Source: ' + d.task.source_dataset;
            
            if (similarRankMap[d.task.id] !== undefined) {
                var sim = STATE.similarTasks[similarRankMap[d.task.id]].similarity;
                content += '<br>Similarity: ' + sim.toFixed(3);
            }
            
            showTooltip(event, content);
            updateInfoBox(d.task);
        })
        .on('mouseout', function(event, d) {
            // Restore original stroke
            if (d.task.id === STATE.selectedTaskId) {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
            } else if (similarRankMap[d.task.id] !== undefined) {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
            } else {
                d3.select(this).attr('stroke', 'none').attr('stroke-width', 0);
            }
            hideTooltip();
        })
        .on('click', function(event, d) {
            event.preventDefault();
            event.stopPropagation();
            selectTask(d.task.id);
        });
    
    // Add drag behavior for rotation
    // Add drag behavior for rotation
    svg.call(d3.drag()
        .on('start', function(event) {
            event.sourceEvent.preventDefault();
            event.sourceEvent.stopPropagation();
        })
        .on('drag', function(event) {
            event.sourceEvent.preventDefault();
            event.sourceEvent.stopPropagation();
            sphereRotation.y += event.dx * 0.4;
            sphereRotation.x += event.dy * 0.4;
            // Clamp X rotation
            sphereRotation.x = Math.max(-89, Math.min(89, sphereRotation.x));
            renderScatterPlot();
        })
    );
}

/**
 * Determine point color based on selection state
 */
function getPointColor(task, similarRankMap) {
    // If no task is selected, color by category
    if (STATE.selectedTaskId === null) {
        return STATE.colorScale(task[STATE.colorBy]);
    }
    
    // Selected task = RED
    if (task.id === STATE.selectedTaskId) {
        return '#e74c3c';
    }
    
    // Similar task = BLUE gradient
    if (similarRankMap[task.id] !== undefined) {
        var rank = similarRankMap[task.id];
        return getBlueGradient(rank);
    }
    
    // Unrelated = GREY
    return '#bdc3c7';
}

/**
 * Blue gradient: rank 0 (T2) = darkest, rank 8 (T10) = lightest
 */
function getBlueGradient(rank) {
    // Dark blue to light blue
    var colors = [
        '#1a5276', // T2 - darkest
        '#1f618d',
        '#2471a3',
        '#2980b9',
        '#3498db',
        '#5dade2',
        '#7fb3d5',
        '#a9cce3',
        '#aed6f1'  // T10 - lightest
    ];
    return colors[Math.min(rank, colors.length - 1)];
}

/**
 * Update the info box below the sphere
 */
function updateInfoBox(task) {
    var sourceEl = document.getElementById('info-source');
    var typeEl = document.getElementById('info-type');
    var domainEl = document.getElementById('info-domain');
    var defEl = document.getElementById('info-definition');
    
    if (sourceEl) sourceEl.textContent = task.source_dataset || 'Unknown';
    if (typeEl) typeEl.textContent = task.category || 'Unknown';
    if (domainEl) domainEl.textContent = task.domain || task.category || 'Unknown';
    if (defEl) {
        var def = task.definition || '';
        defEl.textContent = 'Definition: ' + truncateText(def, 180);
    }
}

/**
 * Clear the overview panel
 */
function clearScatterPlot() {
    var container = d3.select('#scatter-plot');
    container.selectAll('*').remove();
    container.append('p')
        .attr('class', 'placeholder')
        .style('text-align', 'center')
        .style('padding', '100px 20px')
        .style('color', '#999')
        .text('Loading tasks...');
}
