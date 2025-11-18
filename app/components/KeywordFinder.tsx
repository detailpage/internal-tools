'use client'

import { useState } from 'react'
import { fetchKeywordFinder } from '@/lib/api'

type SearchType = 'ai-phrase' | 'exact-match' | 'asin-lookup'

interface KeywordFinderProps {
  onNavigateToTool: (tool: 'keyword-universe' | 'keyword-history', keywords?: string[]) => void
}

export default function KeywordFinder({ onNavigateToTool }: KeywordFinderProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('ai-phrase')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<Set<number>>(new Set())
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)

  const placeholders = {
    'ai-phrase': 'Enter a seed keyword or phrase (e.g., \'wireless headphones\')',
    'exact-match': 'Enter exact keyword to match (e.g., wireless headphones)',
    'asin-lookup': 'Enter up to 5 ASINs (comma-separated, e.g., B08N5WRWNW, B07XYZ1234)'
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert('Please enter a search term')
      return
    }

    setLoading(true)
    try {
      const data = await fetchKeywordFinder(searchTerm, searchType)
      setResults(data)
      setIsFormCollapsed(true)

      // Auto-select top 10
      const top10 = new Set(Array.from({ length: Math.min(10, data.length - 1) }, (_, i) => i + 1))
      setSelectedKeywords(top10)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch keywords'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (index: number) => {
    const newSelected = new Set(selectedKeywords)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedKeywords(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(Array.from({ length: results.length - 1 }, (_, i) => i + 1))
      setSelectedKeywords(allIndices)
    } else {
      setSelectedKeywords(new Set())
    }
  }

  const getSelectedKeywordsList = () => {
    return Array.from(selectedKeywords)
      .map(index => results[index][1]) // Column 1 contains the keyword for all search types
      .filter(Boolean)
  }

  const handleNavigateToUniverse = () => {
    const selected = getSelectedKeywordsList()
    if (selected.length === 0) {
      alert('Please select at least one keyword')
      return
    }
    onNavigateToTool('keyword-universe', selected)
  }

  const handleNavigateToHistory = () => {
    const selected = getSelectedKeywordsList()
    if (selected.length === 0) {
      alert('Please select at least one keyword')
      return
    }
    if (selected.length > 10) {
      alert('Please select up to 10 keywords for history view')
      return
    }
    onNavigateToTool('keyword-history', selected)
  }

  const exportToCSV = () => {
    if (results.length === 0) return

    const csvContent = results.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keyword-finder-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="keyword-finder" className="tool-content active">
      <div className="tool-header">
        <h2><i className="fas fa-search"></i> Keyword Finder</h2>
        <p>Discover semantically similar keywords for any word, text, or ASIN.</p>
      </div>

      <div className="tool-form" id="kf-form-container">
        <div
          id="kf-form-header"
          className="form-header"
          onClick={() => setIsFormCollapsed(!isFormCollapsed)}
        >
          <span>
            <i className="fas fa-search"></i> Search Parameters
          </span>
          <i className={`fas fa-chevron-${isFormCollapsed ? 'down' : 'up'}`}></i>
        </div>

        {!isFormCollapsed && (
          <div id="kf-form-fields" className="form-fields">
            <div className="form-section mb-3">
              <input
                type="text"
                className="form-control"
                id="kf-search-term"
                placeholder={placeholders[searchType]}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="form-section mb-3">
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="kf-search-type"
                    id="kf-type-ai"
                    value="ai-phrase"
                    checked={searchType === 'ai-phrase'}
                    onChange={() => setSearchType('ai-phrase')}
                  />
                  <label className="form-check-label" htmlFor="kf-type-ai" title="Uses AI to find semantically similar keywords">
                    AI Phrase Match
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="kf-search-type"
                    id="kf-type-exact"
                    value="exact-match"
                    checked={searchType === 'exact-match'}
                    onChange={() => setSearchType('exact-match')}
                  />
                  <label className="form-check-label" htmlFor="kf-type-exact" title="Finds keywords that contain your exact search term">
                    Exact Match
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="kf-search-type"
                    id="kf-type-asin"
                    value="asin-lookup"
                    checked={searchType === 'asin-lookup'}
                    onChange={() => setSearchType('asin-lookup')}
                  />
                  <label className="form-check-label" htmlFor="kf-type-asin" title="Enter ASINs to discover associated keywords">
                    ASIN Lookup
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section">
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                <i className="fas fa-search"></i> Find Keywords
              </button>
              {results.length > 0 && (
                <>
                  <button className="btn btn-secondary ms-2" onClick={() => { setResults([]); setSearchTerm(''); setSelectedKeywords(new Set()); }}>
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
        <div id="kf-loading" className="loading-spinner">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Searching for related keywords...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="results-section" id="kf-results-section">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Results (<span id="kf-result-count">{results.length - 1}</span> keywords found)</h5>
            {selectedKeywords.size > 0 && (
              <div id="kf-action-buttons">
                <button className="btn btn-sm btn-primary" onClick={handleNavigateToUniverse}>
                  <i className="fas fa-globe"></i> Generate Keyword Universe
                </button>
                <button className="btn btn-sm btn-primary ms-2" onClick={handleNavigateToHistory}>
                  <i className="fas fa-history"></i> View Keyword History
                </button>
              </div>
            )}
          </div>
          <div id="kf-results">
            <table className="table table-sm table-striped table-hover">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedKeywords.size === results.length - 1}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  {results[0]?.map((header: string, idx: number) => (
                    <th key={idx}>{header}</th>
                  ))}
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {results.slice(1).map((row: any[], idx: number) => {
                  const keyword = row[1] // Keyword is in column 1
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedKeywords.has(idx + 1)}
                          onChange={() => handleCheckboxChange(idx + 1)}
                        />
                      </td>
                      {row.map((cell: any, cellIdx: number) => (
                        <td key={cellIdx}>
                          {typeof cell === 'number' ? cell.toLocaleString('en-US') : cell}
                        </td>
                      ))}
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
