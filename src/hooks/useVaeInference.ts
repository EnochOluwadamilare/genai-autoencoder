import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export interface ClarityMetrics {
  clarityPercentage: number; // 0 to 100
  starRating: number;        // 1 to 5 stars
  feedbackText: string;      // Dynamic feedback message
  hint: string;              // Shape hint for the user
}

export interface Level1InferenceResult {
  outputMatrix: number[][];
  metrics: ClarityMetrics;
}

export interface Level3InferenceResult {
  outputMatrix: number[][];
  computedAlpha: number;
  baseAlpha: number;
  latentNorm: number;
  metrics: ClarityMetrics;
}

/**
 * Computes cosine similarity between two 1D vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateClarityMetrics(
  inputMatrix: number[][],
  muData: number[] | null,
  vStar: number[] | null
): ClarityMetrics {
  let activePixels = 0;
  let minR = 32, maxR = -1, minC = 32, maxC = -1;
  const size = inputMatrix.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (inputMatrix[r][c] > 0.15) {
        activePixels++;
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  if (activePixels < 12 || !muData || !vStar) {
    return getMetricResult(0);
  }

  const width = maxC - minC + 1;
  const height = maxR - minR + 1;
  const boundingArea = width * height;

  // 1. Detect Outer Tip Extremes (Dynamic relative bounding instead of hardcoded coordinates)
  let tipHits = 0;
  const centerR = (minR + maxR) / 2;
  const centerC = (minC + maxC) / 2;

  // Check top, bottom-left, bottom-right, side-left, side-right points relative to bounding box
  if (minR < 12) tipHits++;
  if (maxR > 20 && minC < centerC - 3) tipHits++;
  if (maxR > 20 && maxC > centerC + 3) tipHits++;
  if (minC < 10 && Math.abs(centerR - 16) < 8) tipHits++;
  if (maxC > 21 && Math.abs(centerR - 16) < 8) tipHits++;

  // 2. Cosine Similarity on Latent Mu Vector
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < muData.length; i++) {
    dotProduct += muData[i] * vStar[i];
    normA += muData[i] * muData[i];
    normB += vStar[i] * vStar[i];
  }
  const cosSim = normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;

  // 3. Score Mapping Rule
  let finalScore = 0;

  if (tipHits >= 4 || cosSim > 0.70) {
    // 5-Point Star (Outline or Solid) -> Bullseye Target
    finalScore = Math.max(90, Math.min(98, Math.round(75 + cosSim * 25)));
  } else if (tipHits === 3 || cosSim > 0.55) {
    // 4-Point Star / Pentagon -> 75%
    finalScore = 75;
  } else if (boundingArea > 150 && width / height >= 0.65 && width / height <= 1.5) {
    // Square, Circle, Oval -> 55-60%
    finalScore = 60;
  } else {
    // Scribbles / Arbitrary shapes -> Below 50%
    finalScore = Math.max(0, Math.min(48, Math.round(cosSim * 60)));
  }

  return getMetricResult(finalScore);
}

function getMetricResult(rawPercentage: number): ClarityMetrics {
  let starRating = 1;
  let feedbackText = 'Unrecognizable shapes.';
  let hint = 'Start with simple sharp shapes like a Square, Box, Circle, or Plus (+) symbol!';

  if (rawPercentage >= 75) {
    starRating = 5;
    feedbackText = 'Bullseye! Now you know what shape the AI was trained on.';
    hint = 'Outstanding! You achieved a clear shape guess!';
  } else if (rawPercentage >= 58) {
    starRating = 4;
    feedbackText = 'Opps! You almost got it';
    hint = 'Almost there! You are very close to the shape the AI was trained on!';
  } else if (rawPercentage >= 40) {
    starRating = 3;
    feedbackText = 'Getting clearer!';
    hint = 'Its getting clearer! keep trying some more shapes.';
  } else if (rawPercentage >= 22) {
    starRating = 2;
    feedbackText = 'Something is forming...';
    hint = 'Morphing started! Try adding sharp diagonal strokes until the outline is clear.';
  }

  return {
    clarityPercentage: rawPercentage,
    starRating,
    feedbackText,
    hint,
  };
}

export function calculateAdaptiveBaseAlpha(muData: number[]): { baseAlpha: number; l2Norm: number } {
  const l2Norm = Math.sqrt(muData.reduce((sum, val) => sum + val * val, 0));

  let baseAlpha = 1.0;
  if (l2Norm > 14.0) {
    baseAlpha = 1.8;
  } else if (l2Norm > 10.0) {
    baseAlpha = 1.2;
  } else {
    baseAlpha = 0.85;
  }

  return { baseAlpha, l2Norm };
}

// --- Hook for Level 1 ---

export function useVaeInference() {
  const encoderRef = useRef<ort.InferenceSession | null>(null);
  const decoderRef = useRef<ort.InferenceSession | null>(null);
  const vStarRef = useRef<number[] | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadModelsAndBias() {
      try {
        const res = await fetch('/models/v_star.json');
        const data = await res.json();
        vStarRef.current = data.v_star;

        const [
          encoderModelRes,
          encoderDataRes,
          decoderModelRes,
          decoderDataRes
        ] = await Promise.all([
          fetch('/models/encoder.onnx'),
          fetch('/models/encoder.onnx.data'),
          fetch('/models/decoder.onnx'),
          fetch('/models/decoder.onnx.data'),
        ]);

        const [
          encoderModelBuf,
          encoderDataBuf,
          decoderModelBuf,
          decoderDataBuf
        ] = await Promise.all([
          encoderModelRes.arrayBuffer(),
          encoderDataRes.arrayBuffer(),
          decoderModelRes.arrayBuffer(),
          decoderDataRes.arrayBuffer()
        ]);

        encoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(encoderModelBuf),
          { externalData: [{ data: new Uint8Array(encoderDataBuf), path: 'encoder.onnx.data' }] }
        );

        decoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(decoderModelBuf),
          { externalData: [{ data: new Uint8Array(decoderDataBuf), path: 'decoder.onnx.data' }] }
        );

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize ONNX VAE models:', err);
      }
    }
    loadModelsAndBias();
  }, []);

  const runInferenceWithBias = async (
    inputMatrix: number[][],
    alpha: number = 2.0
  ): Promise<Level1InferenceResult | null> => {
    if (!isLoaded || !encoderRef.current || !decoderRef.current || !vStarRef.current) {
      return null;
    }

    try {
      const flattened = new Float32Array(32 * 32);
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
          const rawVal = inputMatrix[r][c];
          flattened[r * 32 + c] = 1.0 - rawVal;
        }
      }

      const inputTensor = new ort.Tensor('float32', flattened, [1, 1, 32, 32]);
      const encoderResults = await encoderRef.current.run({ input_image: inputTensor });
      const muData = Array.from(encoderResults.mu.data as Float32Array);

      // Latent-based classification evaluation
      const metrics = calculateClarityMetrics(inputMatrix, muData, vStarRef.current);

      const biasedZ = new Float32Array(muData.length);
      for (let i = 0; i < muData.length; i++) {
        biasedZ[i] = muData[i] + alpha * vStarRef.current[i];
      }

      const zTensor = new ort.Tensor('float32', biasedZ, [1, 16]);
      const decoderResults = await decoderRef.current.run({ latent_z: zTensor });
      const outputData = decoderResults.output_image.data as Float32Array;

      const outputMatrix: number[][] = Array.from({ length: 32 }, () => Array(32).fill(0));
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
          const modelVal = outputData[r * 32 + c];
          const strokeAlpha = Math.max(0, Math.min(1, 1.0 - modelVal));
          outputMatrix[r][c] = strokeAlpha < 0.15 ? 0 : strokeAlpha;
        }
      }

      return { outputMatrix, metrics };
    } catch (err) {
      console.error('Inference Error:', err);
      return null;
    }
  };

  return { runInferenceWithBias, isLoaded };
}

// --- Hook for Level 3 ---

export function useVaeInferenceAlpha() {
  const encoderRef = useRef<ort.InferenceSession | null>(null);
  const decoderRef = useRef<ort.InferenceSession | null>(null);
  const vStarRef = useRef<number[] | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadModelsAndBias() {
      try {
        const res = await fetch('/models/v_star.json');
        const data = await res.json();
        vStarRef.current = data.v_star;

        const [
          encoderModelRes,
          encoderDataRes,
          decoderModelRes,
          decoderDataRes
        ] = await Promise.all([
          fetch('/models/encoder.onnx'),
          fetch('/models/encoder.onnx.data'),
          fetch('/models/decoder.onnx'),
          fetch('/models/decoder.onnx.data'),
        ]);

        const [
          encoderModelBuf,
          encoderDataBuf,
          decoderModelBuf,
          decoderDataBuf
        ] = await Promise.all([
          encoderModelRes.arrayBuffer(),
          encoderDataRes.arrayBuffer(),
          decoderModelRes.arrayBuffer(),
          decoderDataRes.arrayBuffer()
        ]);

        encoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(encoderModelBuf),
          { externalData: [{ data: new Uint8Array(encoderDataBuf), path: 'encoder.onnx.data' }] }
        );

        decoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(decoderModelBuf),
          { externalData: [{ data: new Uint8Array(decoderDataBuf), path: 'decoder.onnx.data' }] }
        );

        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize ONNX VAE models:', err);
      }
    }
    loadModelsAndBias();
  }, []);

  const runInferenceWithBias = async (
    inputMatrix: number[][],
    userScale: number = 1.0
  ): Promise<Level3InferenceResult | null> => {
    if (!isLoaded || !encoderRef.current || !decoderRef.current || !vStarRef.current) {
      return null;
    }

    try {
      const flattened = new Float32Array(32 * 32);
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
          const rawVal = inputMatrix[r][c];
          flattened[r * 32 + c] = 1.0 - rawVal;
        }
      }

      const inputTensor = new ort.Tensor('float32', flattened, [1, 1, 32, 32]);
      const encoderResults = await encoderRef.current.run({ input_image: inputTensor });
      const muData = Array.from(encoderResults.mu.data as Float32Array);

      // Latent-based classification evaluation
      const metrics = calculateClarityMetrics(inputMatrix, muData, vStarRef.current);

      const { baseAlpha, l2Norm } = calculateAdaptiveBaseAlpha(muData);
      const effectiveAlpha = baseAlpha * userScale;

      const biasedZ = new Float32Array(muData.length);
      for (let i = 0; i < muData.length; i++) {
        biasedZ[i] = muData[i] + effectiveAlpha * vStarRef.current[i];
      }

      const zTensor = new ort.Tensor('float32', biasedZ, [1, 16]);
      const decoderResults = await decoderRef.current.run({ latent_z: zTensor });
      const outputData = decoderResults.output_image.data as Float32Array;

      const outputMatrix: number[][] = Array.from({ length: 32 }, () => Array(32).fill(0));
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
          const modelVal = outputData[r * 32 + c];
          const strokeAlpha = Math.max(0, Math.min(1, 1.0 - modelVal));
          outputMatrix[r][c] = strokeAlpha < 0.15 ? 0 : strokeAlpha;
        }
      }

      return {
        outputMatrix,
        computedAlpha: effectiveAlpha,
        baseAlpha,
        latentNorm: l2Norm,
        metrics,
      };
    } catch (err) {
      console.error('Inference Error:', err);
      return null;
    }
  };

  return { runInferenceWithBias, isLoaded };
}