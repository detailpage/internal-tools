import { NextRequest, NextResponse } from 'next/server'
import { getBCHeaders, convertInputToValues } from '@/lib/bluecitrus'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Keyword Finder API Request ===')
    const body = await request.json()
    console.log('Request body:', body)

    const { input, searchType = 'ai-phrase' } = body

    if (!input) {
      console.log('Error: Missing input')
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }

    const clientId = process.env.BC_CLIENT_ID
    const clientSecret = process.env.BC_CLIENT_SECRET

    console.log('Checking credentials...')
    console.log('BC_CLIENT_ID exists:', !!clientId)
    console.log('BC_CLIENT_SECRET exists:', !!clientSecret)

    if (!clientId || !clientSecret) {
      console.log('Error: Missing API credentials')
      return NextResponse.json({ error: 'API credentials not configured' }, { status: 500 })
    }

    const headers = await getBCHeaders(clientId, clientSecret)
    let url: string
    let payload: any
    let data: any

    // Handle different search types
    if (searchType === 'ai-phrase') {
      // AI Phrase Match - like-terms endpoint
      const phraseConverted = convertInputToValues(input, ',', '')
      url = 'https://api.bluecitrus.co/like-terms'
      payload = {
        'input_text': phraseConverted,
        'num_results': 100
      }
      console.log(`AI Phrase Match for: "${phraseConverted}"`)

    } else if (searchType === 'exact-match') {
      // Exact Match - keyword-fuzzy-landscape endpoint
      url = 'https://api.bluecitrus.co/keyword-fuzzy-landscape'
      payload = {
        'keyword_match': input,
        'row_limit': 1000,
        'domain': 'US'
      }
      console.log(`Exact Match for: "${input}"`)

    } else if (searchType === 'asin-lookup') {
      // ASIN Lookup - asin-vector-terms endpoint
      const asins = input.split(',').map((a: string) => a.trim()).filter((a: string) => a).slice(0, 5)
      url = 'https://api.bluecitrus.co/asin-vector-terms'
      payload = {
        'asins': asins,
        'num_terms': 100,
        'view': 'summary'
      }
      console.log(`ASIN Lookup for: ${asins.join(', ')}`)
    } else {
      return NextResponse.json({ error: 'Invalid search type' }, { status: 400 })
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`BlueCitrus API error: ${response.status}`, errorText)
      return NextResponse.json(
        { error: `BlueCitrus API request failed: ${response.status}` },
        { status: response.status }
      )
    }

    data = await response.json()

    // Handle exact-match response (has overview and asins structure)
    if (searchType === 'exact-match' && data.overview) {
      data = data.overview
    }

    if (!data || data.length === 0) {
      return NextResponse.json([['NO DATA']])
    }

    // Extract headers from first object
    const dataHeaders = Object.keys(data[0] || {})

    // Convert data to array format
    const dataArray = data.map((item: any) => Object.values(item))

    // Combine headers and data
    let combinedData = [dataHeaders].concat(dataArray)

    // Log column information for exact-match and asin-lookup to help with debugging
    if (searchType === 'exact-match') {
      console.log('=== EXACT MATCH COLUMNS ===')
      dataHeaders.forEach((header, index) => {
        console.log(`Column ${index} (user counting: ${index + 1}): ${header}`)
      })
      console.log('===========================')
    } else if (searchType === 'asin-lookup') {
      console.log('=== ASIN LOOKUP COLUMNS ===')
      dataHeaders.forEach((header, index) => {
        console.log(`Column ${index} (user counting: ${index + 1}): ${header}`)
      })
      console.log('===========================')
    }

    // Reorder columns based on search type
    if (searchType === 'ai-phrase') {
      // Move column 3 to column 1 (reorder: col2, col0, col1, ...rest)
      combinedData = combinedData.map(row => [row[2], row[0], row[1]].concat(row.slice(3)))
      combinedData[0][0] = 'Relevancy Rank'
    } else if (searchType === 'exact-match') {
      // Use columns 2, 1, and 12 (user counting from 1, so indices 1, 0, and 11)
      combinedData = combinedData.map(row => [row[1], row[0], row[11]])
    } else if (searchType === 'asin-lookup') {
      // Use columns 5, 2, and 3 (user counting from 1, so indices 4, 1, and 2)
      combinedData = combinedData.map(row => [row[4], row[1], row[2]])
    }

    // Format headers: remove underscores and make proper case
    combinedData[0] = combinedData[0].map((header: string) =>
      header.replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase())
    )

    console.log(`Successfully returned ${combinedData.length - 1} results`)

    return NextResponse.json(combinedData)

  } catch (error: any) {
    console.error('=== ERROR in /api/keyword-finder ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
