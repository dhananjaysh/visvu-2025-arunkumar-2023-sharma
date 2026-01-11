// Google Drive Data Configuration for LINGO with CORS Proxy
const DATA_CONFIG = {
    // Direct download URLs for all data files
    GOOGLE_DRIVE_FILES: {
        categories: 'https://www.dropbox.com/scl/fi/8rmf4iyavnc4t3lj1p4xs/categories.json?rlkey=pgopwy3j5bcseoyxcs1x34sh8&st=vf9vd21s&dl=1',
        coords_3d: 'https://www.dropbox.com/scl/fi/ntr5pjhtp4vfwmrmx2e18/coords_3d.json?rlkey=2strs2gclrhuk0if77lzywnff&st=zfpxsjeo&dl=1',
        embeddings: 'https://www.dropbox.com/scl/fi/9e2ep42wby2lwc0xbmdjq/embeddings.json?rlkey=o7u6zqlpfvc2v6qgytjzrt04x&st=iqes2hq5&dl=1',
        model_results: 'https://www.dropbox.com/scl/fi/trah6h7iomjefldnpzpu3/model_results.json?rlkey=2ffiy88j0tn0co9vbac2jn890&st=6zt3k4ms&dl=1',
        similarities: 'https://www.dropbox.com/scl/fi/9zd95ps6mx1azfn0k3ahv/similarities.json?rlkey=1bmpkew8x7s1tboluwfx8mph6&st=ev1maoei&dl=1',
        summary: 'https://www.dropbox.com/scl/fi/mhfxzk80owxpszecwiqo8/summary.json?rlkey=kht2o8tonjt4h1wztmc8a20kw&st=6i5m6mou&dl=1',
        task_metrics: 'https://www.dropbox.com/scl/fi/rtjfry9kgfdi7lxrmy2pu/task_metrics.json?rlkey=dsif3ox9pxp51lpjvvc7g5ek5&st=3yifyjxz&dl=1',
        tasks_basic: 'https://www.dropbox.com/scl/fi/l00xa97ov1x2mj9vz4iha/tasks_basic.json?rlkey=p0vrh7gr8t3fvs5f3yhv7tcff&st=5nxne0h4&dl=1'
    },
    
    CACHE_PREFIX: 'lingo_data_v1_',
    USE_CACHE: true
};

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
    
    // Download directly from Dropbox (NO CORS PROXY)
    const url = DATA_CONFIG.GOOGLE_DRIVE_FILES[fileKey];
    
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
        
        // Cache it
        if (DATA_CONFIG.USE_CACHE) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (e) {
                console.warn(`Cache full: ${e.message}`);
            }
        }
        
        return data;
        
    } catch (error) {
        console.error(`❌ Error loading ${fileKey}:`, error);
        throw error;
    }
}

// Load all required data files
async function loadAllData() {
    const startTime = Date.now();
    
    try {
        showLoading('Initializing data loading...');
        
        // Load files in parallel for speed
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

// Clear all cache
function clearDataCache() {
    let count = 0;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(DATA_CONFIG.CACHE_PREFIX)) {
            localStorage.removeItem(key);
            count++;
        }
    });
    console.log(`Cleared ${count} cached files`);
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
        console.log(`Cleared ${count} old cached files`);
    }
}

// Expose to global scope for debugging
window.clearDataCache = clearDataCache;
window.DATA_CONFIG = DATA_CONFIG;