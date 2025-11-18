'use client'

import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { fetchKeywordHistory } from '@/lib/api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface KeywordHistoryProps {
  initialKeywords?: string[]
}

export default function KeywordHistory({ initialKeywords = [] }: KeywordHistoryProps) {
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)

  useEffect(() => {
    if (initialKeywords.length > 0) {
      setKeywords(initialKeywords.join('\n'))
      handleSearch(initialKeywords)
    }
  }, [initialKeywords])

  const handleSearch = async (kw?: string[]) => {
    const keywordList = kw || keywords.split('\n').map(k => k.trim()).filter(Boolean)

    if (keywordList.length === 0) {
      alert('Please enter at least one keyword')
      return
    }

    if (keywordList.length > 10) {
      alert('Please limit keywords to 10 maximum')
      return
    }

    setLoading(true)
    try {
      const data = await fetchKeywordHistory(keywordList)
      setResults(data)
      setIsFormCollapsed(true)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch keyword history'}`)
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
    a.download = `keyword-history-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Prepare chart data
  const getChartData = () => {
    if (results.length === 0) return null

    const labels = results.slice(1).map(row => row[0]) // Dates
    const datasets = results[0].slice(1).map((keyword: string, idx: number) => {
      const color = `hsl(${(idx * 360) / (results[0].length - 1)}, 70%, 50%)`
      return {
        label: keyword,
        data: results.slice(1).map(row => row[idx + 1]),
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
      }
    })

    return { labels, datasets }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Keyword Search Volume Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString('en-US')
          }
        }
      }
    }
  }

  const chartData = getChartData()

  return (
    <div id="keyword-history" className="tool-content active">
      <div className="tool-header">
        <h2><i className="fas fa-chart-line"></i> Keyword History</h2>
        <p>View search volume trends over time for up to 10 keywords.</p>
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
                Keywords <span className="badge-info">Up to 10</span>
              </label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Enter keywords (one per line)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              ></textarea>
            </div>

            <div className="form-section">
              <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading}>
                <i className="fas fa-chart-line"></i> Get History
              </button>
              {results.length > 0 && (
                <>
                  <button className="btn btn-secondary ms-2" onClick={() => { setResults([]); setKeywords(''); }}>
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
          <p>Fetching keyword history...</p>
        </div>
      )}

      {!loading && results.length > 0 && chartData && (
        <div className="results-section">
          <div className="card mb-4" style={{ padding: '1.5rem' }}>
            <div style={{ height: '400px' }}>
              <Line options={chartOptions} data={chartData} />
            </div>
          </div>

          <h5 className="mb-3">Data Table</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped table-hover">
              <thead>
                <tr>
                  {results[0]?.map((header: string, idx: number) => (
                    <th key={idx}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(1).map((row: any[], idx: number) => (
                  <tr key={idx}>
                    {row.map((cell: any, cellIdx: number) => (
                      <td key={cellIdx}>
                        {typeof cell === 'number' ? cell.toLocaleString('en-US') : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
