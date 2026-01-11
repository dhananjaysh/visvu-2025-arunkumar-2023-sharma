// Google Drive Data Configuration for LINGO
const DATA_CONFIG = {
    // Google Drive direct download URLs (using export=download)
    GOOGLE_DRIVE_FILES: {
        categories: 'https://drive.google.com/uc?export=download&id=YOUR_CATEGORIES_FILE_ID',
        coords_3d: 'https://drive.google.com/uc?export=download&id=YOUR_COORDS_FILE_ID',
        embeddings: 'https://drive.google.com/uc?export=download&id=YOUR_EMBEDDINGS_FILE_ID',
        model_results: 'https://drive.google.com/uc?export=download&id=YOUR_MODEL_RESULTS_FILE_ID',
        similarities: 'https://drive.google.com/uc?export=download&id=YOUR_SIMILARITIES_FILE_ID',
        summary: 'https://drive.google.com/uc?export=download&id=YOUR_SUMMARY_FILE_ID',
        task_metrics: 'https://drive.google.com/uc?export=download&id=YOUR_TASK_METRICS_FILE_ID',
        tasks_basic: 'https://drive.google.com/uc?export=download&id=YOUR_TASKS_BASIC_FILE_ID'
    },
    
    // Cache settings - disabled for large datasets
    CACHE_PREFIX: 'lingo_data_v3_',
    CACHE_VERSION: '3.0',
    USE_CACHE: false  // Disabled due to 800MB dataset size
};

// Data loader with progress tracking
async function loadDataFromDrive(fileKey, showProgress = true) {
    const url = DATA_CONFIG.GOOGLE_DRIVE_FILES[fileKey];
    
    if (!url) {
        throw new Error(`No URL configured for: ${fileKey}`);
    }
    
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
        console.error(`Error loading ${fileKey}:`, error);
        throw new Error(`Failed to load ${fileKey}: ${error.message}`);
    }
}

// Load all required data files
async function loadAllData() {
    const startTime = Date.now();
    
    try {
        showLoading('Initializing data loading...');
        
        console.log('Loading all data files from Google Drive...');
        console.log('This may take 30-60 seconds on first load...');
        
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
        console.log(`All data loaded successfully in ${elapsed}s`);
        console.log(`Loaded ${tasks.length} tasks`);
        
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
        console.error('Failed to load data:', error);
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