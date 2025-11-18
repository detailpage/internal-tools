import { NextRequest, NextResponse } from 'next/server'
import { getBCHeaders } from '@/lib/bluecitrus'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Keyword Universe API Request ===')
    const body = await request.json()
    console.log('Request body:', body)

    const { keywords, asins, levels = 2, ownBrand } = body

    // Check if we have any actual input
    const hasKeywords = keywords && keywords.trim().length > 0
    const hasAsins = asins && asins.trim().length > 0

    if (!hasKeywords && !hasAsins) {
      console.log('Error: Missing both keywords and ASINs')
      return NextResponse.json({ error: 'Either keywords or ASINs are required' }, { status: 400 })
    }

    const clientId = process.env.BC_CLIENT_ID
    const clientSecret = process.env.BC_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.log('Error: Missing API credentials')
      return NextResponse.json({ error: 'API credentials not configured' }, { status: 500 })
    }

    const headers = await getBCHeaders(clientId, clientSecret)

    // Process keywords and ASINs
    let kwList: string[] | null = null
    let asinList: string[] | null = null

    if (keywords) {
      // Split by newlines or commas, clean up, limit to 100
      kwList = keywords.split(/[\n,]/)
        .map((kw: string) => kw.trim().toLowerCase())
        .filter((kw: string) => kw)
        .slice(0, 100)
    }

    if (asins) {
      // Split by newlines or commas, clean up, limit to 10
      asinList = asins.split(/[\n,]/)
        .map((asin: string) => asin.trim().toUpperCase())
        .filter((asin: string) => asin)
        .slice(0, 10)
    }

    // Build payload
    const payload: any = {
      levels: levels,
      min_keyword_length: 5,
      return_keepa_data: false,
      search_volume_params: {
        A: 15000000,
        X: -0.5818,
        Y: -0.0205
      },
      domain: 'US'
    }

    if (kwList && kwList.length > 0) {
      payload.keywords = kwList
    }

    if (asinList && asinList.length > 0) {
      payload.asins = asinList
    }

    console.log('Payload:', JSON.stringify(payload, null, 2))

    // Call the keyword-flat-landscape endpoint
    const url = 'https://api.bluecitrus.co/keyword-flat-landscape'
    let response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`BlueCitrus API error: ${response.status}`, errorText)
      console.error('Request payload was:', JSON.stringify(payload, null, 2))
      return NextResponse.json(
        { error: `BlueCitrus API request failed: ${response.status} - ${errorText}` },
        { status: 500 }
      )
    }

    let data = await response.json()
    let overviewResult = data.overview || []

    // If no results, try fallback strategy
    if (!overviewResult || overviewResult.length === 0) {
      console.log('No results from initial request, attempting fallback...')

      // Use like-terms or asin-vector-terms to get seed keywords
      let fallbackKeywords: string[] = []

      if (kwList && kwList.length > 0) {
        // Try AI phrase match
        const likeTermsPayload = {
          input_text: kwList.join(' '),
          num_results: 10
        }
        const likeTermsResponse = await fetch('https://api.bluecitrus.co/like-terms', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(likeTermsPayload)
        })

        if (likeTermsResponse.ok) {
          const likeTermsData = await likeTermsResponse.json()
          fallbackKeywords = likeTermsData.slice(0, 10).map((item: any) => item.search_term || item.keyword)
        }
      } else if (asinList && asinList.length > 0) {
        // Try ASIN vector terms
        const asinPayload = {
          asins: [asinList[0]],
          num_terms: 10,
          view: 'summary'
        }
        const asinResponse = await fetch('https://api.bluecitrus.co/asin-vector-terms', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(asinPayload)
        })

        if (asinResponse.ok) {
          const asinData = await asinResponse.json()
          fallbackKeywords = asinData.slice(0, 10).map((item: any) => item.search_term || item.keyword)
        }
      }

      // Retry with fallback keywords
      if (fallbackKeywords.length > 0) {
        const fallbackPayload = { ...payload, keywords: fallbackKeywords }
        response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(fallbackPayload)
        })

        if (response.ok) {
          data = await response.json()
          overviewResult = data.overview || []
        }
      }
    }

    // Apply own brand filter if specified
    if (ownBrand && overviewResult && overviewResult.length > 0) {
      overviewResult = overviewResult.filter((item: any) =>
        !item.matched_brand ||
        item.matched_brand.trim() === '' ||
        item.matched_brand.toLowerCase() !== ownBrand.toLowerCase()
      )
    }

    if (!overviewResult || overviewResult.length === 0) {
      return NextResponse.json([['NO DATA']])
    }

    // Transform to array format matching the Google Sheets code
    const dataArray = overviewResult.map((item: any) => [
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
    ])

    const combinedData = [[
      'Search Term', 'Search Volume', 'Level', 'Branded Keyword',
      'ASIN1', 'ASIN2', 'ASIN3',
      'Click1', 'Click2', 'Click3',
      'Conv1', 'Conv2', 'Conv3'
    ]].concat(dataArray)

    console.log(`Successfully returned ${dataArray.length} keywords`)
    return NextResponse.json(combinedData)

  } catch (error: any) {
    console.error('=== ERROR in /api/keyword-universe ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Full error:', error)
    return NextResponse.json(
      { error: error.message, details: error.toString() },
      { status: 500 }
    )
  }
}
