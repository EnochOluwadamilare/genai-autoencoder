import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime Web to use WASM binaries from CDN or public root
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export function useVaeInference() {
  const encoderRef = useRef<ort.InferenceSession | null>(null);
  const decoderRef = useRef<ort.InferenceSession | null>(null);
  const vStarRef = useRef<number[] | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
    async function loadModelsAndBias() {
      try {
        // 1. Fetch v_star.json
        const res = await fetch('/models/v_star.json');
        const data = await res.json();
        vStarRef.current = data.v_star;

        // 2. Concurrently download all model topologies and data payloads
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

        // 3. Convert all network responses into ArrayBuffers correctly using await
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

        // 4. Initialize Encoder with its external weights data block
        encoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(encoderModelBuf),
          {
            externalData: [
              {
                data: new Uint8Array(encoderDataBuf),
                path: 'encoder.onnx.data',
              },
            ],
          }
        );

        // 5. Initialize Decoder with its external weights data block
        decoderRef.current = await ort.InferenceSession.create(
          new Uint8Array(decoderModelBuf),
          {
            externalData: [
              {
                data: new Uint8Array(decoderDataBuf),
                path: 'decoder.onnx.data',
              },
            ],
          }
        );

        setIsLoaded(true);
        console.log('VAE Models & Star Bias loaded successfully.');
      } catch (err) {
        console.error('Failed to initialize ONNX VAE models:', err);
      }
    }
    loadModelsAndBias();
  }, []);


  /**
   * Encodes 32x32 pixel array, applies Star Bias, and Decodes to 32x32 output matrix.
   */
  const runInferenceWithBias = async (
    inputMatrix: number[][],
    alpha: number = 1.0
  ): Promise<number[][] | null> => {
    if (!isLoaded || !encoderRef.current || !decoderRef.current || !vStarRef.current) {
      return null;
    }

    try {
      // 1. Flatten 32x32 matrix into Float32Array [1, 1, 32, 32]
      const flattened = new Float32Array(32 * 32);
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
            const rawVal = inputMatrix[r][c]; // 1.0 for black stroke, 0.0 for white
            flattened[r * 32 + c] = 1.0 - rawVal; // Maps 1 -> 0.0 (stroke), 0 -> 1.0 (bg)
        }
      }

      const inputTensor = new ort.Tensor('float32', flattened, [1, 1, 32, 32]);

      // 2. Run Encoder: get mu [1, 16]
      const encoderFeeds = { input_image: inputTensor };
      const encoderResults = await encoderRef.current.run(encoderFeeds);
      const muTensor = encoderResults.mu;
      const muData = Array.from(muTensor.data as Float32Array);

      // 3. Apply Latent Star Bias: z_biased = mu + alpha * v_star
      const biasedZ = new Float32Array(muData.length);
      for (let i = 0; i < muData.length; i++) {
        biasedZ[i] = muData[i] + alpha * vStarRef.current[i];
      }

      const zTensor = new ort.Tensor('float32', biasedZ, [1, 16]);

      // 4. Run Decoder: get output_image [1, 1, 32, 32]
      const decoderFeeds = { latent_z: zTensor };
      const decoderResults = await decoderRef.current.run(decoderFeeds);
      const outputData = decoderResults.output_image.data as Float32Array;

      // 5. Convert 1D float array back to 32x32 2D array for PixelCanvas
      const outputMatrix: number[][] = Array.from({ length: 32 }, () => Array(32).fill(0));
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 32; c++) {
            const modelVal = outputData[r * 32 + c]; // 0.0 = black stroke, 1.0 = background
            
            // Invert continuously to retain soft morphing gradients
            const strokeAlpha = Math.max(0, Math.min(1, 1.0 - modelVal));
            
            // Set low alpha values to 0 so background remains clean grid
            outputMatrix[r][c] = strokeAlpha < 0.15 ? 0 : strokeAlpha;
        }
      }

      return outputMatrix;
    } catch (err) {
      console.error('Inference Error:', err);
      return null;
    }
  };

  return { runInferenceWithBias, isLoaded };
}
