import React from 'react';

export default function LanguageSelector({ selected = 'hi', onChange }) {
  const languages = [
    { code: 'hi', name: 'Hindi', script: 'हिन्दी', speakers: '600M' },
    { code: 'ta', name: 'Tamil', script: 'தமிழ்', speakers: '75M' },
    { code: 'mr', name: 'Marathi', script: 'मराठी', speakers: '95M' }
  ];

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Primary Neural Language
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Bhashini ULCA API & AI4Bharat</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {languages.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onChange(lang.code)}
              className={`p-3 rounded-xl text-left transition-all border ${
                isSelected
                  ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="text-sm">{lang.script}</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">{lang.name}</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">{lang.speakers} speakers</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
