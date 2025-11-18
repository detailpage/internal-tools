import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const TOKEN_CACHE_FILE = './token-cache.json';
const TOKEN_EXPIRY_MS = 3600000; // 1 hour

/**
 * Retrieves a cached token if it exists and is still valid
 */
function getCachedToken() {
  try {
    if (!fs.existsSync(TOKEN_CACHE_FILE)) {
      return null;
    }
    const cacheData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    const currentTime = Date.now();
    if (cacheData.token && cacheData.timestamp && (currentTime - cacheData.timestamp) < TOKEN_EXPIRY_MS) {
      console.log('Using cached token');
      return cacheData.token;
    }
    return null;
  } catch (error) {
    console.error('Error reading token cache:', error.message);
    return null;
  }
}

/**
 * Saves a token to the cache file
 */
function saveTokenToCache(token) {
  try {
    const cacheData = {
      token: token,
      timestamp: Date.now()
    };
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log('Token cached successfully');
  } catch (error) {
    console.error('Error saving token to cache:', error.message);
  }
}

/**
 * Retrieves a BlueCitrus API access token
 */
async function getBCToken(clientId, clientSecret) {
  const cachedToken = getCachedToken();
  if (cachedToken) {
    return cachedToken;
  }

  console.log('Fetching new access token from BlueCitrus API...');
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://api.bluecitrus.co/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      })
    });

    console.log('Token response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const jsonResponse = await response.json();
    const newAccessToken = jsonResponse.access_token;

    if (!newAccessToken) {
      throw new Error('No access token in response');
    }

    saveTokenToCache(newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error('Error fetching BC token:', error.message);
    throw error;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

/**
 * Helper function to create BlueCitrus API headers
 */
async function getBCHeaders(clientId, clientSecret) {
  const apiKeyValue = await getBCToken(clientId, clientSecret);
  return {
    'accept': 'application/json',
    'Authorization': `Bearer ${apiKeyValue}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Converts input phrase by removing/replacing characters
 */
function convertInputToValues(phrase, delimiter = ',', replacement = '') {
  return phrase.split(delimiter).map(p => p.trim()).join(replacement);
}

/**
 * API endpoint for keyword universe generator
 */
app.post('/api/keyword-universe', async (req, res) => {
  try {
    console.log('=== Keyword Universe API Request ===');
    console.log('Request body:', req.body);

    const { keywords, asins, levels = 2, ownBrand } = req.body;

    // Check if we have any actual input
    const hasKeywords = keywords && keywords.trim().length > 0;
    const hasAsins = asins && asins.trim().length > 0;

    if (!hasKeywords && !hasAsins) {
      console.log('Error: Missing both keywords and ASINs');
      return res.status(400).json({ error: 'Either keywords or ASINs are required' });
    }

    const clientId = process.env.BC_CLIENT_ID;
    const clientSecret = process.env.BC_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log('Error: Missing API credentials');
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const headers = await getBCHeaders(clientId, clientSecret);

    // Process keywords and ASINs
    let kwList = null;
    let asinList = null;

    if (keywords) {
      // Split by newlines or commas, clean up, limit to 100
      kwList = keywords.split(/[\n,]/)
        .map(kw => kw.trim().toLowerCase())
        .filter(kw => kw)
        .slice(0, 100);
    }

    if (asins) {
      // Split by newlines or commas, clean up, limit to 10
      asinList = asins.split(/[\n,]/)
        .map(asin => asin.trim().toUpperCase())
        .filter(asin => asin)
        .slice(0, 10);
    }

    // Build payload
    const payload = {
      levels: levels,
      min_keyword_length: 5,
      return_keepa_data: false,
      search_volume_params: {
        A: 15000000,
        X: -0.5818,
        Y: -0.0205
      },
      domain: 'US'
    };

    if (kwList && kwList.length > 0) {
      payload.keywords = kwList;
    }

    if (asinList && asinList.length > 0) {
      payload.asins = asinList;
    }

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Call the keyword-flat-landscape endpoint
    const url = 'https://api.bluecitrus.co/keyword-flat-landscape';
    let response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BlueCitrus API error: ${response.status}`, errorText);
      console.error('Request payload was:', JSON.stringify(payload, null, 2));
      return res.status(500).json({
        error: `BlueCitrus API request failed: ${response.status} - ${errorText}`
      });
    }

    let data = await response.json();
    let overviewResult = data.overview || [];

    // If no results, try fallback strategy
    if (!overviewResult || overviewResult.length === 0) {
      console.log('No results from initial request, attempting fallback...');

      // Use like-terms or asin-vector-terms to get seed keywords
      let fallbackKeywords = [];

      if (kwList && kwList.length > 0) {
        // Try AI phrase match
        const likeTermsPayload = {
          input_text: kwList.join(' '),
          num_results: 10
        };
        const likeTermsResponse = await fetch('https://api.bluecitrus.co/like-terms', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(likeTermsPayload)
        });

        if (likeTermsResponse.ok) {
          const likeTermsData = await likeTermsResponse.json();
          fallbackKeywords = likeTermsData.slice(0, 10).map(item => item.search_term || item.keyword);
        }
      } else if (asinList && asinList.length > 0) {
        // Try ASIN vector terms
        const asinPayload = {
          asins: [asinList[0]],
          num_terms: 10,
          view: 'summary'
        };
        const asinResponse = await fetch('https://api.bluecitrus.co/asin-vector-terms', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(asinPayload)
        });

        if (asinResponse.ok) {
          const asinData = await asinResponse.json();
          fallbackKeywords = asinData.slice(0, 10).map(item => item.search_term || item.keyword);
        }
      }

      // Retry with fallback keywords
      if (fallbackKeywords.length > 0) {
        const fallbackPayload = { ...payload, keywords: fallbackKeywords };
        response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(fallbackPayload)
        });

        if (response.ok) {
          data = await response.json();
          overviewResult = data.overview || [];
        }
      }
    }

    // Apply own brand filter if specified
    if (ownBrand && overviewResult && overviewResult.length > 0) {
      overviewResult = overviewResult.filter(item =>
        !item.matched_brand ||
        item.matched_brand.trim() === '' ||
        item.matched_brand.toLowerCase() !== ownBrand.toLowerCase()
      );
    }

    if (!overviewResult || overviewResult.length === 0) {
      return res.json([['NO DATA']]);
    }

    // Transform to array format matching the Google Sheets code
    const dataArray = overviewResult.map(item => [
      item.search_term,
      item.search_volume,
      item.level,
      item.matched_brand || '',
      item.num_1_asin || '',
      item.num_2_asin || '',
      item.num_3_asin || '',
      (item.num_1_click_share || 0) / 100,
      (item.num_2_click_share || 0) / 100,
      (item.num_3_click_share || 0) / 100,
      (item.num_1_conversion_share || 0) / 100,
      (item.num_2_conversion_share || 0) / 100,
      (item.num_3_conversion_share || 0) / 100
    ]);

    const combinedData = [[
      'Search Term', 'Search Volume', 'Level', 'Branded Keyword',
      'ASIN1', 'ASIN2', 'ASIN3',
      'Click1', 'Click2', 'Click3',
      'Conv1', 'Conv2', 'Conv3'
    ]].concat(dataArray);

    console.log(`Successfully returned ${dataArray.length} keywords`);
    res.json(combinedData);

  } catch (error) {
    console.error('=== ERROR in /api/keyword-universe ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
});

