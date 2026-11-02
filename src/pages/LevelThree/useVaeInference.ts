import { useCallback, useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export interface LevelTwoInferenceResult {
  outputMatrix: number[][];
  latentVector: number[];
}

export interface LevelTwoShapePreset {
  id: string;
  label: string;
  vector: number[];
}

export interface ShapeVectorCandidate {
  id: string;
  vector: number[];
}

export const INITIAL_LEVEL_TWO_VECTOR = Array.from({ length: 16 }, () => 0);

export const LEVEL_TWO_SHAPE_PRESETS: LevelTwoShapePreset[] = [
  {
    id: 'star_4',
    label: '4-point star',
    vector: [0.95, 0.52, 0.18, -0.04, 0.61, 0.11, -0.08, 0.32, 0.42, -0.18, 0.09, -0.02, 0.13, -0.05, -0.12, 0.21],
  },
  {
    id: 'star_5',
    label: '5-point star',
    vector: [0.78, 0.64, 0.44, 0.16, 0.25, 0.72, 0.08, 0.51, 0.38, 0.12, -0.14, 0.22, -0.06, 0.31, -0.18, 0.09],
  },
  {
    id: 'star_8',
    label: '8-point star',
    vector: [0.7, 0.7, 0.3, 0.7, 1.3, 0.3, 0.5, 0.2, -0.1, -0.2, 0.5, 0.5, -0.1, -0.1, 0.1, -0.1],
  },
  {
    id: 'box',
    label: 'box',
    vector: [0.15, 0.34, 0.86, 0.51, 0.22, 0.42, 0.58, 0.17, 0.26, 0.74, 0.3, 0.19, 0.09, 0.12, 0.35, 0.2],
  },
  {
    id: 'circle',
    label: 'circle',
    vector: [0.18, 0.24, 0.5, 0.63, 0.76, 0.21, 0.44, 0.66, 0.34, 0.42, 0.53, 0.28, 0.17, 0.05, 0.22, 0.14],
  },
  {
    id: 'pentagon',
    label: 'pentagon',
    vector: [0.14, 0.42, 0.75, 0.67, 0.3, 0.9, 0.36, 0.29, 0.48, 0.14, 0.54, 0.2, 0.26, 0.08, 0.18, 0.11],
  },
  {
    id: 'triangle',
    label: 'triangle',
    vector: [0.4, 0.9, 0.61, 0.32, 0.12, 0.77, 0.24, 0.51, 0.36, 0.18, 0.67, 0.05, 0.14, 0.23, 0.09, 0.12],
  },
  {
    id: 'hexagon',
    label: 'hexagon',
    vector: [0.11, 0.52, 0.25, 0.84, 0.62, 0.17, 0.76, 0.39, 0.55, 0.3, 0.48, 0.7, 0.11, 0.2, 0.27, 0.16],
  },
  {
    id: 'crescent',
    label: 'crescent',
    vector: [0.63, 0.28, 0.18, 0.15, 0.56, 0.25, 0.76, -0.1, 0.33, 0.54, -0.08, 0.62, 0.19, 0.07, 0.13, 0.24],
  },
  {
    id: 'scribble',
    label: 'scribble',
    vector: [0.32, 0.18, 0.24, 0.45, 0.58, -0.1, 0.68, 0.23, 0.49, 0.32, 0.72, 0.41, 0.07, 0.11, 0.53, 0.19],
  },
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getShapeProgressScore(currentVector: number[], targetVector: number[]): number {
  const vectorLength = Math.max(currentVector.length, targetVector.length, 1);
  let distanceSquared = 0;

  for (let index = 0; index < vectorLength; index += 1) {
    const currentValue = currentVector[index] ?? 0;
    const targetValue = targetVector[index] ?? 0;
    const delta = currentValue - targetValue;
    distanceSquared += delta * delta;
  }

  const distance = Math.sqrt(distanceSquared);
  const discoveryRadius = 1.35;
  const percent = 100 * (1 - distance / Math.max(discoveryRadius, 0.0001));

  return Math.round(clamp(percent, 0, 100));
}

export function getShapeMatchPercentages(
  currentVector: number[],
  candidates: ShapeVectorCandidate[],
): Record<string, number> {
  if (candidates.length === 0) {
    return {};
  }

  const distances = candidates.map(({ vector }) => {
    let distanceSquared = 0;
    for (let index = 0; index < Math.max(currentVector.length, vector.length); index += 1) {
      const delta = (currentVector[index] ?? 0) - (vector[index] ?? 0);
      distanceSquared += delta * delta;
    }
    return Math.sqrt(distanceSquared);
  });
  const minimumDistance = Math.min(...distances);
  const weights = distances.map((distance) => 1 / Math.max(distance, 0.000001));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const roundedPercentages = weights.map((weight) => Math.round((weight / totalWeight) * 100));
  const closestIndex = distances.indexOf(minimumDistance);
  const roundedTotal = roundedPercentages.reduce((sum, percentage) => sum + percentage, 0);
  roundedPercentages[closestIndex] += 100 - roundedTotal;

  return Object.fromEntries(
    candidates.map(({ id }, index) => [id, roundedPercentages[index]]),
  );
}

export function getNearestShapePreset(currentVector: number[]): LevelTwoShapePreset {
  let nearestShape = LEVEL_TWO_SHAPE_PRESETS[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const shape of LEVEL_TWO_SHAPE_PRESETS) {
    let distanceSquared = 0;

    for (let index = 0; index < Math.max(currentVector.length, shape.vector.length); index += 1) {
      const currentValue = currentVector[index] ?? 0;
      const targetValue = shape.vector[index] ?? 0;
      const delta = currentValue - targetValue;
      distanceSquared += delta * delta;
    }

    const distance = Math.sqrt(distanceSquared);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestShape = shape;
    }
  }

  return nearestShape;
}

export function useLevelThreeEncoder() {
  const encoderRef = useRef<ort.InferenceSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadEncoderModel() {
      try {
        const [modelResponse, dataResponse] = await Promise.all([
          fetch('/models/encoder.onnx'),
          fetch('/models/encoder.onnx.data'),
        ]);
        const [modelBuffer, dataBuffer] = await Promise.all([
          modelResponse.arrayBuffer(),
          dataResponse.arrayBuffer(),
        ]);

        if (!isMounted) return;

        encoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(modelBuffer),
          {
            externalData: [
              {
                data: new Uint8Array(dataBuffer),
                path: 'encoder.onnx.data',
              },
            ],
          },
        );

        if (isMounted) setIsLoaded(true);
      } catch (error) {
        console.error('Level 3 encoder model failed to load:', error);
      }
    }

    loadEncoderModel();

    return () => {
      isMounted = false;
    };
  }, []);

  const encodeInputGrid = useCallback(async (inputGrid: number[][]): Promise<number[] | null> => {
    if (!encoderRef.current) {
      return null;
    }

    try {
      const flattened = new Float32Array(32 * 32);
      for (let row = 0; row < 32; row += 1) {
        for (let column = 0; column < 32; column += 1) {
          flattened[row * 32 + column] = 1 - (inputGrid[row]?.[column] ?? 0);
        }
      }

      const inputTensor = new ort.Tensor('float32', flattened, [1, 1, 32, 32]);
      const encoderResults = await encoderRef.current.run({ input_image: inputTensor });

      return Array.from(encoderResults.mu.data as Float32Array);
    } catch (error) {
      console.error('Level 3 input encoding error:', error);
      return null;
    }
  }, []);

  return { encodeInputGrid, isLoaded };
}

