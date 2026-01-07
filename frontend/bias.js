/**
 * Panel E: Bias Metrics
 * 
 * Shows instruction bias metrics:
 * - Heatmap: Jaccard similarity between tasks (Examples vs Instances)
 * - Bar Chart: Unique vocabulary per task
 * 
 * Colors: T1=red, T2-T10=blue gradient
 */

/**
 * Main render function for bias panel
 */
function renderBiasPanel() {
    renderHeatmap();
    renderBarChart();
}

/**
 * Render heatmap showing similarity between tasks
 */
function renderHeatmap() {
    var container = d3.select('#heatmap');
    container.selectAll('*').remove();
    
    if (!STATE.selectedTask || STATE.similarTasks.length === 0) {
        container.append('p')
            .attr('class', 'placeholder')
            .style('padding', '30px')
            .style('color', '#999')
            .style('text-align', 'center')
            .text('Select a task');
        return;
    }
    
    var rect = container.node().getBoundingClientRect();
    var width = rect.width || 280;
    var height = rect.height || 140;
    var margin = { top: 25, right: 10, bottom: 25, left: 35 };
    
    var svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    // Build task list
    var allTasks = [STATE.selectedTask].concat(STATE.similarTasks);
    var n = allTasks.length;
    
    // Calculate cell size
    var availableWidth = width - margin.left - margin.right;
    var availableHeight = height - margin.top - margin.bottom;
    var cellSize = Math.min(availableWidth / n, availableHeight / n, 18);
    
    // Get selected component
    var componentSelect = document.getElementById('bias-component-select');
    var component = componentSelect ? componentSelect.value : 'positive_examples';

    // Get selected metric
    var metricSelect = document.getElementById('bias-metric-select');
    var metric = metricSelect ? metricSelect.value : 'jaccard_adverbs';

    // Build similarity matrix
    var matrixData = [];
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            var sim;
            if (i === j) {
                sim = 1.0;
            } else {
                var text1 = getComponentText(allTasks[i], component);
                var text2 = getComponentText(allTasks[j], component);
                sim = calculateBiasMetric(text1, text2, metric);
            }
            matrixData.push({
                row: i,
                col: j,
                value: sim
            });
        }
    }
    
    // Color scale (pink gradient like LINGO paper)
    var colorScale = d3.scaleSequential(d3.interpolateRdPu)
        .domain([0, 1]);
    
    // Get label
    function getLabel(idx) {
        if (idx === 0) return 'T1';
        return 'T' + (idx + 1);
    }
    
    // Draw cells
    g.selectAll('.heatmap-cell')
        .data(matrixData)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', function(d) { return d.col * cellSize; })
        .attr('y', function(d) { return d.row * cellSize; })
        .attr('width', cellSize - 1)
        .attr('height', cellSize - 1)
        .attr('fill', function(d) { return colorScale(d.value); })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#333').attr('stroke-width', 1);
            var content = '<strong>' + getLabel(d.row) + ' vs ' + getLabel(d.col) + '</strong>';
            content += '<br>Similarity: ' + d.value.toFixed(3);
            showTooltip(event, content);
        })
        .on('mouseout', function() {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
            hideTooltip();
        });
    
    // Row labels (left side)
    g.selectAll('.row-label')
        .data(allTasks)
        .enter()
        .append('text')
        .attr('class', 'row-label')
        .attr('x', -4)
        .attr('y', function(d, i) { return i * cellSize + cellSize / 2 + 3; })
        .attr('text-anchor', 'end')
        .attr('font-size', '8px')
        .attr('fill', '#666')
        .text(function(d, i) { return getLabel(i); });
    
    // Column labels (bottom)
    g.selectAll('.col-label')
        .data(allTasks)
        .enter()
        .append('text')
        .attr('class', 'col-label')
        .attr('x', function(d, i) { return i * cellSize + cellSize / 2; })
        .attr('y', n * cellSize + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('fill', '#666')
        .text(function(d, i) { return getLabel(i); });
    
    // Section labels
    svg.append('text')
        .attr('x', margin.left - 5)
        .attr('y', 12)
        .attr('font-size', '9px')
        .attr('fill', '#888')
        .text('Examples');
    
    svg.append('text')
        .attr('x', margin.left + (n * cellSize) / 2)
        .attr('y', margin.top + n * cellSize + 22)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#888')
        .text('Instances');
}

/**
 * Render bar chart showing unique vocabulary per task
 */
