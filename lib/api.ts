// API helper for calling backend endpoints
// Uses relative paths to work with Next.js API routes (works on Vercel and locally)

// Force empty string - never use environment variables for API base URL
const API_BASE_URL = ''

// Log environment check
if (typeof window !== 'undefined') {
  console.log('%c=== API CONFIGURATION DEBUG ===', 'background: #0BBBDF; color: white; font-size: 16px; padding: 4px;')
  console.log('%cAPI_BASE_URL:', 'font-weight: bold', API_BASE_URL)
  console.log('%cprocess.env.NEXT_PUBLIC_API_URL:', 'font-weight: bold', process.env.NEXT_PUBLIC_API_URL)
  console.log('%cWindow location:', 'font-weight: bold', window.location.origin)
  console.log('%c==============================', 'background: #0BBBDF; color: white; font-size: 16px; padding: 4px;')

  // Alert if problematic env var is set
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.error('%c⚠️ WARNING: NEXT_PUBLIC_API_URL is set to: ' + process.env.NEXT_PUBLIC_API_URL,
      'background: red; color: white; font-size: 14px; padding: 4px;')
  }
}

export async function fetchKeywordFinder(searchTerm: string, searchType: string) {
  const fullUrl = `${API_BASE_URL}/api/keyword-finder`
  console.log('%c🔍 Keyword Finder - Calling URL:', 'color: #0BBBDF; font-weight: bold; font-size: 14px;', fullUrl)
  console.log('%c🔍 Keyword Finder - Full resolved URL:', 'color: #0BBBDF; font-weight: bold; font-size: 14px;', new URL(fullUrl, window.location.origin).href)

  // Additional diagnostic
  console.log('%c📍 Current window.location.href:', 'color: purple; font-weight: bold;', window.location.href)

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: searchTerm, searchType }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch keywords')
  }

  return response.json()
}

export async function fetchKeywordUniverse(keywords: string[], asins: string[], relevancyLevel: number) {
  const response = await fetch(`${API_BASE_URL}/api/keyword-universe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keywords: keywords.join('\n'),
      asins: asins.join('\n'),
      levels: relevancyLevel
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch keyword universe')
  }

  return response.json()
}

export async function fetchKeywordHistory(keywords: string[]) {
  const response = await fetch(`${API_BASE_URL}/api/keyword-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ keywords: keywords.join('\n') }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch keyword history')
  }

  return response.json()
}
