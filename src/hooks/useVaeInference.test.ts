import { describe, expect, it } from 'vitest';
import { calculateClarityMetrics } from './useVaeInference';

function makeShapeGrid(): number[][] {
  const grid = Array.from({ length: 32 }, () => Array(32).fill(0));

  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      const center = 16;
      const dx = c - center;
      const dy = r - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isInShape = dist < 13 && (Math.abs(dx) > 2 || Math.abs(dy) > 2);
      if (isInShape) {
        grid[r][c] = 1;
      }
    }
  }

  return grid;
}

describe('calculateClarityMetrics', () => {
  it('returns a separate progress percentage from clarity', () => {
    const mu = Array.from({ length: 16 }, (_, i) => 0.4 + i * 0.03);
    const vStar = Array.from({ length: 16 }, (_, i) => 0.4 + i * 0.03);

    const metrics = calculateClarityMetrics(makeShapeGrid(), mu, vStar);

    expect(metrics.clarityPercentage).toBeGreaterThanOrEqual(0);
    expect(metrics.clarityPercentage).toBeLessThanOrEqual(100);
    expect(metrics.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(metrics.progressPercentage).toBeLessThanOrEqual(100);
    expect(metrics.progressPercentage).not.toBe(metrics.clarityPercentage);
  });

  it('returns zeros for invalid input', () => {
    const metrics = calculateClarityMetrics(Array.from({ length: 32 }, () => Array(32).fill(0)), null, null);

    expect(metrics.clarityPercentage).toBe(0);
    expect(metrics.progressPercentage).toBe(0);
  });
});
