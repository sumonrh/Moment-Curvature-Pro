export const manderConfined = (strain: number, fc: number, fcc: number, ecc: number, Ec: number, ecu: number) => {
  const eps = Math.abs(strain);
  if (eps > ecu) return 0;
  const Esec = fcc / ecc;
  const r = Ec / (Ec - Esec);
  const x = eps / ecc;
  return -fcc * x * r / (r - 1 + Math.pow(x, r));
};

export const manderUnconfined = (strain: number, fc: number) => {
  const eps = Math.abs(strain);
  const eco = 0.002;
  const spall_start = 0.0035;
  const spall_end = 0.005; 
  
  if (eps > spall_end) return 0;
  
  const Ec = 5000 * Math.sqrt(fc);
  const Esec = fc / eco;
  const r = Ec / (Ec - Esec);
  const x = eps / eco;
  
  let stress = fc * x * r / (r - 1 + Math.pow(x, r));
  
  if (eps > spall_start) {
      stress *= (spall_end - eps) / (spall_end - spall_start);
  }
  return -stress;
};

export const parkSteel = (strain: number, fy: number) => {
  const Es = 200000; 
  const ey = fy / Es;
  const eps = Math.abs(strain);
  const sign = strain >= 0 ? 1 : -1;
  
  if (eps <= ey) return sign * eps * Es;
  
  const esh = 0.015;
  const esu = 0.14;
  const fu = 1.35 * fy;
  
  if (eps <= esh) return sign * fy;
  if (eps >= esu) return sign * fu;
  
  const ratio = (esu - eps) / (esu - esh);
  const stress = fu - (fu - fy) * Math.pow(ratio, 2);
  
  return sign * stress;
};
