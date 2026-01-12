// Google Drive API Configuration for LINGO
const DATA_CONFIG = {
    // Google Drive API Key
    API_KEY: 'AIzaSyArW_1ILBItS7eziufDq3RPtee0wIFvE1A',
    
    // Google Drive File IDs
    GOOGLE_DRIVE_FILES: {
        categories: '1GV0vMg4mYiW55ZKJhsT7yj89-LVntsmJ',
        coords_3d: '1pLdhssolTh3Z5DG_W7bSlRH2WVlLKjYM',
        embeddings: '1pETfbh5yvBnTpNRaAQx4ObJc-fbfLL2H',
        model_results: '1LWZT0luDwfqiPXNKPnvi73o6-QRjdPM3',
        similarities: '1qnKOezsuBaEQ0_lbV7sV-Oid5E-mhO7n',
        summary: '1IQv-_aMNwV-NQA-xJ-zDdt_KV8CDlkLC',
        task_metrics: '1AwxEqlCek297U0NbYkfwbiqqjs-kV3Xw',
        tasks_basic: '1DI0muRF4o30uv7vcVSXRtHHcrn8u6iN5'
    },
    
    // Cache disabled for 800MB dataset
    USE_CACHE: false
};

// Load data from Google Drive using API
async function loadDataFromDrive(fileKey, showProgress = true) {
    const fileId = DATA_CONFIG.GOOGLE_DRIVE_FILES[fileKey];
    const apiKey = DATA_CONFIG.API_KEY;
    
    // Google Drive API endpoint for file download
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    
    console.log(`⬇ Downloading ${fileKey}...`);
    if (showProgress) {
        updateLoadingProgress(`Downloading ${fileKey}...`);
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✓ Downloaded ${fileKey}`);
        
        return data;
        
    } catch (error) {
        console.error(`❌ Error loading ${fileKey}:`, error);
        throw new Error(`Failed to load ${fileKey}: ${error.message}`);
    }
}

// Load all required data files in parallel
async function loadAllData() {
    const startTime = Date.now();
    
    try {
        showLoading('Initializing LINGO Dashboard...');
        
        console.log('📦 Loading all data files from Google Drive...');
        console.log('⏱ This may take 30-60 seconds on first load (800MB dataset)...');
        
        const [
            tasks,
            coords,
            embeddings,
            similarities,
            modelResults,
            taskMetrics,
            categories,
            summary
        ] = await Promise.all([
            loadDataFromDrive('tasks_basic'),
            loadDataFromDrive('coords_3d'),
            loadDataFromDrive('embeddings'),
            loadDataFromDrive('similarities'),
            loadDataFromDrive('model_results'),
            loadDataFromDrive('task_metrics'),
            loadDataFromDrive('categories'),
            loadDataFromDrive('summary')
        ]);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ All data loaded successfully in ${elapsed}s`);
        console.log(`✅ Loaded ${tasks.length} tasks`);
        
        hideLoading();
        
        return {
            tasks,
            coords,
            embeddings,
            similarities,
            modelResults,
            taskMetrics,
            categories,
            summary
        };
        
    } catch (error) {
        hideLoading();
        console.error('❌ Failed to load data:', error);
        showError('Failed to load data from Google Drive. Please check your internet connection and try again.');
        throw error;
    }
}

// Helper function to update loading message
function updateLoadingProgress(message) {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        const textDiv = loader.querySelector('.loading-text');
        if (textDiv) {
            textDiv.textContent = message;
        } else {
            loader.textContent = message;
        }
    }
}

// Helper function to show loading indicator
function showLoading(message) {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        const textDiv = loader.querySelector('.loading-text');
        if (textDiv) {
            textDiv.textContent = message || 'Loading...';
        } else {
            loader.textContent = message || 'Loading...';
        }
        loader.style.display = 'block';
    }
}

// Helper function to hide loading indicator
function hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Helper function to show error message
function showError(message) {
    alert(message);
}

// Expose to global scope for debugging
window.DATA_CONFIG = DATA_CONFIG;
window.loadAllData = loadAllData;