/**
 * API endpoint for keyword history
 */
app.post('/api/keyword-history', async (req, res) => {
  try {
    console.log('=== Keyword History API Request ===');
    console.log('Request body:', req.body);

    const { keywords } = req.body;

    if (!keywords || keywords.trim().length === 0) {
      console.log('Error: Missing keywords');
      return res.status(400).json({ error: 'Keywords are required' });
    }

    const clientId = process.env.BC_CLIENT_ID;
    const clientSecret = process.env.BC_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log('Error: Missing API credentials');
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const headers = await getBCHeaders(clientId, clientSecret);

    // Process keywords - split by newlines or commas, limit to 10
    const kwList = keywords.split(/[\n,]/)
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw)
      .slice(0, 10);

    const payload = {
      keywords: kwList
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Call the keyword-volume-history endpoint
    const url = 'https://api.bluecitrus.co/keyword-volume-history';
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BlueCitrus API error: ${response.status}`, errorText);
      return res.status(500).json({
        error: `BlueCitrus API request failed: ${response.status} - ${errorText}`
      });
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json([['NO DATA']]);
    }

    // Transform data to pivot table format
    // Input: array of {year, month, search_term, search_volume_estimate}
    // Output: Date column + one column per keyword

    const dataArray = data.map(item => {
      const date = `${item.year}-${String(item.month).padStart(2, '0')}`;
      return [date, item.search_term, item.search_volume_estimate];
    });

    // Get unique keywords
    const uniqueKeywords = [...new Set(dataArray.map(item => item[1]))];

    // Get unique dates and sort
    const uniqueDates = [...new Set(dataArray.map(item => item[0]))].sort();

    // Initialize pivot table with headers
    const pivotData = [['Date'].concat(uniqueKeywords)];

    // Fill in the pivot data
    uniqueDates.forEach(date => {
      const row = [date];
      uniqueKeywords.forEach(keyword => {
        const found = dataArray.find(item => item[0] === date && item[1] === keyword);
        row.push(found ? found[2] : '');
      });
      pivotData.push(row);
    });

    // Fill blanks with decay algorithm (forward fill)
    function fillBlanks(data, direction = 'forward') {
      const length = data.length;
      const start = direction === 'forward' ? 1 : length - 1;
      const end = direction === 'forward' ? length : 0;
      const step = direction === 'forward' ? 1 : -1;

      for (let j = 1; j < data[0].length; j++) {
        let previousValue = null;
        for (let i = start; i !== end; i += step) {
          if (data[i][j] !== '') {
            previousValue = data[i][j];
          } else if (previousValue !== null) {
            const randomDecay = Math.random() * (0.9 - 0.5) + 0.5;
            previousValue = Math.min(previousValue, 1000);
            const decayedValue = Math.round(previousValue * randomDecay);
            data[i][j] = decayedValue;
            previousValue = decayedValue;
          }
        }
      }
    }

    // Forward and backward fill
    fillBlanks(pivotData, 'forward');
    fillBlanks(pivotData, 'backward');

    console.log(`Successfully returned ${uniqueDates.length} date entries for ${uniqueKeywords.length} keywords`);
    res.json(pivotData);

  } catch (error) {
    console.error('=== ERROR in /api/keyword-history ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
});

/**
 * API endpoint for keyword finder
 */
app.post('/api/keyword-finder', async (req, res) => {
  try {
    console.log('=== Keyword Finder API Request ===');
    console.log('Request body:', req.body);

    const { input, searchType = 'ai-phrase' } = req.body;

    if (!input) {
      console.log('Error: Missing input');
      return res.status(400).json({ error: 'Input is required' });
    }

    const clientId = process.env.BC_CLIENT_ID;
    const clientSecret = process.env.BC_CLIENT_SECRET;

    console.log('Checking credentials...');
    console.log('BC_CLIENT_ID exists:', !!clientId);
    console.log('BC_CLIENT_SECRET exists:', !!clientSecret);

    if (!clientId || !clientSecret) {
      console.log('Error: Missing API credentials');
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const headers = await getBCHeaders(clientId, clientSecret);
    let url, payload, data;

    // Handle different search types
    if (searchType === 'ai-phrase') {
      // AI Phrase Match - like-terms endpoint
      const phraseConverted = convertInputToValues(input, ',', '');
      url = 'https://api.bluecitrus.co/like-terms';
      payload = {
        'input_text': phraseConverted,
        'num_results': 100
      };
      console.log(`AI Phrase Match for: "${phraseConverted}"`);

    } else if (searchType === 'exact-match') {
      // Exact Match - keyword-fuzzy-landscape endpoint
      url = 'https://api.bluecitrus.co/keyword-fuzzy-landscape';
      payload = {
        'keyword_match': input,
        'row_limit': 1000,
        'domain': 'US'
      };
      console.log(`Exact Match for: "${input}"`);

    } else if (searchType === 'asin-lookup') {
      // ASIN Lookup - asin-vector-terms endpoint
      const asins = input.split(',').map(a => a.trim()).filter(a => a).slice(0, 5);
      url = 'https://api.bluecitrus.co/asin-vector-terms';
      payload = {
        'asins': asins,
        'num_terms': 100,
        'view': 'summary'
      };
      console.log(`ASIN Lookup for: ${asins.join(', ')}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BlueCitrus API error: ${response.status}`, errorText);
      return res.status(response.status).json({
        error: `BlueCitrus API request failed: ${response.status}`
      });
    }

    data = await response.json();

    // Handle exact-match response (has overview and asins structure)
    if (searchType === 'exact-match' && data.overview) {
      data = data.overview;
    }

    if (!data || data.length === 0) {
      return res.json([['NO DATA']]);
    }

    // Extract headers from first object
    const dataHeaders = Object.keys(data[0] || {});

    // Convert data to array format
    const dataArray = data.map(item => Object.values(item));

    // Combine headers and data
    let combinedData = [dataHeaders].concat(dataArray);

    // Log column information for exact-match and asin-lookup to help with debugging
    if (searchType === 'exact-match') {
      console.log('=== EXACT MATCH COLUMNS ===');
      dataHeaders.forEach((header, index) => {
        console.log(`Column ${index} (user counting: ${index + 1}): ${header}`);
      });
      console.log('===========================');
    } else if (searchType === 'asin-lookup') {
      console.log('=== ASIN LOOKUP COLUMNS ===');
      dataHeaders.forEach((header, index) => {
        console.log(`Column ${index} (user counting: ${index + 1}): ${header}`);
      });
      console.log('===========================');
    }

    // Reorder columns based on search type
    if (searchType === 'ai-phrase') {
      // Move column 3 to column 1 (reorder: col2, col0, col1, ...rest)
      combinedData = combinedData.map(row => [row[2], row[0], row[1]].concat(row.slice(3)));
      combinedData[0][0] = 'Relevancy Rank';
    } else if (searchType === 'exact-match') {
      // Use columns 2, 1, and 12 (user counting from 1, so indices 1, 0, and 11)
      combinedData = combinedData.map(row => [row[1], row[0], row[11]]);
    } else if (searchType === 'asin-lookup') {
      // Use columns 5, 2, and 3 (user counting from 1, so indices 4, 1, and 2)
      combinedData = combinedData.map(row => [row[4], row[1], row[2]]);
    }

    // Format headers: remove underscores and make proper case
    combinedData[0] = combinedData[0].map(header =>
      header.replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase())
    );

    console.log(`Successfully returned ${combinedData.length - 1} results`);

    res.json(combinedData);

  } catch (error) {
    console.error('=== ERROR in /api/keyword-finder ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'prototype.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Client Tools Server running on http://localhost:${PORT}`);
  console.log(`📝 Open http://localhost:${PORT}/prototype.html in your browser\n`);
});
