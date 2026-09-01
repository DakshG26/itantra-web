import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Radio, Mic, MicOff, Volume2, Zap, AlertTriangle, Layers,
  Cpu, Shield, Activity, Send, CheckCircle2, Clock,
  ArrowRight, Server, WifiOff, Sliders,
  Copy, Check, Link, Wifi, MessageSquare, Users, Globe,
  RefreshCw, PhoneOff, Trash2, X, Info, Sparkles
} from 'lucide-react';
import { TACTICAL_SAMPLES, HOW_IT_WORKS_INFO } from './data/samplesAndInfo';
import { audioEngine } from './utils/audioEngine';
import { usePeer } from './utils/usePeer';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function copyToClipboard(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  else {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

// ─── Badges & Micro Components ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const labels = {
    idle: 'Idle', initializing: 'Starting…', ready: 'Ready',
    connecting: 'Connecting…', connected: 'Connected', disconnected: 'Disconnected', error: 'Error',
  };
  const classes = {
    idle: 'badge-gray', initializing: 'badge-amber', ready: 'badge-blue',
    connecting: 'badge-amber', connected: 'badge-green', disconnected: 'badge-red', error: 'badge-red',
  };
  return (
    <span className={`badge ${classes[status] || 'badge-gray'}`}>
      <span className={`status-indicator ${status}`} />
      {labels[status] || status}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost"
      style={{ padding: '6px 12px', fontSize: 12 }}
      onClick={() => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#16A34A' }} /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function HexInspector({ tokens, isSos }) {
  const tags = ['HDR', 'LANG', 'PRIO', 'VOX', 'VOX', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'BPE', 'CRC', 'CRC'];
  return (
    <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 text-center font-mono">
      {tokens.map((b, i) => {
        const hex = (isSos && i === 2) ? 'FF' : b.toString(16).toUpperCase().padStart(2, '0');
        const isHeader = i === 0;
        const isLang = i === 1;
        const isPrio = i === 2;
        const isCrc = i >= 16;
        
        let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
        if (isHeader) bgClass = 'bg-amber-50 text-amber-800 border-amber-200';
        else if (isLang) bgClass = 'bg-purple-50 text-purple-800 border-purple-200';
        else if (isPrio && isSos) bgClass = 'bg-red-100 text-red-700 border-red-300 font-bold';
        else if (isPrio) bgClass = 'bg-blue-50 text-blue-800 border-blue-200';
        else if (isCrc) bgClass = 'bg-rose-50 text-rose-700 border-rose-200';

        return (
          <div key={i} className={`p-1 rounded border ${bgClass} flex flex-col items-center justify-center transition-all`}>
            <span className="font-bold text-[10px] leading-none">0x{hex}</span>
            <span className="text-[7px] opacity-60 uppercase mt-0.5">{tags[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Waveform({ isActive, color = 'blue', bars = 22 }) {
  const [heights, setHeights] = useState(() => Array(bars).fill(10));
  const rafRef = useRef(null);
  useEffect(() => {
    if (isActive) {
      const anim = () => {
        setHeights(Array.from({ length: bars }, (_, i) => {
          const center = bars / 2;
          const dist = Math.abs(i - center) / center;
          return Math.floor((Math.random() * 70 + 15) * (1 - dist * 0.5));
        }));
        rafRef.current = requestAnimationFrame(anim);
      };
      rafRef.current = requestAnimationFrame(anim);
    } else {
      cancelAnimationFrame(rafRef.current);
      setHeights(Array(bars).fill(10));
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, bars]);

  return (
    <div className="waveform">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`waveform-bar ${isActive ? (color === 'green' ? 'active-green' : 'active') : ''}`}
          style={{ height: `${h}%`, transition: isActive ? 'height 80ms ease' : 'height 400ms ease' }}
        />
      ))}
    </div>
  );
}

// ─── Main App Component ──────────────────────────────────────────────────────
export default function App() {
  const [viewMode, setViewMode] = useState('p2p'); // 'p2p' | 'simulator'
  const [selectedSample, setSelectedSample] = useState(TACTICAL_SAMPLES[0]);
  const [customText, setCustomText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isEmergencySos, setIsEmergencySos] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [receiverTargetLang, setReceiverTargetLang] = useState('same');

  // Radio Parameters
  const [radioMode, setRadioMode] = useState('lora'); // 'lora' | 'ble' | 'hc12'
  const [spreadingFactor, setSpreadingFactor] = useState(7);
  const [distanceKm, setDistanceKm] = useState(4.5);
  const [faradayCageActive, setFaradayCageActive] = useState(true);

  // Simulator State
  const [isTransmittingSim, setIsTransmittingSim] = useState(false);
  const [simDelivered, setSimDelivered] = useState(false);
  const [simPlayingAudio, setSimPlayingAudio] = useState(false);
  const simIntervalRef = useRef(null);

  // P2P State
  const {
    myId, status, error, messages, isConnected, remoteName,
    connect, sendMessage, disconnect, clearMessages,
  } = usePeer();
  const [remoteIdInput, setRemoteIdInput] = useState('');
  const [p2pMsgInput, setP2pMsgInput] = useState('');
  const [p2pTransmitting, setP2pTransmitting] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ToA Calculation
  const calculateToA = () => {
    if (radioMode === 'ble') return 18;
    if (radioMode === 'hc12') return 35;
    return Math.max(45, Math.round(Math.pow(2, spreadingFactor) / 125 * 30 * 0.25));
  };
  const timeOnAirMs = calculateToA();
  const e2eLatencyMs = 369 + (radioMode === 'lora' ? timeOnAirMs - 56 : 0);
  const currentText = customText || selectedSample.text;

  // Voice Recognition Handler
  const handleMicRecord = (targetSetter) => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported directly in this browser. Please type or select a preset sample.');
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = selectedSample.lang === 'en' ? 'en-IN' : `${selectedSample.lang}-IN`;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      audioEngine.playRadioChirp(700, 0.05);
    };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      targetSetter(transcript);
      setIsRecording(false);
      audioEngine.playRadioChirp(900, 0.05);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    try {
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Simulator Transmit
  const handleSimTransmit = () => {
    setIsTransmittingSim(true);
    setSimDelivered(false);
    audioEngine.playPacketBurst(timeOnAirMs);
    let step = 0;
    clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(() => {
      if (++step > 6) {
        clearInterval(simIntervalRef.current);
        setIsTransmittingSim(false);
        setSimDelivered(true);
        audioEngine.playRadioChirp(1200, 0.1);
      }
    }, timeOnAirMs / 6);
  };

  // P2P Send
  const handleP2pSend = (text, lang = selectedSample.lang, isSos = false) => {
    if (!text.trim()) return;
    setP2pTransmitting(true);
    audioEngine.playPacketBurst(timeOnAirMs);
    setTimeout(() => setP2pTransmitting(false), timeOnAirMs + 200);
    sendMessage(text.trim(), lang, isSos);
    setP2pMsgInput('');
  };

  // Trigger Emergency SOS
  const handleEmergencySos = () => {
    setIsEmergencySos(true);
    audioEngine.playEmergencySiren();
    if (viewMode === 'p2p' && isConnected) {
      handleP2pSend(`🚨 SOS EMERGENCY: ${selectedSample.text} [GPS: 30.42°N, 79.33°E]`, selectedSample.lang, true);
    } else {
      handleSimTransmit();
    }
  };

  const resetEmergency = () => {
    setIsEmergencySos(false);
    audioEngine.stopSpeech();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── Top Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg tracking-tight text-blue-950">iTANTRA</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                  ISRO SIH26173
                </span>
                {faradayCageActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 font-medium">
                    <WifiOff className="h-3 w-3" /> Air-Gapped (24 bps)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Multilingual Speech-to-Semantic Token Neural Transceiver
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 border border-slate-200">
              <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>865.20 MHz</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg text-emerald-700 border border-emerald-200">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>{e2eLatencyMs}ms E2E</span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-sans">
              <button
                onClick={() => setViewMode('p2p')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'p2p' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔗 P2P Live Link
              </button>
              <button
                onClick={() => setViewMode('simulator')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'simulator' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📡 Dual Simulator
              </button>
            </div>

            {/* Specs & Architecture Modal Button */}
            <button
              onClick={() => setShowSpecsModal(true)}
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              <Info className="w-3.5 h-3.5" /> Specs
            </button>

            {/* Emergency SOS Button */}
            <button
              onClick={isEmergencySos ? resetEmergency : handleEmergencySos}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
                isEmergencySos
                  ? 'bg-red-600 text-white animate-bounce shadow-md shadow-red-500/30'
                  : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {isEmergencySos ? 'DISMISS SOS' : 'LEVEL 0 SOS'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Emergency Active Alert ── */}
      {isEmergencySos && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2.5 flex items-center justify-between text-xs animate-fade-in font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 animate-bounce" />
            <span>
              <strong>LEVEL 0 EMERGENCY BROADCAST ACTIVE:</strong> Channel seized • Priority 0xFF • Preempting normal voice packets.
            </span>
          </div>
          <button onClick={resetEmergency} className="underline text-red-700 font-bold hover:text-red-900">
            Acknowledge & Stop
          </button>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
        
        {/* VIEW 1: P2P REAL-TIME DEVICE LINK */}
        {viewMode === 'p2p' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
            
            {/* Left Column: Radio Channel & Link Controls */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Channel Setup Card */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-600" />
                    <h2 className="font-bold text-sm text-slate-800">Radio Node Identity</h2>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* My Node ID */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Your Radio ID:
                  </label>
                  {myId ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-2.5 font-mono font-bold text-blue-900 text-center tracking-wider text-base">
                        {myId}
                      </div>
                      <CopyButton text={myId} />
                      <button
                        onClick={() => setShowQr(!showQr)}
                        className="btn-ghost"
                        style={{ padding: '8px 10px' }}
                        title="Show QR Code"
                      >
                        <Globe className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-3 text-slate-400 text-xs gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Allocating radio channel...
                    </div>
                  )}

                  {/* QR Code Popup */}
                  {showQr && myId && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 flex flex-col items-center animate-pop-in">
                      <QRCodeSVG value={myId} size={140} level="M" />
                      <span className="text-[10px] text-slate-500 font-mono mt-2">Scan on Device 2 to Link</span>
                    </div>
                  )}
                </div>

                {/* Connect to Remote Node */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Connect to Remote Node:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. BRAVO-XXXX"
                      value={remoteIdInput}
                      onChange={(e) => setRemoteIdInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && remoteIdInput && connect(remoteIdInput)}
                      disabled={isConnected || status === 'connecting'}
                      className="input input-mono flex-1 uppercase"
                    />
                    {!isConnected ? (
                      <button
                        onClick={() => connect(remoteIdInput)}
                        disabled={!remoteIdInput.trim() || status === 'connecting'}
                        className="btn-primary"
                        style={{ padding: '0 14px' }}
                      >
                        <Link className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={disconnect} className="btn-danger" style={{ padding: '0 14px' }}>
                        <PhoneOff className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Linked with <strong>{remoteName}</strong></span>
                    </div>
                  )}
                  {error && <p className="text-xs text-red-600 mt-1">⚠ {error}</p>}
                </div>
              </div>

              {/* Indic Speech Presets */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Indic Presets
                  </span>
                  <span className="text-[10px] text-slate-400">18-Byte Neural Token</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TACTICAL_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => {
                        setSelectedSample(sample);
                        setP2pMsgInput(sample.text);
                        audioEngine.playRadioChirp(800, 0.04);
                      }}
                      className={`p-2 rounded-lg text-left text-xs transition-all border ${
                        selectedSample.id === sample.id
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">{sample.langName.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">{sample.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live 18-Byte Token Inspector */}
              <div className="card p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <span>Packet Hex Inspector (24 bps)</span>
                  <span className="text-blue-600 font-mono">18 Bytes</span>
                </div>
                <HexInspector tokens={selectedSample.tokens} isSos={isEmergencySos} />
              </div>
            </div>

            {/* Right Column: Real-Time Transceiver Channel Stream */}
            <div className="lg:col-span-8 card flex flex-col h-[650px] overflow-hidden shadow-sm">
              
              {/* Channel Header */}
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      {isConnected ? `Real-Time Channel with ${remoteName}` : 'Radio Air Interface (Standby)'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      LoRa 865MHz • 18-Byte Payload • RS(32,24) FEC • On-Device Vocos TTS
                    </p>
                  </div>
                </div>

                <button
                  onClick={clearMessages}
                  className="btn-ghost text-xs"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" /> Clear
                </button>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                    <MessageSquare className="h-8 w-8 text-slate-300" />
                    <p className="text-xs">No packets transmitted yet.</p>
                    <p className="text-[11px] text-slate-400 text-center max-w-sm">
                      Connect another tab or phone with the Radio ID, or select an Indic voice preset below to transmit.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSent = msg.direction === 'sent';
                    const isSos = msg.type === 'sos';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 shadow-xs ${
                            isSos
                              ? 'bg-red-50 border border-red-200 text-red-900'
                              : isSent
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                          }`}
                        >
                          {isSos && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> LEVEL 0 SOS BROADCAST
                            </div>
                          )}
                          <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                          
                          {/* Mini Token & Actions */}
                          <div className={`mt-2 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                            isSent ? 'border-blue-500/50 text-blue-100' : 'border-slate-100 text-slate-500'
                          }`}>
                            <span>18-Byte Packet • RS(32,24)</span>
                            {!isSent && (
                              <button
                                onClick={() => audioEngine.speakText(msg.text, msg.lang)}
                                className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded transition-all"
                              >
                                <Volume2 className="h-3 w-3" /> Play TTS
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                          {fmtTime(msg.timestamp)} {msg.latencyMs ? `(${msg.latencyMs}ms)` : ''}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMicRecord(setP2pMsgInput)}
                    className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                      isRecording
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={isRecording ? 'Listening...' : 'Record Voice'}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>

                  <input
                    type="text"
                    value={p2pMsgInput}
                    onChange={(e) => setP2pMsgInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleP2pSend(p2pMsgInput)}
                    placeholder="Speak into mic or type emergency message..."
                    className="input flex-1"
                  />

                  <button
                    onClick={() => handleP2pSend(p2pMsgInput)}
                    disabled={!p2pMsgInput.trim() || p2pTransmitting}
                    className="btn-primary h-10 px-4 flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Send className={`h-4 w-4 ${p2pTransmitting ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Transmit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DUAL-NODE SIMULATOR (Node Alpha -> Radio Link -> Node Bravo) */}
        {viewMode === 'simulator' && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Top RF Modulation Config */}
            <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">RF PHY Mode:</span>
                {[
                  { id: 'lora', label: '📡 LoRa SX1262 (865 MHz)' },
                  { id: 'ble', label: '📶 BLE 5.0 Coded PHY' },
                  { id: 'hc12', label: '📻 HC-12 433 MHz' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setRadioMode(m.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      radioMode === m.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                <span>Distance: <strong>{distanceKm} km</strong></span>
                <span>•</span>
                <span>Time-on-Air: <strong>{timeOnAirMs} ms</strong></span>
              </div>
            </div>

            {/* 3-Column Tactical Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* NODE ALPHA (Field Transmitter) */}
              <div className="lg:col-span-5 card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
                    <h3 className="font-bold text-sm text-blue-900">NODE ALPHA — FIELD TRANSMITTER</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Chamoli Sector 4</span>
                </div>

                {/* Sample Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Select Indic Voice Sample:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TACTICAL_SAMPLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSample(s);
                          setCustomText('');
                          setSimDelivered(false);
                          audioEngine.playRadioChirp(800, 0.04);
                        }}
                        className={`p-2 rounded-lg text-left text-xs transition-all border ${
                          selectedSample.id === s.id && !customText
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="truncate">{s.langName.split(' ')[0]}</div>
                        <div className="text-[10px] text-slate-400 truncate">{s.category}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speech Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 flex items-center gap-1">
                      <Mic className="h-3 w-3 text-blue-600" /> Acoustic Input (16kHz)
                    </span>
                    <button
                      onClick={() => handleMicRecord(setCustomText)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      {isRecording ? 'Listening...' : 'Record Voice'}
                    </button>
                  </div>
                  <p className="font-medium text-sm text-slate-900 leading-relaxed">"{currentText}"</p>
                  <p className="text-xs text-slate-500 italic">{selectedSample.englishMeaning}</p>
                </div>

                {/* Compression Ratio */}
                <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 text-xs font-mono">
                  <div>
                    <span className="text-slate-500">Raw PCM:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedSample.pcmBytes.toLocaleString()} B</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
                  <div>
                    <span className="text-blue-700 font-bold">18 Bytes</span>{' '}
                    <span className="text-emerald-700 font-semibold">({Math.round(selectedSample.pcmBytes / 18)}× compression)</span>
                  </div>
                </div>

                {/* Hex Inspector */}
                <HexInspector tokens={selectedSample.tokens} isSos={isEmergencySos} />

                {/* Transmit Button */}
                <button
                  onClick={handleSimTransmit}
                  disabled={isTransmittingSim}
                  className="btn-primary w-full py-3 justify-center text-sm"
                >
                  <Send className={`h-4 w-4 ${isTransmittingSim ? 'animate-spin' : ''}`} />
                  {isTransmittingSim ? 'Transmitting over Radio Link...' : 'Transmit 18-Byte Token via Radio'}
                </button>
              </div>

              {/* RADIO AIR CHANNEL */}
              <div className="lg:col-span-2 card p-4 flex flex-col justify-between items-center text-center space-y-4">
                <div className="w-full">
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider block">
                    Radio Channel
                  </span>
                  <span className="text-[10px] text-slate-400">865.20 MHz LoRa</span>
                </div>

                {/* Radio Animation */}
                <div className="my-auto py-6 flex flex-col items-center">
                  <div className="relative flex items-center justify-center h-20 w-20">
                    <div className={`absolute inset-0 rounded-full border-2 border-blue-200 ${isTransmittingSim ? 'animate-ping' : ''}`} />
                    <div className="h-14 w-14 rounded-full bg-blue-50 border border-blue-300 flex items-center justify-center shadow-sm">
                      <Radio className={`h-7 w-7 text-blue-600 ${isTransmittingSim ? 'animate-bounce' : ''}`} />
                    </div>
                  </div>

                  <div className="mt-3 text-xs font-mono">
                    {isTransmittingSim ? (
                      <span className="text-blue-600 font-bold animate-pulse">⚡ Flying: {timeOnAirMs}ms</span>
                    ) : simDelivered ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                      </span>
                    ) : (
                      <span className="text-slate-400">Channel Idle</span>
                    )}
                  </div>
                </div>

                {/* Sliders */}
                <div className="w-full space-y-2 text-[11px] font-mono text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Distance:</span>
                      <span className="text-blue-700 font-bold">{distanceKm} km</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between text-[10px] text-slate-500">
                    <span>FEC Parity:</span>
                    <span className="text-emerald-600 font-bold">RS(32,24)</span>
                  </div>
                </div>
              </div>

              {/* NODE BRAVO (HQ Receiver & TTS) */}
              <div className="lg:col-span-5 card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${simDelivered ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <h3 className="font-bold text-sm text-emerald-900">NODE BRAVO — RESCUE HQ RECEIVER</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Dehradun Command</span>
                </div>

                {/* Received Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Server className="h-3.5 w-3.5 text-emerald-600" /> Radio Buffer (18 Bytes)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      simDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {simDelivered ? 'CRC16 VERIFIED • 0 ERRORS' : 'AWAITING PACKET'}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200 min-h-[68px] flex flex-col justify-center">
                    {simDelivered ? (
                      <>
                        <p className="font-medium text-sm text-slate-900 leading-relaxed">"{currentText}"</p>
                        <p className="text-xs text-slate-500 mt-1">MOS Score: 4.26 / 5.0 • FastPitch + Vocos</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center">
                        Click "Transmit" on Node Alpha to send packet over radio.
                      </p>
                    )}
                  </div>

                  {/* Target Voice Synthesis Language Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">
                      Cross-Lingual Synthesis Output:
                    </label>
                    <select
                      value={receiverTargetLang}
                      onChange={(e) => setReceiverTargetLang(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="same">Original ({selectedSample.langName})</option>
                      <option value="en">English (Synthesized)</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="bn">Bengali (বাংলা)</option>
                    </select>
                  </div>

                  {/* Waveform */}
                  <Waveform isActive={simPlayingAudio} color="green" />
                </div>

                {/* Play Audio Button */}
                <button
                  onClick={async () => {
                    setSimPlayingAudio(true);
                    const lang = receiverTargetLang === 'same' ? selectedSample.lang : receiverTargetLang;
                    await audioEngine.speakText(currentText, lang);
                    setSimPlayingAudio(false);
                  }}
                  disabled={!simDelivered || simPlayingAudio}
                  className="btn-success w-full py-3 justify-center text-sm"
                >
                  <Volume2 className={`h-4 w-4 ${simPlayingAudio ? 'animate-bounce' : ''}`} />
                  {simPlayingAudio ? 'Synthesizing Audio via Vocos TTS...' : 'Play Synthesized Neural Voice (TTS)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Technical Specs & Architecture Modal ── */}
      {showSpecsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5 animate-pop-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-base text-slate-900">iTantra System Architecture & Specs</h2>
              </div>
              <button
                onClick={() => setShowSpecsModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Top 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Latency', value: '369 ms', sub: 'End-to-End' },
                { label: 'Bitrate', value: '24 bps', sub: 'LoRa/BLE' },
                { label: 'Packet', value: '18 Bytes', sub: 'Per utterance' },
                { label: 'Compression', value: '2,666×', sub: 'vs 64 kbps PCM' },
              ].map((m) => (
                <div key={m.label} className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div className="font-mono font-bold text-lg text-blue-900">{m.value}</div>
                  <div className="text-xs font-semibold text-slate-700">{m.label}</div>
                  <div className="text-[10px] text-slate-400">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Pipeline Steps */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                6-Step Neural Transceiver Pipeline:
              </h4>
              <div className="space-y-2 text-xs">
                {HOW_IT_WORKS_INFO.pipelineSteps.map((step) => (
                  <div key={step.step} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.step}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{step.name}</span>
                        <span className="font-mono text-emerald-600">{step.timeMs}ms</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSpecsModal(false)}
              className="btn-primary w-full py-2.5 justify-center text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500 font-mono">
        iTantra • Multilingual Speech Neural Transceiver • ISRO SIH26173 • Zero-Internet Air-Gapped Operation
      </footer>
    </div>
  );
}
