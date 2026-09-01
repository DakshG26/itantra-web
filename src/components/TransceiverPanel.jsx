import React, { useState, useRef } from 'react';
import { Mic, MicOff, Send, Radio, Volume2, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { useMicrophone } from '../hooks/useMicrophone';
import { useWebSocket } from '../hooks/useWebSocket';

export default function TransceiverPanel({ language = 'hi', onMetricsUpdate, onTransmission }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'transmitting' | 'receiving'
  const [originalText, setOriginalText] = useState('');
  const [receivedText, setReceivedText] = useState('');
  const [transmissionCount, setTransmissionCount] = useState(0);
  const audioPlayerRef = useRef(null);

  const { isRecording, startRecording } = useMicrophone();

  const wsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws/transceive`
    : 'ws://localhost:8000/ws/transceive';

  const { isConnected, sendMessage } = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data.event === 'result') {
        setOriginalText(data.original_text || '');
        setReceivedText(data.received_text || '');

        if (data.audio_b64) {
          const audioSrc = `data:audio/wav;base64,${data.audio_b64}`;
          if (audioPlayerRef.current) {
            audioPlayerRef.current.src = audioSrc;
            audioPlayerRef.current.play().catch(() => {});
          }
        }

        if (onMetricsUpdate && data.metrics) {
          onMetricsUpdate(data.metrics);
        }

        setTransmissionCount((prev) => prev + 1);
        setStatus('idle');
      } else if (data.event === 'silence') {
        setStatus('idle');
      }
    },
    onError: () => setStatus('idle'),
    onDisconnect: () => setStatus('idle')
  });

  const handlePushToTalk = async () => {
    if (status !== 'idle') return;

    try {
      setStatus('recording');
      const { audioBase64, durationSec } = await startRecording(4000);

      setStatus('transmitting');
      sendMessage({
        audio_b64: audioBase64,
        language: language,
        duration_sec: durationSec
      });

      if (onTransmission) onTransmission();
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  const getPttText = () => {
    switch (status) {
      case 'recording': return '🔴 Recording Voice (4s)...';
      case 'transmitting': return '📡 Transmitting over Radio...';
      case 'receiving': return '🔊 Synthesizing TTS...';
      default: return '🎙️ PUSH TO TALK (4 SEC)';
    }
  };

  return (
    <div className="card p-5 space-y-5">
      {/* Top Status */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <h2 className="font-bold text-sm text-slate-800">
            {isConnected ? 'Backend WebSocket Linked' : 'Connecting to Python Backend (ws://localhost:8000)...'}
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">Transmissions: {transmissionCount}</span>
      </div>

      {/* PTT Main Button */}
      <div className="flex justify-center py-3">
        <button
          onClick={handlePushToTalk}
          disabled={status !== 'idle'}
          className={`w-full max-w-md py-4 rounded-2xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
            status === 'recording'
              ? 'bg-red-600 text-white animate-pulse shadow-red-500/30'
              : status === 'transmitting'
              ? 'bg-amber-600 text-white animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
          }`}
        >
          {getPttText()}
        </button>
      </div>

      {/* Side-by-Side Dual Transceiver View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transmitter Side */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1">
              <Mic className="h-3.5 w-3.5 text-blue-600" /> Transmitted Voice (STT)
            </span>
            <span className="text-[10px] font-mono text-slate-400">Node Alpha</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200 min-h-[64px] flex items-center">
            <p className="text-sm font-medium text-slate-900">
              {originalText ? `"${originalText}"` : <span className="text-slate-400 italic">Press Push-To-Talk to speak</span>}
            </p>
          </div>
        </div>

        {/* Receiver Side */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> Received Voice (Neural TTS)
            </span>
            <span className="text-[10px] font-mono text-slate-400">Node Bravo</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200 min-h-[64px] flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-950">
              {receivedText ? `"${receivedText}"` : <span className="text-slate-400 italic">Waiting for incoming packet</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}
