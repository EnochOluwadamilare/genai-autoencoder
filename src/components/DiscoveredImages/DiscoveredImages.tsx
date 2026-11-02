import PixelCanvas from '../PixelCanvas/PixelCanvas';
import style from './style.module.css';

type DiscoveredImage = {
    name: string;
    grid: number[][];
};

type DiscoveredImagesProps = {
    images: DiscoveredImage[];
};

function DiscoveredImages({ images }: DiscoveredImagesProps) {
    return (
        <div className={style.gallery} role="region" aria-label="Images Discovered">
            {images.length > 0 ? (
                <ul className={style.imageList}>
                    {images.map((image, index) => (
                        <li className={style.imageCard} key={`${image.name}-${index}`}>
                            <PixelCanvas
                                rows={32}
                                cols={32}
                                cellSize={3}
                                grid={image.grid}
                                gridless
                                readOnly
                            />
                            <span className={style.imageLabel}>{image.name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={style.emptyState}>No saved images yet.</p>
            )}
        </div>
    );
}

export default DiscoveredImages;
