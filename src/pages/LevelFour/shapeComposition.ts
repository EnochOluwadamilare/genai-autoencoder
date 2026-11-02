export type ShapeCompositionSource = {
    id: string;
    vector: number[];
};

export function getShapeCompositionVector(
    shapes: ShapeCompositionSource[],
    percentages: Record<string, number>,
): number[] | null {
    const activeShapes = shapes
        .map((shape) => ({
            ...shape,
            weight: Math.max(0, Math.min(100, percentages[shape.id] ?? 0)),
        }))
        .filter((shape) => shape.weight > 0);
    const totalWeight = activeShapes.reduce((total, shape) => total + shape.weight, 0);

    if (totalWeight === 0) {
        return null;
    }

    const vectorLength = Math.max(...activeShapes.map((shape) => shape.vector.length));
    return Array.from({ length: vectorLength }, (_, index) =>
        activeShapes.reduce(
            (total, shape) => total + (shape.vector[index] ?? 0) * shape.weight,
            0,
        ) / totalWeight,
    );
}
