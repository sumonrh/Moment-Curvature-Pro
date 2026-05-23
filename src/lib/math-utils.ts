import { Point } from './types';

// Polygon Clipping (Sutherland-Hodgman) against line: A*x + B*y >= -C
export function clipPolygon(polygon: Point[], A: number, B: number, C: number) {
  const inside = (pt: Point) => (A * pt.x + B * pt.y) >= -C - 1e-6;
  const intersect = (p1: Point, p2: Point) => {
    const d1 = A * p1.x + B * p1.y + C;
    const d2 = A * p2.x + B * p2.y + C;
    const t = d1 / (d1 - d2);
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  };

  const clipped: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const cur = polygon[i];
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);

    if (curIn) {
      if (!prevIn) clipped.push(intersect(prev, cur));
      clipped.push(cur);
    } else if (prevIn) {
      clipped.push(intersect(prev, cur));
    }
  }
  return clipped;
}

// Calculate Area and Centroid of a CCW polygon
export function polygonProperties(polygon: Point[]) {
  if (polygon.length < 3) return { area: 0, cx: 0, cy: 0 };
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }
  const signedArea = area / 2;
  if (signedArea === 0) return { area: 0, cx: 0, cy: 0 };
  return { area: Math.abs(signedArea), cx: cx / (6 * signedArea), cy: cy / (6 * signedArea) };
}

export const integrate = (func: (val: number) => number, start: number, end: number, steps: number) => {
  const dx = (end - start) / steps;
  let area = 0;
  for (let i = 0; i < steps; i++) {
    area += 0.5 * (Math.abs(func(start + i * dx)) + Math.abs(func(start + (i + 1) * dx))) * dx;
  }
  return area;
};
