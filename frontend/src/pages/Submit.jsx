import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import './Submit.css'

const SCRAPE_STEPS = [
  { key: 'welcome', label: 'Loading tournament page' },
  { key: 'teams', label: 'Archiving team tab' },
  { key: 'speakers', label: 'Archiving speaker tab' },
  { key: 'replies', label: 'Archiving replies tab' },
  { key: 'motions', label: 'Archiving motions' },
  { key: 'results', label: 'Archiving round results' },
  { key: 'breaks', label: 'Archiving break tabs' },
  { key: 'participants', label: 'Archiving participants' },
]

export default function Submit() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [scrapeStatus, setScrapeStatus] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const pollRef = useRef(null)
  const stepRef = useRef(null)

  function startPolling(slug) {
    // Animate steps
    stepRef.current = setInterval(() => {
      setStepIndex(i => {
        if (i < SCRAPE_STEPS.length - 1) return i + 1
        clearInterval(stepRef.current)
        return i
      })
    }, 8000)

    // Poll scrape status
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.getTournament(slug)
        if (data?.scrape_status === 'complete') {
          clearInterval(pollRef.current)
          clearInterval(stepRef.current)
          setScrapeStatus('complete')
          setStatus('complete')
          setResult(data)
        } else if (data?.scrape_status === 'failed') {
          clearInterval(pollRef.current)
          clearInterval(stepRef.current)
          setScrapeStatus('failed')
          setStatus('error')
          setError('Scraping failed. The tournament may not be public.')
        }
      } catch {}
    }, 4000)
  }

  useEffect(() => {
    return () => {
      clearInterval(pollRef.current)
      clearInterval(stepRef.current)
    }
  }, [])

  async function handleSubmit() {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!trimmed.includes('calicotab.com')) {
      setError('Please enter a valid Calico/Tabbycat URL')
      return
    }
    setStatus('loading')
    setError('')
    setResult(null)
    setScrapeStatus(null)
    setStepIndex(0)

    try {
      const data = await api.submit(trimmed)
      if (data.duplicate) {
        setStatus('duplicate')
        setResult(data.tournament)
      } else {
        setStatus('scraping')
        setScrapeStatus('pending')
        startPolling(data.slug)
      }
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Something went wrong.')
    }
  }

  return (
    <div className="submit-page">
      <div className="submit-card card">
        <Link to="/" className="submit-back">← Back to TabVault</Link>

        <div className="submit-icon">🗄️</div>
        <h1 className="submit-title">Archive a Tournament</h1>
        <p className="submit-desc">
          Paste a public Calico/Tabbycat tournament URL below. TabVault will scrape and permanently archive all public data.
        </p>

        {/* Input */}
        <div className="submit-input-wrap">
          <input
            className="submit-input"
            type="url"
            placeholder="https://example.calicotab.com/tournament/"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); setStatus(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={status === 'loading' || status === 'scraping'}
          />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={status === 'loading' || status === 'scraping' || !url.trim()}
          >
            {status === 'loading' ? 'Submitting...' : status === 'scraping' ? 'Archiving...' : 'Archive'}
          </button>
        </div>

        {error && <div className="submit-error">{error}</div>}

        {/* Scraping progress */}
        {status === 'scraping' && (
          <div className="scrape-progress">
            <div className="scrape-progress-header">
              <div className="scrape-spinner" />
              <span>Archiving tournament...</span>
            </div>
            <div className="scrape-steps">
              {SCRAPE_STEPS.map((step, i) => (
                <div
                  key={step.key}
                  className={`scrape-step ${
                    i < stepIndex ? 'done' :
                    i === stepIndex ? 'active' : 'pending'
                  }`}
                >
                  <span className="scrape-step-icon">
                    {i < stepIndex ? '✓' : i === stepIndex ? '⟳' : '○'}
                  </span>
                  <span className="scrape-step-label">{step.label}</span>
                </div>
              ))}
            </div>
            <div className="scrape-note">This takes 3–5 minutes. Don't close this tab.</div>
          </div>
        )}

        {/* Complete */}
        {status === 'complete' && result && (
          <div className="submit-result success">
            <span className="submit-result-icon">✅</span>
            <div>
              <div className="submit-result-title">Successfully archived!</div>
              <div className="submit-result-sub">{result.name} is now permanently in TabVault.</div>
              <Link to={`/archive/${result.slug}`} className="submit-result-link">
                View Archive →
              </Link>
            </div>
          </div>
        )}

        {/* Duplicate */}
        {status === 'duplicate' && result && (
          <div className="submit-result duplicate">
            <span className="submit-result-icon">📌</span>
            <div>
              <div className="submit-result-title">Tournament already archived!</div>
              <div className="submit-result-sub">{result.name} was archived on {new Date(result.archived_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</div>
              <Link to={`/archive/${result.slug}`} className="submit-result-link">
                View Archive →
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="submit-result error">
            <span className="submit-result-icon">❌</span>
            <div>
              <div className="submit-result-title">Failed to archive</div>
              <div className="submit-result-sub">{error}</div>
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="submit-guide">
          <div className="submit-guide-title">What gets archived?</div>
          <ul>
            <li>✓ Team & Speaker tabs (open, novice, ESL, EFL)</li>
            <li>✓ Replies tab</li>
            <li>✓ Round-by-round results & draws</li>
            <li>✓ Break tabs (all categories)</li>
            <li>✓ Motion statistics</li>
            <li>✓ Participants list</li>
            <li>✗ Adjudicator feedback (private)</li>
            <li>✗ Ballots (private)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}