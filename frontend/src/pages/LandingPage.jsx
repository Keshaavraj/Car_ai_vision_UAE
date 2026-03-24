import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCamera, FaMicrophone, FaMapMarkerAlt, FaShieldAlt,
  FaBolt, FaCarCrash, FaTools, FaCommentDots,
  FaChevronRight
} from 'react-icons/fa';
import './LandingPage.css';

const FEATURES = [
  {
    icon: <FaCamera size={32} />,
    title: 'Camera Vision',
    desc: 'Snap your car damage — Llama 4 Scout analyses severity, parts affected, and repair complexity instantly.',
    accent: true,
  },
  {
    icon: <FaMicrophone size={32} />,
    title: 'Voice First',
    desc: 'Speak your issue. No typing needed — full voice input and spoken responses via Web Speech API.',
  },
  {
    icon: <FaCarCrash size={32} />,
    title: 'Damage Assessment',
    desc: 'AI identifies scratch, dent, panel damage, glass cracks, and more with severity grading.',
  },
  {
    icon: <FaTools size={32} />,
    title: 'Repair Cost in AED',
    desc: 'Instant cost estimates in AED based on UAE labour rates and parts pricing.',
    accent: true,
  },
  {
    icon: <FaMapMarkerAlt size={32} />,
    title: 'Live Workshops',
    desc: 'Detects your emirate and finds real nearby garages via OpenStreetMap — no API key needed.',
  },
  {
    icon: <FaShieldAlt size={32} />,
    title: 'Insurance Advice',
    desc: 'Claim or pay yourself? UAE-specific insurance guidance based on your estimated repair cost.',
  },
  {
    icon: <FaBolt size={32} />,
    title: 'Real-time Streaming',
    desc: 'Token-by-token SSE streaming via Groq — responses start in under a second.',
    accent: true,
  },
  {
    icon: <FaCommentDots size={32} />,
    title: 'Multi-turn Chat',
    desc: 'Follow-up questions, clarifications, accident procedures — full conversational context maintained.',
  },
];

const EMIRATES = [
  { name: 'Abu Dhabi',  emoji: '🏛️', desc: 'Capital & largest emirate' },
  { name: 'Dubai',      emoji: '🏙️', desc: 'Workshop-dense, fast service' },
  { name: 'Sharjah',   emoji: '🕌', desc: 'Budget-friendly repair options' },
  { name: 'Ajman',     emoji: '⚓', desc: 'Compact city, quick access' },
  { name: 'RAK',       emoji: '🏔️', desc: 'Ras Al Khaimah coverage' },
  { name: 'Fujairah',  emoji: '🌊', desc: 'East coast emirate support' },
];

const STEPS = [
  { num: '01', title: 'Snap or Speak',  desc: 'Take a photo of the damage or describe it by voice. No typing required.' },
  { num: '02', title: 'AI Analyses',    desc: 'Llama 4 Scout identifies damage type, severity, and affected parts in seconds.' },
  { num: '03', title: 'Get Your Plan',  desc: 'Receive cost estimate in AED, nearby workshop recommendations, and insurance advice.' },
];

export default function LandingPage() {
  const navigate  = useNavigate();
  const canvasRef = useRef(null);

  // Particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx   = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192,57,43,${p.alpha})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="landing">
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* ── NAV ── */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">🚗</span>
          <span className="logo-text">Car<span className="logo-accent">AI</span> Vision UAE</span>
        </div>
        <button className="nav-cta" onClick={() => navigate('/chat')}>
          Launch Assistant <FaChevronRight size={12} />
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-badge">
          <span className="badge-dot" />
          Powered by Groq · Llama 4 Scout · 70B
        </div>

        <h1 className="hero-title">
          AI That Sees<br />
          <span className="hero-accent">Your Car Damage</span>
        </h1>

        <p className="hero-sub">
          Snap a photo or speak your issue — get instant damage analysis,<br />
          AED repair estimates, and nearby UAE workshops in seconds.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate('/chat')}>
            <FaCamera size={16} /> Analyse My Car
          </button>
          <button className="btn-secondary" onClick={() => navigate('/chat')}>
            <FaMicrophone size={16} /> Ask by Voice
          </button>
        </div>

        <div className="hero-stats">
          {[
            { val: '3',     label: 'AI Models'       },
            { val: '<1s',   label: 'Response'         },
            { val: '6',     label: 'Emirates'         },
            { val: '100%',  label: 'Free'             },
          ].map(s => (
            <div key={s.label} className="stat-item">
              <span className="stat-val">{s.val}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Floating damage indicators */}
        <div className="floating-cards">
          {[
            { icon: '🔴', label: 'Front Bumper Dent',  sub: 'Moderate · AED 800–1200' },
            { icon: '🟡', label: 'Side Panel Scratch',  sub: 'Minor · AED 300–600'    },
            { icon: '🔴', label: 'Windshield Crack',    sub: 'Severe · AED 1500–2500' },
          ].map(c => (
            <div key={c.label} className="float-card">
              <span className="float-icon">{c.icon}</span>
              <div>
                <div className="float-label">{c.label}</div>
                <div className="float-sub">{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section how-section">
        <h2 className="section-title">How It Works</h2>
        <p className="section-sub">Three steps from damage to repair plan</p>
        <div className="steps-row">
          {STEPS.map((s, i) => (
            <div key={s.num} className="step-card">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              {i < STEPS.length - 1 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section features-section">
        <h2 className="section-title">Intelligent Features</h2>
        <p className="section-sub">Everything you need — voice, vision, location, and expert AI knowledge</p>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className={`feature-card ${f.accent ? 'feature-card--accent' : ''}`}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMIRATES ── */}
      <section className="section emirates-section">
        <h2 className="section-title">Covers All UAE Emirates</h2>
        <p className="section-sub">Location-aware — detects your emirate and finds nearby workshops</p>
        <div className="emirates-grid">
          {EMIRATES.map(e => (
            <div key={e.name} className="emirate-card">
              <span className="emirate-emoji">{e.emoji}</span>
              <div className="emirate-name">{e.name}</div>
              <div className="emirate-desc">{e.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Damaged? Get answers in seconds.</h2>
          <p className="cta-sub">No signup. No fees. Just snap, speak, and get your repair plan.</p>
          <button className="btn-primary btn-large" onClick={() => navigate('/chat')}>
            <FaCamera size={18} /> Start Now — It's Free
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <p>Built with <span className="footer-accent">Groq</span> · <span className="footer-accent">React</span> · <span className="footer-accent">FastAPI</span> · <span className="footer-accent">OpenStreetMap</span></p>
        <p className="footer-note">For educational and non-commercial use only · UAE Car Care</p>
      </footer>
    </div>
  );
}
