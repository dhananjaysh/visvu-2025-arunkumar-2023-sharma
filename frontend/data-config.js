// Google Drive Data Configuration for LINGO with CORS Proxy
const DATA_CONFIG = {
    // CORS proxy to bypass Google Drive restrictions
    CORS_PROXY: 'https://corsproxy.io/?',
    
    // Direct download URLs for all data files
    GOOGLE_DRIVE_FILES: {
        categories: 'https://drive.google.com/uc?export=download&id=1GV0vMg4mYiW55ZKJhsT7yj89-LVntsmJ',
        coords_3d: 'https://drive.google.com/uc?export=download&id=1pLdhssolTh3Z5DG_W7bSlRH2WVlLKjYM',
        embeddings: 'https://drive.google.com/uc?export=download&id=1pETfbh5yvBnTpNRaAQx4ObJc-fbfLL2H',
        model_results: 'https://drive.google.com/uc?export=download&id=1LWZT0luDwfqiPXNKPnvi73o6-QRjdPM3',
        similarities: 'https://drive.google.com/uc?export=download&id=1qnKOezsuBaEQ0_lbV7sV-Oid5E-mhO7n',
        summary: 'https://drive.google.com/uc?export=download&id=1IQv-_aMNwV-NQA-xJ-zDdt_KV8CDlkLC',
        task_metrics: 'https://drive.google.com/uc?export=download&id=1AwxEqlCek297U0NbYkfwbiqqjs-kV3Xw',
        tasks_basic: 'https://drive.google.com/uc?export=download&id=1DI0muRF4o30uv7vcVSXRtHHcrn8u6iN5'
    },
    
    // Cache settings
    CACHE_PREFIX: 'lingo_data_v1_',
    CACHE_VERSION: '1.0',
    USE_CACHE: true
};

// Data loader with caching and progress tracking
async function loadDataFromDrive(fileKey, showProgress = true) {
    const cacheKey = DATA_CONFIG.CACHE_PREFIX + fileKey;
    
    // Check cache first
    if (DATA_CONFIG.USE_CACHE) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                console.log(`✓ Loaded ${fileKey} from cache`);
                return JSON.parse(cached);
            }
        } catch (e) {
            console.warn(`Cache read error for ${fileKey}:`, e);
        }
    }
    
    // Download from Google Drive via CORS proxy
    const driveUrl = DATA_CONFIG.GOOGLE_DRIVE_FILES[fileKey];
    if (!driveUrl) {
        throw new Error(`No URL configured for: ${fileKey}`);
    }
    
    const url = DATA_CONFIG.CORS_PROXY + encodeURIComponent(driveUrl);
    
    console.log(`⬇ Downloading ${fileKey} from Google Drive...`);
    if (showProgress) {
        updateLoadingProgress(`Downloading ${fileKey}...`);
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get file size for progress
        const contentLength = response.headers.get('content-length');
        if (contentLength && showProgress) {
            const total = parseInt(contentLength, 10);
            console.log(`File size: ${(total / 1024 / 1024).toFixed(2)} MB`);
        }
        
        const data = await response.json();
        console.log(`✓ Downloaded ${fileKey}`);
        
        // Cache it
        if (DATA_CONFIG.USE_CACHE) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                console.log(`✓ Cached ${fileKey}`);
            } catch (e) {
                console.warn(`Cache storage full, couldn't cache ${fileKey}:`, e.message);
                // If localStorage is full, try to clear old cache
                if (e.name === 'QuotaExceededError') {
                    console.log('Attempting to clear old cache...');
                    clearOldCache();
                }
            }
        }
        
        return data;
        
    } catch (error) {
        console.error(`❌ Error loading ${fileKey}:`, error);
        throw new Error(`Failed to load ${fileKey}: ${error.message}`);
    }
}

// Load all required data files
async function loadAllData() {
    const startTime = Date.now();
    
    try {
        showLoading('Initializing data loading...');
        
        // Load files in parallel for speed
        console.log('📦 Loading all data files from Google Drive...');
        console.log('⏱ This may take 30-60 seconds on first load...');
        
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

// Clear all cache
function clearDataCache() {
    let count = 0;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(DATA_CONFIG.CACHE_PREFIX)) {
            localStorage.removeItem(key);
            count++;
        }
    });
    console.log(`✓ Cleared ${count} cached files`);
    alert(`Cache cleared! (${count} files removed)\nRefresh the page to reload data.`);
}

// Clear old cache (keep only current version)
function clearOldCache() {
    let count = 0;
    Object.keys(localStorage).forEach(key => {
        // Remove old versions or non-matching cache
        if (key.startsWith('lingo_') && !key.startsWith(DATA_CONFIG.CACHE_PREFIX)) {
            localStorage.removeItem(key);
            count++;
        }
    });
    if (count > 0) {
        console.log(`✓ Cleared ${count} old cached files`);
    }
}

// Expose to global scope for debugging
window.clearDataCache = clearDataCache;
window.DATA_CONFIG = DATA_CONFIG;