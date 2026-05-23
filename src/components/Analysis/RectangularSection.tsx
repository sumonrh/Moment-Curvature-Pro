import React from 'react';
import { Download, FileText, Activity, Zap, Layers } from 'lucide-react';
import { StatCard } from '../UI/StatCard';
import { CrossSectionVisualizer } from '../Section/CrossSectionVisualizer';
import { InteractiveLineChart } from '../Charts/InteractiveLineChart';
import { ResultRow } from '../UI/ResultRow';
import { InputField } from '../UI/InputField';

export const RectangularSection = ({ activeTab, results, inputs, setInputs, generateReport, mergedMomentData, downloadCSV }: any) => {
  if (activeTab === 'summary') {
    return (
      <div className="flex flex-col gap-8 pb-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Rectangular Section Summary</h3>
            <p className="text-slate-500 text-sm">Overview of section performance and material limits</p>
          </div>
          <button 
            onClick={generateReport}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group"
          >
            <FileText size={20} className="group-hover:scale-110 transition-transform" /> 
            Create Report
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="Confinement Efficiency" 
            value={(results.confinement.fcc / inputs.fc).toFixed(2)} 
            unit="ratio" 
            subLabel={`f'cc = ${results.confinement.fcc.toFixed(1)} MPa`}
            icon={<Layers size={20} />}
          />
          <StatCard 
            label="Deformation Capacity" 
            value={(results.confinement.ecu * 100).toFixed(2)} 
            unit="%" 
            subLabel={`Lp = ${(results.Lp_mm/1000).toFixed(3)} m`}
            icon={<Zap size={20} />}
          />
          <StatCard 
             label="Moment Capacities" 
             icon={<Activity size={20} />}
             subLabel="Biaxial ultimate moments"
             customContent={
                 <div className="flex flex-col justify-center h-full gap-2">
                    <div className="flex justify-between items-center"><span className="text-xl font-bold text-slate-800">Mx</span><div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-slate-800">{Math.max(...(results.mcStrong?.moments || [0])).toFixed(0)}</span><span className="text-sm font-bold text-slate-500">kN-m</span></div></div>
                    <div className="h-px bg-slate-200 w-full"></div>
                    <div className="flex justify-between items-center"><span className="text-xl font-bold text-slate-800">My</span><div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-slate-800">{Math.max(...(results.mcWeak?.moments || [0])).toFixed(0)}</span><span className="text-sm font-bold text-slate-500">kN-m</span></div></div>
                 </div>
             }/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-stretch h-full">
           <div className="md:col-span-2 h-full min-h-[350px]">
              <CrossSectionVisualizer sectionType="rectangular" inputs={inputs} isPrintMode={false} />
           </div>
           <div className="md:col-span-3 h-full min-h-[450px] border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col">
              <h5 className="text-sm font-bold text-slate-500 mb-4 flex items-center justify-between">Analysis Preview: Moment vs Curvature</h5>
              <div className="flex-grow">
                <InteractiveLineChart data={mergedMomentData} xKey="curvature" yKey={["moment", "momentWeak"]} labels={["Mx", "My"]} xLabel="Curvature (1/m)" yLabel="Moment (kN-m)" className="h-full" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'mc') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-16">
        <div className="h-[550px] border border-slate-100 rounded-2xl p-6 shadow-sm md:col-span-2 relative">
           <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => downloadCSV(mergedMomentData, 'moment_curvature_rectangular.csv', ['curvature', 'moment', 'momentWeak', 'strainSteel', 'strainSteelWeak', 'strainConc', 'strainConcWeak'])}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
              >
                <Download size={14} /> Download CSV
              </button>
           </div>
           <InteractiveLineChart data={mergedMomentData} xKey="curvature" yKey={["moment", "momentWeak"]} labels={["Mx", "My"]} title="Moment vs. Curvature (Rectangular)" xLabel="Curvature (1/m)" yLabel="Moment (kN-m)"/>
        </div>
        <div className="h-[450px] border border-slate-100 rounded-2xl p-6 shadow-sm">
          <InteractiveLineChart data={mergedMomentData} xKey="curvature" yKey={["strainSteel", "strainSteelWeak"]} labels={["Strain (Mx)", "Strain (My)"]} title="Steel Strain vs. Curvature" color="#ef4444" colors={["#ef4444", "#fb923c"]} xLabel="Curvature (1/m)" yLabel="Tensile Strain (%)"/>
        </div>
        <div className="h-[450px] border border-slate-100 rounded-2xl p-6 shadow-sm">
          <InteractiveLineChart data={mergedMomentData} xKey="curvature" yKey={["strainConc", "strainConcWeak"]} labels={["Strain (Mx)", "Strain (My)"]} title="Concrete Strain vs. Curvature" color="#10b981" colors={["#10b981", "#2dd4bf"]} xLabel="Curvature (1/m)" yLabel="Comp. Strain (%)"/>
        </div>
      </div>
    );
  }

  if (activeTab === 'mr') {
    return (
      <div className="grid grid-cols-1 gap-8 pb-16">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-grow">
            <h4 className="text-sm font-bold text-slate-700 uppercase">Analysis Parameters</h4>
            <p className="text-xs text-slate-500">Adjust parameters for rectangular rotation calculations</p>
          </div>
          <div className="w-full md:w-72">
            <InputField 
              label="Length to Contraflexure (L)" 
              value={inputs.L} 
              onChange={(v: number) => setInputs({...inputs, L: v})} 
              unit="mm" 
              tooltip="Column length from Max Moment to point of contraflexure"
            />
          </div>
        </div>
        <div className="h-[600px] border border-slate-100 rounded-2xl p-6 shadow-sm relative">
           <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => downloadCSV(mergedMomentData, 'moment_rotation_rectangular.csv', ['rotation', 'moment', 'momentWeak'])}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
              >
                <Download size={14} /> Download CSV
              </button>
           </div>
           <InteractiveLineChart data={mergedMomentData} xKey="rotation" yKey={["moment", "momentWeak"]} labels={["Mx", "My"]} title="Moment vs. Rotation (Rectangular)" xLabel="Rotation (rad)" yLabel="Moment (kN-m)"/>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
           <h4 className="text-sm font-bold text-blue-900 uppercase mb-4">Plastic Hinge Parameters (Caltrans SDC)</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResultRow label="Plastic Hinge Length (Lp)" value={results.Lp_mm} unit="mm" />
              <ResultRow label="Column Length (L)" value={inputs.L} unit="mm" />
           </div>
        </div>
      </div>
    );
  }

  return null;
};
