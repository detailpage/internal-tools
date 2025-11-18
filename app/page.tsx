'use client'

import { useState, useEffect } from 'react'
import Header from './components/Header'
import KeywordFinder from './components/KeywordFinder'
import KeywordUniverse from './components/KeywordUniverse'
import KeywordHistory from './components/KeywordHistory'

type Tool = 'keyword-finder' | 'keyword-universe' | 'keyword-history'

// Version to verify deployment
const APP_VERSION = '1.0.3'

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>('keyword-finder')
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])

  useEffect(() => {
    console.log('=== APP VERSION ===')
    console.log('Version:', APP_VERSION)
    console.log('Build time:', new Date().toISOString())
    console.log('==================')
  }, [])

  const navigateToTool = (tool: Tool, keywords?: string[]) => {
    setActiveTool(tool)
    if (keywords) {
      setSelectedKeywords(keywords)
    }
  }

  return (
    <>
      <Header />
      <div className="main-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section-header">
            <i className="fas fa-tools"></i>
            <h6>Keyword Tools</h6>
          </div>

          <div className="tool-category">
            <ul className="tool-list">
              <li
                className={`tool-item ${activeTool === 'keyword-finder' ? 'active' : ''}`}
                onClick={() => setActiveTool('keyword-finder')}
              >
                <i className="fas fa-search me-2"></i>
                Keyword Finder
              </li>
              <li
                className={`tool-item ${activeTool === 'keyword-universe' ? 'active' : ''}`}
                onClick={() => setActiveTool('keyword-universe')}
              >
                <i className="fas fa-globe me-2"></i>
                Keyword Universe Generator
              </li>
              <li
                className={`tool-item ${activeTool === 'keyword-history' ? 'active' : ''}`}
                onClick={() => setActiveTool('keyword-history')}
              >
                <i className="fas fa-chart-line me-2"></i>
                Keyword History
              </li>
            </ul>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="content-area">
          {activeTool === 'keyword-finder' && (
            <KeywordFinder onNavigateToTool={navigateToTool} />
          )}
          {activeTool === 'keyword-universe' && (
            <KeywordUniverse initialKeywords={selectedKeywords} />
          )}
          {activeTool === 'keyword-history' && (
            <KeywordHistory initialKeywords={selectedKeywords} />
          )}
        </div>
      </div>
    </>
  )
}
