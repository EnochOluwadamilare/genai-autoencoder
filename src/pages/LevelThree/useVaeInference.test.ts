import { describe, expect, it } from 'vitest';
import { getShapeMatchPercentages } from './useVaeInference';

describe('LevelThree shape classification', () => {
    it('ranks the closest discovered shape highest and reports relative percentages', () => {
        const percentages = getShapeMatchPercentages([0, 0], [
            { id: 'far', vector: [3, 0] },
            { id: 'closest', vector: [0.5, 0] },
            { id: 'middle', vector: [1, 0] },
        ]);

        expect(percentages.closest).toBeGreaterThan(percentages.middle);
        expect(percentages.middle).toBeGreaterThan(percentages.far);
        expect(Object.values(percentages).reduce((sum, percentage) => sum + percentage, 0)).toBe(100);
    });

    it('returns a full match for the only discovered shape', () => {
        expect(getShapeMatchPercentages([1, 2], [
            { id: 'square', vector: [10, 10] },
        ])).toEqual({ square: 100 });
    });

    it('returns no matches when there are no discovered shapes', () => {
        expect(getShapeMatchPercentages([1, 2], [])).toEqual({});
    });
});