export function useLevelTwoVaeInference() {
  const decoderRef = useRef<ort.InferenceSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDecoderModel() {
      try {
        const decoderModelRes = await fetch('/models/decoder.onnx');
        const decoderModelBuf = await decoderModelRes.arrayBuffer();

        if (!isMounted) return;

        let externalData: { data: Uint8Array; path: string }[] | undefined;

        try {
          const decoderDataRes = await fetch('/models/decoder.onnx.data');
          const decoderDataBuf = await decoderDataRes.arrayBuffer();

          externalData = [
            {
              data: new Uint8Array(decoderDataBuf),
              path: 'decoder.onnx.data',
            },
          ];
        } catch {
          externalData = undefined;
        }

        decoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(decoderModelBuf),
          externalData ? { externalData } : undefined
        );

        setIsLoaded(true);
      } catch (error) {
        console.error('Level 2 decoder model failed to load:', error);
      }
    }

    loadDecoderModel();

    return () => {
      isMounted = false;
    };
  }, []);

  const runLevelTwoInference = useCallback(async (latentVector: number[]): Promise<LevelTwoInferenceResult | null> => {
    if (!decoderRef.current || latentVector.length !== 16) {
      return null;
    }

    try {
      const sanitizedVector = latentVector.map((value) => Number.isFinite(value) ? Number(value) : 0);
      const zTensor = new ort.Tensor('float32', new Float32Array(sanitizedVector), [1, 16]);
      const decoderResults = await decoderRef.current.run({ latent_z: zTensor });
      const outputData = decoderResults.output_image.data as Float32Array;

      const outputMatrix: number[][] = Array.from({ length: 32 }, () => Array(32).fill(0));

      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
          const modelValue = outputData[r * 32 + c];
          const strokeAlpha = Math.max(0, Math.min(1, 1.0 - modelValue));
          outputMatrix[r][c] = strokeAlpha < 0.15 ? 0 : strokeAlpha;
        }
      }

      return { outputMatrix, latentVector: sanitizedVector };
    } catch (error) {
      console.error('Level 2 latent inference error:', error);
      return null;
    }
  }, []);

  return { isLoaded, runLevelTwoInference };
}
