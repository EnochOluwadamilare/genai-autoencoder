import { Stage, Layer, Rect } from 'react-konva';
import { useState } from 'react';
import style from './style.module.css';

type PixelCanvasProps = {
    rows?: number;
    cols?: number;
    cellSize?: number;
    onChange?: () => void;
};

function PixelCanvas({
    rows = 8,
    cols = 8,
    cellSize = 50,
    onChange,
}: PixelCanvasProps) {

    // Create empty grid
    const createGrid = () =>
        Array(rows)
            .fill(0)
            .map(() => Array(cols).fill(0));

    const [grid, setGrid] = useState<number[][]>(createGrid());

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

        const newGrid = grid.map(r => [...r]);

        newGrid[row][col] = value;

        setGrid(newGrid);

        if (onChange) {
            onChange();
        }
    };

    return (
        <div className={style.wrapper}>
            <Stage
                width={cols * cellSize}
                height={rows * cellSize}

                onMouseDown={() => setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}

                onTouchStart={() => setIsDrawing(true)}
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
                                        cell === 1
                                            ? '#000000'
                                            : isHovered
                                                ? '#d9eef2'
                                                : '#e9eef1'
                                    }
                                    stroke="#d0d7db"
                                    strokeWidth={1}

                                    onMouseDown={() => {
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

                                        if (isDrawing) {
                                            paintCell(
                                                rowIndex,
                                                colIndex,
                                                drawValue
                                            );
                                        }
                                    }}

                                    onTouchStart={() => {
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
                                        if (isDrawing) {
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