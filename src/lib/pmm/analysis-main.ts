import { SectionInputs, SectionType } from '../types';
import { calcRectangularPMPoint } from './rectangular';
import { calcCircularPMPoint } from './circular';
import { findInteractionPointAtP } from './shared';

export const calculateInteractionDiagram = (sectionType: SectionType, inputs: SectionInputs) => {
  const { fc, fy, code, cover, db, dbt, D, B, H, n_bars, nx, ny } = inputs;
  const isRect = sectionType === 'rectangular';
  
  let phic = 0.65, phis = 0.85;
  if (code === 'CHBDC') { phic = 0.75; phis = 0.90; }
  if (code === 'EC') { phic = 1/1.35; phis = 1/1.15; }

  const aBar = Math.PI * Math.pow(db/2, 2);
  const dcover = cover + dbt + db/2; 
  
  const bars = [];
  if (isRect) {
    const x_lim = B/2 - dcover;
    const y_lim = H/2 - dcover;
    if (nx > 1) {
      const dx = (2 * x_lim) / (nx - 1);
      for(let i=0; i<nx; i++) {
         bars.push({ x: -x_lim + i*dx, y: y_lim, As: aBar }); 
         bars.push({ x: -x_lim + i*dx, y: -y_lim, As: aBar }); 
      }
    }
    if (ny > 2) {
      const dy = (2 * y_lim) / (ny - 1);
      for(let j=1; j<ny-1; j++) {
         bars.push({ x: -x_lim, y: y_lim - j*dy, As: aBar }); 
         bars.push({ x: x_lim, y: y_lim - j*dy, As: aBar }); 
      }
    }
  } else {
    const rCenter = D/2 - dcover;
    for (let i = 0; i < n_bars; i++) {
      const thetaBar = i * (2 * Math.PI) / n_bars;
      bars.push({ x: rCenter * Math.cos(thetaBar), y: rCenter * Math.sin(thetaBar), As: aBar });
    }
  }

  const totalAst = bars.reduce((sum, bar) => sum + bar.As, 0);
  const Ag = isRect ? B * H : Math.PI * Math.pow(D, 2) / 4;
  
  const a1 = Math.max(0.67, 0.85 - 0.0015 * fc);
  const Pro = (phic * a1 * fc * (Ag - totalAst) + phis * totalAst * fy) / 1000;
  const Prmax = 0.80 * Pro;
  const Prt = -(phis * fy * totalAst) / 1000;

  const theta_steps = 72;
  const angles = Array.from({length: theta_steps + 1}, (_, i) => i * (360 / theta_steps));
  const pSteps = 41;
  const pVals = Array.from({length: pSteps}, (_, i) => {
    const ratio = (1 - Math.cos(Math.PI * (i + 1) / (pSteps + 1))) / 2;
    return Prmax - ratio * (Prmax - Prt);
  });

  const grid = { P: [], Mx: [], My: [] };
  const surface = [];

  const calcPMPoint = isRect ? calcRectangularPMPoint : calcCircularPMPoint;

  for (let t of angles) {
    const rowP = [], rowMx = [], rowMy = [];
    rowP.push(Prmax); rowMx.push(0); rowMy.push(0);
    
    for (let pTarget of pVals) {
      const pt = findInteractionPointAtP(t * Math.PI / 180, pTarget, sectionType, inputs, phic, phis, bars, Prmax, Prt, calcPMPoint);
      rowP.push(pTarget);
      rowMx.push(pt.mx);
      rowMy.push(pt.my);
      surface.push({ p: pTarget, mx: pt.mx, my: pt.my, theta: t * Math.PI / 180 });
    }
    
    rowP.push(Prt); rowMx.push(0); rowMy.push(0);
    grid.P.push(rowP);
    grid.Mx.push(rowMx);
    grid.My.push(rowMy);
  }

  return { surface, p_ro: Pro, p_r_max: Prmax, p_r_tension: Prt, grid, theta_steps, t_steps: pVals.length + 2, bars, phic, phis };
};
