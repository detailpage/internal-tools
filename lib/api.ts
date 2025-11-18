// API helper for calling backend endpoints
// Uses relative paths to work with Next.js API routes (works on Vercel and locally)

// Force empty string - never use environment variables for API base URL
const API_BASE_URL = ''

// Verify we're using relative paths
if (typeof window !== 'undefined') {
  console.log('API Base URL:', API_BASE_URL || '(relative paths)')
}

export async function fetchKeywordFinder(searchTerm: string, searchType: string) {
  const response = await fetch(`${API_BASE_URL}/api/keyword-finder`, {
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
