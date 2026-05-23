import { SectionInputs, Bar } from '../types';
import { clipPolygon, polygonProperties } from '../math-utils';

export const calcRectangularPMPoint = (thetaDeg: number, c: number, inputs: SectionInputs, phic: number, phis: number, bars: Bar[]) => {
  const { fc, B, H, fy } = inputs;
  const rad = thetaDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const a1 = Math.max(0.67, 0.85 - 0.0015 * fc);
  const b1 = Math.max(0.67, 0.97 - 0.0025 * fc);
  const ecu = 0.0035;

  const uMax = (H/2)*Math.abs(cos) + (B/2)*Math.abs(sin);
  const a = b1 * c;

  const rectPoly = [
    {x: B/2, y: H/2}, {x: -B/2, y: H/2},
    {x: -B/2, y: -H/2}, {x: B/2, y: -H/2}
  ];
  const clipped = clipPolygon(rectPoly, Math.sin(rad), Math.cos(rad), -(uMax - a));
  const props = polygonProperties(clipped);
  const Cc = (a1 * phic * fc * props.area) / 1000;
  const cx = props.cx;
  const cy = props.cy;

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
