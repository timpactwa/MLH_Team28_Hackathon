/** 150 -> 12 ft 6 in. Inches are rounded to the nearest half. */
export function feetInches(inches: number): string {
  const rounded = Math.round(inches * 2) / 2;
  const ft = Math.floor(rounded / 12);
  const inch = rounded - ft * 12;
  if (ft === 0) return `${inch} in`;
  if (inch === 0) return `${ft} ft`;
  return `${ft} ft ${inch} in`;
}
