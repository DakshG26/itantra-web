import React from 'react';
import { Radio, Zap, Activity, Clock, ShieldCheck, TrendingDown } from 'lucide-react';

export default function MetricsDashboard({ metrics }) {
  if (!metrics) {
    return (
      <div className="card p-5 text-center text-slate-400 space-y-2">
        <Activity className="h-8 w-8 mx-auto text-slate-300 animate-pulse" />
        <p className="text-xs font-semibold">Live Transmission Metrics</p>
        <p className="text-[11px]">Transmit audio or select an Indic phrase to view live compression benchmarks.</p>
      </div>
    );
  }

  const {
    stt_latency_ms = 120,
    compression_ratio = 2.4,
    itantra_bits = 144,
    raw_pcm_bits = 384000,
    transmission_ms = 60,
    total_latency_ms = 369,
    link_type = "HF / LoRa Radio",
    savings_vs_raw = "2666x smaller"
  } = metrics;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">Physical & Neural Metrics</h3>
        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
          {link_type}
        </span>
      </div>

      {/* 6 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        
        {/* Card 1: Compression */}
        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
          <span className="text-[10px] text-slate-500 block font-medium">Compression</span>
          <span className="text-lg font-mono font-bold text-blue-900">{compression_ratio}×</span>
          <span className="text-[9px] text-blue-600 block mt-0.5">SCSU + Token</span>
        </div>

        {/* Card 2: Bits Sent */}
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
          <span className="text-[10px] text-slate-500 block font-medium">Bits Sent</span>
          <span className="text-lg font-mono font-bold text-emerald-900">{itantra_bits} b</span>
          <span className="text-[9px] text-emerald-600 block mt-0.5">18 Bytes</span>
        </div>

        {/* Card 3: Bandwidth Saved */}
        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
          <span className="text-[10px] text-slate-500 block font-medium">Bandwidth Cut</span>
          <span className="text-lg font-mono font-bold text-purple-900">{savings_vs_raw}</span>
          <span className="text-[9px] text-purple-600 block mt-0.5">vs 64 kbps PCM</span>
        </div>

        {/* Card 4: STT Latency */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-medium">STT Latency</span>
          <span className="text-lg font-mono font-bold text-slate-800">{stt_latency_ms} ms</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Whisper / Conformer</span>
        </div>

        {/* Card 5: Air Transmission */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-medium">Time on Air</span>
          <span className="text-lg font-mono font-bold text-slate-800">{transmission_ms} ms</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">2400 bps RF</span>
        </div>

        {/* Card 6: Total E2E */}
        <div className={`p-3 rounded-xl border ${total_latency_ms < 1500 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'}`}>
          <span className="text-[10px] text-slate-500 block font-medium">E2E Latency</span>
          <span className="text-lg font-mono font-bold text-slate-900">{total_latency_ms} ms</span>
          <span className="text-[9px] text-emerald-700 block mt-0.5 font-semibold">&lt; Human Pause</span>
        </div>
      </div>

      {/* Savings Summary Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-3 text-xs flex items-center justify-between font-mono">
        <span>⚡ <strong>{itantra_bits} bits</strong> vs {raw_pcm_bits.toLocaleString()} bits raw</span>
        <span className="text-emerald-400 font-bold">{savings_vs_raw}</span>
      </div>
    </div>
  );
}
