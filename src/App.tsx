import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Settings, FileText, Download, 
  TrendingUp, RotateCw, Box, HelpCircle, 
  Info, AlertTriangle, Mail, Calculator, Moon, Sun
} from 'lucide-react';

// Modular Imports
import { SectionType, SectionInputs } from './lib/types';
import { validateInputs } from './lib/validation';
import { 
  getSectionGeometry, 
  calculateUltimateStrain, 
  analyzeSection, 
  getSectionForcesFromStrains 
} from './lib/section-analysis';
import { calculateInteractionDiagram } from './lib/pmm/analysis-main';
import { manderConfined, manderUnconfined, parkSteel } from './lib/material-models';
import { generateSVGSection, generateSVGChart } from './lib/report-generator';

// Component Imports
import { InputField } from './components/UI/InputField';
import { SectionToggle } from './components/UI/SectionToggle';
import { StatCard } from './components/UI/StatCard';
import { ResultRow } from './components/UI/ResultRow';
import { CrossSectionVisualizer } from './components/Section/CrossSectionVisualizer';
import { InteractiveLineChart } from './components/Charts/InteractiveLineChart';
import { InteractionDiagramTab } from './components/Analysis/InteractionDiagramTab';
import { CircularSection } from './components/Analysis/CircularSection';
import { RectangularSection } from './components/Analysis/RectangularSection';

