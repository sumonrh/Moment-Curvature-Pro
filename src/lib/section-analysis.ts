import { SectionType, SectionInputs, CalculationParams, Bar, ConcreteCell, SectionGeometry, StrainPlane, SectionForces } from './types';
import { manderConfined, manderUnconfined, parkSteel } from './material-models';
import { integrate } from './math-utils';

export const getAnalyticalDMax = (sectionType: SectionType, inputs: SectionInputs, theta: number) => {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  if (sectionType === 'circular') {
    return inputs.D / 2;
  } else {
    return (inputs.B / 2) * Math.abs(cosT) + (inputs.H / 2) * Math.abs(sinT);
  }
};

export const getSectionGeometry = (sectionType: SectionType, inputs: SectionInputs): SectionGeometry => {
  const { D, B, H, cover, n_bars, nx, ny, db, dbt, fc, fy } = inputs;
  const bar_area = Math.PI * Math.pow(db / 2, 2);
  
  let bar_coords: Bar[] = [];
  let depth_total = 0, width_total = 0, Ag = 0;

  const core_r = sectionType === 'circular' ? (D - 2 * cover - dbt) / 2 : 0;
  const core_w = B - 2 * cover - dbt;
  const core_h = H - 2 * cover - dbt;

  if (sectionType === 'circular') {
    depth_total = width_total = D;
    Ag = Math.PI * Math.pow(D / 2, 2);
    const ds = D - 2 * cover - dbt;
    const r_rebar = (ds - dbt - db) / 2;
    const angleStep = (2 * Math.PI) / n_bars;
    for (let i = 0; i < n_bars; i++) {
      const theta = i * angleStep;
      const x = r_rebar * Math.cos(theta);
      const y = r_rebar * Math.sin(theta);
      const r = Math.sqrt(x*x + y*y);
      bar_coords.push({ x, y, As: bar_area, in_core: r <= core_r });
    }
  } else {
    depth_total = H; width_total = B; Ag = B * H;
    const x_lim = (B / 2) - cover - dbt - db / 2;
    const y_lim = (H / 2) - cover - dbt - db / 2;
    
    const addBar = (x: number, y: number) => {
      bar_coords.push({ x, y, As: bar_area, in_core: Math.abs(x) <= core_w / 2 && Math.abs(y) <= core_h / 2 });
    };

    if (nx > 1) {
      const dx = (2 * x_lim) / (nx - 1);
      for (let i = 0; i < nx; i++) { addBar(-x_lim + i * dx, y_lim); addBar(-x_lim + i * dx, -y_lim); }
    }
    if (ny > 2) {
      const dy = (2 * y_lim) / (ny - 1);
      for (let j = 1; j < ny - 1; j++) { addBar(-x_lim, -y_lim + j * dy); addBar(x_lim, -y_lim + j * dy); }
    }
  }

  const grid_size = sectionType === 'rectangular' ? 140 : 80;
  const dx = width_total / grid_size;
  const dy = depth_total / grid_size;
  const dA = dx * dy;
  const concrete_cells: ConcreteCell[] = [];

  for (let i = 0; i < grid_size; i++) {
    for (let j = 0; j < grid_size; j++) {
      const x = -width_total / 2 + (i + 0.5) * dx;
      const y = -depth_total / 2 + (j + 0.5) * dy;
      
      let in_section = false, in_core = false;
      if (sectionType === 'circular') {
        const r = Math.sqrt(x * x + y * y);
        if (r <= D / 2) in_section = true;
        if (r <= core_r) in_core = true;
      } else {
        in_section = true;
        if (Math.abs(x) <= core_w / 2 && Math.abs(y) <= core_h / 2) in_core = true;
      }

      if (in_section) concrete_cells.push({ x, y, area: dA, in_core });
    }
  }

  let totalP_pc = 0, totalMx_pc = 0, totalMy_pc = 0;
  const alpha1_pc = Math.max(0.67, 0.85 - 0.0015 * fc);
  
  concrete_cells.forEach(cell => {
    const p = alpha1_pc * fc * cell.area;
    totalP_pc += p;
    totalMx_pc += p * cell.y;
    totalMy_pc += p * cell.x;
  });
  
  bar_coords.forEach(bar => {
    const p = fy * bar_area;
    totalP_pc += p;
    totalMx_pc += p * bar.y;
    totalMy_pc += p * bar.x;
    const p_disp = alpha1_pc * fc * bar_area;
    totalP_pc -= p_disp;
    totalMx_pc -= p_disp * bar.y;
    totalMy_pc -= p_disp * bar.x;
  });

  const x_pc = totalP_pc > 0 ? totalMy_pc / totalP_pc : 0;
  const y_pc = totalP_pc > 0 ? totalMx_pc / totalP_pc : 0;

  return { 
    bar_coords, concrete_cells, Ag, Ast: bar_coords.length * bar_area, 
    depth_total, width_total, x_pc, y_pc 
  };
};

