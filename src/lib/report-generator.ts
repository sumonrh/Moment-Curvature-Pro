import { SectionType, SectionInputs } from './types';

export const generateSVGSection = (sectionType: SectionType, inputs: SectionInputs, size = 280) => {
  const { D, B, H, cover, n_bars, nx, ny, db, dbt } = inputs;
  const center = size / 2;
  const padding = 40; 
  const maxDim = sectionType === 'circular' ? (Number(D) || 100) : Math.max((Number(B) || 100), (Number(H) || 100));
  const scale = (size - 2 * padding) / maxDim;
  const toPx = (val: number) => {
    const v = val * scale;
    return isNaN(v) ? 0 : v;
  };
  
  const colorConcrete = "#f1f5f9", colorConfined = "#cbd5e1", colorSteel = "#1e293b", colorStirrup = "#64748b", colorAxis = "#ef4444"; 

  let shapes = "", rebars = "", dims = "";

  if (sectionType === 'circular') {
     const R = D/2, ds = D - 2 * cover - dbt, R_conf = ds / 2, R_bars = R_conf - dbt/2 - db/2;
     shapes += `<circle cx="${center}" cy="${center}" r="${Math.max(0, toPx(R))}" fill="${colorConcrete}" stroke="#94a3b8" stroke-width="1" />`;
     if(R_conf > 0) shapes += `<circle cx="${center}" cy="${center}" r="${Math.max(0, toPx(R_conf))}" fill="${colorConfined}" stroke="${colorStirrup}" stroke-width="1" stroke-dasharray="3 2" />`;
     
     const angleStep = (2 * Math.PI) / (n_bars || 1);
     for (let i = 0; i < n_bars; i++) {
        const theta = i * angleStep - Math.PI/2; 
        rebars += `<circle cx="${center + toPx(R_bars) * Math.cos(theta)}" cy="${center + toPx(R_bars) * Math.sin(theta)}" r="${Math.max(1.5, toPx(db/2))}" fill="${colorSteel}" />`;
     }
     const dimY = center + toPx(R) + 20;
     dims += `<g><line x1="${center - toPx(R)}" y1="${dimY}" x2="${center + toPx(R)}" y2="${dimY}" stroke="#64748b" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)" /><text x="${center}" y="${dimY + 12}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">D = ${D}</text></g>`;
  } else {
     const W_px = toPx(B), H_px = toPx(H);
     shapes += `<rect x="${center - W_px/2}" y="${center - H_px/2}" width="${Math.max(0, W_px)}" height="${Math.max(0, H_px)}" fill="${colorConcrete}" stroke="#94a3b8" stroke-width="1" />`;
     const W_conf = B - 2*cover - dbt, H_conf = H - 2*cover - dbt;
     if(W_conf > 0 && H_conf > 0) shapes += `<rect x="${center - toPx(W_conf/2)}" y="${center - toPx(H_conf/2)}" width="${Math.max(0, toPx(W_conf))}" height="${Math.max(0, toPx(H_conf))}" fill="${colorConfined}" stroke="${colorStirrup}" stroke-width="1" stroke-dasharray="3 2" />`;

     const x_lim = (B/2) - cover - dbt - db/2, y_lim = (H/2) - cover - dbt - db/2;
     if (nx > 1) {
        const dx = (2 * x_lim) / (nx - 1);
        for(let i=0; i<nx; i++) { rebars += `<circle cx="${center+toPx(-x_lim + i*dx)}" cy="${center-toPx(y_lim)}" r="${Math.max(1.5, toPx(db/2))}" fill="${colorSteel}" />`; rebars += `<circle cx="${center+toPx(-x_lim + i*dx)}" cy="${center+toPx(y_lim)}" r="${Math.max(1.5, toPx(db/2))}" fill="${colorSteel}" />`; }
     }
     if (ny > 2) {
        const dy = (2 * y_lim) / (ny - 1);
        for(let j=1; j<ny-1; j++) { rebars += `<circle cx="${center-toPx(x_lim)}" cy="${center+toPx(-y_lim + j*dy)}" r="${Math.max(1.5, toPx(db/2))}" fill="${colorSteel}" />`; rebars += `<circle cx="${center+toPx(x_lim)}" cy="${center+toPx(-y_lim + j*dy)}" r="${Math.max(1.5, toPx(db/2))}" fill="${colorSteel}" />`; }
     }

     const dimY = center + H_px/2 + 20;
     dims += `<g><line x1="${center - W_px/2}" y1="${dimY}" x2="${center + W_px/2}" y2="${dimY}" stroke="#64748b" stroke-width="1" /><text x="${center}" y="${dimY + 12}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">B = ${B}</text></g>`;
     const dimX = center + W_px/2 + 20;
     dims += `<g><line x1="${dimX}" y1="${center - H_px/2}" x2="${dimX}" y2="${center + H_px/2}" stroke="#64748b" stroke-width="1" /><text x="${dimX + 4}" y="${center}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600" transform="rotate(90, ${dimX+4}, ${center})">H = ${H}</text></g>`;
  }

  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="background: white; border-radius: 12px; border: 1px solid #f1f5f9;">
        <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#64748b" /></marker></defs>
        ${shapes}
        <line x1="${center}" y1="${padding - 10}" x2="${center}" y2="${size-padding + 10}" stroke="${colorAxis}" stroke-width="1" stroke-dasharray="6 3" />
        <text x="${center + 6}" y="${padding - 10}" font-size="11" fill="${colorAxis}" font-weight="bold">Y</text>
        <line x1="${padding - 10}" y1="${center}" x2="${size-padding + 10}" y2="${center}" stroke="${colorAxis}" stroke-width="1" stroke-dasharray="6 3" />
        <text x="${size-padding + 10}" y="${center - 6}" font-size="11" fill="${colorAxis}" font-weight="bold">X</text>
        ${rebars} ${dims}
    </svg>
  `;
};

export const generateSVGChart = ({ data, xKey, yKey, color = "#2563eb", colors = [], labels = [], xLabel = "", yLabel = "", title = "", width = 600, height = 400, scatterPoints = [] }: any) => {
  const padding = 65;
  const hasData = data && data.length > 0;
  if (!hasData) return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="sans-serif" fill="#94a3b8">No Data Available</text></svg>`;

  const yKeys = Array.isArray(yKey) ? yKey : [yKey];
  const lineColors = (colors && colors.length > 0) ? colors : [color, "#10b981", "#f59e0b", "#8b5cf6"];
  
  const xValues: number[] = data.map((d: any) => Number(d[xKey])).filter((v: any) => !isNaN(v));
  const allYValues: number[] = data.flatMap((d: any) => yKeys.map(k => Number(d[k]))).filter((v: any) => !isNaN(v));
  
  if (xValues.length === 0 || allYValues.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="sans-serif" fill="#94a3b8">No Valid Data Points</text></svg>`;
  }

  const xMax = Math.max(...xValues), xMin = Math.min(...xValues);
  const yMax = Math.max(...allYValues), yMin = Math.min(...allYValues);
  const yRange = Math.max(1e-9, yMax - yMin), xRange = Math.max(1e-9, xMax - xMin);
  
  const xScale = (val: number) => ((val - xMin) / xRange) * (width - 2 * padding) + padding;
  const yScale = (val: number) => height - padding - ((val - yMin) / yRange) * (height - 2 * padding);

  const formatTick = (val: number) => {
      if (val === 0) return "0";
      if (Math.abs(val) >= 100) return val.toFixed(0);
      if (Math.abs(val) >= 10) return val.toFixed(0);
      if (Math.abs(val) >= 1) return val.toFixed(1);
      return val.toFixed(3);
  };

  const numTicks = 5;
  const xTicks = Array.from({length: numTicks}, (_, i) => xMin + (i * xRange / (numTicks-1)));
  const yTicks = Array.from({length: numTicks}, (_, i) => yMin + (i * yRange / (numTicks-1)));

  let gridLines = "";
  yTicks.forEach(val => {
    const y = yScale(val);
    gridLines += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`;
    gridLines += `<text x="${padding - 10}" y="${y + 3}" text-anchor="end" font-size="10" fill="#94a3b8" font-weight="500">${formatTick(val)}</text>`;
  });
  xTicks.forEach(val => {
    const x = xScale(val);
    gridLines += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" stroke="#e2e8f0" stroke-width="1" />`;
    gridLines += `<text x="${x}" y="${height - padding + 16}" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="500">${formatTick(val)}</text>`;
  });

  let paths = "";
  yKeys.forEach((key, i) => {
    const points = data.filter((d: any) => !isNaN(Number(d[xKey])) && !isNaN(Number(d[key])))
      .map((d: any) => `${xScale(Number(d[xKey]))},${yScale(Number(d[key]))}`).join(' ');
    paths += `<polyline points="${points}" fill="none" stroke="${lineColors[i % lineColors.length]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
  });

  let scatter = "";
  if (scatterPoints) {
    scatterPoints.forEach((p: any) => {
      const x = xScale(p.x);
      const y = yScale(p.y);
      if (!isNaN(x) && !isNaN(y)) {
        scatter += `<circle cx="${x}" cy="${y}" r="6" fill="#ef4444" stroke="white" stroke-width="2" />`;
        scatter += `<text x="${x + 8}" y="${y - 8}" font-size="10" font-weight="bold" fill="#ef4444" text-anchor="start">${p.label || ''}</text>`;
      }
    });
  }

  let legend = "";
  if (yKeys.length > 1 || (labels && labels.length > 0)) {
    yKeys.forEach((key, i) => {
      legend += `<g transform="translate(${padding + i * 120}, 20)"><rect width="12" height="4" rx="2" fill="${lineColors[i % lineColors.length]}" /><text x="16" y="5" font-size="10" fill="#64748b" font-weight="600">${labels[i] || key}</text></g>`;
    });
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background: white; border-radius: 16px; border: 1px solid #f1f5f9;">
      <text x="${width/2}" y="15" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">${title}</text>
      ${gridLines}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1.5" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1.5" />
      ${paths}
      ${scatter}
      ${legend}
      <text x="${width/2}" y="${height - 5}" text-anchor="middle" font-size="12" fill="#64748b" font-weight="600">${xLabel}</text>
      <text x="15" y="${height/2}" text-anchor="middle" font-size="12" fill="#64748b" font-weight="600" transform="rotate(-90, 15, ${height/2})">${yLabel}</text>
    </svg>
  `;
};
