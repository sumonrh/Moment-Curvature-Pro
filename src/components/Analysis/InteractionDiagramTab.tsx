import React, { useState, useMemo } from 'react';
import { TrendingUp, RotateCw, Box, Download, Calculator } from 'lucide-react';
import Plot from 'react-plotly.js';
import { InteractiveLineChart } from '../Charts/InteractiveLineChart';
import { ResultRow } from '../UI/ResultRow';
import { findInteractionPointAtP } from '../../lib/pmm/shared';
import { calcRectangularPMPoint } from '../../lib/pmm/rectangular';
import { calcCircularPMPoint } from '../../lib/pmm/circular';

const downloadCSV = (data: any[], filename: string, headers: string[]) => {
  const csvContent = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const InteractionDiagramTab = ({ results, inputs, sectionType }: any) => {
  const [activeSubTab, setActiveSubTab] = useState('pm'); 
  const [angle, setAngle] = useState(0); 
  const [targetP, setTargetP] = useState(0); 
  const interaction = results.interaction;

  if (!interaction) return <div className="p-8 text-center text-slate-500">Calculating interaction diagram...</div>;

  const { surface, p_ro, p_r_max, p_r_tension, grid, theta_steps, bars, phic, phis } = interaction;
  const isRect = sectionType === 'rectangular';
  const calcPMPoint = isRect ? calcRectangularPMPoint : calcCircularPMPoint;
  
  const pmData = useMemo(() => {
    const th_idx = Math.round((angle / 360) * theta_steps) % theta_steps;
    const rowP = grid.P[th_idx];
    const rowMx = grid.Mx[th_idx];
    const rowMy = grid.My[th_idx];
    
    return rowP.map((p: number, i: number) => ({
      p,
      m: Math.sqrt(rowMx[i]**2 + rowMy[i]**2),
      mx: rowMx[i],
      my: rowMy[i]
    }));
  }, [grid, angle, theta_steps]);

  const mxmyPoints = useMemo(() => {
    if (isNaN(targetP)) return [];
    const pts = [];
    const local_theta_steps = theta_steps; 
    for (let t = 0; t < local_theta_steps; t++) {
      const theta = (t / local_theta_steps) * 2 * Math.PI;
      pts.push(findInteractionPointAtP(theta, targetP, sectionType, inputs, phic, phis, bars, p_r_max, p_r_tension, calcPMPoint));
    }
    if (pts.length > 0) pts.push(pts[0]);
    return pts;
  }, [targetP, inputs, sectionType, bars, phic, phis, p_r_max, p_r_tension, theta_steps, calcPMPoint]);
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
        {[
          { id: 'pm', label: 'Uniaxial P-M', icon: <TrendingUp size={16} /> },
          { id: 'mxmy', label: 'Mx-My Interaction', icon: <RotateCw size={16} /> },
          { id: '3d', label: '3D Surface', icon: <Box size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeSubTab === 'pm' && (
          <div className="p-6 flex flex-col h-[850px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Uniaxial P-M Diagram</h4>
                <p className="text-sm text-slate-500">Capacity at {angle}° orientation</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => downloadCSV(pmData, `uniaxial_pm_${angle}deg.csv`, ['p', 'm', 'mx', 'my'])}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <Download size={14} /> CSV
                </button>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                  <label className="text-xs font-bold text-slate-500 uppercase">Angle:</label>
                  <input type="range" min="0" max="360" step="5" value={angle} onChange={(e) => setAngle(parseFloat(e.target.value))} className="w-32 accent-blue-600"/>
                  <span className="text-sm font-mono font-bold text-blue-600 w-10">{angle}°</span>
                </div>
              </div>
            </div>
            <div className="flex-grow border border-slate-100 rounded-xl p-4 bg-slate-50">
              <InteractiveLineChart data={pmData} xKey="m" yKey="p" title="" xLabel="Moment (kN-m)" yLabel="Axial Force (kN)" className="h-full" 
                scatterPoints={[{x: Math.sqrt(inputs.loadMx**2 + inputs.loadMy**2), y: inputs.P}]}
              />
            </div>
          </div>
        )}

        {activeSubTab === 'mxmy' && (
          <div className="p-6 flex flex-col h-[850px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Mx-My Interaction</h4>
                <p className="text-sm text-slate-500">Biaxial capacity at P = {targetP} kN</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => downloadCSV(mxmyPoints, `mxmy_interaction_P${targetP}kN.csv`, ['mx', 'my', 'p'])}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <Download size={14} /> CSV
                </button>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                  <label className="text-xs font-bold text-slate-500 uppercase">Target P (kN):</label>
                  <input type="number" value={targetP} onChange={(e) => setTargetP(parseFloat(e.target.value))} className="w-24 text-sm font-bold border-none bg-transparent focus:ring-0 text-blue-600"/>
                </div>
              </div>
            </div>
            <div className="flex-grow border border-slate-100 rounded-xl p-4 bg-slate-50">
              <InteractiveLineChart data={mxmyPoints} xKey="mx" yKey="my" title="" xLabel="Mx (kN-m)" yLabel="My (kN-m)" className="h-full" 
                scatterPoints={[{x: inputs.loadMx, y: inputs.loadMy}]}
              />
            </div>
          </div>
        )}

        {activeSubTab === '3d' && (
          <div className="p-6 flex flex-col h-[850px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-slate-800">3D Interaction Surface</h4>
                <p className="text-sm text-slate-500">Factored Biaxial Resistance (P-Mx-My)</p>
              </div>
              <button 
                onClick={() => downloadCSV(surface, 'interaction_surface_3d.csv', ['p', 'mx', 'my', 'theta'])}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                <Download size={16} /> Download CSV
              </button>
            </div>
            <div className="flex-grow min-h-0 border border-slate-100 rounded-xl overflow-hidden">
              <Plot
                data={[{
                    type: 'surface', x: grid.Mx, y: grid.My, z: grid.P, opacity: 0.9, colorscale: 'Viridis', showscale: true,
                    colorbar: { title: 'Pr (kN)', thickness: 15, len: 0.8 },
                    lighting: { ambient: 0.6, diffuse: 0.9, specular: 0.2, roughness: 0.5 },
                    contours: { z: { show: true, usecolormap: true, highlightcolor: "#42f4f4", project: { z: true } } }
                }]}
                layout={{
                  autosize: true, margin: { l: 0, r: 0, b: 0, t: 0 },
                  scene: {
                    xaxis: { title: 'Mx (kN-m)', gridcolor: '#f1f5f9' }, yaxis: { title: 'My (kN-m)', gridcolor: '#f1f5f9' }, zaxis: { title: 'Pr (kN)', gridcolor: '#f1f5f9' },
                    camera: { eye: { x: 1.8, y: 1.8, z: 1.2 } }, aspectmode: 'manual', aspectratio: { x: 1, y: 1, z: 1.2 }
                  },
                  paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 text-white rounded-lg"><Calculator size={20} /></div>
          <h4 className="text-base font-bold text-blue-900 uppercase tracking-wider">Design Summary</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ResultRow label="Resistance Factor (Concrete), φc" value={phic.toFixed(3)} unit="" />
          <ResultRow label="Resistance Factor (Steel), φs" value={phis.toFixed(3)} unit="" />
          <ResultRow label="Max Factored Axial Resistance, Pr,max" value={p_r_max.toFixed(1)} unit="kN" highlight={true} />
          <ResultRow label="Pure Axial Capacity, Pro" value={p_ro.toFixed(1)} unit="kN" />
          <ResultRow label="Concrete Stress Block, α1" value={Math.max(0.67, 0.85 - 0.0015 * inputs.fc).toFixed(3)} unit="" />
        </div>
      </div>
    </div>
  );
};
