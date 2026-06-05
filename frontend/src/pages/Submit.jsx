import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import './Submit.css'

export default function Submit() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'queued' | 'duplicate' | 'error'
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!trimmed.includes('calicotab.com')) {
      setError('Please enter a valid Calico/Tabbycat URL (e.g. https://example.calicotab.com/tournament/)')
      return
    }
    setStatus('loading')
    setError('')
    setResult(null)
    try {
      const data = await api.submit(trimmed)
      if (data.duplicate) {
        setStatus('duplicate')
        setResult(data.tournament)
      } else {
        setStatus('queued')
        setResult(data)
      }
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Something went wrong.')
    }
  }

  return (
    <div className="submit-page">
      <div className="submit-card card">
        {/* Back */}
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
            disabled={status === 'loading'}
          />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={status === 'loading' || !url.trim()}
          >
            {status === 'loading' ? 'Scraping...' : 'Archive'}
          </button>
        </div>

        {error && <div className="submit-error">{error}</div>}

        {/* Results */}
        {status === 'queued' && (
          <div className="submit-result success">
            <span className="submit-result-icon">✅</span>
            <div>
              <div className="submit-result-title">Tournament queued for archiving!</div>
              <div className="submit-result-sub">This usually takes 2–5 minutes. Check back soon.</div>
              {result?.slug && (
                <Link to={`/archive/${result.slug}`} className="submit-result-link">
                  View Archive →
                </Link>
              )}
            </div>
          </div>
        )}

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