function renderBarChart() {
    var container = d3.select('#bar-chart');
    container.selectAll('*').remove();
    
    if (!STATE.selectedTask || STATE.similarTasks.length === 0) {
        return;
    }
    
    // Get selected metric
    var metricSelect = document.getElementById('bias-metric-select');
    var metric = metricSelect ? metricSelect.value : 'unique_vocab';
    
    // Only show bar chart for unique vocabulary
    if (metric !== 'unique_vocab') {
        container.append('p')
            .attr('class', 'placeholder')
            .style('padding', '30px')
            .style('color', '#999')
            .style('text-align', 'center')
            .style('font-size', '11px')
            .text('Bar chart only available for Unique Vocabulary metric');
        return;
    }
    
    var rect = container.node().getBoundingClientRect();
    var width = rect.width || 280;
    var height = rect.height || 80;
    var margin = { top: 15, right: 10, bottom: 20, left: 35 };
    
    var svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;
    
    // Build task list
    var allTasks = [STATE.selectedTask].concat(STATE.similarTasks);
    
    // Get selected component
    var componentSelect = document.getElementById('bias-component-select');
    var component = componentSelect ? componentSelect.value : 'positive_examples';
    
    // Calculate unique vocabulary for each task
    var vocabData = allTasks.map(function(task, i) {
        var text = getComponentText(task, component);
        var words = text.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 2; });
        var uniqueWords = new Set(words).size;
        
        return {
            label: i === 0 ? 'T1' : 'T' + (i + 1),
            value: uniqueWords,
            color: i === 0 ? '#e74c3c' : getBlueGradient(i - 1)
        };
    });
    
    // X Scale
    var xScale = d3.scaleBand()
        .domain(vocabData.map(function(d) { return d.label; }))
        .range([0, plotWidth])
        .padding(0.2);
    
    // Y Scale - DYNAMIC based on actual max value
    var maxVocab = d3.max(vocabData, function(d) { return d.value; }) || 10;
    // Add 10% padding to max value for better visualization
    var yMax = Math.ceil(maxVocab * 1.1);
    
    var yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([plotHeight, 0])
        .nice(); // Makes nice round numbers
    
    // Draw bars
    g.selectAll('.vocab-bar')
        .data(vocabData)
        .enter()
        .append('rect')
        .attr('class', 'vocab-bar')
        .attr('x', function(d) { return xScale(d.label); })
        .attr('y', function(d) { return yScale(d.value); })
        .attr('width', xScale.bandwidth())
        .attr('height', function(d) { return plotHeight - yScale(d.value); })
        .attr('fill', function(d) { return d.color; })
        .attr('opacity', 0.85)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, '<strong>' + d.label + '</strong><br>Unique words: ' + d.value);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.85);
            hideTooltip();
        });
    
    // X axis (just labels)
    g.append('g')
        .attr('transform', 'translate(0,' + plotHeight + ')')
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll('text')
        .attr('font-size', '8px');
    
    // Y axis with dynamic ticks
    var numTicks = Math.min(4, yMax); // Show 3-4 ticks
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(numTicks).tickSize(-plotWidth))
        .selectAll('text')
        .attr('font-size', '8px');
    
    // Style grid lines
    g.selectAll('.tick line')
        .attr('stroke', '#eee');
    
    g.select('.domain').remove();
    
    // Remove x-axis domain line
    g.selectAll('.domain').remove();
}

/**
 * Calculate bias metric based on selected type
 */
function calculateBiasMetric(text1, text2, metric) {
    if (!text1 || !text2) return 0;
    
    if (metric === 'jaccard_adverbs') {
        return calculateJaccardByPOS(text1, text2, 'adverb');
    } else if (metric === 'jaccard_nouns') {
        return calculateJaccardByPOS(text1, text2, 'noun');
    } else if (metric === 'unique_vocab') {
        // For unique vocab, we don't compare - just count (handled in bar chart)
        return calculateWordOverlap(text1, text2);
    }
    
    return calculateWordOverlap(text1, text2);
}

/**
 * Calculate Jaccard similarity for specific part of speech
 */
function calculateJaccardByPOS(text1, text2, posType) {
    // Simple POS extraction (this is a simplified version)
    // In a real implementation, you'd use a proper NLP library
    
    var words1 = extractWordsByPOS(text1, posType);
    var words2 = extractWordsByPOS(text2, posType);
    
    if (words1.length === 0 && words2.length === 0) return 0;
    
    var set1 = new Set(words1);
    var set2 = new Set(words2);
    
    var intersection = 0;
    set1.forEach(function(w) {
        if (set2.has(w)) intersection++;
    });
    
    var union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * Extract words by part of speech (simplified heuristic)
 */
function extractWordsByPOS(text, posType) {
    if (!text) return [];
    
    var words = text.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 2; });
    
    if (posType === 'adverb') {
        // Common adverb patterns: words ending in -ly
        return words.filter(function(w) {
            return w.endsWith('ly') || isCommonAdverb(w);
        });
    } else if (posType === 'noun') {
        // Simple noun heuristic: exclude common verbs/adverbs
        return words.filter(function(w) {
            return !w.endsWith('ly') && !isCommonVerb(w) && !isCommonAdverb(w);
        });
    }
    
    return words;
}

/**
 * Check if word is a common adverb
 */
function isCommonAdverb(word) {
    var commonAdverbs = ['very', 'really', 'quite', 'too', 'almost', 'always', 'never', 
                         'often', 'sometimes', 'usually', 'here', 'there', 'now', 'then',
                         'today', 'tomorrow', 'yesterday', 'well', 'badly', 'quickly', 'slowly'];
    return commonAdverbs.indexOf(word) !== -1;
}

/**
 * Check if word is a common verb
 */
function isCommonVerb(word) {
    var commonVerbs = ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
                       'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
                       'can', 'get', 'got', 'make', 'made', 'go', 'went', 'come', 'came', 'see', 'saw'];
    return commonVerbs.indexOf(word) !== -1;
}

/**
 * Clear bias panel
 */
function clearBiasPanel() {
    d3.select('#heatmap').selectAll('*').remove();
    d3.select('#bar-chart').selectAll('*').remove();
}
