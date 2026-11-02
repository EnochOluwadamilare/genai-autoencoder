import type { LevelTwoSavedShape } from '../../stores/progressStore';
import PixelCanvas from '../PixelCanvas/PixelCanvas';
import style from './style.module.css';

export type DiscoveredShapeSliderItem = Omit<LevelTwoSavedShape, 'outputGrid'> & {
    outputGrid: number[][] | null;
};

type DiscoveredShapeInputSlidersProps = {
    shapes: DiscoveredShapeSliderItem[];
    percentages: Record<string, number>;
    onPercentageChange: (shapeId: string, percentage: number) => void;
};

function DiscoveredShapeInputSliders({
    shapes,
    percentages,
    onPercentageChange,
}: DiscoveredShapeInputSlidersProps) {
    return (
        <section className={style.container} aria-labelledby="discovered-shape-input-sliders-title">
            <h3 id="discovered-shape-input-sliders-title">Choose shape proportions</h3>
            {shapes.length > 0 ? (
                <ul className={style.shapeList}>
                    {shapes.map((shape) => {
                        const percentage = percentages[shape.id] ?? 0;
                        const sliderId = `shape-percentage-${shape.id}`;

                        return (
                            <li className={style.shapeRow} key={shape.id}>
                                <label className={style.sliderControl} htmlFor={sliderId}>
                                    <span className={style.percentage}>{percentage}%</span>
                                    <input
                                        id={sliderId}
                                        type="range"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={percentage}
                                        aria-label={`${shape.name} percentage`}
                                        onChange={(event) => onPercentageChange(shape.id, Number(event.target.value))}
                                    />
                                </label>
                                <span className={style.shapeLabel}>{shape.name}</span>
                                <div className={style.preview} aria-label={`${shape.name} image`}>
                                    {shape.outputGrid ? (
                                        <PixelCanvas
                                            rows={32}
                                            cols={32}
                                            cellSize={1}
                                            grid={shape.outputGrid}
                                            gridless
                                            readOnly
                                        />
                                    ) : (
                                        <span className={style.noImage}>No image</span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className={style.emptyState}>No shapes discovered in Level 2 yet.</p>
            )}
        </section>
    );
}

export default DiscoveredShapeInputSliders;
