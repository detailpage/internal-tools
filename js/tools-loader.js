/**
 * Tools Loader - Dynamically loads tool content from separate files
 */

class ToolsLoader {
    constructor() {
        this.currentTool = null;
        this.toolCache = {};
        this.init();
    }

    init() {
        // Map tool IDs to their folder paths
        this.toolPaths = {
            'keyword-finder': 'tools/keyword-finder/index.html',
            'keyword-universe': 'tools/keyword-universe/index.html',
            'keyword-history': 'tools/keyword-history/index.html',
            'search-results': 'tools/search-results/index.html',
            'customer-reviews': 'tools/customer-reviews/index.html',
            'image-analysis': 'tools/image-analysis/index.html',
            'item-info': 'tools/item-info/index.html',
            'asin-list': 'tools/asin-list/index.html',
            'brand-asin': 'tools/brand-asin/index.html',
            'category-asin': 'tools/category-asin/index.html',
            'seller-asin': 'tools/seller-asin/index.html',
            'variation-asin': 'tools/variation-asin/index.html',
            'asin-bbx': 'tools/asin-bbx/index.html',
            'brand-bbx': 'tools/brand-bbx/index.html',
            'indexing': 'tools/indexing/index.html',
            'bulk-indexing': 'tools/bulk-indexing/index.html'
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle tool navigation clicks
        document.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const toolId = item.getAttribute('data-tool');
                this.loadTool(toolId, item);
            });
        });
    }

    async loadTool(toolId, navItem) {
        // Update navigation state
        document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
        navItem.classList.add('active');

        // Hide all tool content areas
        document.querySelectorAll('.tool-content').forEach(c => c.classList.remove('active'));

        // Get or create content container
        let contentContainer = document.getElementById(toolId);

        // Check if tool is already loaded in cache
        if (this.toolCache[toolId]) {
            contentContainer.innerHTML = this.toolCache[toolId];
            contentContainer.classList.add('active');
            this.executeToolScripts(toolId);
            return;
        }

        // Load tool content from external file
        try {
            const response = await fetch(this.toolPaths[toolId]);
            if (!response.ok) {
                throw new Error(`Failed to load tool: ${response.status}`);
            }

            const html = await response.text();

            // Cache the content
            this.toolCache[toolId] = html;

            // Insert content
            contentContainer.innerHTML = html;
            contentContainer.classList.add('active');

            // Execute any tool-specific scripts
            this.executeToolScripts(toolId);

        } catch (error) {
            console.error(`Error loading tool ${toolId}:`, error);
            contentContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Error Loading Tool</h4>
                    <p>Unable to load ${toolId}. Please try again later.</p>
                    <small>${error.message}</small>
                </div>
            `;
            contentContainer.classList.add('active');
        }

        // Scroll to top of content area
        document.querySelector('.content-area').scrollTop = 0;
    }

    executeToolScripts(toolId) {
        // Load and execute tool-specific JavaScript if it exists
        const scriptPath = this.toolPaths[toolId].replace('index.html', 'script.js');

        // Remove any existing script with this ID
        const existingScript = document.getElementById(`script-${toolId}`);
        if (existingScript) {
            existingScript.remove();
        }

        // Create and load new script
        const script = document.createElement('script');
        script.id = `script-${toolId}`;
        script.src = scriptPath;
        script.onerror = () => {
            // It's okay if script doesn't exist, not all tools need custom JS
            console.log(`No custom script found for ${toolId}`);
        };
        document.body.appendChild(script);
    }

    clearCache() {
        this.toolCache = {};
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.toolsLoader = new ToolsLoader();
});
