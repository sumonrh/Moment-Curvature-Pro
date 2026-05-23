import React, { useState, useRef, useLayoutEffect } from 'react';

export const InteractiveLineChart = ({ data, xKey, yKey, color = "#2563eb", colors = [], labels = [], xLabel = "", yLabel = "", title = "", className = "", fixedWidth = 0, fixedHeight = 0, scatterPoints = [] }: any) => {
  const [hoverData, setHoverData] = useState<any>(null);
  const [dims, setDims] = useState({ width: fixedWidth || 0, height: fixedHeight || 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (fixedWidth && fixedHeight) { setDims({ width: fixedWidth, height: fixedHeight }); return; }
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) setDims({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [fixedWidth, fixedHeight]);

  const hasData = data && data.length > 0;
  const { width, height } = dims;
  const padding = 65; 

  let paths: any[] = [], yKeys: any[] = [], xScale: any, yScale: any, xTicks: any[] = [], yTicks: any[] = [];
  const lineColors = (colors && colors.length > 0) ? colors : [color, "#10b981", "#f59e0b", "#8b5cf6"];

  const formatTick = (val: number) => {
      if (val === 0) return "0";
      if (Math.abs(val) >= 100) return val.toFixed(0);
      if (Math.abs(val) >= 10) return val.toFixed(0);
      if (Math.abs(val) >= 1) return val.toFixed(1);
      return val.toFixed(3);
  };

  if (hasData) {
    yKeys = Array.isArray(yKey) ? yKey : [yKey];
    const xValues: number[] = data.map((d: any) => Number(d[xKey])).filter((v: any) => !isNaN(v));
    const allYValues: number[] = data.flatMap((d: any) => yKeys.map(k => Number(d[k]))).filter((v: any) => !isNaN(v));
    
    if (xValues.length === 0 || allYValues.length === 0) return <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50/50">No Valid Data</div>;

    const xMax = Math.max(...xValues), xMin = Math.min(...xValues);
    const yMax = Math.max(...allYValues), yMin = Math.min(...allYValues);
    const yRange = Math.max(1e-9, yMax - yMin), xRange = Math.max(1e-9, xMax - xMin);
    
    xScale = (val: number) => width <= 2*padding ? padding : ((val - xMin) / xRange) * (width - 2 * padding) + padding;
    yScale = (val: number) => height <= 2*padding ? height - padding : height - padding - ((val - yMin) / yRange) * (height - 2 * padding);

    paths = yKeys.map((key, i) => {
      const points = data.filter((d: any) => !isNaN(Number(d[xKey])) && !isNaN(Number(d[key])))
        .map((d: any) => `${xScale(Number(d[xKey]))},${yScale(Number(d[key]))}`).join(' ');
      return { key, points, color: lineColors[i % lineColors.length] };
    });

    const numTicks = 5;
    xTicks = Array.from({length: numTicks}, (_, i) => xMin + (i * xRange / (numTicks-1)));
    yTicks = Array.from({length: numTicks}, (_, i) => yMin + (i * yRange / (numTicks-1)));
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hasData || !containerRef.current || (fixedWidth && fixedHeight)) return; 
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xValues: number[] = data.map((d: any) => Number(d[xKey])).filter((v: any) => !isNaN(v));
    if (xValues.length === 0) return;

    const xMax = Math.max(...xValues);
    const xMin = Math.min(...xValues);
    const xRange = xMax - xMin;
    const plotWidth = width - 2 * padding;
    if (xRange === 0 || plotWidth <= 0) return;

    const xValEstimate = ((x - padding) / plotWidth) * xRange + xMin;
    const nearest = data.reduce((prev: any, curr: any) => {
      if (isNaN(Number(curr[xKey]))) return prev;
      if (isNaN(Number(prev[xKey]))) return curr;
      return (Math.abs(Number(curr[xKey]) - xValEstimate) < Math.abs(Number(prev[xKey]) - xValEstimate) ? curr : prev);
    });
    setHoverData(nearest);
  };

  const canRender = width > 0 && height > 0 && hasData;

  return (
    <div className={`w-full h-full flex flex-col ${className || ''}`} style={fixedWidth && fixedHeight ? { width: fixedWidth, height: fixedHeight, flexGrow: 0 } : {}}>
      <div className="flex flex-wrap justify-between items-center mb-2 px-2 shrink-0">
         <h4 className="text-sm md:text-base font-bold text-slate-700 mx-auto text-center">{title}</h4>
         {hasData && (yKeys.length > 1 || (labels && labels.length > 0)) && (
           <div className="flex flex-wrap gap-2 text-[10px] md:text-xs justify-center w-full mt-1">
             {yKeys.map((key, i) => (
               <div key={key} className="flex items-center gap-1">
                 <div className="w-3 h-1 rounded-full" style={{ backgroundColor: lineColors[i % lineColors.length] }}></div>
                 <span className="text-slate-600 font-medium">{labels[i] || key}</span>
               </div>
             ))}
           </div>
         )}
      </div>
      
      <div className={`relative flex-grow w-full ${fixedWidth ? '' : 'min-h-[250px]'}`} ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverData(null)}>
        {canRender ? (
            <svg width={width} height={height} className="absolute top-0 left-0 w-full h-full overflow-visible cursor-crosshair">
            {yTicks.map((val, i) => {
                const y = yScale(val);
                return (
                    <g key={`y-${i}`}>
                        <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                        <text x={padding - 10} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">{formatTick(val)}</text>
                    </g>
                );
            })}
            {xTicks.map((val, i) => {
                const x = xScale(val);
                return (
                    <g key={`x-${i}`}>
                        <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
                        <text x={x} y={height - padding + 16} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="500">{formatTick(val)}</text>
                    </g>
                );
            })}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />
            
            {paths.map((p: any) => <polyline key={p.key} points={p.points} fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
            
            {scatterPoints && scatterPoints.map((p: any, i: number) => {
                const x = xScale(p.x);
                const y = yScale(p.y);
                if (isNaN(x) || isNaN(y)) return null;
                return (
                    <g key={`scatter-${i}`}>
                        <circle cx={x} cy={y} r="6" fill="#ef4444" stroke="white" strokeWidth="2" />
                        <text x={x + 8} y={y - 8} fontSize="10" fontWeight="bold" fill="#ef4444" textAnchor="start">{p.label || ''}</text>
                    </g>
                );
            })}

            {hoverData && !fixedWidth && (
                <g>
                <line x1={xScale(hoverData[xKey])} y1={padding} x2={xScale(hoverData[xKey])} y2={height - padding} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                {yKeys.map((key, i) => {
                  const val = Number(hoverData[key]);
                  if (isNaN(val)) return null;
                  return <circle key={key} cx={xScale(hoverData[xKey])} cy={yScale(val)} r="4" fill="white" stroke={lineColors[i % lineColors.length]} strokeWidth="2" vectorEffect="non-scaling-stroke" />;
                })}
                </g>
            )}
            </svg>
        ) : <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50/50">Loading Chart...</div>}
        
        {hoverData && canRender && !fixedWidth && (
          <div className="absolute bg-slate-800/90 backdrop-blur-sm text-white text-xs rounded px-3 py-2 pointer-events-none shadow-xl z-10 top-2 left-1/2 -translate-x-1/2 whitespace-nowrap border border-slate-700">
            <div className="border-b border-slate-600 mb-1 pb-1 font-mono text-center">
                {xLabel}: <span className="font-bold">{Number(hoverData[xKey]).toFixed(4)}</span>
            </div>
            {yKeys.map((key, i) => {
                const val = Number(hoverData[key]);
                if (isNaN(val)) return null;
                return (
                    <div key={key} className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: lineColors[i % lineColors.length] }}></span>
                            <span className="text-slate-300">{(labels && labels[i]) ? labels[i] : yLabel}: </span>
                        </div>
                        <span className="font-mono font-bold text-white">{val.toFixed(1)}</span>
                    </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
