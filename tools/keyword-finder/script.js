/**
 * Keyword Finder Tool - BlueCitrus API Integration
 */

(function() {
    console.log('Keyword Finder script loaded');

    let currentResults = null;

    // Wait for DOM to be ready
    const initKeywordFinder = () => {
        const submitBtn = document.getElementById('kf-submit');
        const clearBtn = document.getElementById('kf-clear');
        const exportBtn = document.getElementById('kf-export');

        if (!submitBtn) {
            setTimeout(initKeywordFinder, 100);
            return;
        }

        // Submit button handler
        submitBtn.addEventListener('click', handleSearch);

        // Clear button handler
        clearBtn.addEventListener('click', () => {
            document.getElementById('kf-search-term').value = '';
            document.getElementById('kf-results-section').style.display = 'none';
            clearBtn.style.display = 'none';
            exportBtn.style.display = 'none';
            currentResults = null;
        });

        // Export button handler
        exportBtn.addEventListener('click', exportToCSV);

        // Enter key handler
        document.getElementById('kf-search-term').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    };

    async function handleSearch() {
        const searchTerm = document.getElementById('kf-search-term').value.trim();
        const numKeywords = parseInt(document.getElementById('kf-num-keywords').value);

        if (!searchTerm) {
            alert('Please enter a search phrase');
            return;
        }

        // Show loading state
        const loadingDiv = document.getElementById('kf-loading');
        const resultsSection = document.getElementById('kf-results-section');

        resultsSection.style.display = 'none';
        loadingDiv.style.display = 'block';

        try {
            // Call the API
            const results = await fetchKeywords(searchTerm, numKeywords);

            // Display results
            displayResults(results, searchTerm);

        } catch (error) {
            console.error('Error fetching keywords:', error);
            showError(error.message);
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    async function fetchKeywords(phrase, numKWs) {
        // TODO: Replace with your actual API endpoint
        // For now, this calls a backend endpoint that you'll need to create
        const response = await fetch('/api/keyword-finder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phrase: phrase,
                numKWs: numKWs
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    }

    function displayResults(data, searchPhrase) {
        if (!data || data.length === 0) {
            showError('No keywords found');
            return;
        }

        currentResults = data;

        // First row is headers
        const headers = data[0];
        const rows = data.slice(1);

        // Update search phrase display
        document.getElementById('kf-search-phrase').textContent = searchPhrase;
        document.getElementById('kf-result-count').textContent = rows.length;

        // Build table HTML
        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-striped table-hover">
                    <thead class="table-light">
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, idx) => `
                            <tr>
                                ${row.map((cell, cellIdx) => `
                                    <td>${cellIdx === 0 ? `<strong>${cell}</strong>` : cell}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('kf-results').innerHTML = tableHTML;
        document.getElementById('kf-results-section').style.display = 'block';
        document.getElementById('kf-clear').style.display = 'inline-block';
        document.getElementById('kf-export').style.display = 'inline-block';
    }

    function showError(message) {
        const resultsSection = document.getElementById('kf-results-section');
        const resultsDiv = document.getElementById('kf-results');

        resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Error:</strong> ${message}
            </div>
        `;

        resultsSection.style.display = 'block';
    }

    function exportToCSV() {
        if (!currentResults) return;

        // Convert array to CSV
        const csv = currentResults.map(row =>
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keyword-finder-results-${new Date().getTime()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Initialize
    initKeywordFinder();
})();
