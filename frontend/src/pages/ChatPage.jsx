import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FaPaperPlane, FaTrash, FaHome, FaStop,
  FaPlay, FaPause, FaBolt, FaCamera, FaMicrophone,
  FaTimes, FaBars, FaImage, FaMapMarkerAlt, FaSpinner
} from 'react-icons/fa';
import { UAE_WORKSHOPS } from '../data/workshops';
import './ChatPage.css';

// ── Session memory helpers ─────────────────────────────────
const MEM_KEY = 'car_ai_session';
const loadMemory = () => { try { return JSON.parse(localStorage.getItem(MEM_KEY) || '{}'); } catch { return {}; } };
const saveMemory = (patch) => { try { localStorage.setItem(MEM_KEY, JSON.stringify({ ...loadMemory(), ...patch })); } catch {} };

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_BASE    = 'https://api.groq.com/openai/v1';

const SYSTEM_PROMPT = `You are a specialized UAE car care assistant. You ONLY respond to questions about:
- Car damage assessment and repair (scratches, dents, accidents, mechanical issues)
- Repair cost estimates in AED (UAE market rates)
- UAE car workshops and service centres
- UAE car insurance guidance (claim or self-pay decisions)
- UAE traffic laws, RTA regulations, and accident procedures
- Car maintenance, spare parts, and service intervals for UAE conditions
- Roadside assistance and emergency procedures in UAE

If asked anything unrelated to cars or UAE automotive topics, respond exactly:
"I'm specialized in UAE car care only. Ask me about your car damage, repair costs, workshops, or insurance."

When giving cost estimates, always use AED and mention that prices vary by workshop and car brand.

Key UAE references:
- RTA (Roads and Transport Authority): https://www.rta.ae
- UAE Insurance Authority guidelines apply to all vehicle insurance
- Common UAE workshop areas: Al Quoz (Dubai), Mussafah (Abu Dhabi), Industrial Area (Sharjah)

Always be helpful, accurate, and concise. Cite sources when referencing official data.`;

const QUICK_ACTIONS = [
  { e: '🔴', q: 'I have a front bumper dent — how much to fix in Abu Dhabi?' },
  { e: '💥', q: 'My car was in an accident — what are the RTA procedures?' },
  { e: '🔧', q: 'Best workshops in Dubai for Toyota Camry service?' },
  { e: '🛡️', q: 'Should I claim insurance for a AED 1200 repair?' },
  { e: '🪟', q: 'Windshield crack — replace or repair? Cost estimate?' },
];

