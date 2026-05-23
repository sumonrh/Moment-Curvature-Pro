import React from 'react';

export const StatCard = ({ label, value, unit, icon, trend, subLabel, customContent }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative min-h-[140px] flex flex-col justify-between">
    <div className="flex items-start justify-between relative z-10 w-full">
      <div className="space-y-2 w-full">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">{label}</p>
        {customContent ? (
          <div className="w-full">{customContent}</div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
            <span className="text-sm font-bold text-slate-400">{unit}</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="p-2 bg-slate-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shrink-0">
          {icon}
        </div>
      )}
    </div>
    {trend && (
      <div className="mt-4 flex items-center gap-2 relative z-10">
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 tracking-wider">
          {trend}
        </span>
        <span className="text-xs font-medium text-slate-400">{subLabel}</span>
      </div>
    )}
    {!trend && subLabel && (
       <div className="mt-2 relative z-10">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{subLabel}</span>
       </div>
    )}
    {icon && (
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 scale-100">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    )}
  </div>
);
