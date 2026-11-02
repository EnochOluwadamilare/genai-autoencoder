import { Button } from '@mui/material';
import style from './style.module.css';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { LatentVector } from '../../components/LatentSpace/LatentVector/LatentVector';
import type { VAEStage } from '../../components/LatentSpace/LatentSpaceSVG';
import PixelCanvas from '../../components/PixelCanvas/PixelCanvas';
import DiscoveredShapeInputSliders, {
    type DiscoveredShapeSliderItem,
} from '../../components/DiscoveredShapeInputSliders/DiscoveredShapeInputSliders';
import { useProgressStore } from '../../stores/progressStore';
import { LEVEL_TWO_SHAPE_PRESETS, useLevelTwoVaeInference } from '../LevelTwo/useVaeInference';
import { getShapeCompositionVector } from './shapeComposition';

function LevelFour() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const discoveredShapeIds = useProgressStore((state) => state.levelTwo.discoveredShapeIds);
    const savedShapes = useProgressStore((state) => state.levelTwo.savedShapes);
    const [percentages, setPercentages] = useState<Record<string, number>>({});
    const [currentStage, setCurrentStage] = useState<VAEStage>('resting');
    const [output, setOutput] = useState<{ vectorKey: string; grid: number[][] } | null>(null);
    const [inferenceError, setInferenceError] = useState<string | null>(null);
    const { runLevelTwoInference, isLoaded } = useLevelTwoVaeInference();

    const discoveredShapes = useMemo<DiscoveredShapeSliderItem[]>(
        () => discoveredShapeIds.reduce<DiscoveredShapeSliderItem[]>((shapes, id) => {
            const savedShape = savedShapes.find((shape) => shape.id === id);
            if (savedShape) {
                shapes.push(savedShape);
                return shapes;
            }

            const preset = LEVEL_TWO_SHAPE_PRESETS.find((shape) => shape.id === id);
            if (preset) {
                shapes.push({
                    id: preset.id,
                    name: preset.label,
                    vector: preset.vector,
                    outputGrid: null,
                });
            }

            return shapes;
        }, []),
        [discoveredShapeIds, savedShapes],
    );

    const compositionVector = useMemo(
        () => getShapeCompositionVector(discoveredShapes, percentages),
        [discoveredShapes, percentages],
    );
    const vectorKey = compositionVector?.join(',') ?? '';

    const handlePercentageChange = (shapeId: string, percentage: number) => {
        setPercentages((currentPercentages) => ({
            ...currentPercentages,
            [shapeId]: percentage,
        }));
        setInferenceError(null);
        setCurrentStage('thinking');
    };

    useEffect(() => {
        if (!compositionVector || !isLoaded) {
            return;
        }

        let isCancelled = false;
        let stageTimer: ReturnType<typeof setTimeout> | undefined;

        const decodeComposition = async () => {
            const result = await runLevelTwoInference(compositionVector);
            if (isCancelled) return;

            if (!result) {
                setInferenceError('The shape combination could not be generated.');
                setCurrentStage('resting');
                return;
            }

            setOutput({ vectorKey, grid: result.outputMatrix });
            setInferenceError(null);
            setCurrentStage('reconstructing');
            stageTimer = setTimeout(() => setCurrentStage('resting'), 1200);
        };

        decodeComposition();

        return () => {
            isCancelled = true;
            if (stageTimer) clearTimeout(stageTimer);
        };
    }, [compositionVector, isLoaded, runLevelTwoInference, vectorKey]);

    const handleReset = () => {
        setPercentages({});
        setOutput(null);
        setInferenceError(null);
        setCurrentStage('resting');
    };

    const currentOutput = output?.vectorKey === vectorKey ? output.grid : null;

    return (
        <div>
            <AppBar onSave={() => {}} />

            <section className={style.levelIntro}>
                <h2>Level 4</h2>
                <p>
                    <span className={style.goalText}>Goal:</span>
                    {' '}
                    Choose the proportions of your discovered shapes to create a combination.
                </p>
            </section>

            <section className={style.gameArea}>
                <div className={style.panelColumn}>
                    <h3>Input</h3>
                    <DiscoveredShapeInputSliders
                        shapes={discoveredShapes}
                        percentages={percentages}
                        onPercentageChange={handlePercentageChange}
                    />
                </div>

                <div className={style.latentColumn}>
                    <h3>Latent vector</h3>
                    <LatentVector
                        stage={currentStage}
                        latentValues={compositionVector ?? Array.from({ length: 16 }, () => 0)}
                        readOnly
                        width="320px"
                        height="420px"
                    />
                </div>

                <div className={style.panelColumn}>
                    <h3>Output</h3>
                    {isLoaded ? (
                        <PixelCanvas
                            rows={32}
                            cols={32}
                            cellSize={12}
                            readOnly
                            grid={currentOutput}
                        />
                    ) : (
                        <p role="status">Loading decoder…</p>
                    )}
                    {compositionVector && !currentOutput && isLoaded && (
                        <p role="status">Generating shape combination…</p>
                    )}
                    {inferenceError && <p role="alert">{inferenceError}</p>}
                </div>
            </section>

            <section className={style.bottomActions}>
                <Button
                    variant="outlined"
                    onClick={handleReset}
                    style={{ color: '#008298', borderColor: '#008298' }}
                >
                    {t('home.actions.reset')}
                </Button>

                <Button
                    variant="outlined"
                    style={{ color: '#008298', borderColor: '#008298' }}
                >
                    Hint 👁️
                </Button>

                <Button
                    variant="outlined"
                    style={{ color: '#008298', borderColor: '#008298' }}
                    onClick={() => navigate('/level-4')}
                >
                    Submit
                </Button>
            </section>
        </div>
    );
}

export default LevelFour;
