import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Landing() {
  const [activeTab, setActiveTab] = useState('recommended');

  return (
    <div className="wrap">
      {/* NAV */}
      <nav>
        <div className="logo">
          FPL<span>Booster</span>
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', gap: '32px' }}>
          <li>
            <a href="#squad" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
              Squad
            </a>
          </li>
          <li>
            <a href="#transfers" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
              Transfers
            </a>
          </li>
          <li>
            <a href="#fixtures" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
              Fixtures
            </a>
          </li>
          <li>
            <a href="#analytics" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
              Analytics
            </a>
          </li>
          <li>
            <a href="#minileague" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
              Mini-League
            </a>
          </li>
        </ul>
        <Link to="/auth">
          <button
            className="btn-primary"
            style={{ background: 'var(--neon)', color: 'var(--dark)', border: 'none', padding: '10px 24px', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none' }}
          >
            Get Started Now
          </button>
        </Link>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-tag">
            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--neon)', borderRadius: '50%', animation: 'pulse 1.5s infinite', marginRight: '8px' }} />
            AI INTELLIGENCE ACTIVE
          </div>
          <h1>
            DOMINATE<br />
            YOUR <span className="accent">FPL</span>
            <br />
            <span className="italic">season</span>
          </h1>
          <p>AI-powered transfer recommendations, captain picks, and chip strategy — built to give you the edge every gameweek. Connected to live FPL data.</p>
          <div className="hero-actions">
            <Link to="/auth">
              <button className="btn-primary">Connect Team</button>
            </Link>
            <button className="btn-ghost">View Demo</button>
          </div>
        </div>

        {/* PITCH WIDGET */}
        <div className="hero-right">
          <div className="pitch-visual">
            <div className="pitch-field">
              <div className="line line-h line-mid"></div>
              <div className="line line-v"></div>
              <div className="circle-center"></div>
              <div className="penalty-top"></div>
              <div className="penalty-bot"></div>

              {/* GK */}
              <div className="player-node" style={{ left: '50%', top: '88%' }}>
                <div className="player-avatar gk">GK</div>
                <div className="player-name">Flekken</div>
              </div>

              {/* DEF */}
              <div className="player-node" style={{ left: '20%', top: '72%' }}>
                <div className="player-avatar">
                  <span className="score">8</span>DF
                </div>
                <div className="player-name">Alexander-Arnold</div>
              </div>
              <div className="player-node" style={{ left: '40%', top: '74%' }}>
                <div className="player-avatar">
                  <span className="score">6</span>DF
                </div>
                <div className="player-name">Pedro Porro</div>
              </div>
              <div className="player-node" style={{ left: '60%', top: '74%' }}>
                <div className="player-avatar">
                  <span className="score">9</span>DF
                </div>
                <div className="player-name">Mykolenko</div>
              </div>
              <div className="player-node" style={{ left: '80%', top: '72%' }}>
                <div className="player-avatar">
                  <span className="score">6</span>DF
                </div>
                <div className="player-name">Pedro</div>
              </div>

              {/* MID */}
              <div className="player-node" style={{ left: '18%', top: '52%' }}>
                <div className="player-avatar">
                  <span className="score">12</span>MF
                </div>
                <div className="player-name">Salah</div>
              </div>
              <div className="player-node" style={{ left: '38%', top: '50%' }}>
                <div className="player-avatar">
                  <span className="score">7</span>MF
                </div>
                <div className="player-name">Mbeumo</div>
              </div>
              <div className="player-node" style={{ left: '62%', top: '50%' }}>
                <div className="player-avatar">
                  <span className="score">5</span>MF
                </div>
                <div className="player-name">Palmer</div>
              </div>
              <div className="player-node" style={{ left: '82%', top: '52%' }}>
                <div className="player-avatar">
                  <span className="score">4</span>MF
                </div>
                <div className="player-name">Andreas</div>
              </div>

              {/* FWD */}
              <div className="player-node" style={{ left: '30%', top: '28%' }}>
                <div className="player-avatar cap">
                  <span className="score">18</span>FW
                </div>
                <div className="player-name">Haaland ©</div>
              </div>
              <div className="player-node" style={{ left: '70%', top: '28%' }}>
                <div className="player-avatar">
                  <span className="score">6</span>FW
                </div>
                <div className="player-name">Watkins</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS ROW */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="num">847</div>
          <div className="label">Overall Rank</div>
        </div>
        <div className="stat-card">
          <div className="num">73</div>
          <div className="label">GW 26 Points</div>
        </div>
        <div className="stat-card">
          <div className="num">1,612</div>
          <div className="label">Total Points</div>
        </div>
        <div className="stat-card">
          <div className="num">3</div>
          <div className="label">Free Transfers</div>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="main-panel">
        {/* LEFT: Transfer Recs */}
        <div>
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">AI Transfer Picks</div>
              <span className="badge badge-green">GW 27</span>
            </div>
            <div className="tab-bar">
              <button
                className={`tab ${activeTab === 'recommended' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommended')}
              >
                Recommended
              </button>
              <button
                className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Options
              </button>
              <button
                className={`tab ${activeTab === 'differential' ? 'active' : ''}`}
                onClick={() => setActiveTab('differential')}
              >
                Differential
              </button>
              <button
                className={`tab ${activeTab === 'budget' ? 'active' : ''}`}
                onClick={() => setActiveTab('budget')}
              >
                Budget
              </button>
            </div>

            <div className="transfer-item">
              <div className="player-info out">
                <div className="name">Palmer</div>
                <div className="meta">CHE · MID · £10.6m</div>
              </div>
              <div className="arrow">→</div>
              <div className="player-info in">
                <div className="name">Salah</div>
                <div className="meta">LIV · MID · £13.2m</div>
              </div>
              <div>
                <div className="xp-badge">+6.8</div>
                <div className="xp-label">Xpts gain</div>
              </div>
            </div>

            <div className="transfer-item">
              <div className="player-info out">
                <div className="name">Andreas</div>
                <div className="meta">FUL · MID · £5.8m</div>
              </div>
              <div className="arrow">→</div>
              <div className="player-info in">
                <div className="name">Mbeumo</div>
                <div className="meta">BRE · MID · £7.9m</div>
              </div>
              <div>
                <div className="xp-badge">+4.2</div>
                <div className="xp-label">Xpts gain</div>
              </div>
            </div>

            <div className="transfer-item">
              <div className="player-info out">
                <div className="name">Pedro Porro</div>
                <div className="meta">TOT · DEF · £5.9m</div>
              </div>
              <div className="arrow">→</div>
              <div className="player-info in">
                <div className="name">A. Arnold</div>
                <div className="meta">LIV · DEF · £7.1m</div>
              </div>
              <div>
                <div className="xp-badge">+3.1</div>
                <div className="xp-label">Xpts gain</div>
              </div>
            </div>

            <div className="ai-tip" style={{ marginTop: '24px' }}>
              <div className="ai-icon">🤖</div>
              <p>
                Liverpool have a <strong>Double Gameweek in GW29</strong>. Prioritise <strong>Salah</strong> and <strong>Arnold</strong> now — their ownership is rising fast. Wildcard window opens GW28.
              </p>
            </div>
          </div>

          {/* Captain Picks */}
          <div className="panel-card" style={{ marginTop: '16px' }}>
            <div className="panel-header">
              <div className="panel-title">Captain Picks</div>
              <span className="badge badge-amber">GW 27</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ border: '1px solid rgba(245,166,35,0.4)', padding: '16px', textAlign: 'center', background: 'rgba(245,166,35,0.05)' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: 'var(--amber)' }}>Haaland</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0' }}>MCI · FWD</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--white)' }}>
                  xPts <span style={{ color: 'var(--amber)' }}>11.4</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--neon)', marginTop: '6px', letterSpacing: '0.06em' }}>TOP PICK</div>
              </div>
              <div style={{ border: '1px solid var(--border)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem' }}>Salah</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0' }}>LIV · MID</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--white)' }}>
                  xPts <span style={{ color: 'var(--white)' }}>9.2</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '6px', letterSpacing: '0.06em' }}>STRONG ALT</div>
              </div>
              <div style={{ border: '1px solid var(--border)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem' }}>Mbeumo</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0' }}>BRE · MID</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--white)' }}>
                  xPts <span style={{ color: 'var(--white)' }}>7.8</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '6px', letterSpacing: '0.06em' }}>DIFFERENTIAL</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="side-panel">
          {/* GW Score */}
          <div className="mini-card">
            <div className="mini-title">GW 26 Result</div>
            <div className="score-display">
              <div className="score-big">73</div>
              <div className="score-rank">Rank ↑ 12,400 · #847 overall</div>
            </div>
          </div>

          {/* Chips */}
          <div className="mini-card">
            <div className="mini-title">Chip Strategy</div>
            <div className="chip-grid">
              <div className="chip">
                <div className="chip-name">Wildcard</div>
                <div className="chip-gw">Use GW28</div>
              </div>
              <div className="chip">
                <div className="chip-name">Triple Cap</div>
                <div className="chip-gw">Use GW29</div>
              </div>
              <div className="chip used">
                <div className="chip-name">Bench Boost</div>
                <div className="chip-gw">Used GW18</div>
              </div>
              <div className="chip used">
                <div className="chip-name">Free Hit</div>
                <div className="chip-gw">Used GW22</div>
              </div>
            </div>
          </div>

          {/* Fixture Difficulty */}
          <div className="mini-card">
            <div className="mini-title">Fixture Difficulty</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Next 5 GWs</div>

            <div className="fixture-row">
              <div className="fix-team">Liverpool</div>
              <div className="fix-dots">
                <div className="dot d1">2</div>
                <div className="dot d1">1</div>
                <div className="dot d2">2</div>
                <div className="dot d1">2</div>
                <div className="dot d3">3</div>
              </div>
            </div>
            <div className="fixture-row">
              <div className="fix-team">Man City</div>
              <div className="fix-dots">
                <div className="dot d2">2</div>
                <div className="dot d1">2</div>
                <div className="dot d3">3</div>
                <div className="dot d2">2</div>
                <div className="dot d2">2</div>
              </div>
            </div>
            <div className="fixture-row">
              <div className="fix-team">Brentford</div>
              <div className="fix-dots">
                <div className="dot d1">1</div>
                <div className="dot d2">2</div>
                <div className="dot d2">2</div>
                <div className="dot d3">3</div>
                <div className="dot d1">2</div>
              </div>
            </div>
            <div className="fixture-row">
              <div className="fix-team">Arsenal</div>
              <div className="fix-dots">
                <div className="dot d3">3</div>
                <div className="dot d3">3</div>
                <div className="dot d4">4</div>
                <div className="dot d2">2</div>
                <div className="dot d3">3</div>
              </div>
            </div>
            <div className="fixture-row">
              <div className="fix-team">Chelsea</div>
              <div className="fix-dots">
                <div className="dot d4">4</div>
                <div className="dot d3">3</div>
                <div className="dot d5">5</div>
                <div className="dot d4">4</div>
                <div className="dot d3">3</div>
              </div>
            </div>
          </div>

          {/* Mini League */}
          <div className="mini-card">
            <div className="mini-title">Mini-League</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Manager</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span>
                  <span style={{ color: 'var(--neon)' }}>1.</span> You
                </span>
                <span style={{ color: 'var(--neon)' }}>1,612</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span>
                  <span style={{ color: 'var(--muted)' }}>2.</span> Kieran F
                </span>
                <span>1,589</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span>
                  <span style={{ color: 'var(--muted)' }}>3.</span> Maya P
                </span>
                <span>1,571</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span>
                  <span style={{ color: 'var(--muted)' }}>4.</span> Raj K
                </span>
                <span>1,554</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                <span>
                  <span style={{ color: 'var(--muted)' }}>5.</span> Sam W
                </span>
                <span>1,542</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <p>© 2025 FPL Booster · Not affiliated with the Premier League</p>
        <p style={{ color: 'var(--neon)' }}>Data live · GW 27 Deadline: Sat 15:30</p>
      </footer>
    </div>
  );
}
