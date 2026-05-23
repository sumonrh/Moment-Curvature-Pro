import React from 'react';
import { Circle, Box } from 'lucide-react';

export const SectionToggle = ({ value, onChange }: any) => (
  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
    <button 
      onClick={() => onChange('circular')}
      className={`flex flex-1 items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-black transition-all ${value === 'circular' ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
    >
      <Circle size={18} strokeWidth={3} /> Circular
    </button>
    <button 
      onClick={() => onChange('rectangular')}
      className={`flex flex-1 items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-black transition-all ${value === 'rectangular' ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
    >
      <Box size={18} strokeWidth={3} /> Rectangular
    </button>
  </div>
);
