import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Radio, Mic, MicOff, Volume2, Zap, AlertTriangle, Layers,
  Cpu, Shield, Activity, Send, CheckCircle2, Clock,
  ArrowRight, Server, WifiOff, Sliders,
  Copy, Check, Link, Wifi, MessageSquare, Users, Globe,
  RefreshCw, PhoneOff, Trash2, X, Info, Sparkles, Sun, Moon,
  Terminal, Settings, Search, Lock, Power, RotateCcw,
  Signal, BarChart2, CheckCircle
} from 'lucide-react';
import { audioEngine } from './utils/audioEngine';
import { usePeer } from './utils/usePeer';
import './App.css';

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
  // Navigation & Mode
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'logs', 'languages', 'config'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  // Radio Config State
  const [bitrate, setBitrate] = useState(1200);
  const [fecEnabled, setFecEnabled] = useState(true);
  const [aesEnabled, setAesEnabled] = useState(false);
  const [macEnabled, setMacEnabled] = useState(true);

  // Transceiver State
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

  // Peer P2P Link State
  const [remotePeerInput, setRemotePeerInput] = useState('');
  const [copiedPeerId, setCopiedPeerId] = useState(false);

  // Tactical Chat Messages
  const [messages, setMessages] = useState([
    {
      id: 'log-1',
      senderId: 'OP-ALPHA',
      type: 'critical',
      timeStr: '14:02:11 UTC',
      text: 'Target visual confirmed at sector 4. Moving to intercept.',
      language: 'en',
      timestamp: Date.now() - 120000,
      tokensHex: generateHexTokens('Target visual confirmed at sector 4. Moving to intercept.'),
      isSentByMe: false
    },
    {
      id: 'log-2',
      senderId: 'COMMAND',
      type: 'routine',
      timeStr: '14:02:45 UTC',
      text: 'Copy that. Proceed with caution. Medical unit on standby.',
      language: 'en',
      timestamp: Date.now() - 45000,
      tokensHex: generateHexTokens('Copy that. Proceed with caution. Medical unit on standby.'),
      isSentByMe: true
    }
  ]);

  // Spectrum Bars State
  const [spectrumBars, setSpectrumBars] = useState(() =>
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 75 + 15))
  );

  // Languages Database
  const [languageList, setLanguageList] = useState([
    { code: 'hi', name: 'Hindi (HIN)', label: 'Hindi Regional Core', id: 'ID:99X4', status: 'Active', size: '412 MB', progress: 100 },
    { code: 'ta', name: 'Tamil (TAM)', label: 'Tamil Regional Core', id: 'ID:72A1', status: 'Standby', size: '389 MB', progress: 100 },
    { code: 'mr', name: 'Marathi (MAR)', label: 'Marathi Regional Core', id: 'ID:44M2', status: 'Downloading', size: '245 / 450 MB', progress: 54 },
    { code: 'te', name: 'Telugu (TEL)', label: 'Telugu Regional Core', id: 'ID:31T9', status: 'Standby', size: '350 MB', progress: 100 },
    { code: 'bn', name: 'Bengali (BEN)', label: 'Bengali Regional Core', id: 'ID:11B8', status: 'Offline', size: '0 MB', progress: 0 },
    { code: 'en', name: 'English (ENG)', label: 'English Tactical Core', id: 'ID:00E1', status: 'Active', size: '120 MB', progress: 100 }
  ]);

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
      setMessages((prev) => [...prev, { ...packet, isSentByMe: false, timeStr: fmtTime(Date.now()) + ' UTC' }]);
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

  // Spectrum animation
  useEffect(() => {
    const interval = setInterval(() => {
      setSpectrumBars((prev) =>
        prev.map(() => Math.floor(Math.random() * 85 + 15))
      );
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Send Message
  const handleSendMessage = (textToSend = inputText, isSos = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const hexTokens = generateHexTokens(trimmed);
    const newPacket = {
      id: `msg-${Date.now()}`,
      senderId: myPeerId ? myPeerId.slice(0, 8).toUpperCase() : 'COMMAND',
      type: isSos ? 'critical' : 'routine',
      timeStr: fmtTime(Date.now()) + ' UTC',
      text: trimmed,
      language: selectedLanguage,
      isSos: isSos,
      timestamp: Date.now(),
      tokensHex: hexTokens,
      isSentByMe: true
    };

    setMessages((prev) => [...prev, newPacket]);
    setInputText('');
    sendMessageToPeer(newPacket);

    if (!isSos) {
      audioEngine.speak(trimmed, selectedLanguage);
    }
  };

  // Push-To-Talk Toggle
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
        onError: () => {
          setIsRecording(false);
        }
      });
    }
  };

  const playAudio = (id, text, lang) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      audioEngine.speak(text, lang || 'en');
      setTimeout(() => setPlayingAudioId(null), 3000);
    }
  };

  const copyMyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(myPeerId);
      setCopiedPeerId(true);
      setTimeout(() => setCopiedPeerId(false), 2000);
    }
  };

  const triggerGlobalSync = () => {
    setIsGlobalSyncing(true);
    setTimeout(() => {
      setIsGlobalSyncing(false);
      setLanguageList((prev) =>
        prev.map((l) => (l.code === 'mr' ? { ...l, status: 'Active', progress: 100, size: '450 MB' } : l))
      );
    }, 1800);
  };

  const filteredMessages = messages.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.senderId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* ─── Top Mission Glass Header ─── */}
      <header className="tactical-glass-header">
        <div className="mission-ticker-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }}></span>
            <span>MISSION ACTIVE</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--on-surface-variant)' }}>
            <span>{(bitrate / 1000).toFixed(1)} kbps</span>
            <span>{utcTime || '00:00:00 UTC'}</span>
          </div>
        </div>

        <div className="header-main-bar">
          <div className="brand-section">
            <Radio size={22} color="var(--primary)" />
            <span className="brand-heading">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'logs' && 'Transceiver Log'}
              {activeTab === 'languages' && 'Languages'}
              {activeTab === 'config' && 'Config'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="lang-btn"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Toggle Tactical Dark / Light Mode"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary-fixed)',
                border: '1px solid var(--outline-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '12px',
                color: 'var(--primary)'
              }}
            >
              ISRO
            </div>
          </div>
        </div>
      </header>

      {/* ─── Page Main Content ─── */}
      <main className="page-main">
        {/* ══════════════════════════════════════════════════
            TAB 1: DASHBOARD (Clean Tech)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* 1. Network Spectrum Visualization */}
            <section className="clean-card">
              <div className="card-header-clean">
                <div className="card-header-title">
                  <Signal size={18} color="var(--primary)" />
                  <span>Network Spectrum</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-fixed)', padding: '3px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: '700', color: 'var(--primary)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                  <span>UPLINK ACTIVE</span>
                </div>
              </div>

              <div className="spectrum-box">
                {spectrumBars.map((h, i) => (
                  <div key={i} className={`spectrum-col ${h > 65 ? 'high' : ''}`} style={{ height: `${h}%` }} />
                ))}
              </div>

              <div className="freq-labels">
                <span>30 MHz</span>
                <span>150 MHz</span>
                <span>300 MHz</span>
                <span>450 MHz</span>
              </div>
            </section>

            {/* 2. Neural Link Panel */}
            <section className="clean-card">
              <div className="card-header-clean">
                <div>
                  <div className="card-header-title">Neural Link Status</div>
                  <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                    Real-time translation core active
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)', background: 'var(--primary-fixed)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--primary-fixed-dim)' }}>
                  SYS-OP: OK
                </span>
              </div>

              <div className="neural-status-grid">
                <div className="stat-cell">
                  <div className="stat-cell-header">
                    <span>INCOMING (STT)</span>
                    <Volume2 size={16} color="var(--tertiary-container)" />
                  </div>
                  <div className="stat-cell-num">98.4<span style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>%</span></div>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: '98.4%' }}></div>
                  </div>
                </div>

                <div className="stat-cell">
                  <div className="stat-cell-header">
                    <span>OUTGOING (TTS)</span>
                    <Zap size={16} color="var(--primary)" />
                  </div>
                  <div className="stat-cell-num">99.1<span style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>%</span></div>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: '99.1%' }}></div>
                  </div>
                </div>
              </div>

              {/* Language Chips */}
              <div className="lang-chip-row">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'Hindi' },
                  { code: 'ta', label: 'Tamil' },
                  { code: 'te', label: 'Telugu' },
                  { code: 'mr', label: 'Marathi' },
                  { code: 'bn', label: 'Bengali' }
                ].map((item) => (
                  <button
                    key={item.code}
                    className={`lang-btn ${selectedLanguage === item.code ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage(item.code)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Indic Emergency Presets */}
            <div className="lang-chip-row">
              {[
                { label: '🇮🇳 Chamoli Alert', text: 'चमोली में बादल फटा है, तुरंत मेडिकल टीम भेजो।', lang: 'hi' },
                { label: '🌊 Coastal Rescue', text: 'கப்பல் புயலில் சிக்கியுள்ளது, மீட்புப் படகை அனுப்புங்கள்.', lang: 'ta' },
                { label: '⛰️ Ghats Landslide', text: 'घाटमाथ्यावर दरड कोसळली आहे, रस्ता बंद आहे.', lang: 'mr' },
                { label: '📡 ISRO Base Command', text: 'Base Station 4, oxygen supply critical, initiate evacuation plan.', lang: 'en' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  className="lang-btn"
                  onClick={() => {
                    setSelectedLanguage(p.lang);
                    handleSendMessage(p.text, false);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 4. Tactical Chat */}
            <section className="clean-card" style={{ flex: 1, minHeight: '300px' }}>
              <div className="card-header-clean">
                <div className="card-header-title">
                  <MessageSquare size={16} color="var(--primary)" />
                  <span>Tactical Messages ({messages.length})</span>
                </div>
                <button
                  onClick={() => setMessages([])}
                  style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}
                  title="Clear Log"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="chat-thread-container">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.isSentByMe ? 'out' : 'in'}`}>
                    <div className="chat-bubble-top">
                      <span>{m.senderId} • {m.timeStr || fmtTime(m.timestamp)}</span>
                      <button
                        onClick={() => playAudio(m.id, m.text, m.language)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600' }}
                      >
                        <Volume2 size={12} />
                        <span>{playingAudioId === m.id ? 'Playing...' : 'Play Audio'}</span>
                      </button>
                    </div>

                    <div className="audio-sim-wave">
                      <div className="audio-sim-bar" style={{ height: '6px' }}></div>
                      <div className="audio-sim-bar" style={{ height: '14px' }}></div>
                      <div className="audio-sim-bar" style={{ height: '10px' }}></div>
                      <div className="audio-sim-bar" style={{ height: '16px' }}></div>
                      <div className="audio-sim-bar" style={{ height: '8px' }}></div>
                      <div className="audio-sim-bar" style={{ height: '12px' }}></div>
                      <div className="audio-sim-bar" style={{ height: '6px' }}></div>
                      <span style={{ fontSize: '11px', marginLeft: '6px', color: 'var(--on-surface-variant)' }}>0:04</span>
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--on-surface)' }}>{m.text}</p>
                    <div className="token-pill">📦 18B Token: {m.tokensHex}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 2: TRANSCEIVER LOGS (Clean Tech)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--on-surface-variant)' }} />
              <input
                type="text"
                placeholder="Search database..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 38px',
                  background: 'var(--bg-surface-card)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: 'var(--on-surface)',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              />
            </div>

            {/* Log Entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Critical Entry */}
              <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--error)', background: 'var(--error-container)', padding: '2px 8px', borderRadius: '4px' }}>
                    Incoming (Critical)
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Received - 23:41:09 UTC</span>
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--on-surface)' }}>
                  Proximity alert trigger on external sensor array C-4. Heat signature detected exceeding normal operational parameters by 400%. Recommending immediate manual override of coolant system.
                </p>
                <div>
                  <button
                    onClick={() => playAudio('crit-1', 'Proximity alert trigger on external sensor array C-4. Heat signature detected.', 'en')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}
                  >
                    <Volume2 size={18} />
                    <span>{playingAudioId === 'crit-1' ? 'Playing...' : 'Play Audio'}</span>
                  </button>
                </div>
              </div>

              {/* Filtered Messages */}
              {filteredMessages.map((m) => (
                <div key={m.id} className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', background: 'var(--bg-surface-container)', padding: '2px 8px', borderRadius: '4px' }}>
                      {m.isSentByMe ? 'Outgoing' : 'Incoming'} ({m.senderId})
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Received - {m.timeStr || fmtTime(m.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--on-surface)' }}>{m.text}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => playAudio(m.id, m.text, m.language)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}
                    >
                      <Volume2 size={18} />
                      <span>{playingAudioId === m.id ? 'Playing...' : 'Play Audio'}</span>
                    </button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--on-surface-variant)' }}>18 Bytes • 24 bps</span>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `old-${Date.now()}`,
                      senderId: 'BETA-2',
                      type: 'routine',
                      timeStr: '22:15:00 UTC',
                      text: 'Hourly telemetry packet received. All life support nominal. Entering communication shadow in T-minus 14 minutes.',
                      language: 'en',
                      timestamp: Date.now() - 3600000,
                      tokensHex: generateHexTokens('Hourly telemetry packet received. All life support nominal.'),
                      isSentByMe: false
                    }
                  ]);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-card)',
                  color: 'var(--primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                Load Older Logs
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 3: LANGUAGE MANAGEMENT (Clean Tech)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'languages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {languageList.map((item) => (
              <div key={item.code} className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--on-surface)' }}>{item.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', background: 'var(--bg-surface-container)', padding: '2px 8px', borderRadius: '9999px' }}>
                    {item.id}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{item.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: item.status === 'Active' ? 'var(--primary)' : item.status === 'Downloading' ? 'var(--primary-container)' : item.status === 'Standby' ? 'var(--secondary)' : 'var(--outline)'
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '500', color: item.status === 'Active' ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{item.size}</span>
                </div>

                {item.status === 'Downloading' && (
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface-container)', borderRadius: '9999px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ width: `${item.progress}%`, height: '100%', background: 'var(--primary-container)', borderRadius: '9999px', transition: 'width 0.4s ease' }}></div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={triggerGlobalSync}
              disabled={isGlobalSyncing}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '12px',
                background: 'var(--primary)',
                color: 'var(--on-primary)',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 71, 141, 0.25)'
              }}
            >
              <RefreshCw size={18} className={isGlobalSyncing ? 'animate-spin' : ''} />
              <span>{isGlobalSyncing ? 'Synchronizing Neural Models…' : 'Global Sync'}</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 4: SYSTEM CONFIGURATION (Clean Tech)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Radio Protocol Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Radio Protocol</span>
                <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>V.3.92-BETA</span>
              </div>

              <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--on-surface)' }}>Uplink Bitrate</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                      {bitrate >= 1000 ? `${(bitrate / 1000).toFixed(1)} kbps` : `${bitrate} bps`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="2400"
                    value={bitrate}
                    onChange={(e) => setBitrate(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                    <span>128bps</span>
                    <span>2.4kbps</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--outline-variant)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--on-surface)' }}>Error Correction (FEC)</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Reed-Solomon RS(255,223)</div>
                  </div>
                  <button
                    className={`toggle-switch ${fecEnabled ? 'on' : ''}`}
                    onClick={() => setFecEnabled(!fecEnabled)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>
            </div>

            {/* Neural Parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Neural Parameters</span>
                <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>ACTIVE</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '110px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>MODEL TEMP</span>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--on-surface)' }}>0.72°</div>
                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-surface-container)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '72%', height: '100%', background: 'var(--primary)', borderRadius: '9999px' }}></div>
                  </div>
                </div>

                <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '110px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>INFERENCE SPEED</span>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--on-surface)' }}>45 ms</div>
                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-surface-container)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '45%', height: '100%', background: 'var(--primary)', borderRadius: '9999px' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Security</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--error)' }}>RESTRICTED</span>
              </div>

              <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-error-container)' }}>
                      <Lock size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: 'var(--on-surface)' }}>AES-256 Encryption</div>
                      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Hardware Accelerated</div>
                    </div>
                  </div>
                  <button
                    className={`toggle-switch ${aesEnabled ? 'on' : ''}`}
                    onClick={() => setAesEnabled(!aesEnabled)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>

                <div style={{ height: '1px', background: 'var(--outline-variant)' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--on-surface)' }}>Strict MAC Verification</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Drop malformed packets</div>
                  </div>
                  <button
                    className={`toggle-switch ${macEnabled ? 'on' : ''}`}
                    onClick={() => setMacEnabled(!macEnabled)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>
            </div>

            {/* Telemetry Stats Grid */}
            <div className="clean-card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>PACKET LOSS</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--on-surface)', marginTop: '2px' }}>0.02%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>UPLINK STABILITY</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--on-surface)', marginTop: '2px' }}>99.9%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>LATENCY</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--on-surface)', marginTop: '2px' }}>112ms</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>TX POWER</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--on-surface)', marginTop: '2px' }}>24 dBm</div>
                </div>
              </div>
            </div>

            {/* WebRTC Peer Pairing */}
            <div className="clean-card">
              <div className="card-header-clean">
                <div className="card-header-title">
                  <Link size={16} color="var(--primary)" />
                  <span>P2P Node Pairing</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>YOUR LOCAL NODE ID</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      readOnly
                      value={myPeerId || 'Initializing P2P...'}
                      style={{ flex: 1, padding: '8px', background: 'var(--bg-surface-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                    />
                    <button onClick={copyMyId} className="lang-btn" style={{ padding: '8px 12px' }}>
                      {copiedPeerId ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>CONNECT TO REMOTE NODE</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Paste remote Node ID..."
                      value={remotePeerInput}
                      onChange={(e) => setRemotePeerInput(e.target.value)}
                      style={{ flex: 1, padding: '8px', background: 'var(--bg-surface-low)', border: '1px solid var(--outline-variant)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                    />
                    <button onClick={() => connectToPeer(remotePeerInput)} className="lang-btn active">
                      Link Node
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hard Reset Button */}
            <button
              onClick={() => {
                setBitrate(1200);
                setFecEnabled(true);
                setAesEnabled(false);
                setMacEnabled(true);
                setMessages([]);
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--error)',
                color: 'var(--on-error)',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(186, 26, 26, 0.25)'
              }}
            >
              <Power size={18} />
              <span>Initiate Hard Reset</span>
            </button>
          </div>
        )}
      </main>

      {/* ─── Floating Push-To-Talk Button (Only on Dashboard) ─── */}
      {activeTab === 'dashboard' && (
        <div className="floating-ptt-wrap">
          <button
            className={`ptt-main-circle ${isRecording ? 'recording' : ''}`}
            onClick={handlePttToggle}
          >
            <div className="ptt-inner-button">
              {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
            </div>
          </button>
          <span className="ptt-label-pill">{isRecording ? 'Listening…' : 'Hold to Speak'}</span>
        </div>
      )}

      {/* ─── Bottom Navigation Bar ─── */}
      <nav className="bottom-glass-nav">
        <div
          className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Radio size={22} />
          <span>Dashboard</span>
        </div>

        <div
          className={`nav-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Terminal size={22} />
          <span>Logs</span>
        </div>

        <div
          className={`nav-tab-btn ${activeTab === 'languages' ? 'active' : ''}`}
          onClick={() => setActiveTab('languages')}
        >
          <Globe size={22} />
          <span>Languages</span>
        </div>

        <div
          className={`nav-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={22} />
          <span>Config</span>
        </div>
      </nav>
    </div>
  );
}
