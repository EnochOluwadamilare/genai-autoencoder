import PixelCanvas from '../PixelCanvas/PixelCanvas';
import style from './style.module.css';

export type DiscoveredShapeMatch = {
    id: string;
    label: string;
    percentage: number | null;
    grid: number[][] | null;
};

type DiscoveredShapesClassificationProps = {
    shapes: DiscoveredShapeMatch[];
};

function DiscoveredShapesClassification({ shapes }: DiscoveredShapesClassificationProps) {
    return (
        <section className={style.container} aria-labelledby="discovered-shapes-classification-title">
            <h3 id="discovered-shapes-classification-title">Shapes discovered in Level 2</h3>
            {shapes.length > 0 ? (
                <ul className={style.shapeList}>
                    {shapes.map((shape, index) => (
                        <li className={style.shapeRow} key={shape.id}>
                            <div className={style.preview} aria-label={`${shape.label} preview`}>
                                {shape.grid ? (
                                    <PixelCanvas
                                        rows={32}
                                        cols={32}
                                        cellSize={1}
                                        grid={shape.grid}
                                        gridless
                                        readOnly
                                    />
                                ) : (
                                    <span className={style.previewLoading}>No saved image</span>
                                )}
                            </div>
                            <span className={style.shapeLabel}>
                                {shape.label}
                                {index === 0 && shape.percentage !== null && (
                                    <span className={style.closestBadge}>Closest match</span>
                                )}
                            </span>
                            <div className={style.match}>
                                <span className={style.percentage}>
                                    {shape.percentage === null ? 'Draw a shape' : `${shape.percentage}%`}
                                </span>
                                <div
                                    className={style.track}
                                    role="progressbar"
                                    aria-label={`${shape.label} match`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={shape.percentage ?? 0}
                                >
                                    <span
                                        className={style.fill}
                                        style={{ width: `${shape.percentage ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={style.emptyState}>No shapes discovered in Level 2 yet.</p>
            )}
        </section>
    );
}

export default DiscoveredShapesClassification;