export const getSectionForcesFromStrains = (
  geometry: SectionGeometry, inputs: SectionInputs, calcParams: CalculationParams, strainPlane: StrainPlane, phi_c = 1.0, phi_s = 1.0, alpha1 = 1.0, ignoreFracture = false
): SectionForces => {
  const { fc, fy, db } = inputs;
  const { ecu, fcc, ecc } = calcParams;
  const { eps_top, eps_bot, theta, d_max } = strainPlane;
  const { bar_coords, concrete_cells, x_pc, y_pc } = geometry;
  
  const Ec = 5000 * Math.sqrt(fc);
  const bar_area = Math.PI * Math.pow(db / 2, 2);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  let P = 0, Mx = 0, My = 0;
  let max_t_strain = 0, max_c_strain = 0;

  const getStrain = (x: number, y: number) => {
    const d = x * cosT + y * sinT; 
    return eps_bot + (eps_top - eps_bot) * ((d + d_max) / (2 * d_max));
  };

  for(let i=0; i<concrete_cells.length; i++) {
    const cell = concrete_cells[i];
    const strain = getStrain(cell.x, cell.y);
    if (strain < 0) {
      const stress = cell.in_core ? manderConfined(strain, fc, fcc, ecc, Ec, ecu) : manderUnconfined(strain, fc);
      const force = stress * cell.area * alpha1 * phi_c;
      P += force;
      Mx += -force * (cell.y - y_pc);
      My += -force * (cell.x - x_pc);
      if (Math.abs(strain) > max_c_strain) max_c_strain = Math.abs(strain);
    }
  }

  for(let i=0; i<bar_coords.length; i++) {
    const bar = bar_coords[i];
    const strain = getStrain(bar.x, bar.y);
    let steel_stress = parkSteel(strain, fy);
    
    if (ignoreFracture && Math.abs(strain) > 0.14) {
      steel_stress = strain > 0 ? 1.35 * fy : -1.35 * fy;
    }

    const steel_force = steel_stress * bar_area * phi_s;
    P += steel_force;
    Mx += -steel_force * (bar.y - y_pc);
    My += -steel_force * (bar.x - x_pc);
    
    if (strain > 0 && strain > max_t_strain) max_t_strain = strain;

    if (strain < 0) {
      const conc_stress = bar.in_core ? manderConfined(strain, fc, fcc, ecc, Ec, ecu) : manderUnconfined(strain, fc);
      const displaced_force = conc_stress * bar_area * alpha1 * phi_c;
      P -= displaced_force;
      Mx -= -displaced_force * (bar.y - y_pc);
      My -= -displaced_force * (bar.x - x_pc);
    }
  }

  return { P, Mx, My, max_t_strain, max_c_strain };
};

const getRectangularAxisForcesFromStrains = (
  geometry: SectionGeometry, inputs: SectionInputs, calcParams: CalculationParams, strainPlane: StrainPlane
): SectionForces => {
  const { B, H, cover, dbt, fc, fy, db } = inputs;
  const { ecu, fcc, ecc } = calcParams;
  const { eps_top, eps_bot, theta, d_max } = strainPlane;
  const { bar_coords, x_pc, y_pc } = geometry;
  const Ec = 5000 * Math.sqrt(fc);
  const bar_area = Math.PI * Math.pow(db / 2, 2);
  const isStrongAxis = Math.abs(Math.sin(theta)) > Math.abs(Math.cos(theta));
  const stripCount = 900;
  const core_w = Math.max(0, B - 2 * cover - dbt);
  const core_h = Math.max(0, H - 2 * cover - dbt);

  let P = 0, Mx = 0, My = 0;
  let max_t_strain = 0, max_c_strain = 0;

  const getStrain = (d: number) => eps_bot + (eps_top - eps_bot) * ((d + d_max) / (2 * d_max));

  for (let i = 0; i < stripCount; i++) {
    const d0 = -d_max + (2 * d_max * i) / stripCount;
    const d1 = -d_max + (2 * d_max * (i + 1)) / stripCount;
    const d = (d0 + d1) / 2;
    const strain = getStrain(d);
    if (strain >= 0) continue;

    const stripThickness = d1 - d0;
    const inCoreDepth = isStrongAxis ? Math.abs(d) <= core_h / 2 : Math.abs(d) <= core_w / 2;
    const confinedWidth = inCoreDepth ? (isStrongAxis ? core_w : core_h) : 0;
    const totalWidth = isStrongAxis ? B : H;
    const unconfinedWidth = Math.max(0, totalWidth - confinedWidth);

    const confinedStress = confinedWidth > 0 ? manderConfined(strain, fc, fcc, ecc, Ec, ecu) : 0;
    const unconfinedStress = unconfinedWidth > 0 ? manderUnconfined(strain, fc) : 0;
    const force = confinedStress * confinedWidth * stripThickness + unconfinedStress * unconfinedWidth * stripThickness;

    P += force;
    if (isStrongAxis) Mx += -force * (d - y_pc);
    else My += -force * (d - x_pc);
    if (Math.abs(strain) > max_c_strain) max_c_strain = Math.abs(strain);
  }

  for (let i = 0; i < bar_coords.length; i++) {
    const bar = bar_coords[i];
    const d = isStrongAxis ? bar.y : bar.x;
    const strain = getStrain(d);
    const steel_stress = parkSteel(strain, fy);
    const steel_force = steel_stress * bar_area;

    P += steel_force;
    Mx += -steel_force * (bar.y - y_pc);
    My += -steel_force * (bar.x - x_pc);
    if (strain > 0 && strain > max_t_strain) max_t_strain = strain;

    if (strain < 0) {
      const conc_stress = bar.in_core ? manderConfined(strain, fc, fcc, ecc, Ec, ecu) : manderUnconfined(strain, fc);
      const displaced_force = conc_stress * bar_area;
      P -= displaced_force;
      Mx -= -displaced_force * (bar.y - y_pc);
      My -= -displaced_force * (bar.x - x_pc);
    }
  }

  return { P, Mx, My, max_t_strain, max_c_strain };
};

