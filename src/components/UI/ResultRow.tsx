import React from 'react';

export const ResultRow = ({ label, value, unit, highlight = false }: any) => (
  <div className={`flex flex-col gap-1 p-4 rounded-xl border transition-all ${highlight ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20 translate-y-[-2px]' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
    <span className={`text-[10px] uppercase font-black tracking-widest leading-none ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{label}</span>
    <div className="flex items-baseline gap-1.5">
      <span className={`text-xl font-black ${highlight ? 'text-white' : 'text-slate-800'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className={`text-xs font-bold ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{unit}</span>
    </div>
  </div>
);
