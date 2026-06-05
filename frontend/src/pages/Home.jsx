import AuthModal from '../components/AuthModal'
import { supabase } from '../lib/supabase'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import './Home.css'

// ── Top Navbar ────────────────────────────────────────────────────────────────
function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initial = displayName[0].toUpperCase()

  return (
    <>
      <nav className="top-nav">
        <div className="top-nav-inner">
          <Link to="/" className="nav-brand">
            <span className="nav-brand-icon">⬡</span>
            TabVault
          </Link>
          <div className="nav-links">
            <Link to="/folders" className="nav-link">Your Folders</Link>
            <Link to="/motions" className="nav-link">
              Motion Repo
            </Link>
            <Link to="/competitions" className="nav-link">Competitions</Link>
          </div>

          <div className="nav-auth">
            {user ? (
              <div className="nav-user">
                <div className="nav-user-avatar">{initial}</div>
                <span className="nav-user-name">{displayName}</span>
                <button className="nav-signout-btn" onClick={handleSignOut}>Sign Out</button>
              </div>
            ) : (
              <>
                <button className="nav-login-btn" onClick={() => setAuthMode('login')}>Log In</button>
                <button className="nav-signup-btn" onClick={() => setAuthMode('signup')}>Sign Up</button>
              </>
            )}
          </div>

          <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>

        {menuOpen && (
          <div className="nav-mobile-menu">
            <Link to="/folders" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Your Folders</Link>
            <Link to="/motions" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Motion Repo</Link>
            <Link to="/competitions" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Competitions</Link>
            <div className="nav-mobile-auth">
              {user ? (
                <button className="nav-signout-btn" onClick={handleSignOut}>Sign Out</button>
              ) : (
                <>
                  <button className="nav-login-btn" onClick={() => { setAuthMode('login'); setMenuOpen(false) }}>Log In</button>
                  <button className="nav-signup-btn" onClick={() => { setAuthMode('signup'); setMenuOpen(false) }}>Sign Up</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />}
    </>
  )
}

// ── Vault SVG ─────────────────────────────────────────────────────────────────
function VaultDoor() {
  return (
    <div className="vault-wrap">
      {/* Outer glow rings */}
      <motion.div className="vault-ring vault-ring-1"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div className="vault-ring vault-ring-2"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      <motion.svg
        viewBox="0 0 200 200"
        className="vault-svg"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotateY: [0, 6, 0, -6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 30px rgba(74,143,196,0.5))' }}
      >
        {/* Outer body */}
        <circle cx="100" cy="100" r="95" fill="#0a1628" stroke="#1e3a5f" strokeWidth="3"/>

        {/* Bolt holes */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180
          return (
            <g key={i}>
              <circle cx={100 + 83 * Math.cos(a)} cy={100 + 83 * Math.sin(a)} r="5" fill="#0d1f35" stroke="#2d5f8a" strokeWidth="1.5"/>
              <circle cx={100 + 83 * Math.cos(a)} cy={100 + 83 * Math.sin(a)} r="2" fill="#4a8fc4" opacity="0.6"/>
            </g>
          )
        })}

        {/* Outer dashed ring */}
        <motion.circle cx="100" cy="100" r="72"
          fill="none" stroke="#2d5f8a" strokeWidth="1.5" strokeDasharray="6 4"
          style={{ transformOrigin: '100px 100px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner disk */}
        <circle cx="100" cy="100" r="60" fill="#0d1f35" stroke="#1e3a5f" strokeWidth="2"/>

        {/* Spokes with caps */}
        <motion.g
          style={{ transformOrigin: '100px 100px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i * 60 * Math.PI) / 180
            const ox = 100 + 52 * Math.cos(a)
            const oy = 100 + 52 * Math.sin(a)
            return (
              <g key={i}>
                {/* Spoke line */}
                <line x1="100" y1="100" x2={ox} y2={oy}
                  stroke="#4a8fc4" strokeWidth="3" strokeLinecap="round" opacity="0.9"/>
                {/* Outer cap */}
                <circle cx={ox} cy={oy} r="5" fill="#0d1f35" stroke="#4a8fc4" strokeWidth="2"/>
                <circle cx={ox} cy={oy} r="2" fill="#4a8fc4"/>
              </g>
            )
          })}
        </motion.g>

        {/* Center hub */}
        <circle cx="100" cy="100" r="14" fill="#0a1628" stroke="#4a8fc4" strokeWidth="2.5"/>
        <circle cx="100" cy="100" r="8" fill="#1e3a5f" stroke="#4a8fc4" strokeWidth="1.5"/>
        <circle cx="100" cy="100" r="4" fill="#4a8fc4"/>

        {/* Glow pulse */}
        <motion.circle cx="100" cy="100" r="60"
          fill="none" stroke="#4a8fc4" strokeWidth="1.5"
          animate={{ opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.svg>

      {/* Orbiting dots */}
      {[
        { label: 'BP', r: 150, duration: 8, start: 0 },
        { label: 'Australs', r: 170, duration: 12, start: 120 },
        { label: 'WSDC', r: 155, duration: 10, start: 240 },
        { label: 'Asians', r: 175, duration: 14, start: 60 },
        { label: 'WUDC', r: 160, duration: 9, start: 180 },
      ].map((item, i) => (
        <OrbitItem key={i} {...item} />
      ))}
    </div>
  )
}

function OrbitItem({ label, r, duration, start }) {
  return (
    <motion.div
      className="orbit-item"
      style={{ width: r * 2, height: r * 2, position: 'absolute', top: '50%', left: '50%', marginTop: -r, marginLeft: -r, borderRadius: '50%' }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay: 0 }}
      initial={{ rotate: start }}
    >
      <div className="orbit-dot" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>
        <span>{label}</span>
      </div>
    </motion.div>
  )
}

// ── Particles ─────────────────────────────────────────────────────────────────
function Particles() {
  return (
    <>
      <div className="particles-bg" aria-hidden="true">
        {Array.from({ length: 25 }, (_, i) => (
          <motion.div
            key={i}
            className="particle"
            style={{ left: `${(i * 4.3) % 100}%`, top: `${(i * 7.1) % 100}%` }}
            animate={{ y: [0, -40, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="glow-blobs" aria-hidden="true">
        {[
          { top: '12%', left: '8%', size: 180, delay: 0 },
          { top: '60%', left: '15%', size: 120, delay: 1.5 },
          { top: '30%', left: '45%', size: 80, delay: 0.8 },
          { top: '75%', left: '60%', size: 140, delay: 2 },
          { top: '10%', left: '75%', size: 100, delay: 1 },
          { top: '50%', left: '90%', size: 90, delay: 0.5 },
        ].map((b, i) => (
          <motion.div
            key={i}
            className="glow-blob"
            style={{ top: b.top, left: b.left, width: b.size, height: b.size }}
            animate={{ opacity: [0.03, 0.12, 0.03], scale: [1, 1.2, 1] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: b.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </>
  )
}

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="home-page">
      <TopNav />

      <main className="hero-section">
        <Particles />

        {/* Left — text */}
        <div className="hero-left">
          <motion.div
            className="hero-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Debate Archive Platform
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            Your tournament tabs,<br />
            <span className="hero-title-accent">preserved forever.</span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            TabVault permanently archives Tabbycat and Calico tournament data — results, speaker scores, draws, motions — so nothing is lost when orgcoms shut down their instances.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Link to="/submit" className="hero-btn-primary">
              + Submit Tournament
            </Link>
            <Link to="/competitions" className="hero-btn-secondary">
              View Competitions →
            </Link>
          </motion.div>

          {/* Mini stats */}
          <motion.div
            className="hero-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="hero-stat">
              <span className="hero-stat-num">∞</span>
              <span className="hero-stat-label">Permanent storage</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">100%</span>
              <span className="hero-stat-label">Public & free</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">All</span>
              <span className="hero-stat-label">BP · Australs · WSDC</span>
            </div>
          </motion.div>
        </div>

        {/* Right — vault */}
        <motion.div
          className="hero-right"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <VaultDoor />
        </motion.div>
      </main>

      {/* Logo bar */}
      <motion.div
        className="logo-bar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {['Tabbycat', 'Calico', 'BP Format', 'Australs', 'WSDC', 'Asians'].map(name => (
          <span key={name} className="logo-bar-item">{name}</span>
        ))}
      </motion.div>
    </div>
  )
}