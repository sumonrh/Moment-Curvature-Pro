export type SectionType = 'circular' | 'rectangular';

export interface SectionInputs {
  D: number;
  B: number;
  H: number;
  cover: number;
  n_bars: number;
  nx: number;
  ny: number;
  n_legsX?: number;
  n_legsY?: number;
  db: number;
  dbt: number;
  s: number;
  fc: number;
  fy: number;
  P: number;
  loadMx: number;
  loadMy: number;
  Lp_mm: number;
  L: number;
  code: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bar {
  x: number;
  y: number;
  As: number;
  in_core?: boolean;
}

export interface ConcreteCell {
  x: number;
  y: number;
  area: number;
  in_core: boolean;
}

export interface SectionGeometry {
  bar_coords: Bar[];
  concrete_cells: ConcreteCell[];
  Ag: number;
  Ast: number;
  depth_total: number;
  width_total: number;
  x_pc: number;
  y_pc: number;
}

export interface CalculationParams {
  ecu: number;
  fcc: number;
  ecc: number;
}

export interface StrainPlane {
  eps_top: number;
  eps_bot: number;
  theta: number;
  d_max: number;
}

export interface SectionForces {
  P: number;
  Mx: number;
  My: number;
  max_t_strain: number;
  max_c_strain: number;
}
