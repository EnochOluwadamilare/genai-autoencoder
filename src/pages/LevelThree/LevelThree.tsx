import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import style from './style.module.css';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type VAEStage } from '../../components/LatentSpace/LatentSpaceSVG';
import PixelCanvas from '../../components/PixelCanvas/PixelCanvas';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClarityDisplay } from '../../components/ClarityDisplay/ClarityDisplay';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { LatentVector } from '../../components/LatentSpace/LatentVector/LatentVector';
import type { ClarityMetrics } from '../../hooks/useVaeInference';
import {
    getNearestShapePreset,
    getShapeMatchPercentages,
    getShapeProgressScore,
    INITIAL_LEVEL_TWO_VECTOR,
    LEVEL_TWO_SHAPE_PRESETS,
    useLevelThreeEncoder,
} from './useVaeInference';
import DiscoveredShapesClassification from '../../components/DiscoveredShapesClassification/DiscoveredShapesClassification';
import { useProgressStore } from '../../stores/progressStore';

type DiscoveredLevelTwoShape = {
    id: string;
    name: string;
    vector: number[];
    outputGrid: number[][] | null;
};

function LevelThree() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const [currentStage, setCurrentStage] = useState<VAEStage>("resting");
    const [latentVector, setLatentVector] = useState<number[]>(INITIAL_LEVEL_TWO_VECTOR);
    const [latentVectorResetKey, setLatentVectorResetKey] = useState(0);
    const [inputCanvasResetKey, setInputCanvasResetKey] = useState(0);
    const [inputGrid, setInputGrid] = useState<number[][] | null>(null);
    const [hasEncodedInput, setHasEncodedInput] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const latestInputEditRef = useRef(0);
    const levelTwoDiscoveredShapeIds = useProgressStore((state) => state.levelTwo.discoveredShapeIds);
    const savedShapes = useProgressStore((state) => state.levelTwo.savedShapes);
    const [levelThreeDiscoveredShapeIds, setLevelThreeDiscoveredShapeIds] = useState<string[]>([]);
    const discoveredShapeIds = useMemo(
        () => [...new Set([...levelTwoDiscoveredShapeIds, ...levelThreeDiscoveredShapeIds])],
        [levelThreeDiscoveredShapeIds, levelTwoDiscoveredShapeIds],
    );
    const { encodeInputGrid, isLoaded: isEncoderLoaded } = useLevelThreeEncoder();
    const discoveredShapes = useMemo<DiscoveredLevelTwoShape[]>(
        () => levelTwoDiscoveredShapeIds.reduce<DiscoveredLevelTwoShape[]>((shapes, id) => {
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
        [levelTwoDiscoveredShapeIds, savedShapes],
    );
    const shapeMatches = useMemo(
        () => {
            const percentages = hasEncodedInput
                ? getShapeMatchPercentages(latentVector, discoveredShapes)
                : {};
            return discoveredShapes
            .map((shape) => ({
                id: shape.id,
                label: shape.name,
                percentage: percentages[shape.id] ?? null,
                grid: shape.outputGrid,
            }))
            .sort((left, right) => (right.percentage ?? -1) - (left.percentage ?? -1));
        },
        [discoveredShapes, hasEncodedInput, latentVector],
    );

    const targetShape = useMemo(() => getNearestShapePreset(latentVector), [latentVector]);

    const progressScore = getShapeProgressScore(latentVector, targetShape.vector);

    const metrics = useMemo<ClarityMetrics>(() => {
        const discoveredCount = discoveredShapeIds.length;
        const starRating = Math.min(6, discoveredCount);

        return {
            clarityPercentage: Math.min(100, discoveredCount * 20 + progressScore * 0.2),
            progressPercentage: progressScore,
            starRating,
            feedbackText:
                discoveredCount === 0
                    ? 'No shapes discovered yet. Move closer to the current target.'
                    : `Discovered ${discoveredCount} shape${discoveredCount === 1 ? '' : 's'} so far.`,
            hint:
                discoveredCount === 0
                    ? `Try to match the ${targetShape.label} target and reach 70% to discover it.`
                    : `Current target: ${targetShape.label}. Aim for another match.`,
        };
    }, [discoveredShapeIds.length, progressScore, targetShape.label]);

    const canSubmit = metrics.starRating >= 4;

    // Create refs to keep track of our active timers
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timelineTimersRef = useRef<NodeJS.Timeout[]>([]);
    // Clear any running animation timeline timers
    const clearActiveTimeline = () => {
        timelineTimersRef.current.forEach((timer) => clearTimeout(timer));
        timelineTimersRef.current = [];
    };

    const handleReset = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        clearActiveTimeline();
        latestInputEditRef.current += 1;
        setInputGrid(null);
        setHasEncodedInput(false);
        setInputCanvasResetKey((currentKey) => currentKey + 1);
        setCurrentStage("resting");
        setLatentVector([...INITIAL_LEVEL_TWO_VECTOR]);
        setLatentVectorResetKey((currentKey) => currentKey + 1);
    };

    // This function gets called EVERY time the user draws/edits your input canvas
    const handleInputCanvasEdit = (inputGrid: number[][]) => {
        latestInputEditRef.current += 1;
        setInputGrid(inputGrid);
        setHasEncodedInput(false);
        setCurrentStage("resting");
        clearActiveTimeline();
    };

    const runAnimationOrchestration = useCallback(() => {
        setCurrentStage("inputting");

        const timer1 = setTimeout(() => {
            setCurrentStage("compressing");
        }, 500);

        const timer2 = setTimeout(() => {
            setCurrentStage("thinking");
        }, 1700);

        const timer3 = setTimeout(() => {
            setCurrentStage("reconstructing");
        }, 3300);

        const timer4 = setTimeout(() => {
            setCurrentStage("resting");
        }, 4300);

        timelineTimersRef.current = [timer1, timer2, timer3, timer4];
    }, []);

    useEffect(() => {
        if (!inputGrid || !isEncoderLoaded) {
            return;
        }

        const editId = latestInputEditRef.current;
        let isCancelled = false;
        const debounceTimer = setTimeout(async () => {
            runAnimationOrchestration();
            const encodedVector = await encodeInputGrid(inputGrid);
            if (!isCancelled && encodedVector && editId === latestInputEditRef.current) {
                setLatentVector(encodedVector);
                setHasEncodedInput(true);
            }
        }, 500);
        debounceTimerRef.current = debounceTimer;

        return () => {
            isCancelled = true;
            clearTimeout(debounceTimer);
        };
    }, [encodeInputGrid, inputGrid, isEncoderLoaded, runAnimationOrchestration]);

    useEffect(() => () => {
        latestInputEditRef.current += 1;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        timelineTimersRef.current.forEach((timer) => clearTimeout(timer));
    }, []);

    return <div>
        {/* NAV BAR */}
        <AppBar onSave={() => {}}></AppBar>

        {/* TITLE AREA */}
        <section className={style.levelIntro}>
            <h2>Level 2</h2>
            <p>
                <span className={style.goalText}>Goal:</span>
                {' '}
                Draw on the Input canvas and observe which of your discovered shape it is closest to.
            </p>
            <ClarityDisplay metrics={metrics} />
            <ProgressBar value={progressScore} showPercentage={false}/>
        </section>

        {/* GAME AREA */}
        <section className={style.gameArea}>
            {/* INPUT */}
            <div className={style.panelColumn}>
                <h3>Input</h3>
                <PixelCanvas
                    key={inputCanvasResetKey}
                    onChange={handleInputCanvasEdit}
                    rows={32}
                    cols={32}
                    cellSize={12}
                />
            </div>

            {/* LATENT */}
            <div className={style.latentColumn}>
                {!isEncoderLoaded && <p role="status">Loading the input encoder…</p>}
                {/* <LatentSpaceSVGWC stage={currentStage}></LatentSpaceSVGWC> */}
                <LatentVector
                    key={latentVectorResetKey}
                    stage={currentStage}
                    latentValues={latentVector}
                    onValueChange={(index, value) => {
                        const nextVector = [...latentVector];
                        nextVector[index] = Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
                        setLatentVector(nextVector);

                        const nextTarget = getNearestShapePreset(nextVector);
                        if (
                            getShapeProgressScore(nextVector, nextTarget.vector) >= 70
                            && !discoveredShapeIds.includes(nextTarget.id)
                        ) {
                            setLevelThreeDiscoveredShapeIds((currentShapes) =>
                                currentShapes.includes(nextTarget.id)
                                    ? currentShapes
                                    : [...currentShapes, nextTarget.id],
                            );
                        }
                    }}
                />
            </div>

            <div className={style.panelColumn}>
                <h3>Classification</h3>
                <DiscoveredShapesClassification shapes={shapeMatches} />
            </div>
        </section>

        {/* ACTION BUTTONS */}
        <section className={style.bottomActions}>
            <Button
                variant="outlined"
                onClick={handleReset}
                style={{color:"#008298", borderColor: "#008298"}}
            >
                {t('home.actions.reset')}
            </Button>

            <Button
                variant="outlined"
                style={{color:"#008298", borderColor: "#008298"}}
                onClick={() => setShowHint(true)}
                >
                Hint 👁️
            </Button>

            {/* <Button
                variant="outlined"
                style={{color:"#008298", borderColor: "#008298"}}
                onClick={() => setShowSaveDialog(true)}
                >
                Save Discovered Shape
            </Button> */}

            <Button
                variant="outlined"
                style={{color:"#008298", borderColor: "#008298"}}
                disabled={!canSubmit}
                onClick={() => navigate('/level-4')}>
                Submit
            </Button>
        </section>

        <Dialog open={showHint} onClose={() => setShowHint(false)} aria-labelledby="level-2-hint-title">
            <DialogTitle id="level-2-hint-title">Hint</DialogTitle>
            <DialogContent>
                <DialogContentText align="justify" sx={{ mb: 2 }}>
                    <strong>1. Watch the bars move:</strong> Look at your target DNA Code. As you draw, check which bars or numbers spike up or down. If the target requires a high value in a specific column, try altering your shape's traits—like making it wider, sharper, or adding more sides.
                </DialogContentText>
                <DialogContentText align="justify" sx={{ mb: 2 }}>
                    <strong>2.</strong> Think of each number like a tiny switch that controls one trait in the image. Small changes can make big differences, so watch carefully and look for patterns.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowHint(false)} autoFocus>
                    Close
                </Button>
            </DialogActions>
        </Dialog>

    </div>;
}

export default LevelThree;