import { useCallback, useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export interface LevelTwoInferenceResult {
  outputMatrix: number[][];
  latentVector: number[];
}

export const INITIAL_LEVEL_TWO_VECTOR = Array.from({ length: 16 }, () => 0);

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
