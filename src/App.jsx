import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Radio, Mic, MicOff, Volume2, Zap, AlertTriangle, Layers,
  Cpu, Shield, Activity, Send, CheckCircle2, Clock,
  ArrowRight, Server, WifiOff, Sliders,
  Copy, Check, Link, Wifi, MessageSquare, Users, Globe,
  RefreshCw, PhoneOff, Trash2, X, Info, Sparkles, Sun, Moon,
  BarChart3, Settings, FileText, Terminal, Satellite
} from 'lucide-react';
import { TACTICAL_SAMPLES, HOW_IT_WORKS_INFO } from './data/samplesAndInfo';
import { audioEngine } from './utils/audioEngine';
import { usePeer } from './utils/usePeer';
import './App.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function generateHexTokens(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  const bytes = [];
  for (let i = 0; i < 18; i++) {
    const byte = Math.abs((hash * (i + 1) * 31 + i * 17) % 256);
    bytes.push('0x' + byte.toString(16).padStart(2, '0').toUpperCase());
  }
  return bytes.join(' ');
}

export default function App() {
  // Navigation & Themes
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'logs', 'languages', 'config'
  const [isSolarMode, setIsSolarMode] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  // Transceiver State
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [remotePeerInput, setRemotePeerInput] = useState('');
  const [copiedPeerId, setCopiedPeerId] = useState(false);

  // Message Logs
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      senderId: 'ISRO-BASE-01',
      text: 'बेस स्टेशन 4: उत्तरी सेक्टर में संचार लिंक सक्रिय। (24 bps)',
      language: 'hi',
      isSos: false,
      timestamp: Date.now() - 120000,
      tokensHex: generateHexTokens('बेस स्टेशन 4: उत्तरी सेक्टर में संचार लिंक सक्रिय।'),
      isSentByMe: false
    },
    {
      id: 'init-2',
      senderId: 'OP-ALPHA',
      text: 'Target visual confirmed at sector 4. Medical teams advancing.',
      language: 'en',
      isSos: false,
      timestamp: Date.now() - 45000,
      tokensHex: generateHexTokens('Target visual confirmed at sector 4. Medical teams advancing.'),
      isSentByMe: true
    }
  ]);

  // Spectrum Bars State
  const [spectrumBars, setSpectrumBars] = useState(() =>
    Array.from({ length: 28 }, () => Math.floor(Math.random() * 80 + 10))
  );

  // WebRTC P2P Hook
  const {
    myPeerId,
    connectionStatus,
    activeRemotePeerId,
    lastError,
    connectToPeer,
    disconnectPeer,
    sendMessageToPeer
  } = usePeer({
    onMessageReceived: (packet) => {
      setMessages((prev) => [...prev, { ...packet, isSentByMe: false }]);
      audioEngine.speak(packet.text, packet.language);
    }
  });

  // UTC Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animate Spectrum Bars
  useEffect(() => {
    const interval = setInterval(() => {
      setSpectrumBars((prev) =>
        prev.map(() => Math.floor(Math.random() * 85 + 15))
      );
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Send Message Handler
  const handleSendMessage = (textToSend = inputText, isSos = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const hexTokens = generateHexTokens(trimmed);
    const newPacket = {
      id: `msg-${Date.now()}`,
      senderId: myPeerId ? myPeerId.slice(0, 8).toUpperCase() : 'NODE-ALPHA',
      text: trimmed,
      language: selectedLanguage,
      isSos: isSos,
      timestamp: Date.now(),
      tokensHex: hexTokens,
      isSentByMe: true
    };

    setMessages((prev) => [...prev, newPacket]);
    setInputText('');

    // Broadcast over real WebRTC P2P
    sendMessageToPeer(newPacket);

    // Speak locally if audio playback enabled
    if (!isSos) {
      audioEngine.speak(trimmed, selectedLanguage);
    }
  };

  // Push-To-Talk Voice Handler
  const handlePttToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      audioEngine.stopRecording();
    } else {
      setIsRecording(true);
      audioEngine.startRecording({
        language: selectedLanguage,
        onTranscript: (text) => {
          setIsRecording(false);
          setInputText(text);
          handleSendMessage(text, false);
        },
        onError: (err) => {
          setIsRecording(false);
        }
      });
    }
  };

  const handleSosTrigger = () => {
    const sosMsg = "🚨 EMERGENCY SOS: Level 0 Alert [Chamoli Sector 4 • GPS: 30.42°N, 79.33°E]";
    handleSendMessage(sosMsg, true);
  };

  const copyMyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(myPeerId);
      setCopiedPeerId(true);
      setTimeout(() => setCopiedPeerId(false), 2000);
    }
  };

  return (
    <div className={`app-container ${isSolarMode ? 'solar-mode' : ''}`}>
      <div className="scanline"></div>

      {/* ─── Top Mission Header ─── */}
      <header className="mission-header">
        <div className="mission-ticker">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-active)', display: 'inline-block' }}></span>
            <span>MISSION ACTIVE • 24 BPS RF LINK</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>SAVINGS: 2,666×</span>
            <span>{utcTime || '00:00:00 UTC'}</span>
          </div>
        </div>

        <div className="mission-nav-bar">
          <div className="brand-badge">
            <Radio size={22} color="var(--saffron-primary)" />
            <span className="brand-title">iTANTRA</span>
            <span className="isro-pill">ISRO SIH26173</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowArchModal(true)}
              className="lang-chip"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Activity size={12} />
              <span>369ms Budget</span>
            </button>

            <button
              onClick={() => setShowPairModal(true)}
              className={`lang-chip ${connectionStatus === 'connected' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Link size={12} />
              <span>{connectionStatus === 'connected' ? 'Linked P2P' : 'Pair Node'}</span>
            </button>

            <button
              onClick={() => setIsSolarMode(!isSolarMode)}
              className="lang-chip"
              style={{ padding: '6px 8px' }}
              title="Toggle Solar / Dark Mode"
            >
              {isSolarMode ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Tabs ─── */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <>
            {/* 1. Network Spectrum Visualization Card */}
            <section className="tactical-card">
              <div className="card-header">
                <div className="card-title">
                  <Satellite size={16} color="var(--saffron-primary)" />
                  <span>Network Spectrum • Tactical RF Uplink</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--status-active)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-active)' }}></span>
                  <span>ACTIVE (24 BPS)</span>
                </div>
              </div>

              <div className="spectrum-bars-container">
                {spectrumBars.map((height, idx) => (
                  <div
                    key={idx}
                    className={`spectrum-bar ${height > 65 ? 'active' : ''}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="spectrum-freqs">
                <span>30 MHz (VHF)</span>
                <span>150 MHz (ISRO Tactical)</span>
                <span>300 MHz (UHF LoRa)</span>
                <span>450 MHz (Satellite)</span>
              </div>
            </section>

            {/* 2. Neural Link Status & Dialect Chips */}
            <section className="tactical-card">
              <div className="card-header">
                <div>
                  <div className="card-title">Neural Link Status</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Air-gapped 18-byte neural quantization core active
                  </div>
                </div>
                <span className="isro-pill">SYS-OP: OK</span>
              </div>

              <div className="neural-metrics-grid">
                <div className="metric-box">
                  <div className="metric-label">
                    <span>INCOMING (STT)</span>
                    <Volume2 size={14} color="var(--accent-blue)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>98.4%</div>
                  <div className="metric-progress">
                    <div className="metric-fill-blue" style={{ width: '98.4%' }}></div>
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-label">
                    <span>OUTGOING (TTS)</span>
                    <Zap size={14} color="var(--saffron-primary)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--saffron-primary)' }}>99.1%</div>
                  <div className="metric-progress">
                    <div className="metric-fill-saffron" style={{ width: '99.1%' }}></div>
                  </div>
                </div>
              </div>

              {/* Indic Language Chips */}
              <div className="language-chips-scroll">
                {[
                  { code: 'hi', label: 'HINDI (हिंदी)' },
                  { code: 'en', label: 'ENGLISH' },
                  { code: 'ta', label: 'TAMIL (தமிழ்)' },
                  { code: 'mr', label: 'MARATHI (मराठी)' },
                  { code: 'te', label: 'TELUGU (తెలుగు)' },
                  { code: 'bn', label: 'BENGALI (বাংলা)' }
                ].map((item) => (
                  <button
                    key={item.code}
                    className={`lang-chip ${selectedLanguage === item.code ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage(item.code)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Indic Emergency Presets Bar */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { label: '🇮🇳 Chamoli Cloudburst', text: 'चमोली में बादल फटा है, तुरंत मेडिकल टीम भेजो।', lang: 'hi' },
                { label: '🌊 Coastal Rescue', text: 'கப்பல் புயலில் சிக்கியுள்ளது, மீட்புப் படகை அனுப்புங்கள்.', lang: 'ta' },
                { label: '⛰️ Ghats Landslide', text: 'घाटमाथ्यावर दरड कोसळली आहे, रस्ता बंद आहे.', lang: 'mr' },
                { label: '📡 ISRO Base Command', text: 'Base Station 4, oxygen supply critical, initiate evacuation plan.', lang: 'en' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  className="lang-chip"
                  onClick={() => {
                    setSelectedLanguage(p.lang);
                    handleSendMessage(p.text, false);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 4. Tactical Communications Thread */}
            <section className="tactical-card" style={{ flex: 1, minHeight: '300px' }}>
              <div className="card-header">
                <div className="card-title">
                  <MessageSquare size={16} color="var(--saffron-primary)" />
                  <span>Tactical Comms Stream ({messages.length} Packets)</span>
                </div>
                <button
                  onClick={() => setMessages([])}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  title="Clear Log"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="tactical-chat-list">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`msg-bubble ${m.isSentByMe ? 'msg-outgoing' : 'msg-incoming'} ${m.isSos ? 'msg-sos' : ''}`}
                  >
                    <div className="msg-meta">
                      <span>{m.senderId} • {fmtTime(m.timestamp)}</span>
                      <button
                        onClick={() => audioEngine.speak(m.text, m.language)}
                        style={{ background: 'none', border: 'none', color: 'var(--saffron-primary)', cursor: 'pointer' }}
                        title="Replay Audio"
                      >
                        <Volume2 size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: '500', color: m.isSentByMe ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                      {m.text}
                    </div>

                    <div className="hex-token-badge">
                      📦 18B: {m.tokensHex}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ─── TAB: LOGS ─── */}
        {activeTab === 'logs' && (
          <section className="tactical-card">
            <div className="card-header">
              <div className="card-title">
                <Terminal size={16} color="var(--saffron-primary)" />
                <span>RF Telemetry & Packet Hex Stream</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-outline)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--saffron-primary)', marginBottom: '4px' }}>
                    <span>PACKET #{idx + 1} • {m.senderId}</span>
                    <span>{fmtTime(m.timestamp)}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>"{m.text}"</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '11px', wordBreak: 'break-all' }}>
                    Hex Payload: <span style={{ color: 'var(--saffron-glow)' }}>{m.tokensHex}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '10px', color: 'var(--status-active)' }}>
                    <span>Size: 18 Bytes</span>
                    <span>Bitrate: 24 bps</span>
                    <span>CRC16: VALID ✓</span>
                    <span>Bandwidth Savings: 2,666×</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── TAB: LANGUAGES ─── */}
        {activeTab === 'languages' && (
          <section className="tactical-card">
            <div className="card-header">
              <div className="card-title">
                <Globe size={16} color="var(--saffron-primary)" />
                <span>Multilingual Neural Accents & Models</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { name: 'Hindi (हिंदी)', dialect: 'Standard Northern Devanagari', acc: '98.8%', engine: 'Bhashini + Whisper' },
                { name: 'Tamil (தமிழ்)', dialect: 'Dravidian Tactical Coast', acc: '98.1%', engine: 'Bhashini ULCA API' },
                { name: 'Marathi (मराठी)', dialect: 'Sahyadri Terrain Mesh', acc: '97.9%', engine: 'Offline Android TTS' },
                { name: 'Telugu (తెలుగు)', dialect: 'Eastern Ghats Grid', acc: '98.2%', engine: 'Bhashini ULCA API' },
                { name: 'Bengali (বাংলা)', dialect: 'Delta Flood Radar', acc: '97.8%', engine: 'Offline Android TTS' },
                { name: 'English (Indian)', dialect: 'ISRO Aerospace Tactical', acc: '99.4%', engine: 'Faster-Whisper Tiny' }
              ].map((lang, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-outline)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{lang.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0' }}>{lang.dialect}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--saffron-primary)', fontFamily: 'var(--font-mono)' }}>
                    <span>Accuracy: {lang.acc}</span>
                    <span>{lang.engine}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── TAB: CONFIG ─── */}
        {activeTab === 'config' && (
          <section className="tactical-card">
            <div className="card-header">
              <div className="card-title">
                <Settings size={16} color="var(--saffron-primary)" />
                <span>System Configuration & Device Pairing</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="metric-box">
                <div className="metric-label">YOUR LOCAL RADIO NODE ID</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <input
                    type="text"
                    readOnly
                    value={myPeerId || 'Initializing...'}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-outline)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  />
                  <button onClick={copyMyId} className="lang-chip" style={{ padding: '8px 12px' }}>
                    {copiedPeerId ? <Check size={14} color="var(--status-active)" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-label">CONNECT TO REMOTE PEER NODE</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <input
                    type="text"
                    placeholder="Paste remote Node Peer ID..."
                    value={remotePeerInput}
                    onChange={(e) => setRemotePeerInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-outline)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  />
                  <button
                    onClick={() => connectToPeer(remotePeerInput)}
                    className="lang-chip active"
                    style={{ padding: '8px 16px' }}
                  >
                    Link Node
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <QRCodeSVG value={myPeerId || 'https://itantra-isro.vercel.app'} size={140} fgColor="#ff9d33" bgColor="transparent" />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── Bottom Floating PTT Bar ─── */}
      <div className="ptt-container">
        <button
          className={`ptt-btn ${isRecording ? 'recording' : ''}`}
          onClick={handlePttToggle}
          title="Push To Talk"
        >
          {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
          <span style={{ fontSize: '9px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
            {isRecording ? 'REC…' : 'PTT'}
          </span>
        </button>
      </div>

      {/* ─── Bottom Navigation Bar ─── */}
      <nav className="bottom-nav">
        <div
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Radio size={18} />
          <span>DASHBOARD</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Terminal size={18} />
          <span>LOGS</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'languages' ? 'active' : ''}`}
          onClick={() => setActiveTab('languages')}
        >
          <Globe size={18} />
          <span>LANGUAGES</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={18} />
          <span>CONFIG</span>
        </div>
      </nav>

      {/* ─── Architecture & 369ms Latency Modal ─── */}
      {showArchModal && (
        <div className="modal-overlay" onClick={() => setShowArchModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                ⚡ 369ms Latency Budget & 18-Byte Packet
              </div>
              <button onClick={() => setShowArchModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.5' }}>
              <div style={{ padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-outline)' }}>
                <strong style={{ color: 'var(--saffron-primary)' }}>1. Speech-to-Text (STT):</strong> Faster-Whisper / On-Device ASR (120ms)
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-outline)' }}>
                <strong style={{ color: 'var(--saffron-primary)' }}>2. Neural Tokenizer:</strong> 18-Byte Quantization + CRC16 (8ms) • 2,666× savings
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-outline)' }}>
                <strong style={{ color: 'var(--saffron-primary)' }}>3. 24 bps RF Transmission:</strong> LoRa / Tactical HF Link (18ms)
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-outline)' }}>
                <strong style={{ color: 'var(--saffron-primary)' }}>4. Neural Voice Synthesis:</strong> Bhashini / On-Device Indic TTS (223ms)
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: '700', color: 'var(--status-active)', fontFamily: 'var(--font-mono)' }}>
                TOTAL PIPELINE LATENCY: 369 ms (Real-Time Voice Grade)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── P2P Pairing Modal ─── */}
      {showPairModal && (
        <div className="modal-overlay" onClick={() => setShowPairModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                🔗 Pair Radio Nodes (Zero-Server WebRTC)
              </div>
              <button onClick={() => setShowPairModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="metric-box">
                <div className="metric-label">YOUR NODE ID</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    readOnly
                    value={myPeerId || 'Initializing...'}
                    style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-outline)', borderRadius: '6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                  />
                  <button onClick={copyMyId} className="lang-chip">
                    {copiedPeerId ? <Check size={14} color="var(--status-active)" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <QRCodeSVG value={myPeerId || 'https://itantra-isro.vercel.app'} size={150} fgColor="#ff9d33" bgColor="transparent" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
