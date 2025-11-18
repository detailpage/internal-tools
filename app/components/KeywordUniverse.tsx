'use client'

import { useState, useEffect } from 'react'
import { fetchKeywordUniverse } from '@/lib/api'

interface KeywordUniverseProps {
  initialKeywords?: string[]
}

export default function KeywordUniverse({ initialKeywords = [] }: KeywordUniverseProps) {
  const [keywords, setKeywords] = useState('')
  const [asins, setAsins] = useState('')
  const [relevancyLevel, setRelevancyLevel] = useState(2)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)

  useEffect(() => {
    if (initialKeywords.length > 0) {
      setKeywords(initialKeywords.join('\n'))
      handleSearch(initialKeywords, [], relevancyLevel)
    }
  }, [initialKeywords])

  const handleSearch = async (kw?: string[], asn?: string[], level?: number) => {
    const keywordList = kw || keywords.split('\n').map(k => k.trim()).filter(Boolean)
    const asinList = asn || asins.split(/[,\n]/).map(a => a.trim()).filter(Boolean)

    if (keywordList.length === 0 && asinList.length === 0) {
      alert('Please enter at least one keyword or ASIN')
      return
    }

    if (keywordList.length > 100) {
      alert('Please limit keywords to 100 maximum')
      return
    }

    if (asinList.length > 10) {
      alert('Please limit ASINs to 10 maximum')
      return
    }

    setLoading(true)
    try {
      const data = await fetchKeywordUniverse(keywordList, asinList, level || relevancyLevel)
      setResults(data)
      setIsFormCollapsed(true)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch keyword universe'}`)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (results.length === 0) return

    const csvContent = results.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keyword-universe-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="keyword-universe" className="tool-content active">
      <div className="tool-header">
        <h2><i className="fas fa-globe"></i> Keyword Universe Generator</h2>
        <p>Expand keywords and ASINs into a comprehensive universe of related search terms.</p>
      </div>

      <div className="tool-form">
        <div
          className="form-header"
          onClick={() => setIsFormCollapsed(!isFormCollapsed)}
        >
          <span>
            <i className="fas fa-search"></i> Search Parameters
          </span>
          <i className={`fas fa-chevron-${isFormCollapsed ? 'down' : 'up'}`}></i>
        </div>

        {!isFormCollapsed && (
          <div className="form-fields">
            <div className="form-section mb-3">
              <label className="form-label">
                Keywords <span className="badge-info">Up to 100</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Enter keywords (one per line)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              ></textarea>
            </div>

            <div className="form-section mb-3" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">
                ASINs (Optional) <span className="badge-info">Up to 10</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Enter ASINs (comma-separated or one per line)"
                value={asins}
                onChange={(e) => setAsins(e.target.value)}
              ></textarea>
            </div>

            <div className="form-section mb-3" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">
                Relevancy Level{' '}
                <i className="fas fa-question-circle" title="Higher levels return more related keywords but may be less relevant"></i>
              </label>
              <select
                className="form-select"
                value={relevancyLevel}
                onChange={(e) => setRelevancyLevel(parseInt(e.target.value))}
              >
                <option value={1}>Level 1 (Most Relevant)</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
                <option value={4}>Level 4 (Broadest)</option>
              </select>
            </div>

            <div className="form-section">
              <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading}>
                <i className="fas fa-globe"></i> Generate Universe
              </button>
              {results.length > 0 && (
                <>
                  <button className="btn btn-secondary ms-2" onClick={() => { setResults([]); setKeywords(''); setAsins(''); }}>
                    <i className="fas fa-times"></i> Clear Results
                  </button>
                  <button className="btn btn-secondary ms-2" onClick={exportToCSV}>
                    <i className="fas fa-download"></i> Export CSV
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Generating keyword universe...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="results-section">
          <h5 className="mb-3">Results ({results.length - 1} keywords found)</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped table-hover">
              <thead>
                <tr>
                  {results[0]?.map((header: string, idx: number) => (
                    <th key={idx}>{header}</th>
                  ))}
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {results.slice(1).map((row: any[], idx: number) => {
                  const prevRow = results[idx]
                  const needsSeparator = idx > 0 && prevRow && prevRow[2] !== row[2]
                  const keyword = row[0] // Keyword is in column 0

                  return (
                    <tr key={idx} style={needsSeparator ? { borderTop: '3px solid var(--color-primary)' } : {}}>
                      {row.map((cell: any, cellIdx: number) => {
                        // ASINs in columns 4, 5, 6 (indices 4, 5, 6) should be Amazon links (no icon)
                        if (cellIdx >= 4 && cellIdx <= 6 && cell) {
                          return (
                            <td key={cellIdx}>
                              <a href={`https://www.amazon.com/dp/${cell}`} target="_blank" rel="noopener noreferrer" className="amazon-link">
                                {cell}
                              </a>
                            </td>
                          )
                        }
                        // Click share columns 7, 8, 9 (indices 7, 8, 9) should be formatted as percentages
                        if (cellIdx >= 7 && cellIdx <= 9 && typeof cell === 'number') {
                          return (
                            <td key={cellIdx}>
                              {(cell * 100).toFixed(1)}%
                            </td>
                          )
                        }
                        // Conversion share columns 10, 11, 12 (indices 10, 11, 12) should be formatted as percentages
                        if (cellIdx >= 10 && cellIdx <= 12 && typeof cell === 'number') {
                          return (
                            <td key={cellIdx}>
                              {(cell * 100).toFixed(1)}%
                            </td>
                          )
                        }
                        return (
                          <td key={cellIdx}>
                            {typeof cell === 'number' ? cell.toLocaleString('en-US') : cell}
                          </td>
                        )
                      })}
                      <td>
                        <a
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="amazon-link"
                          title="Search on Amazon"
                        >
                          <i className="fab fa-amazon"></i>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
