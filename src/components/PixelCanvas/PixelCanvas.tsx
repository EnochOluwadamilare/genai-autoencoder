import { Stage, Layer, Rect } from 'react-konva';
import { useEffect, useState } from 'react';
import style from './style.module.css';

type PixelCanvasProps = {
    rows?: number;
    cols?: number;
    cellSize?: number;
    grid?: number[][] | null;
    initialGrid?: number[][];
    readOnly?: boolean;
    onChange?: (grid: number[][]) => void;
};

function PixelCanvas({
    rows = 8,
    cols = 8,
    cellSize = 50,
    grid: externalGrid,
    initialGrid,
    readOnly = false,
    onChange,
}: PixelCanvasProps) {

    // Create empty grid
    const createGrid = () =>
        Array(rows)
            .fill(0)
            .map(() => Array(cols).fill(0));

    const [grid, setGrid] = useState<number[][]>(() => initialGrid ?? createGrid());

    useEffect(() => {
        if (externalGrid) {
            setGrid(externalGrid.map((row) => [...row]));
        }
    }, [externalGrid]);

    const [hovered, setHovered] = useState<{
        row: number;
        col: number;
    } | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);

    const [drawValue, setDrawValue] = useState(1);

    const paintCell = (
        row: number,
        col: number,
        value: number
    ) => {

        const newGrid = grid.map((r) => [...r]);

        newGrid[row][col] = value;

        setGrid(newGrid);

        if (onChange) {
            onChange(newGrid);
        }
    };

    return (
        <div className={style.wrapper}>
            <Stage
                width={cols * cellSize}
                height={rows * cellSize}

                onMouseDown={() => !readOnly && setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}

                onTouchStart={() => !readOnly && setIsDrawing(true)}
                onTouchEnd={() => setIsDrawing(false)}
            >
                <Layer>
                    {grid.map((row, rowIndex) =>
                        row.map((cell, colIndex) => {

                            const isHovered =
                                hovered?.row === rowIndex &&
                                hovered?.col === colIndex;

                            return (
                                <Rect
                                    key={`${rowIndex}-${colIndex}`}
                                    x={colIndex * cellSize}
                                    y={rowIndex * cellSize}
                                    width={cellSize}
                                    height={cellSize}
                                    fill={
                                        typeof cell === 'number' && cell > 0.05
                                            ? `rgba(0,0,0,${Math.min(1, cell)})`
                                            : isHovered
                                                ? '#d9eef2'
                                                : '#e9eef1'
                                    }
                                    stroke="#d0d7db"
                                    strokeWidth={1}

                                    onMouseDown={() => {
                                        if (readOnly) return;

                                        const value =
                                            grid[rowIndex][colIndex] === 1 ? 0 : 1;

                                        setDrawValue(value);

                                        paintCell(
                                            rowIndex,
                                            colIndex,
                                            value
                                        );
                                    }}

                                    onMouseEnter={() => {

                                        setHovered({
                                            row: rowIndex,
                                            col: colIndex,
                                        });

                                        if (isDrawing && !readOnly) {
                                            paintCell(
                                                rowIndex,
                                                colIndex,
                                                drawValue
                                            );
                                        }
                                    }}

                                    onTouchStart={() => {
                                        if (readOnly) return;

                                        const value =
                                            grid[rowIndex][colIndex] === 1 ? 0 : 1;

                                        setDrawValue(value);

                                        paintCell(
                                            rowIndex,
                                            colIndex,
                                            value
                                        );
                                    }}

                                    onTouchMove={() => {
                                        if (isDrawing && !readOnly) {
                                            paintCell(
                                                rowIndex,
                                                colIndex,
                                                drawValue
                                            );
                                        }
                                    }}

                                    onMouseLeave={() =>
                                        setHovered(null)
                                    }
                                    listening={!readOnly}
                                />
                            );
                        })
                    )}
                </Layer>
            </Stage>
        </div>
    );
}

export default PixelCanvas;