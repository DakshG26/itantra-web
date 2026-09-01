import React, { useState, useEffect } from 'react';
import { Radio, Activity } from 'lucide-react';

export default function RadioVisualizer({ isTransmitting = false, bitrateBps = 2400, bitsLastSent = 144 }) {
  const [binaryStream, setBinaryStream] = useState('01001101 00110100 11010010 01100001');

  useEffect(() => {
    if (isTransmitting) {
      const interval = setInterval(() => {
        const randomBits = Array.from({ length: 4 }, () =>
          Math.floor(Math.random() * 256).toString(2).padStart(8, '0')
        ).join(' ');
        setBinaryStream(randomBits);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isTransmitting]);

  return (
    <div className="card p-4 space-y-3 font-mono">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${isTransmitting ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
          <span className="font-bold text-slate-700">865 MHz ISM Radio Carrier Simulation</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          isTransmitting ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-800'
        }`}>
          {isTransmitting ? 'TRANSMITTING' : 'CARRIER STANDBY'}
        </span>
      </div>

      {/* Bit Stream Display */}
      <div className="bg-slate-950 text-emerald-400 rounded-lg p-2.5 text-center text-xs tracking-widest overflow-hidden">
        {isTransmitting ? binaryStream : '• • • 01010011 01001001 01001000 00110010 00110110 • • •'}
      </div>

      {/* Speed and Capacity */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <span>Link Bitrate: <strong className="text-slate-800">{bitrateBps} bps</strong></span>
        <span>Payload Size: <strong className="text-slate-800">{bitsLastSent} bits (18 Bytes)</strong></span>
      </div>
    </div>
  );
}
