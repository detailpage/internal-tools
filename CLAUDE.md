# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
# Development mode (runs both Next.js frontend and Express API backend)
npm run dev

# Build for production
npm run build

# Production mode
npm start

# Run API server only
npm run api
```

### Initial Setup
```bash
# Install dependencies
npm install

# Configure API credentials (required)
# Create .env file with:
# BC_CLIENT_ID=your_bluecitrus_client_id
# BC_CLIENT_SECRET=your_bluecitrus_client_secret
# APIKey-Keepa=your_keepa_api_key_here  # For future Keepa integration

# IMPORTANT: Do NOT set NEXT_PUBLIC_API_URL or similar variables
# The app uses relative paths (/api/*) which work on both localhost and Vercel
```

### Access the Application
- Main application (Next.js): http://localhost:3000/
- API server: http://localhost:3001/
- Legacy prototype: http://localhost:3001/prototype.html (still accessible)

## Architecture Overview

### Next.js + Express Architecture (Current)

The application now follows the **DetailPage Agent Playbook** guidelines with a modern stack:

**Frontend (Next.js App Router):**
- **Framework**: Next.js 16 with React 19 and TypeScript
- **Location**: `/app` directory
  - `app/layout.tsx` - Root layout with Bootstrap CSS and global styles
  - `app/page.tsx` - Main page with sidebar navigation and tool routing
  - `app/components/` - React components for each tool
  - `app/globals.css` - Global styles using DetailPage brand tokens
- **Styling**: Bootstrap 5.3.8 with custom CSS variables for brand colors
- **Brand Colors**: Primary `#0BBBDF`, Accent `#FF9900`, per guidelines
- **Navigation**: React state-based tool switching
- **Charts**: Chart.js with react-chartjs-2 wrapper
- **API Client**: `/lib/api.ts` - Fetch helpers for backend endpoints

**Backend (Express.js API Server):**
- **Port**: 3001 (separate from Next.js on 3000)
- Express.js server handling BlueCitrus API integration
- Token caching mechanism (1-hour expiry in `token-cache.json`)
- API endpoints namespace: `/api/{tool-name}`
- All endpoints return data in array-of-arrays format for consistent frontend handling
- CORS configured to allow requests from Next.js frontend

**Legacy Code:**
- `prototype.html` - Original single-file SPA (still functional, served by Express)
- `tools/` directory - Unused modular loading system
- Can be removed in future cleanup

## Implemented Tools

### 1. Keyword Finder (`/api/keyword-finder`)
Three search modes via radio buttons:
- **AI Phrase Match**: Uses `/like-terms` endpoint, returns columns 2,0,1 (Relevancy Rank, Keyword, Search Volume)
- **Exact Match**: Uses `/keyword-fuzzy-landscape` endpoint, returns columns 2,1,12 (user counting from 1, not 0)
- **ASIN Lookup**: Uses `/asin-vector-terms` endpoint, returns columns 5,2,3

Features:
- Checkboxes on each result row (top 10 auto-selected)
- "Select All" checkbox in header
- Action buttons appear when keywords selected: "Generate Keyword Universe" and "View Keyword History"
- Clicking action buttons navigates to target tool, populates keywords, and auto-submits

### 2. Keyword Universe Generator (`/api/keyword-universe`)
Uses `/keyword-flat-landscape` endpoint
- Accepts keywords AND/OR ASINs (up to 100 keywords, 10 ASINs)
- Relevancy levels 1-4 (default: 2)
- Returns 13 columns: Search Term, Search Volume, Level, Branded Keyword, ASIN1-3, Click1-3, Conv1-3
- Visual separator lines between level changes (e.g., Level 1 → Level 2)
- ASINs in columns 5-7 are hyperlinked to Amazon product pages
- Collapsible form (collapses after search, expands on hover or click)

### 3. Keyword History (`/api/keyword-history`)
Uses `/keyword-volume-history` endpoint
- Accepts up to 10 keywords
- Returns pivot table: Date column + one column per keyword
- Forward/backward fill algorithm for missing data (random decay 0.5-0.9)
- Chart.js line chart showing trends over time
- Data table below chart
- Collapsible form pattern

## BlueCitrus API Integration

### Authentication Flow
1. Check `token-cache.json` for valid cached token (< 1 hour old)
2. If missing/expired, fetch new token from `https://api.bluecitrus.co/token`
3. Use Basic auth with base64-encoded `clientId:clientSecret`
4. Cache token with timestamp for subsequent requests

