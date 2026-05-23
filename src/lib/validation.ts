import { SectionType, SectionInputs } from './types';

export const validateInputs = (inputs: SectionInputs, sectionType: SectionType) => {
  const { D, B, H, cover, n_bars, nx, ny, db, s } = inputs;
  if (sectionType === 'circular') {
    if (D <= 0) return "Diameter must be positive.";
    if (cover <= 0) return "Cover must be positive.";
    if (db <= 0) return "Bar diameter must be positive.";
    if (n_bars < 4) return "At least 4 bars are required for a circular section.";
    if (s <= 0) return "Spacing must be positive.";
    if (D < 2 * cover) return "Reinforcement cage must be inside the section.";
  } else {
    if (B <= 0 || H <= 0) return "Dimensions must be positive.";
    if (cover <= 0) return "Cover must be positive.";
    if (db <= 0) return "Bar diameter must be positive.";
    if (nx < 2 || ny < 2) return "At least 2 bars per side are required.";
    if (s <= 0) return "Spacing must be positive.";
    if (B < 2 * cover || H < 2 * cover) return "Reinforcement cage must be inside the section.";
  }
  return null;
};