export default function ChatPage() {
  const navigate = useNavigate();

  const [messages,      setMessages]      = useState([]);
  const [inputText,     setInputText]     = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [voiceEnabled,  setVoiceEnabled]  = useState(() => loadMemory().voiceEnabled ?? true);
  const [voiceSpeed,    setVoiceSpeed]    = useState(() => loadMemory().voiceSpeed   ?? 1.7);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [sttSupported,  setSttSupported]  = useState(true);
  const [imagePreview,  setImagePreview]  = useState(null);
  const [imageBase64,   setImageBase64]   = useState(null);
  const [locLoading,    setLocLoading]    = useState(false);
  const [detectedEmirate, setDetectedEmirate] = useState(() => loadMemory().emirate || null);
  const [metrics, setMetrics] = useState({
    lastResponseTime: 0,
    avgResponseTime:  0,
    totalTokens:      0,
    messagesCount:    0,
  });

  const messagesEndRef    = useRef(null);
  const abortControllerRef = useRef(null);
  const utteranceRef      = useRef(null);
  const inputRef          = useRef(null);
  const recognitionRef    = useRef(null);
  const fileInputRef      = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── STT check on mount ─────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSttSupported(false);
  }, []);

  // ── Persist preferences to session memory ──────────────────
  useEffect(() => { saveMemory({ voiceEnabled }); }, [voiceEnabled]);
  useEffect(() => { saveMemory({ voiceSpeed });   }, [voiceSpeed]);
  useEffect(() => { if (detectedEmirate) saveMemory({ emirate: detectedEmirate }); }, [detectedEmirate]);

  // ── SSE stream reader ──────────────────────────────────────
  const readSSEStream = async (response, onToken) => {
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return fullContent;
        try {
          const token = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (token) { fullContent += token; onToken(fullContent); }
        } catch (_) {}
      }
    }
    return fullContent;
  };

  // ── Send message ───────────────────────────────────────────
  const handleSend = async (text = inputText, imgB64 = imageBase64) => {
    if (!text.trim() && !imgB64 || isLoading) return;
    const sendText = text.trim() || 'Analyse this car damage image and give me a detailed assessment with repair cost in AED.';

    stopSpeech();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    // Build user message — vision or plain text
    const userMsgContent = imgB64
      ? [
          { type: 'text',      text: sendText },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imgB64}` } },
        ]
      : sendText;

    const userMsg = { role: 'user', content: userMsgContent, imagePreview: imgB64 ? imagePreview : null };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setInputText('');
    setImagePreview(null);
    setImageBase64(null);
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // For history we only keep plain text messages (vision model can't see past images anyway)
      const history = [...messages, { role: 'user', content: sendText }].slice(-10);

      const model    = imgB64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';
      const apiMsgs  = imgB64
        ? [
            { role: 'system',  content: SYSTEM_PROMPT },
            { role: 'user',    content: userMsgContent },
          ]
        : [
            { role: 'system',  content: SYSTEM_PROMPT },
            ...history,
          ];

      const response = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ model, messages: apiMsgs, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const fullContent = await readSSEStream(response, (content) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content };
          return updated;
        });
      });

      const responseTime  = (Date.now() - startTime) / 1000;
      const tokenEstimate = Math.round(fullContent.split(' ').length * 1.3);

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullContent, responseTime };
        return updated;
      });

      setMetrics(prev => ({
        lastResponseTime: responseTime,
        avgResponseTime:  ((prev.avgResponseTime * prev.messagesCount) + responseTime) / (prev.messagesCount + 1),
        totalTokens:      prev.totalTokens + tokenEstimate,
        messagesCount:    prev.messagesCount + 1,
      }));

      setIsLoading(false);

      // TTS
      if (voiceEnabled && fullContent && 'speechSynthesis' in window) {
        speakText(fullContent, voiceSpeed);
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // ── Image helpers ──────────────────────────────────────────
  const resizeImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 768;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else                { width  = Math.round(width  * MAX / height); height = MAX; }
      }
      const canvas  = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          const b64     = dataUrl.split(',')[1];
          resolve({ dataUrl, b64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const { dataUrl, b64 } = await resizeImage(file);
      setImagePreview(dataUrl);
      setImageBase64(b64);
    } catch {
      alert('Could not load image. Please try another file.');
    }
  };

  const clearImage = () => { setImagePreview(null); setImageBase64(null); };

  // ── STT helpers ────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    stopSpeech();
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setInputText(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // auto-send if there's text
      setInputText(prev => {
        if (prev.trim()) {
          setTimeout(() => handleSend(prev), 50);
        }
        return prev;
      });
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') console.warn('STT error:', e.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // ── TTS helpers ────────────────────────────────────────────
  const speakText = (text, speed) => {
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/#{1,6}\s+/g,          '')
      .replace(/\*\*(.+?)\*\*/g,      '$1')
      .replace(/\*(.+?)\*/g,          '$1')
      .replace(/__(.+?)__/g,          '$1')
      .replace(/_(.+?)_/g,            '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^\s*[-*+]\s+/gm,      '')
      .replace(/^\s*\d+\.\s+/gm,      '')
      .replace(/^\s*[|].*[|]\s*$/gm,  '')
      .replace(/[-]{3,}/g,            '')
      .replace(/[>|\\~]/g,            '')
      .replace(/\s{2,}/g,             ' ')
      .trim()
      .slice(0, 300);

    const utterance   = new SpeechSynthesisUtterance(clean);
    utterance.rate    = speed;
    utterance.lang    = 'en-US';
    utterance.onstart = () => { setIsPlaying(true);  setIsSpeaking(true);  };
    utterance.onend   = () => { setIsPlaying(false); setIsSpeaking(false); };
    utterance.onerror = () => { setIsPlaying(false); setIsSpeaking(false); };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setIsSpeaking(false);
  };

  const toggleSpeech = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume(); setIsPlaying(true);
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause(); setIsPlaying(false);
    }
  };

  const clearChat = () => {
    stopSpeech();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setMetrics({ lastResponseTime: 0, avgResponseTime: 0, totalTokens: 0, messagesCount: 0 });
  };

  // ── Location + Workshop Finder ─────────────────────────────
  const detectEmirate = (lat, lon) => {
    // Rough bounding boxes for UAE emirates
    if (lat >= 22.6 && lat <= 24.2 && lon >= 51.5 && lon <= 55.5) return 'Abu Dhabi';
    if (lat >= 24.8 && lat <= 25.4 && lon >= 54.9 && lon <= 55.7) return 'Dubai';
    if (lat >= 25.1 && lat <= 25.6 && lon >= 55.3 && lon <= 55.9) return 'Sharjah';
    if (lat >= 25.3 && lat <= 25.6 && lon >= 55.4 && lon <= 55.7) return 'Ajman';
    if (lat >= 25.6 && lat <= 26.2 && lon >= 55.6 && lon <= 56.3) return 'Ras Al Khaimah';
    if (lat >= 25.0 && lat <= 25.4 && lon >= 56.0 && lon <= 56.5) return 'Fujairah';
    if (lat >= 24.0 && lat <= 24.4 && lon >= 53.5 && lon <= 54.1) return 'Abu Dhabi'; // Al Ain area
    return 'UAE';
  };

  const fetchNearbyWorkshops = async (lat, lon) => {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="car_repair"](around:15000,${lat},${lon});
        way["amenity"="car_repair"](around:15000,${lat},${lon});
        node["shop"="car_repair"](around:15000,${lat},${lon});
        way["shop"="car_repair"](around:15000,${lat},${lon});
        node["amenity"="vehicle_inspection"](around:15000,${lat},${lon});
        node["craft"="car_repair"](around:15000,${lat},${lon});
        node["name"~"workshop|garage|repair|service|auto|motors",i]["amenity"!="fuel"](around:15000,${lat},${lon});
      );
      out center 20;
    `.trim();

    const res  = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const json = await res.json();
    return json.elements || [];
  };

  const buildCuratedSection = (emirate) => {
    const list = UAE_WORKSHOPS[emirate] || UAE_WORKSHOPS['UAE'];
    const lines = list.map((w, i) =>
      `**${i + 1}. ${w.name}**\n` +
      `📍 ${w.area}\n` +
      `📞 ${w.phone}\n` +
      `🗺️ [Open in Maps](${w.map})\n` +
      `💰 ${w.price}`
    );
    return `### 🔧 Top Car Workshops in ${emirate}\n\n${lines.join('\n\n')}`;
  };

  const handleFindWorkshops = async () => {
    if (!navigator.geolocation) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Geolocation is not supported by your browser. Try sharing your location manually or search for workshops in your area.',
      }]);
      return;
    }

    setLocLoading(true);
    setSidebarOpen(false);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        const emirate = detectEmirate(lat, lon);
        setDetectedEmirate(emirate);

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📍 Detected: **${emirate}**\n\nSearching nearby…`,
        }]);

        // Run OSM + curated in parallel
        const shops = await fetchNearbyWorkshops(lat, lon).catch(() => []);

        let osmSection = '';
        if (shops.length) {
          const named = shops.filter(s => s.tags?.name || s.tags?.['name:en']);
          const top   = (named.length ? named : shops).slice(0, 3);
          const lines = top.map((s, i) => {
            const name    = s.tags?.name || s.tags?.['name:en'] || 'Workshop';
            const street  = s.tags?.['addr:street'] || s.tags?.['addr:city'] || '';
            const phone   = s.tags?.phone || s.tags?.['contact:phone'] || s.tags?.['contact:mobile'] || '—';
            const slat    = s.lat ?? s.center?.lat;
            const slon    = s.lon ?? s.center?.lon;
            const mapsUrl = slat
              ? `https://maps.google.com/?q=${slat},${slon}`
              : `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + emirate)}`;
            return `**${i + 1}. ${name}**\n📍 ${street || emirate}\n📞 ${phone}\n🗺️ [Open in Maps](${mapsUrl})`;
          });
          osmSection = `### 📡 Closest Workshops (GPS)\n\n${lines.join('\n\n')}\n\n---\n\n`;
        }

        const curatedSection = buildCuratedSection(emirate);
        const tip = '\n\n> 💡 **Tip:** For repairs under AED 1,500 it\'s usually cheaper to pay out-of-pocket than claim insurance (avoids premium hike).';

        const content = osmSection + curatedSection + tip;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content };
          return updated;
        });

        setLocLoading(false);
      },
      (err) => {
        setLocLoading(false);
        const msg = err.code === 1
          ? '❌ Location access denied. Please allow location in your browser settings, then try again.'
          : '❌ Could not get your location. Please try again or describe your area and I\'ll suggest workshops.';
        setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="chat-page">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span>🚗</span>
            <span>Car AI Vision UAE</span>
          </div>
          <div className="sidebar-header-btns">
            <button className="icon-btn" onClick={() => navigate('/')} title="Home">
              <FaHome />
            </button>
            <button className="icon-btn" onClick={() => setSidebarOpen(false)} title="Close">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="metrics-panel">
          <h3 className="panel-title">📊 Performance</h3>
          {[
            { label: 'Last Response', val: `${metrics.lastResponseTime.toFixed(2)}s` },
            { label: 'Avg Response',  val: `${metrics.avgResponseTime.toFixed(2)}s`  },
            { label: 'Total Tokens',  val: metrics.totalTokens                       },
            { label: 'Messages',      val: metrics.messagesCount                     },
          ].map(m => (
            <div key={m.label} className="metric-row">
              <span className="metric-label">{m.label}</span>
              <span className="metric-val">{m.val}</span>
            </div>
          ))}
        </div>

        <div className="models-panel">
          <h3 className="panel-title">Active Models</h3>
          {[
            { name: 'Llama 3.3 70B',      type: 'Text Chat'       },
            { name: 'Llama 4 Scout 17B',   type: 'Vision'          },
            { name: 'Browser TTS',         type: 'Voice Output'    },
            { name: 'Web Speech API',      type: 'Voice Input'     },
          ].map(m => (
            <div key={m.name} className="model-row">
              <span className="model-dot" />
              <div>
                <div className="model-name">{m.name}</div>
                <div className="model-type">{m.type}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="voice-panel">
          <h3 className="panel-title">🔊 Voice</h3>
          <label className="toggle-row">
            <input type="checkbox" checked={voiceEnabled} onChange={e => setVoiceEnabled(e.target.checked)} />
            <span>Enable Voice</span>
          </label>
          <div className="speed-row">
            <span>Speed: {voiceSpeed}x</span>
            <input
              type="range" min="0.5" max="2" step="0.1"
              value={voiceSpeed}
              onChange={e => setVoiceSpeed(parseFloat(e.target.value))}
              className="speed-slider"
            />
          </div>
          {isSpeaking && (
            <div className="audio-controls">
              <button className="icon-btn" onClick={toggleSpeech}>{isPlaying ? <FaPause /> : <FaPlay />}</button>
              <button className="icon-btn" onClick={stopSpeech}><FaStop /></button>
            </div>
          )}
        </div>

        <div className="location-panel">
          <h3 className="panel-title">📍 Workshops</h3>
          {detectedEmirate && (
            <div className="emirate-badge">📌 {detectedEmirate}</div>
          )}
          <button
            className="locate-btn"
            onClick={handleFindWorkshops}
            disabled={locLoading}
          >
            {locLoading
              ? <><FaSpinner className="spin" /> Locating…</>
              : <><FaMapMarkerAlt /> Find Nearby Workshops</>
            }
          </button>
          <p className="locate-hint">Uses your GPS + OpenStreetMap — no account needed</p>
        </div>

        <button className="clear-btn" onClick={clearChat}>
          <FaTrash /> Clear Chat
        </button>
      </aside>

      {/* ── MAIN CHAT ── */}
      <main className="main-chat">
        <header className="chat-header">
          <div className="chat-header-left">
            <button className="icon-btn hamburger" onClick={() => setSidebarOpen(true)}>
              <FaBars />
            </button>
            <div>
              <h1 className="chat-title">Car AI Vision UAE</h1>
              <p className="chat-sub">Damage analysis · Cost estimates · UAE workshops</p>
            </div>
          </div>
          <div className="header-status">
            <span className="status-dot" />
            <span>Models Active</span>
          </div>
        </header>

        <div className="messages-area">
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">🔧</div>
              <h2 className="welcome-title">Car AI Vision UAE</h2>
              <p className="welcome-sub">Snap a photo, speak, or type — get instant damage analysis, AED estimates, and nearby workshops</p>
              <div className="quick-actions">
                <p className="quick-label">Try asking</p>
                <div className="quick-grid">
                  {QUICK_ACTIONS.map(({ e, q }) => (
                    <button key={q} className="quick-btn" onClick={() => handleSend(q)}>
                      <span>{e}</span> {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const textContent = Array.isArray(msg.content)
              ? msg.content.find(c => c.type === 'text')?.text || ''
              : msg.content;
            return (
              <div key={i} className={`message message--${msg.role}`}>
                <div className="msg-avatar">
                  {msg.role === 'user' ? '👤' : '🔧'}
                </div>
                <div className="msg-body">
                  {msg.imagePreview && (
                    <img src={msg.imagePreview} alt="Uploaded damage" className="msg-img" />
                  )}
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                  </div>
                  {msg.responseTime && (
                    <div className="msg-meta">
                      <FaBolt size={9} />
                      <span>{msg.responseTime.toFixed(2)}s</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="message message--assistant">
              <div className="msg-avatar">🔧</div>
              <div className="msg-body">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── IMAGE PREVIEW ── */}
        {imagePreview && (
          <div className="image-preview-bar">
            <img src={imagePreview} alt="Car damage preview" className="preview-img" />
            <button className="preview-remove" onClick={clearImage} title="Remove image">
              <FaTimes />
            </button>
          </div>
        )}

        {/* ── INPUT BAR ── */}
        <div className="input-bar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className={`input-action-btn${imagePreview ? ' input-action-btn--active' : ''}`}
            title="Take or upload a photo of your car damage"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {imagePreview ? <FaImage /> : <FaCamera />}
          </button>
          <button
            className={`input-action-btn${isListening ? ' input-action-btn--active' : ''}`}
            title={!sttSupported ? 'Voice input not supported in this browser' : isListening ? 'Stop listening' : 'Speak your question'}
            onClick={toggleListening}
            disabled={isLoading || !sttSupported}
          >
            <FaMicrophone />
          </button>

          <input
            ref={inputRef}
            className={`chat-input${isListening ? ' chat-input--listening' : ''}`}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isListening ? '🎙️ Listening… speak now' : 'Describe your car issue or type a question...'}
            disabled={isLoading}
          />

          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading
              ? <FaStop onClick={() => abortControllerRef.current?.abort()} />
              : <FaPaperPlane />
            }
          </button>
        </div>
      </main>
    </div>
  );
}
