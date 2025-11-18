// BlueCitrus API utilities for Next.js API routes

let tokenCache: { token: string; timestamp: number } | null = null
const TOKEN_EXPIRY_MS = 3600000 // 1 hour

/**
 * Retrieves a BlueCitrus API access token
 */
export async function getBCToken(clientId: string, clientSecret: string): Promise<string> {
  // Check cache
  if (tokenCache && (Date.now() - tokenCache.timestamp) < TOKEN_EXPIRY_MS) {
    console.log('Using cached token')
    return tokenCache.token
  }

  console.log('Fetching new access token from BlueCitrus API...')
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch('https://api.bluecitrus.co/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials'
    })
  })

  console.log('Token response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed with status ${response.status}: ${errorText}`)
  }

  const jsonResponse = await response.json()
  const newAccessToken = jsonResponse.access_token

  if (!newAccessToken) {
    throw new Error('No access token in response')
  }

  // Cache token in memory
  tokenCache = {
    token: newAccessToken,
    timestamp: Date.now()
  }

  console.log('Token cached successfully')
  return newAccessToken
}

/**
 * Helper function to create BlueCitrus API headers
 */
export async function getBCHeaders(clientId: string, clientSecret: string) {
  const apiKeyValue = await getBCToken(clientId, clientSecret)
  return {
    'accept': 'application/json',
    'Authorization': `Bearer ${apiKeyValue}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Converts input phrase by removing/replacing characters
 */
export function convertInputToValues(phrase: string, splitChar: string, joinChar: string): string {
  const phraseRemoveSymbols = phrase.replace(/[^a-zA-Z0-9,.\s-]/g, '')
  const phraseArray = phraseRemoveSymbols.split(splitChar).map(s => s.trim()).filter(s => s)
  return phraseArray.join(joinChar)
}