### Response Transformation Pattern
Backend converts BlueCitrus API responses to array-of-arrays format:
```javascript
[
  ["Header1", "Header2", "Header3"],  // Row 0: Headers
  [value1, value2, value3],            // Row 1: Data
  [value1, value2, value3]             // Row 2: Data
]
```

### Column Selection Strategy
When BlueCitrus returns many columns, we select specific ones based on user requirements:
- Use zero-based indexing in code
- When user specifies columns (e.g., "columns 2, 1, 12"), they count from 1
- Convert: user column N → array index N-1
- Add logging to debug column selection: `console.log('Column ${index} (user counting: ${index + 1}): ${header}')`

## Adding New Tools

Follow the Next.js component-based pattern:

### 1. Create Component in `app/components/`
Create `app/components/NewTool.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { fetchNewTool } from '@/lib/api'

interface NewToolProps {
  onNavigateToTool?: (tool: string, data?: any) => void
}

export default function NewTool({ onNavigateToTool }: NewToolProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    try {
      const data = await fetchNewTool(input)
      setResults(data)
      setIsFormCollapsed(true)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tool-content active">
      <div className="tool-header">
        <h2><i className="fas fa-icon"></i> Tool Name</h2>
        <p>Tool description</p>
      </div>
      {/* Form, loading, and results sections */}
    </div>
  )
}
```

### 2. Add API Helper to `lib/api.ts`
```typescript
export async function fetchNewTool(param: string) {
  const response = await fetch(`${API_BASE_URL}/api/new-tool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ param }),
  })
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}
```

### 3. Add Backend Endpoint to `server.js`
Add before the final `app.listen()`:
```javascript
app.post('/api/new-tool', async (req, res) => {
    try {
        const headers = await getBCHeaders(clientId, clientSecret);
        const response = await fetch('https://api.bluecitrus.co/endpoint', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        // Transform to array-of-arrays format
        res.json(combinedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 4. Update Main Page (`app/page.tsx`)
Add to imports:
```typescript
import NewTool from './components/NewTool'
```

Add to type definition:
```typescript
type Tool = 'keyword-finder' | 'keyword-universe' | 'keyword-history' | 'new-tool'
```

Add to sidebar:
```tsx
<li className={`tool-item ${activeTool === 'new-tool' ? 'active' : ''}`}
    onClick={() => setActiveTool('new-tool')}>
  <i className="fas fa-icon me-2"></i>
  New Tool
</li>
```

Add to content area:
```tsx
{activeTool === 'new-tool' && <NewTool onNavigateToTool={navigateToTool} />}
```

## UI/UX Patterns

### Collapsible Forms
Most tools use collapsible forms that:
- Auto-collapse after submitting search
- Expand on hover over collapsed header
- Can be toggled by clicking the header
- Use chevron icon to indicate state (up = expanded, down = collapsed)

### Form Elements
- **Info bubbles**: Add tooltips with `<i className="fas fa-question-circle" title="Tooltip text"></i>` (styled via CSS)
- **Badges**: Use `<span className="badge-info">Text</span>` for limits like "Up to 10"
- **Spacing**: Add `style={{marginTop: '1.5rem'}}` between form sections to prevent elements sitting on top of each other

### Tables
- Use Bootstrap table classes: `table table-sm table-striped table-hover`
- Headers: primary color background (CSS variable `var(--color-primary)`) with white text
- Format numbers with commas: `Number(value).toLocaleString('en-US')`
- Format percentages: Multiply by 100 and add `%`
- Amazon icon links: Use Font Awesome `<i className="fab fa-amazon"></i>` with orange color (`#FF9900`)

### Visual Separators
- Add 3px borders between grouped data: `style={{ borderTop: '3px solid var(--color-primary)' }}`
- Check if level/category changed: `const needsSeparator = idx > 0 && rows[idx - 1][2] !== level;`

## Important Implementation Notes

### Component State Management (Next.js)
- Each tool is a React component with its own state using `useState`
- State variables: `results`, `loading`, `isFormCollapsed`, etc.
- Chart instances managed via useEffect hooks
- Props passed for cross-tool navigation: `onNavigateToTool`

### Cross-Tool Integration
- Tools navigate via callback: `onNavigateToTool('tool-name', data)`
- Main page manages active tool state and passes initial data
- Data flows: parent → child via props, child → parent via callbacks
- `useEffect` hooks respond to prop changes for auto-submit behavior

### API Request Pattern
All tools follow this pattern:
1. Validate input
2. Show loading state (`display: block` on loading div)
3. Call backend API endpoint (`fetch('/api/tool-name')`)
4. Transform and display results
5. Hide loading state
6. Handle errors gracefully (show error message in results area)
