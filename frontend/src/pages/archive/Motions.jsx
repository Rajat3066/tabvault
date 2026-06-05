import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import { api } from '../../lib/api'

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function cleanMotionTitle(value) {
  return cleanText(value)
    .replace(/\bVIEW INFO SLIDE\b.*$/i, '')
    .replace(/\b\d+%\s+\d+\s+(PROP|GOV|OPP)\s+(WINS|VETOES).*$/i, '')
    .replace(/\bBALANCE INCONCLUSIVE\b.*$/i, '')
    .trim()
}

function displayRoundName(round) {
  const name = cleanText(round.name)

  if (!name || /^round\s*\d+$/i.test(name)) {
    return `Round ${round.seq}`
  }

  if (/^round\d+$/i.test(name)) {
    return name.replace(/^round(\d+)$/i, 'Round $1')
  }

  return name
}

function getMotionItems(round) {
  if (Array.isArray(round.motions) && round.motions.length > 0) {
    return round.motions
      .map((m, index) => ({
        id: `${round.id}-${index}`,
        title: cleanMotionTitle(m.title || m.motion || m.text),
        infoSlide: cleanText(m.info_slide || m.infoSlide || m.info),
      }))
      .filter(item => item.title || item.infoSlide)
  }

  return [{
    id: round.id,
    title: cleanMotionTitle(round.motion),
    infoSlide: cleanText(round.info_slide),
  }].filter(item => item.title || item.infoSlide)
}

export default function Motions() {
  const { slug } = useParams()
  const [rounds, setRounds] = useState([])
  const [openInfo, setOpenInfo] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    api.getRounds(slug)
      .then(data => {
        const rows = (data || [])
          .map(round => ({
            ...round,
            displayName: displayRoundName(round),
            motionItems: getMotionItems(round),
          }))
          .filter(round => round.motionItems.length > 0)
          .sort((a, b) => (a.seq || 0) - (b.seq || 0))

        setRounds(rows)
      })
      .catch(() => setRounds([]))
      .finally(() => setLoading(false))
  }, [slug])

  function toggleInfo(id) {
    setOpenInfo(current => ({ ...current, [id]: !current[id] }))
  }

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">☁️</span>
          Motion Statistics
        </h1>

        {loading ? (
          <div className="spinner" />
        ) : rounds.length === 0 ? (
          <div className="card">
            <div className="empty">No motion data available.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rounds.map(round => (
              <section key={round.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    background: '#7d8793',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 15,
                    fontWeight: 800,
                  }}>
                    {round.displayName}
                  </span>
                </div>

                {round.motionItems.map((item, index) => {
                  const isOpen = !!openInfo[item.id]

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '30px 40px',
                        textAlign: 'center',
                        borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {round.motionItems.length > 1 && (
                        <div style={{
                          color: 'var(--text-muted)',
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 10,
                        }}>
                          Motion {index + 1}
                        </div>
                      )}

                      {item.title && (
                        <div style={{
                          fontSize: 26,
                          fontWeight: 800,
                          lineHeight: 1.35,
                          maxWidth: 1500,
                          margin: '0 auto',
                        }}>
                          {item.title}
                        </div>
                      )}

                      {item.infoSlide && (
                        <div style={{ marginTop: 18 }}>
                          <button
                            type="button"
                            onClick={() => toggleInfo(item.id)}
                            style={{
                              border: 'none',
                              background: '#d7dde3',
                              color: '#697684',
                              borderRadius: 6,
                              padding: '7px 13px',
                              fontSize: 12,
                              fontWeight: 800,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                            }}
                          >
                            {isOpen ? 'Hide info slide' : 'View info slide'}
                          </button>

                          {isOpen && (
                            <div style={{
                              margin: '18px auto 0',
                              maxWidth: 1150,
                              textAlign: 'left',
                              borderLeft: '4px solid var(--accent)',
                              padding: '10px 0 10px 14px',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.55,
                              fontSize: 15,
                            }}>
                              {item.infoSlide}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}