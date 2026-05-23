import { SectionInputs, Bar } from '../types';

export const calcCircularPMPoint = (thetaDeg: number, c: number, inputs: SectionInputs, phic: number, phis: number, bars: Bar[]) => {
  const { fc, D, fy } = inputs;
  const rad = thetaDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const a1 = Math.max(0.67, 0.85 - 0.0015 * fc);
  const b1 = Math.max(0.67, 0.97 - 0.0025 * fc);
  const ecu = 0.0035;

  const uMax = D/2;
  const a = b1 * c;

  const R = D/2;
  const d = uMax - a;
  let area = 0, localCu = 0;
  
  if (d <= -R) {
    area = Math.PI * R * R;
    localCu = 0;
  } else if (d < R) {
    const absD = Math.abs(d);
    const alpha = Math.acos(absD / R);
    const aSmall = R * R * alpha - absD * Math.sqrt(R * R - absD * absD);
    const cxSmall = (2 / (3 * aSmall)) * Math.pow(R * R - absD * absD, 1.5);
    if (d > 0) {
      area = aSmall; 
      localCu = cxSmall;
    } else {
      area = Math.PI * R * R - aSmall; 
      localCu = (aSmall / area) * cxSmall; 
    }
  }
  const Cc = (a1 * phic * fc * area) / 1000;
  const cx = localCu * Math.sin(rad);
  const cy = localCu * Math.cos(rad);

  const Mcx = Cc * cy;
  const Mcy = Cc * cx;

  let Fs_tot = 0, Msx_tot = 0, Msy_tot = 0;
  bars.forEach(bar => {
    const u = bar.y * cos + bar.x * sin;
    const eps_s = ecu * (u - (uMax - c)) / c;
    let fs = eps_s * 200000;
    if (Math.abs(fs) > fy) fs = Math.sign(fs) * fy;

    let Fs = (phis * fs * bar.As) / 1000;
    if (u > uMax - a) Fs -= (a1 * phic * fc * bar.As) / 1000;

    Fs_tot += Fs;
    Msx_tot += Fs * bar.y;
    Msy_tot += Fs * bar.x;
  });

  return {
    P: Cc + Fs_tot,
    Mx: (Mcx + Msx_tot) / 1000,
    My: (Mcy + Msy_tot) / 1000
  };
};
