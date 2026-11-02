import { describe, expect, it } from 'vitest';
import { getShapeCompositionVector } from './shapeComposition';

describe('LevelFour shape composition', () => {
    it('blends shape vectors according to their relative slider weights', () => {
        const vector = getShapeCompositionVector(
            [
                { id: 'star', vector: [1, 0] },
                { id: 'pentagon', vector: [0, 1] },
                { id: 'circle', vector: [1, 1] },
            ],
            { star: 50, pentagon: 50, circle: 10 },
        );

        expect(vector).toEqual([60 / 110, 60 / 110]);
    });

    it('returns null when all sliders are zero', () => {
        expect(getShapeCompositionVector(
            [{ id: 'star', vector: [1, 0] }],
            { star: 0 },
        )).toBeNull();
    });
});
