import { SectionInputs, Bar } from '../types';

export const findInteractionPointAtP = (
  thetaRad: number, 
  targetP: number, 
  sectionType: string, 
  inputs: SectionInputs, 
  phic: number, 
  phis: number, 
  bars: Bar[], 
  p_r_max: number, 
  p_r_tension: number,
  calcPMPoint: any
) => {
  const thetaDeg = thetaRad * 180 / Math.PI;
  if (targetP > p_r_max) return { mx: 0, my: 0, p: targetP };
  if (targetP <= p_r_tension) return { mx: 0, my: 0, p: p_r_tension };

  let c_min = 0.1, c_max = (sectionType === 'rectangular' ? Math.max(inputs.B, inputs.H) : inputs.D) * 3;
  let finalPt = { Mx: 0, My: 0, P: 0 };

  for (let iter = 0; iter < 50; iter++) {
    const c = (c_min + c_max) / 2;
    const pt = calcPMPoint(thetaDeg, c, inputs, phic, phis, bars);
    const diff = pt.P - targetP;

    if (Math.abs(diff) < 0.01) { finalPt = pt; break; }
    if (diff > 0) c_max = c;
    else c_min = c;
    finalPt = pt;
  }

  return { mx: finalPt.Mx, my: finalPt.My, p: finalPt.P };
};