const downloadCSV = (data: any[], filename: string, headers: string[]) => {
  if (!data || data.length === 0) return;
  const csvContent = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const smoothSeries = (values: any[], passes = 8) => {
  let smoothed = values.map((value) => Number(value));
  for (let pass = 0; pass < passes; pass++) {
    smoothed = smoothed.map((value, index) => {
      if (!Number.isFinite(value) || index < 2 || index > smoothed.length - 3) return value;
      const window = smoothed.slice(index - 2, index + 3);
      if (window.some((item) => !Number.isFinite(item))) return value;
      return (window[0] + 2 * window[1] + 3 * window[2] + 2 * window[3] + window[4]) / 9;
    });
  }
  return smoothed;
};

const interpolateSeries = (xValues: number[], yValues: any[], x: number) => {
  if (!xValues.length || !yValues.length || x < xValues[0] || x > xValues[xValues.length - 1]) return undefined;
  let upper = xValues.findIndex((value) => value >= x);
  if (upper === -1) return undefined;
  if (upper === 0) return yValues[0];

  const lower = upper - 1;
  const x0 = xValues[lower], x1 = xValues[upper];
  const y0 = Number(yValues[lower]), y1 = Number(yValues[upper]);
  if (!Number.isFinite(y0) || !Number.isFinite(y1)) return undefined;
  if (x1 === x0) return y1;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
};

export default function App() {
  const [sectionType, setSectionType] = useState<SectionType>('circular');
  const [inputs, setInputs] = useState<SectionInputs>({
    code: 'CSA',
    cover: 70, L: 1400, fc: 35, fy: 400, db: 35.7, dbt: 20, s: 65,
    P: 0, loadMx: 0, loadMy: 0, Lp_mm: 0, D: 1000, n_bars: 20,
    B: 1000, H: 1000, nx: 5, ny: 5, n_legsX: 4, n_legsY: 4
  });

  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [isDarkTheme, setIsDarkTheme] = useState(() => localStorage.getItem('theme') === 'tokyo-night');

  useEffect(() => {
    localStorage.setItem('theme', isDarkTheme ? 'tokyo-night' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    try {
      const validationError = validateInputs(inputs, sectionType);
      if (validationError) {
        setResults({ error: validationError });
        return;
      }

      const Ec = 5000 * Math.sqrt(inputs.fc);
      let initialConfinement;

      if (sectionType === 'circular') {
        const { D, cover, n_bars, db, dbt, s } = inputs;
        const ds = D - 2 * cover - dbt, Asc = Math.PI * Math.pow(dbt / 2, 2);
        const ps = (4 * Asc) / (ds * s), r_core = ds / 2;
        const pcc = (n_bars * Math.PI * Math.pow(db / 2, 2)) / (Math.PI * Math.pow(r_core, 2));
        const sc = s - dbt, Ae_python = 0.25 * Math.PI * ds * (ds - sc / 2);
        const Acc = 0.25 * Math.PI * Math.pow(ds, 2) * (1 - pcc);
        const Ke = Ae_python / Acc, fLp = Ke * (ps * inputs.fy / 2);
        initialConfinement = { pcc, ps, ds, Ke, fLp, coreArea: Acc };
      } else {
        const { B, H, cover, dbt, nx, ny, db, s, n_legsX = 4, n_legsY = 4 } = inputs;
        const bc = B - 2*cover - dbt, dc = H - 2*cover - dbt, Ac = bc * dc; 
        const pcc = ((2*nx + 2*(ny-2)) * Math.PI * Math.pow(db/2, 2)) / Ac;
        const rho_x = (n_legsX * Math.PI * Math.pow(dbt/2, 2)) / (s * dc); 
        const rho_y = (n_legsY * Math.PI * Math.pow(dbt/2, 2)) / (s * bc); 
        
        const sum_sq = (n_legsX - 1)*Math.pow(bc / (n_legsX - 1), 2) + (n_legsY - 1)*Math.pow(dc / (n_legsY - 1), 2);
        const Ke = ((1 - sum_sq / (6 * bc * dc)) * (1 - (s - dbt) / (2 * bc)) * (1 - (s - dbt) / (2 * dc))) / (1 - pcc);
        initialConfinement = { pcc, ps: rho_x + rho_y, ds: 0, Ke, fLp: (Ke * rho_x * inputs.fy + Ke * rho_y * inputs.fy) / 2, coreArea: Ac };
      }

      const confinement = calculateUltimateStrain(sectionType, inputs, initialConfinement);
      const mcStrong = analyzeSection(sectionType, inputs, confinement, 'strong');
      let mcWeak = sectionType === 'rectangular' ? analyzeSection(sectionType, inputs, confinement, 'weak') : null;

      const { L, fy, db } = inputs;
      const Lp_mm = Math.max(0.08 * L + 0.022 * fy * db, 0.044 * fy * db);

      const calcRotations = (mc: any) => {
         const yieldStrain = fy / 200000;
         let phi_y = 0;
         for(let i=0; i<mc.strainsSteel.length; i++) {
            if(mc.strainsSteel[i]/100 >= yieldStrain) { phi_y = mc.curvatures[i] / 1000; break; }
         }
         if(phi_y === 0 && mc.curvatures.length > 0) phi_y = mc.curvatures[mc.curvatures.length-1]/1000;
         return mc.curvatures.map((phi_m: number) => { 
            const phi_mm = phi_m / 1000; 
            return phi_mm <= phi_y ? (phi_mm * L)/3 : (phi_y * L)/3 + (phi_mm - phi_y)*Lp_mm; 
         });
      };

      const ssData = [];
      for(let i=0; i<=100; i++) {
         const es = (0.14/100) * i, ec = (0.05/100) * i;
         const unconfined = -1 * manderUnconfined(-ec, inputs.fc);
         const confined = -1 * manderConfined(-ec, inputs.fc, confinement.fcc, confinement.ecc, Ec, confinement.ecu);
         ssData.push({
             strain: es, steelStress: parkSteel(es, fy), concStrain: ec,
             confinedStress: (ec > confinement.ecu) ? undefined : confined,
             unconfinedStress: (ec > 0.005) ? undefined : unconfined
         });
      }

      const interaction = calculateInteractionDiagram(sectionType, inputs);

      setResults({
        confinement, Lp_mm, ssData, interaction, error: undefined,
        mcStrong: { ...mcStrong, rotations: calcRotations(mcStrong) },
        mcWeak: mcWeak ? { ...mcWeak, rotations: calcRotations(mcWeak) } : null,
      });
    } catch (err) {
      console.error(err);
      setResults({ error: "Numerical error during calculation." });
    }
  }, [inputs, sectionType]);

  const mergedMomentData = useMemo(() => {
    if(!results || !results.mcStrong) return [];
    const mcS = results.mcStrong;
    const mcW = results.mcWeak;
    const strongMoments = sectionType === 'rectangular' ? smoothSeries(mcS.moments) : mcS.moments;
    const weakMoments = sectionType === 'rectangular' && mcW ? smoothSeries(mcW.moments) : mcW?.moments;
    return mcS.curvatures.map((c: number, i: number) => ({
       curvature: c,
       rotation: mcS.rotations[i],
       moment: strongMoments[i],
       strainSteel: mcS.strainsSteel[i],
       strainConc: mcS.strainsConcrete[i],
       ...(mcW ? {
         momentWeak: sectionType === 'rectangular' ? interpolateSeries(mcW.curvatures, weakMoments || [], c) : weakMoments?.[i],
         momentWeakRotation: sectionType === 'rectangular' ? interpolateSeries(mcW.rotations, weakMoments || [], mcS.rotations[i]) : weakMoments?.[i],
         strainSteelWeak: sectionType === 'rectangular' ? interpolateSeries(mcW.curvatures, mcW.strainsSteel, c) : mcW.strainsSteel[i],
         strainConcWeak: sectionType === 'rectangular' ? interpolateSeries(mcW.curvatures, mcW.strainsConcrete, c) : mcW.strainsConcrete[i]
       } : {})
    }));
  }, [results, sectionType]);

  const generateReport = () => {
    if (!results) return;
    
    const sectionSvg = generateSVGSection(sectionType, inputs, 280);
    const concreteSsSvg = generateSVGChart({ data: results.ssData, xKey: "concStrain", yKey: ["confinedStress", "unconfinedStress"], colors: ["#2563eb", "#10b981"], labels: ["Confined", "Unconfined"], title: "Concrete Stress-Strain", xLabel: "Strain", yLabel: "Stress (MPa)", width: 500, height: 350 });
    const steelSsSvg = generateSVGChart({ data: results.ssData, xKey: "strain", yKey: "steelStress", color: "#6366f1", title: "Steel Stress-Strain", xLabel: "Strain", yLabel: "Stress (MPa)", width: 500, height: 350 });
    const mcStrongSvg = generateSVGChart({ data: mergedMomentData, xKey: "curvature", yKey: sectionType === 'rectangular' ? ["moment", "momentWeak"] : "moment", labels: sectionType === 'rectangular' ? ["Mx", "My"] : null, title: "Moment-Curvature", xLabel: "Curvature (1/m)", yLabel: "Moment (kN-m)", width: 500, height: 350 });
    const mrStrongSvg = generateSVGChart({ data: mergedMomentData, xKey: "rotation", yKey: sectionType === 'rectangular' ? ["moment", "momentWeak"] : "moment", labels: sectionType === 'rectangular' ? ["Mx", "My"] : null, title: "Moment-Rotation", xLabel: "Rotation (rad)", yLabel: "Moment (kN-m)", width: 500, height: 350 });

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Structural RC Column Analysis Report</title>
          <style>
              body { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 40px; margin: 0; }
              .report-container { max-width: 1000px; margin: 0 auto; background: white; padding: 60px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); border-radius: 24px; }
              header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
              h1 { color: #0f172a; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em; }
              h2 { color: #334155; border-left: 4px solid #2563eb; padding-left: 15px; margin-top: 40px; margin-bottom: 20px; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
              .meta-grid { display: grid; grid-cols: 2; gap: 40px; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; }
              th { background: #f1f5f9; text-align: left; padding: 12px 15px; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; border: 1px solid #e2e8f0; }
              td { padding: 12px 15px; border: 1px solid #e2e8f0; font-size: 14px; }
              .viz-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-top: 20px; }
              .viz-card { background: #fff; border: 1px solid #f1f5f9; padding: 15px; border-radius: 12px; }
              .viz-title { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; text-align: center; }
              .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
              .stat-box { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; }
              .stat-label { display: block; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
              .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; }
              .disclaimer { margin-top: 60px; padding: 25px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 16px; color: #9a3412; font-size: 13px; line-height: 1.6; }
              .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; line-height: 1.8; }
              @media print { .no-print { display: none; } body { padding: 0; background: white; } .report-container { box-shadow: none; max-width: 100%; padding: 20px; } }
          </style>
      </head>
      <body>
          <div class="report-container">
              <header>
                  <div>
                      <h1>Analysis Report</h1>
                      <div style="color: #64748b; font-size: 14px; font-weight: 500; margin-top: 5px;">Reinforced Concrete Column Section Analysis</div>
                  </div>
                  <div style="text-align: right; color: #94a3b8; font-size: 12px; font-weight: 600;">Generated on: ${new Date().toLocaleDateString()}</div>
              </header>

              <div class="meta-grid" style="display: flex; gap: 40px;">
                  <div style="flex: 1;">
                      <h2>Section Geometry</h2>
                      <table>
                          <tr><th>Parameter</th><th>Value</th></tr>
                          <tr><td>Type</td><td style="text-transform: capitalize;">${sectionType}</td></tr>
                          ${sectionType === 'circular' ? `<tr><td>Diameter (D)</td><td>${inputs.D} mm</td></tr>` : `<tr><td>Width (B)</td><td>${inputs.B} mm</td></tr><tr><td>Height (H)</td><td>${inputs.H} mm</td></tr>`}
                          <tr><td>Concrete Cover</td><td>${inputs.cover} mm</td></tr>
                          <tr><td>Rebar size (db)</td><td>${inputs.db} mm</td></tr>
                      </table>
                  </div>
                  <div style="flex: 1;">
                      <h2>Design Inputs</h2>
                      <table>
                          <tr><th>Parameter</th><th>Value</th></tr>
                          <tr><td>Axial Load (P)</td><td>${inputs.P} kN</td></tr>
                          <tr><td>Length (L)</td><td>${inputs.L} mm</td></tr>
                      </table>
                  </div>
              </div>

              <h2>Visualizations</h2>
              <div class="viz-grid">
                  <div class="viz-card"><div class="viz-title">Cross-Section Geometry</div>${sectionSvg}</div>
                  <div class="viz-card"><div class="viz-title">Concrete Stress-Strain</div>${concreteSsSvg}</div>
                  <div class="viz-card"><div class="viz-title">Steel Stress-Strain</div>${steelSsSvg}</div>
                  <div class="viz-card"><div class="viz-title">Moment-Curvature</div>${mcStrongSvg}</div>
                  <div class="viz-card"><div class="viz-title">Moment-Rotation</div>${mrStrongSvg}</div>
              </div>

              <h2>Confinement Results (Mander)</h2>
              <div class="stat-grid">
                  <div class="stat-box"><span class="stat-label">Confined Strength (f'cc)</span><span class="stat-val">${results.confinement.fcc.toFixed(2)} MPa</span></div>
                  <div class="stat-box"><span class="stat-label">Strain at f'cc (εcc)</span><span class="stat-val">${results.confinement.ecc.toFixed(5)}</span></div>
                  <div class="stat-box"><span class="stat-label">Ultimate Strain (εcu)</span><span class="stat-val">${results.confinement.ecu.toFixed(5)}</span></div>
                  <div class="stat-box"><span class="stat-label">Strength Gain Ratio</span><span class="stat-val">${(results.confinement.fcc / inputs.fc).toFixed(2)}</span></div>
              </div>

              <h2>Moment-Curvature Summary</h2>
              <table>
                  <thead><tr><th>Direction</th><th>Yield Moment (kN-m)</th><th>Yield Curvature (1/m)</th><th>Ultimate Moment (kN-m)</th><th>Ultimate Curvature (1/m)</th></tr></thead>
                  <tbody>
                      <tr>
                          <td><strong>Strong Axis (Mx)</strong></td>
                          <td>${(results.mcStrong?.moments?.[Math.floor((results.mcStrong?.moments?.length || 0)/4)] || 0).toFixed(1)}</td>
                          <td>${(results.mcStrong?.curvatures?.[Math.floor((results.mcStrong?.curvatures?.length || 0)/4)] || 0).toFixed(4)}</td>
                          <td>${Math.max(...(results.mcStrong?.moments || [0])).toFixed(1)}</td>
                          <td>${Math.max(...(results.mcStrong?.curvatures || [0])).toFixed(4)}</td>
                      </tr>
                      ${sectionType === 'rectangular' && results.mcWeak ? `
                      <tr>
                          <td><strong>Weak Axis (My)</strong></td>
                          <td>${(results.mcWeak?.moments?.[Math.floor((results.mcWeak?.moments?.length || 0)/4)] || 0).toFixed(1)}</td>
                          <td>${(results.mcWeak?.curvatures?.[Math.floor((results.mcWeak?.curvatures?.length || 0)/4)] || 0).toFixed(4)}</td>
                          <td>${Math.max(...(results.mcWeak?.moments || [0])).toFixed(1)}</td>
                          <td>${Math.max(...(results.mcWeak?.curvatures || [0])).toFixed(4)}</td>
                      </tr>
                      ` : ''}
                  </tbody>
              </table>

              <div class="disclaimer">
                  <strong>ENGINEERING DISCLAIMER:</strong> This report is technology demonstration only. The code has been refactored into modular components. 
                  Author: Rafiqul Haque, Ph.D., P.Eng.
              </div>

              <div class="footer">
                  Author: <strong>Rafiqul Haque, Ph.D., P.Eng.</strong><br>
                  Contact: <a href="mailto:rafiqulhaque25@gmail.com">rafiqulhaque25@gmail.com</a>
              </div>
          </div>
          <div class="no-print" style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">Print to PDF</button>
          </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RC_Column_Report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`min-h-screen bg-slate-100 p-2 md:p-8 font-sans text-slate-800 transition-colors duration-300 ${isDarkTheme ? 'theme-dark' : ''}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Activity className="text-blue-600 w-8 h-8" />
              RC Column Analysis
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-1">Advanced nonlinear cross-section analysis for reinforced concrete columns.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-4 items-center">
             <button
               type="button"
               onClick={() => setIsDarkTheme((value) => !value)}
               className="theme-toggle flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-all hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
               aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to Tokyo Night theme'}
               title={isDarkTheme ? 'Switch to light theme' : 'Switch to Tokyo Night theme'}
             >
               {isDarkTheme ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
             </button>
             <SectionToggle value={sectionType} onChange={setSectionType} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <Settings size={20} className="text-slate-500" />
                <h3 className="font-bold text-slate-700 text-lg">Parameters</h3>
              </div>
              <div className="p-5 space-y-6 overflow-y-auto max-h-[80vh]">
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-3">Geometry</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {sectionType === 'circular' ? (
                      <InputField label="Diameter (D)" value={inputs.D} onChange={(v: number) => setInputs({...inputs, D: v})} unit="mm" />
                    ) : (
                      <>
                        <InputField label="Width (B)" value={inputs.B} onChange={(v: number) => setInputs({...inputs, B: v})} unit="mm" />
                        <InputField label="Depth (H)" value={inputs.H} onChange={(v: number) => setInputs({...inputs, H: v})} unit="mm" />
                      </>
                    )}
                    <InputField label="Cover" value={inputs.cover} onChange={(v: number) => setInputs({...inputs, cover: v})} unit="mm" />
                  </div>
                </div>
                <div className="border-t border-slate-100"></div>
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-3">Rebar</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {sectionType === 'circular' ? (
                      <InputField label="No. Bars" value={inputs.n_bars} onChange={(v: number) => setInputs({...inputs, n_bars: Math.max(0, Math.round(v))})} unit="qty" />
                    ) : (
                      <>
                        <InputField label="Bars (nx)" value={inputs.nx} onChange={(v: number) => setInputs({...inputs, nx: Math.max(0, Math.round(v))})} unit="qty" />
                        <InputField label="Bars (ny)" value={inputs.ny} onChange={(v: number) => setInputs({...inputs, ny: Math.max(0, Math.round(v))})} unit="qty" />
                      </>
                    )}
                    <InputField label="Bar Dia (db)" value={inputs.db} onChange={(v: number) => setInputs({...inputs, db: v})} unit="mm" />
                    <InputField label="Tie/Spiral Dia" value={inputs.dbt} onChange={(v: number) => setInputs({...inputs, dbt: v})} unit="mm" />
                    <InputField label="Tie/Spiral Pitch (s)" value={inputs.s} onChange={(v: number) => setInputs({...inputs, s: v})} unit="mm" />
                    {sectionType === 'rectangular' && (
                      <>
                        <InputField label="Legs (nx)" value={inputs.n_legsX} onChange={(v: number) => setInputs({...inputs, n_legsX: Math.max(2, Math.round(v))})} unit="qty" />
                        <InputField label="Legs (ny)" value={inputs.n_legsY} onChange={(v: number) => setInputs({...inputs, n_legsY: Math.max(2, Math.round(v))})} unit="qty" />
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100"></div>
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-3">Materials & Loading</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <InputField label="Conc (fc)" value={inputs.fc} onChange={(v: number) => setInputs({...inputs, fc: v})} unit="MPa" />
                    <InputField label="Steel (fy)" value={inputs.fy} onChange={(v: number) => setInputs({...inputs, fy: v})} unit="MPa" />
                    <InputField label="Axial (P)" value={inputs.P} onChange={(v: number) => setInputs({...inputs, P: v})} unit="kN" tooltip="Compression is positive" />
                    <InputField label="Moment Mx" value={inputs.loadMx} onChange={(v: number) => setInputs({...inputs, loadMx: v})} unit="kN-m" />
                    <InputField label="Moment My" value={inputs.loadMy} onChange={(v: number) => setInputs({...inputs, loadMy: v})} unit="kN-m" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-6">
            <div className="flex space-x-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto">
              {[
                { id: 'summary', label: 'Summary' },
                { id: 'mc', label: 'M-C' },
                { id: 'mr', label: 'Rotation' },
                { id: 'interaction', label: 'Interaction' },
                { id: 'materials', label: 'Materials' },
                { id: 'help', label: 'Help' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>{tab.label}</button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[600px] p-4 md:p-8 relative">
              {results && !results.error ? (
                <>
                  {activeTab === 'interaction' && <InteractionDiagramTab results={results} inputs={inputs} sectionType={sectionType} />}
                  
                  {['summary', 'mc', 'mr'].includes(activeTab) && (
                    <>
                      {sectionType === 'circular' ? (
                        <CircularSection activeTab={activeTab} results={results} inputs={inputs} setInputs={setInputs} generateReport={generateReport} mergedMomentData={mergedMomentData} downloadCSV={downloadCSV} />
                      ) : (
                        <RectangularSection activeTab={activeTab} results={results} inputs={inputs} setInputs={setInputs} generateReport={generateReport} mergedMomentData={mergedMomentData} downloadCSV={downloadCSV} />
                      )}
                    </>
                  )}

                  {activeTab === 'materials' && (
                    <div className="space-y-8 pb-16">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl">
                          <h4 className="text-blue-900 font-bold text-sm uppercase mb-2">Concrete: Mander</h4>
                          <p className="text-blue-700 text-xs text-balance">Confined behavior based on Mander et al. (1988)</p>
                        </div>
                        <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl">
                          <h4 className="text-indigo-900 font-bold text-sm uppercase mb-2">Steel: Park</h4>
                          <p className="text-indigo-700 text-xs text-balance">Stress-strain relationship based on Park and Paulay (1975)</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-96 border border-slate-100 rounded-2xl p-6 shadow-sm"><InteractiveLineChart data={results.ssData} xKey="concStrain" yKey={["confinedStress", "unconfinedStress"]} colors={["#2563eb", "#10b981"]} labels={["Confined", "Unconfined"]} title="Concrete Behavior" xLabel="Strain" yLabel="Stress (MPa)"/></div>
                        <div className="h-96 border border-slate-100 rounded-2xl p-6 shadow-sm"><InteractiveLineChart data={results.ssData} xKey="strain" yKey="steelStress" title="Reinforcement Behavior" color="#6366f1" xLabel="Strain" yLabel="Stress (MPa)"/></div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'help' && (
                    <div className="space-y-8 pb-16">
                      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex gap-4 items-start">
                        <AlertTriangle className="text-amber-600 mt-1" size={24} />
                        <div><h4 className="text-amber-900 font-bold">Disclaimer</h4><p className="text-amber-800 text-sm">Technology demo only. Author: Rafiqul Haque, Ph.D., P.Eng.</p></div>
                      </div>
                      <div className="bg-slate-900 text-white p-10 rounded-3xl text-center">
                        <Mail className="mx-auto text-blue-500 mb-4" size={48} />
                        <h3 className="text-2xl font-bold mb-4">Author: Rafiqul Haque, Ph.D., P.Eng.</h3>
                        <a href="mailto:rafiqulhaque25@gmail.com" className="text-xl text-blue-400 underline">rafiqulhaque25@gmail.com</a>
                        <p className="mt-8 text-slate-500 text-sm">© {new Date().getFullYear()} All rights reserved.</p>
                      </div>
                    </div>
                  )}
                </>
              ) : results?.error ? (
                <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
                  <div className="max-w-md"><AlertTriangle size={48} className="text-red-500 mx-auto mb-4" /><h3 className="text-xl font-bold text-slate-800">Invalid Configuration</h3><p className="text-slate-500 mt-2">{results.error}</p></div>
                </div>
              ) : <div className="p-8 text-center text-slate-400">Loading Analysis...</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
