/**
 * Panel C: Instruction Decomposition (Chord Diagram)
 * 
 * Shows word overlap between task instruction components.
 * - T1 = RED arc, T2-T10 = BLUE gradient arcs
 * - Chord thickness = overlap strength
 * - Only shows chords above threshold
 */

/**
 * Main render function for chord diagram
 */
function renderChordDiagram() {
    var container = d3.select('#chord-diagram');
    container.selectAll('*').remove();
    
    if (!STATE.selectedTask || STATE.similarTasks.length === 0) {
        container.append('p')
            .attr('class', 'placeholder')
            .style('text-align', 'center')
            .style('padding', '80px 20px')
            .style('color', '#999')
            .text('Select a task from Panel A');
        return;
    }
    
    var rect = container.node().getBoundingClientRect();
    var width = rect.width || 280;
    var height = rect.height || 250;
    var outerRadius = Math.min(width, height) / 2 - 30;
    var innerRadius = outerRadius - 18;
    
    var svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');
    
    // Get selected component
    var componentSelect = document.getElementById('chord-component-select');
    var component = componentSelect ? componentSelect.value : 'positive_examples';
    
    // Get threshold
    var thresholdInput = document.getElementById('chord-threshold-input');
    var threshold = thresholdInput ? parseFloat(thresholdInput.value) : 0.5;
    
    // Build task list: T1 + similar tasks
    var allTasks = [STATE.selectedTask].concat(STATE.similarTasks);
    var n = allTasks.length;
    
    // Build overlap matrix
    var matrix = [];
    for (var i = 0; i < n; i++) {
        matrix[i] = [];
        for (var j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else {
                var text1 = getComponentText(allTasks[i], component);
                var text2 = getComponentText(allTasks[j], component);
                var overlap = calculateWordOverlap(text1, text2);
                // Only show if above threshold
                matrix[i][j] = overlap >= threshold ? overlap : 0;
            }
        }
    }
    
    // Check if we have any connections
    var hasConnections = matrix.some(function(row) {
        return row.some(function(val) { return val > 0; });
    });
    
    if (!hasConnections) {
        container.selectAll('*').remove();
        container.append('p')
            .attr('class', 'placeholder')
            .style('text-align', 'center')
            .style('padding', '80px 20px')
            .style('color', '#999')
            .text('No overlap above threshold (' + threshold.toFixed(1) + ')');
        return;
    }
    
    // Create chord layout
    var chord = d3.chord()
        .padAngle(0.04)
        .sortSubgroups(d3.descending);
    
    var chords = chord(matrix);
    
    // Arc generator
    var arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
    
    // Ribbon generator
    var ribbon = d3.ribbon()
        .radius(innerRadius);
    
    // Color function
    function getArcColor(index) {
        if (index === 0) return '#e74c3c'; // T1 = red
        return getBlueGradient(index - 1); // T2-T10 = blue gradient
    }
    
    // Label function
    function getLabel(index) {
        if (index === 0) return 'T1';
        return 'T' + (index + 1);
    }
    
    // Draw arcs (groups)
    var group = svg.append('g')
        .selectAll('g')
        .data(chords.groups)
        .enter()
        .append('g');
    
    group.append('path')
        .attr('fill', function(d) { return getArcColor(d.index); })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('d', arc)
        .on('mouseover', function(event, d) {
            var task = allTasks[d.index];
            var content = '<strong>' + getLabel(d.index) + '</strong>: ' + truncateText(task.task_name, 30);
            showTooltip(event, content);
        })
        .on('mouseout', hideTooltip);
    
    // Draw labels
    group.append('text')
        .each(function(d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .attr('dy', '.35em')
        .attr('transform', function(d) {
            return 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')' +
                   'translate(' + (outerRadius + 8) + ')' +
                   (d.angle > Math.PI ? 'rotate(180)' : '');
        })
        .attr('text-anchor', function(d) {
            return d.angle > Math.PI ? 'end' : null;
        })
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', function(d) { return getArcColor(d.index); })
        .text(function(d) { return getLabel(d.index); });
    
    // Draw ribbons (chords)
    svg.append('g')
        .attr('fill-opacity', 0.7)
        .selectAll('path')
        .data(chords)
        .enter()
        .append('path')
        .attr('d', ribbon)
        .attr('fill', function(d) { return getArcColor(d.source.index); })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('fill-opacity', 1);
            var content = '<strong>' + getLabel(d.source.index) + ' ↔ ' + getLabel(d.target.index) + '</strong>';
            content += '<br>Overlap: ' + matrix[d.source.index][d.target.index].toFixed(3);
            showTooltip(event, content);
            
            // Highlight corresponding tasks
            highlightChordTasks(d.source.index, d.target.index);
        })
        .on('mouseout', function() {
            d3.select(this).attr('fill-opacity', 0.7);
            hideTooltip();
            clearChordHighlight();
        })
        .on('click', function(event, d) {
            // Set comparison tasks
            STATE.comparisonTask1 = allTasks[d.source.index];
            STATE.comparisonTask2 = allTasks[d.target.index];
            updateComparisonBoxes();
        });
}

/**
 * Get text content for a specific component of a task
 */
function getComponentText(task, component) {
    if (component === 'definition') {
        return task.definition || '';
    }
    
    if (component === 'positive_examples') {
        var texts = [];
        (task.positive_examples || []).forEach(function(ex) {
            if (ex.input) texts.push(ex.input);
            if (ex.output) texts.push(ex.output);
            if (ex.explanation) texts.push(ex.explanation);
        });
        return texts.join(' ');
    }
    
    if (component === 'negative_examples') {
        var texts = [];
        (task.negative_examples || []).forEach(function(ex) {
            if (ex.input) texts.push(ex.input);
            if (ex.output) texts.push(ex.output);
            if (ex.explanation) texts.push(ex.explanation);
        });
        return texts.join(' ');
    }
    
    return task.definition || '';
}

/**
 * Highlight tasks in other panels when hovering chord
 */
function highlightChordTasks(idx1, idx2) {
    // Could be implemented to highlight in scatter plot
}

function clearChordHighlight() {
    // Clear highlights
}

/**
 * Clear chord diagram
 */
function clearChordDiagram() {
    var container = d3.select('#chord-diagram');
    container.selectAll('*').remove();
    container.append('p')
        .attr('class', 'placeholder')
        .style('text-align', 'center')
        .style('padding', '80px 20px')
        .style('color', '#999')
        .text('Select a task from Panel A');
}
