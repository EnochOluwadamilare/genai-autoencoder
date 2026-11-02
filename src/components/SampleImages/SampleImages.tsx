import PixelCanvas from '../PixelCanvas/PixelCanvas';
import style from './style.module.css';

type SampleImage = {
    name: string;
    grid: number[][];
};

type SampleImagesProps = {
    onSelect: (grid: number[][]) => void;
};

type Point = readonly [x: number, y: number];

const createGrid = (draw: (grid: number[][]) => void) => {
    const grid = Array.from({ length: 32 }, () => Array(32).fill(0));
    draw(grid);
    return grid;
};

const setPixel = (grid: number[][], x: number, y: number) => {
    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
        grid[y][x] = 1;
    }
};

const drawLine = (grid: number[][], [x1, y1]: Point, [x2, y2]: Point) => {
    let x = x1;
    let y = y1;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const stepX = x1 < x2 ? 1 : -1;
    const stepY = y1 < y2 ? 1 : -1;
    let error = dx - dy;

    while (true) {
        setPixel(grid, x, y);
        if (x === x2 && y === y2) break;

        const doubledError = error * 2;
        if (doubledError > -dy) {
            error -= dy;
            x += stepX;
        }
        if (doubledError < dx) {
            error += dx;
            y += stepY;
        }
    }
};

const drawPath = (grid: number[][], points: Point[]) => {
    points.slice(1).forEach((point, index) => {
        drawLine(grid, points[index], point);
    });
};

const drawOutlineRect = (
    grid: number[][],
    left: number,
    top: number,
    right: number,
    bottom: number,
) => {
    drawPath(grid, [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
        [left, top],
    ]);
};

const drawEllipse = (
    grid: number[][],
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
) => {
    let previous: Point | null = null;
    for (let angle = 0; angle <= 360; angle += 5) {
        const radians = (angle * Math.PI) / 180;
        const point: Point = [
            Math.round(centerX + radiusX * Math.cos(radians)),
            Math.round(centerY + radiusY * Math.sin(radians)),
        ];
        if (previous) drawLine(grid, previous, point);
        previous = point;
    }
};

const samples: SampleImage[] = [
    {
        name: 'House',
        grid: createGrid((grid) => {
            drawPath(grid, [[4, 15], [16, 5], [28, 15]]);
            drawOutlineRect(grid, 7, 14, 25, 27);
            drawOutlineRect(grid, 10, 17, 14, 21);
            drawLine(grid, [12, 17], [12, 21]);
            drawLine(grid, [10, 19], [14, 19]);
            drawOutlineRect(grid, 19, 17, 22, 20);
            drawOutlineRect(grid, 14, 21, 19, 27);
            drawLine(grid, [17, 23], [17, 24]);
        }),
    },
    {
        name: 'Love',
        grid: createGrid((grid) => {
            drawPath(grid, [
                [16, 27], [5, 17], [3, 13], [3, 10], [5, 7], [8, 6],
                [11, 7], [16, 12], [21, 7], [24, 6], [27, 7], [29, 10],
                [29, 13], [27, 17], [16, 27],
            ]);
        }),
    },
    {
        name: '1',
        grid: createGrid((grid) => {
            drawPath(grid, [[10, 11], [16, 6], [19, 6], [19, 25]]);
            drawLine(grid, [12, 25], [24, 25]);
            drawLine(grid, [14, 25], [23, 25]);
        }),
    },
    {
        name: 'Square',
        grid: createGrid((grid) => drawOutlineRect(grid, 6, 6, 25, 25)),
    },
    {
        name: 'Smiley face',
        grid: createGrid((grid) => {
            drawEllipse(grid, 16, 16, 13, 13);
            drawLine(grid, [11, 12], [11, 15]);
            drawLine(grid, [21, 12], [21, 15]);
            drawPath(grid, [
                [9, 19], [11, 22], [14, 24], [18, 24], [21, 22], [23, 19],
            ]);
        }),
    },
    {
        name: 'Stickman person',
        grid: createGrid((grid) => {
            drawEllipse(grid, 16, 7, 4, 4);
            drawLine(grid, [16, 11], [16, 21]);
            drawLine(grid, [7, 15], [25, 15]);
            drawLine(grid, [16, 21], [9, 29]);
            drawLine(grid, [16, 21], [23, 29]);
        }),
    },
    {
        name: 'Fish',
        grid: createGrid((grid) => {
            drawPath(grid, [
                [8, 16], [11, 11], [16, 9], [21, 10], [25, 13], [28, 16],
                [25, 19], [21, 22], [16, 23], [11, 21], [8, 16],
            ]);
            drawPath(grid, [[8, 16], [3, 11], [3, 21], [8, 16]]);
            drawLine(grid, [16, 10], [18, 6]);
            drawLine(grid, [16, 22], [18, 26]);
            setPixel(grid, 23, 14);
        }),
    },
    {
        name: 'Cat face with whiskers',
        grid: createGrid((grid) => {
            drawPath(grid, [
                [5, 13], [5, 5], [13, 9], [19, 9], [27, 5], [27, 13],
                [29, 18], [26, 23], [21, 26], [16, 27], [11, 26], [6, 23],
                [3, 18], [5, 13],
            ]);
            drawLine(grid, [10, 15], [10, 17]);
            drawLine(grid, [22, 15], [22, 17]);
            drawPath(grid, [[14, 19], [16, 21], [18, 19]]);
            drawLine(grid, [16, 21], [16, 23]);
            drawLine(grid, [3, 19], [10, 20]);
            drawLine(grid, [3, 22], [10, 21]);
            drawLine(grid, [22, 20], [29, 19]);
            drawLine(grid, [22, 21], [29, 22]);
        }),
    },
];

function SampleImages({ onSelect }: SampleImagesProps) {
    return (
        <section className={style.sampleImages} aria-labelledby="sample-images-heading">
            <p id="sample-images-heading">Sample Images</p>
            <div className={style.sampleRow}>
                {samples.map((sample) => (
                    <button
                        key={sample.name}
                        className={style.sampleButton}
                        type="button"
                        aria-label={`Use ${sample.name} sample`}
                        onClick={() => onSelect(sample.grid)}
                    >
                        <PixelCanvas
                            rows={32}
                            cols={32}
                            cellSize={1}
                            grid={sample.grid}
                            readOnly
                            gridless
                            injectedStyle={{
                                width: '32px',
                                height: '32px',
                                border: 'none',
                                borderRadius: '0',
                                boxShadow: 'none',
                                cursor: 'pointer',
                            }}
                        />
                    </button>
                ))}
            </div>
        </section>
    );
}

export default SampleImages;
