# DetailPage Client Tools

A modular suite of data analytics tools for keyword research, conversion analysis, and competitive intelligence.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API credentials:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your BlueCitrus API credentials.

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000/prototype.html
   ```

## Features

### Current Tools
- **Keyword Finder** - AI-powered keyword discovery using BlueCitrus API
  - Semantic keyword matching
  - Configurable result count (10-500 keywords)
  - CSV export functionality
  - Relevancy ranking

### Coming Soon
- Keyword Universe Generator
- Keyword History Tracking
- Search Results Analysis
- Customer Reviews Analysis
- Image Analysis
- Item Information Tools
- ASIN List Tools
- Buy Box Analysis
- Indexing & Content Audits

## Project Structure

```
ClientToolsMenu/
├── prototype.html          # Main application shell
├── server.js              # Express server with API endpoints
├── js/
│   └── tools-loader.js    # Dynamic tool loading system
├── tools/
│   └── keyword-finder/    # Individual tool modules
│       ├── index.html     # Tool UI
│       └── script.js      # Tool logic
├── KeywordFinderOld/      # Original implementation reference
│   └── auth.js           # BlueCitrus authentication
└── .env                   # API credentials (not in git)
```

## Architecture

### Modular Design
Each tool is completely isolated in its own folder with:
- `index.html` - Tool-specific UI
- `script.js` - Tool-specific functionality
- Optional `style.css` - Tool-specific styles

### API Integration
The Express server provides REST endpoints that:
- Handle authentication with BlueCitrus API
- Cache tokens (1 hour expiry)
- Transform data for frontend consumption
- Manage CORS and security

### Adding New Tools
1. Create a new folder in `tools/`
2. Add `index.html` with your tool UI
3. Add `script.js` with tool functionality
4. Update `js/tools-loader.js` toolPaths object
5. Tool automatically appears in navigation!

## Development

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### POST /api/keyword-finder
Find related keywords using BlueCitrus AI.

**Request:**
```json
{
  "phrase": "wireless headphones",
  "numKWs": 50
}
```

**Response:**
```json
[
  ["Relevancy Rank", "Keyword", "Search Volume", ...],
  [1, "wireless headphones", 45000, ...],
  [2, "bluetooth headphones", 33000, ...]
]
```

## Environment Variables

- `BC_CLIENT_ID` - BlueCitrus API client ID
- `BC_CLIENT_SECRET` - BlueCitrus API client secret
- `PORT` - Server port (default: 3000)

## Security Notes

- Never commit `.env` file to git
- Token cache expires after 1 hour
- CORS enabled for local development
- API credentials validated on each request

## License

Proprietary - DetailPage Internal Use Only
