import React from 'react';
import { HelpCircle } from 'lucide-react';

export const InputField = ({ label, value, onChange, unit = "", tooltip = "" }: any) => (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center justify-between">
      <label className="text-xs md:text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {label}
        {tooltip && <div className="group relative cursor-help"><HelpCircle size={12} className="text-slate-400" /><div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50 leading-tight normal-case font-normal">{tooltip}</div></div>}
      </label>
      <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{unit}</span>
    </div>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="block w-full rounded-md border-slate-200 bg-slate-50 py-2 px-3 text-sm md:text-base focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 shadow-sm transition-all font-medium"
      placeholder={`Enter ${label}...`}
    />
  </div>
);
