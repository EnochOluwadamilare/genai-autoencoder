import { describe, expect, it } from 'vitest';
import { LEVEL_TWO_SHAPE_PRESETS, getShapeProgressScore } from './useVaeInference';

describe('LevelTwo shape discovery', () => {
  it('scores closer latent vectors higher than distant ones', () => {
    const target = LEVEL_TWO_SHAPE_PRESETS[0].vector;
    const closeVector = target.map((value) => value + 0.15);
    const farVector = Array.from({ length: target.length }, () => 1.5);
    const zeroVector = Array.from({ length: target.length }, () => 0);

    expect(getShapeProgressScore(target, target)).toBe(100);
    expect(getShapeProgressScore(closeVector, target)).toBeGreaterThan(getShapeProgressScore(farVector, target));
    expect(getShapeProgressScore(farVector, target)).toBeGreaterThanOrEqual(0);
    expect(getShapeProgressScore(farVector, target)).toBeLessThanOrEqual(100);
    expect(getShapeProgressScore(zeroVector, target)).toBeLessThan(70);
  });
});
