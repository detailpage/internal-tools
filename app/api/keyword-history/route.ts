import { NextRequest, NextResponse } from 'next/server'
import { getBCHeaders } from '@/lib/bluecitrus'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Keyword History API Request ===')
    const body = await request.json()
    console.log('Request body:', body)

    const { keywords } = body

    if (!keywords || keywords.trim().length === 0) {
      console.log('Error: Missing keywords')
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 })
    }

    const clientId = process.env.BC_CLIENT_ID
    const clientSecret = process.env.BC_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.log('Error: Missing API credentials')
      return NextResponse.json({ error: 'API credentials not configured' }, { status: 500 })
    }

    const headers = await getBCHeaders(clientId, clientSecret)

    // Process keywords - split by newlines or commas, limit to 10
    const kwList = keywords.split(/[\n,]/)
      .map((kw: string) => kw.trim().toLowerCase())
      .filter((kw: string) => kw)
      .slice(0, 10)

    const payload = {
      keywords: kwList
    }

    console.log('Payload:', JSON.stringify(payload, null, 2))

    // Call the keyword-volume-history endpoint
    const url = 'https://api.bluecitrus.co/keyword-volume-history'
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`BlueCitrus API error: ${response.status}`, errorText)
      return NextResponse.json(
        { error: `BlueCitrus API request failed: ${response.status} - ${errorText}` },
        { status: 500 }
      )
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      return NextResponse.json([['NO DATA']])
    }

    // Transform data to pivot table format
    // Input: array of {year, month, search_term, search_volume_estimate}
    // Output: Date column + one column per keyword

    const dataArray = data.map((item: any) => {
      const date = `${item.year}-${String(item.month).padStart(2, '0')}`
      return [date, item.search_term, item.search_volume_estimate]
    })

    // Get unique keywords
    const uniqueKeywords: string[] = [...new Set(dataArray.map((item: any[]) => item[1] as string))]

    // Get unique dates and sort
    const uniqueDates: string[] = [...new Set(dataArray.map((item: any[]) => item[0] as string))].sort()

    // Initialize pivot table with headers
    const pivotData: any[][] = [['Date'].concat(uniqueKeywords)]

    // Fill in the pivot data
    uniqueDates.forEach((date) => {
      const row: any[] = [date]
      uniqueKeywords.forEach((keyword) => {
        const found = dataArray.find((item: any[]) => item[0] === date && item[1] === keyword)
        row.push(found ? found[2] : '')
      })
      pivotData.push(row)
    })

    // Fill blanks with decay algorithm (forward fill)
    function fillBlanks(data: any[][], direction: 'forward' | 'backward' = 'forward') {
      const length = data.length
      const start = direction === 'forward' ? 1 : length - 1
      const end = direction === 'forward' ? length : 0
      const step = direction === 'forward' ? 1 : -1

      for (let j = 1; j < data[0].length; j++) {
        let previousValue: number | null = null
        for (let i = start; i !== end; i += step) {
          if (data[i][j] !== '') {
            previousValue = data[i][j]
          } else if (previousValue !== null) {
            const randomDecay = Math.random() * (0.9 - 0.5) + 0.5
            previousValue = Math.min(previousValue, 1000)
            const decayedValue = Math.round(previousValue * randomDecay)
            data[i][j] = decayedValue
            previousValue = decayedValue
          }
        }
      }
    }

    // Forward and backward fill
    fillBlanks(pivotData, 'forward')
    fillBlanks(pivotData, 'backward')

    console.log(`Successfully returned ${uniqueDates.length} date entries for ${uniqueKeywords.length} keywords`)
    return NextResponse.json(pivotData)

  } catch (error: any) {
    console.error('=== ERROR in /api/keyword-history ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message, details: error.toString() },
      { status: 500 }
    )
  }
}