export const calculateUltimateStrain = (sectionType: SectionType, inputs: SectionInputs, properties: any) => {
  const { fc, fy } = inputs;
  const { pcc, ps, fLp } = properties;
  const Ec = 5000 * Math.sqrt(fc);

  const fcc = fc * (2.254 * Math.sqrt(Math.max(0, 1 + 7.94 * fLp / fc)) - 2 * fLp / fc - 1.254);
  const eco = 0.002059;
  const ecc = eco * (1 + 5 * (fcc / fc - 1));

  const confinedStressFunc = (str: number) => manderConfined(-str, fc, fcc, ecc, Ec, 1.0);
  const steelStressFunc = (str: number) => parkSteel(str, fy);

  let ecu_min = 0.01, ecu_max = 0.15, final_ecu = 0.03, final_energies = {};

  for (let iter = 0; iter < 50; iter++) {
    const ecu_trial = (ecu_min + ecu_max) / 2;
    const Ush = 110 * ps;
    const Ucc = integrate(confinedStressFunc, 0, ecu_trial, 100);
    const Usl = integrate(steelStressFunc, 0, ecu_trial, 100) * pcc;
    const Uco = 0.017 * Math.sqrt(fc);

    const balance = Ush - (Ucc + Usl - Uco);
    final_energies = { Ush, Ucc, Usl, Uco, Balance: balance };

    if (Math.abs(balance) < 1e-6) { final_ecu = ecu_trial; break; } 
    else if (balance > 0) ecu_min = ecu_trial;
    else ecu_max = ecu_trial;
    final_ecu = ecu_trial;
  }

  return { ...properties, ecu: final_ecu, fcc, ecc, energies: final_energies };
};

export const analyzeSection = (sectionType: SectionType, inputs: SectionInputs, calcParams: CalculationParams, axis = 'strong') => {
  const geometry = getSectionGeometry(sectionType, inputs);
  const target_F = -(inputs.P || 0) * 1000;
  const theta = axis === 'strong' ? Math.PI / 2 : 0;
  const d_max = getAnalyticalDMax(sectionType, inputs, theta);
  const forceCalculator = sectionType === 'rectangular' ? getRectangularAxisForcesFromStrains : getSectionForcesFromStrains;
  
  const points = 300;
  const curvatures: number[] = [], moments: number[] = [], strainsSteel: number[] = [], strainsConcrete: number[] = [];
  const max_curv = (calcParams.ecu * 1.5) / (0.15 * geometry.depth_total);
  const forceTolerance = 0.00002 * Math.max(1, Math.abs(target_F), inputs.fc * geometry.Ag);

  for (let i = 0; i <= points; i++) {
    const curv = max_curv * Math.pow(i / points, 1.5);
    
    let ec_min = -0.2, ec_max = 0.2, eps_center = 0;
    let finalForces: SectionForces | null = null;
    let bestResidual = Number.POSITIVE_INFINITY;
    let converged = false;

    for (let iter = 0; iter < 60; iter++) {
      const eps_top = eps_center - curv * d_max;
      const eps_bot = eps_center + curv * d_max;
      const forces = forceCalculator(geometry, inputs, calcParams, { eps_top, eps_bot, theta, d_max });
      
      const diff = forces.P - target_F;
      const residual = Math.abs(diff);
      if (residual < bestResidual) {
        bestResidual = residual;
        finalForces = forces;
      }

      if (Math.abs(diff) < forceTolerance) {
        converged = true;
        break;
      }
      if (diff > 0) { ec_max = eps_center; eps_center = (eps_center + ec_min) / 2; }
      else { ec_min = eps_center; eps_center = (eps_center + ec_max) / 2; }
    }

    if (converged || i === 0) {
      const forces = finalForces || forceCalculator(geometry, inputs, calcParams, { eps_top: eps_center - curv * d_max, eps_bot: eps_center + curv * d_max, theta, d_max });
      curvatures.push(curv * 1000);
      moments.push((axis === 'strong' ? forces.Mx : forces.My) / 1e6);
      strainsSteel.push(forces.max_t_strain * 100);
      strainsConcrete.push(forces.max_c_strain * 100);
    }
  }
  return { curvatures, moments, strainsSteel, strainsConcrete, convergedCount: curvatures.length, totalPoints: points + 1 };
};
