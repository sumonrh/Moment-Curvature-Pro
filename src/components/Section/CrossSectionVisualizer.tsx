import React from 'react';

export const CrossSectionVisualizer = ({ sectionType, inputs, isPrintMode = false }: any) => {
  const { D, B, H, cover, n_bars, nx, ny, db, dbt, n_legsX = 2, n_legsY = 2 } = inputs;
  const size = isPrintMode ? 220 : 280;
  const center = size / 2;
  const padding = 40; 
  const maxDim = sectionType === 'circular' ? (Number(D) || 100) : Math.max((Number(B) || 100), (Number(H) || 100));
  const scale = (size - 2 * padding) / maxDim;
  const toPx = (val: number) => {
    const v = val * scale;
    return isNaN(v) ? 0 : v;
  };
  
  const colorConcrete = "#f1f5f9", colorConfined = "#cbd5e1", colorSteel = "#1e293b", colorStirrup = "#64748b", colorAxis = "#ef4444"; 

  let shapes: any[] = [], rebars: any[] = [], dims: any[] = [];

  if (sectionType === 'circular') {
     const R = D/2, ds = D - 2 * cover - dbt, R_conf = ds / 2, R_bars = R_conf - dbt/2 - db/2;
     shapes.push(<circle cx={center} cy={center} r={Math.max(0, toPx(R))} fill={colorConcrete} stroke="#94a3b8" strokeWidth="1" key="conc_out" />);
     if(R_conf > 0) shapes.push(<circle cx={center} cy={center} r={Math.max(0, toPx(R_conf))} fill={colorConfined} stroke={colorStirrup} strokeWidth="1" strokeDasharray="3 2" key="conc_in" />);
     
     const angleStep = (2 * Math.PI) / (n_bars || 1);
     for (let i = 0; i < n_bars; i++) {
        const theta = i * angleStep - Math.PI/2; 
        rebars.push(<circle cx={center + toPx(R_bars) * Math.cos(theta)} cy={center + toPx(R_bars) * Math.sin(theta)} r={Math.max(1.5, toPx(db/2))} fill={colorSteel} key={`bar_${i}`} />);
     }
     const dimY = center + toPx(R) + 20;
     dims.push(
        <g key="dim_D">
           <line x1={center - toPx(R)} y1={dimY} x2={center + toPx(R)} y2={dimY} stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
           <text x={center} y={dimY + 12} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">D = {D}</text>
        </g>
     );
  } else {
     const W_px = toPx(B), H_px = toPx(H);
     shapes.push(<rect x={center - W_px/2} y={center - H_px/2} width={Math.max(0, W_px)} height={Math.max(0, H_px)} fill={colorConcrete} stroke="#94a3b8" strokeWidth="1" key="conc_out" />);
     const W_conf = B - 2*cover - dbt, H_conf = H - 2*cover - dbt;
     if(W_conf > 0 && H_conf > 0) {
        const x_conf = center - toPx(W_conf/2);
        const y_conf = center - toPx(H_conf/2);
        const w_conf_px = toPx(W_conf);
        const h_conf_px = toPx(H_conf);
        
        shapes.push(<rect x={x_conf} y={y_conf} width={Math.max(0, w_conf_px)} height={Math.max(0, h_conf_px)} fill={colorConfined} stroke={colorStirrup} strokeWidth="1.5" strokeDasharray="3 2" key="conc_in" />);
        
        if (n_legsX > 2) {
          const dx_legs = w_conf_px / (n_legsX - 1);
          for (let i = 1; i < n_legsX - 1; i++) {
            const x_leg = x_conf + i * dx_legs;
            shapes.push(<line x1={x_leg} y1={y_conf} x2={x_leg} y2={y_conf + h_conf_px} stroke={colorStirrup} strokeWidth="1" strokeDasharray="2 2" key={`v_leg_${i}`} />);
          }
        }
        
        if (n_legsY > 2) {
          const dy_legs = h_conf_px / (n_legsY - 1);
          for (let j = 1; j < n_legsY - 1; j++) {
            const y_leg = y_conf + j * dy_legs;
            shapes.push(<line x1={x_conf} y1={y_leg} x2={x_conf + w_conf_px} y2={y_leg} stroke={colorStirrup} strokeWidth="1" strokeDasharray="2 2" key={`h_leg_${j}`} />);
          }
        }
     }

     const x_lim = (B/2) - cover - dbt - db/2, y_lim = (H/2) - cover - dbt - db/2;
     if (nx > 1) {
        const dx = (2 * x_lim) / (nx - 1);
        for(let i=0; i<nx; i++) { 
            rebars.push(<circle cx={center+toPx(-x_lim + i*dx)} cy={center-toPx(y_lim)} r={Math.max(1.5, toPx(db/2))} fill={colorSteel} key={`t_${i}`} />); 
            rebars.push(<circle cx={center+toPx(-x_lim + i*dx)} cy={center+toPx(y_lim)} r={Math.max(1.5, toPx(db/2))} fill={colorSteel} key={`b_${i}`} />); 
        }
     }
     if (ny > 2) {
        const dy = (2 * y_lim) / (ny - 1);
        for(let j=1; j<ny-1; j++) { 
            rebars.push(<circle cx={center-toPx(x_lim)} cy={center+toPx(-y_lim + j*dy)} r={Math.max(1.5, toPx(db/2))} fill={colorSteel} key={`l_${j}`} />); 
            rebars.push(<circle cx={center+toPx(x_lim)} cy={center+toPx(-y_lim + j*dy)} r={Math.max(1.5, toPx(db/2))} fill={colorSteel} key={`r_${j}`} />); 
        }
     }

     const dimY = center + H_px/2 + 20;
     dims.push(<g key="dim_B"><line x1={center - W_px/2} y1={dimY} x2={center + W_px/2} y2={dimY} stroke="#64748b" strokeWidth="1" /><text x={center} y={dimY + 12} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">B = {B}</text></g>);
     const dimX = center + W_px/2 + 20;
     dims.push(<g key="dim_H"><line x1={dimX} y1={center - H_px/2} x2={dimX} y2={center + H_px/2} stroke="#64748b" strokeWidth="1" /><text x={dimX + 4} y={center} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600" transform={`rotate(90, ${dimX+4}, ${center})`}>H = {H}</text></g>);
  }
  
  return (
    <div className={`flex flex-col items-center justify-center bg-white rounded-xl border border-slate-100 w-full ${isPrintMode ? 'p-2 shadow-none' : 'p-6 h-full'}`}>
        {!isPrintMode && <h4 className="text-sm font-bold text-slate-700 mb-4 w-full text-left">Cross-Section Preview</h4>}
        <div className="flex-grow flex items-center justify-center w-full">
            <svg viewBox={`0 0 ${size} ${size}`} width={isPrintMode ? size : "100%"} height={isPrintMode ? size : "auto"} className="max-w-[280px] max-h-[280px] overflow-visible">
                <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#64748b" /></marker></defs>
                {shapes}
                <line x1={center} y1={padding - 10} x2={center} y2={size-padding + 10} stroke={colorAxis} strokeWidth="1" strokeDasharray="6 3" />
                <text x={center + 6} y={padding - 10} fontSize="11" fill={colorAxis} fontWeight="bold">Y</text>
                <line x1={padding - 10} y1={center} x2={size-padding + 10} y2={center} stroke={colorAxis} strokeWidth="1" strokeDasharray="6 3" />
                <text x={size-padding + 10} y={center - 6} fontSize="11" fill={colorAxis} fontWeight="bold">X</text>
                {rebars} {dims}
            </svg>
        </div>
    </div>
  );
}
