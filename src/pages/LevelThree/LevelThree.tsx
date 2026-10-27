import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import style from './style.module.css';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type VAEStage } from '../../components/LatentSpace/LatentSpaceSVG';
import PixelCanvas from '../../components/PixelCanvas/PixelCanvas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClarityDisplay } from '../../components/ClarityDisplay/ClarityDisplay';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { LatentVector } from '../../components/LatentSpace/LatentVector/LatentVector';
import type { ClarityMetrics } from '../../hooks/useVaeInference';
import {
    getNearestShapePreset,
    getShapeProgressScore,
    INITIAL_LEVEL_TWO_VECTOR,
    LEVEL_TWO_SHAPE_PRESETS,
    useLevelTwoVaeInference,
} from './useVaeInference';

type SavedShape = {
    name: string;
    vector: number[];
    outputGrid: number[][];
};

function LevelThree() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const [currentStage, setCurrentStage] = useState<VAEStage>("resting");
    const [latentVector, setLatentVector] = useState<number[]>(INITIAL_LEVEL_TWO_VECTOR);
    const [latentVectorResetKey, setLatentVectorResetKey] = useState(0);
    const [outputGridData, setOutputGridData] = useState<number[][] | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [shapeName, setShapeName] = useState('');
    const [savedShapes, setSavedShapes] = useState<SavedShape[]>([]);
    const [discoveredShapeIds, setDiscoveredShapeIds] = useState<string[]>([]);
    const { runLevelTwoInference, isLoaded } = useLevelTwoVaeInference();

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

    const saveDiscoveredShape = () => {
        if (!shapeName.trim() || !outputGridData) {
            return;
        }

        setSavedShapes((currentShapes) => [
            ...currentShapes,
            {
                name: shapeName.trim(),
                vector: [...latentVector],
                outputGrid: outputGridData.map((row) => [...row]),
            },
        ]);

        if (discoveredShapeIds.includes(targetShape.id)) {
            setShowSaveDialog(false);
            setShapeName('');
            return;
        }

        setDiscoveredShapeIds((currentShapes) => [...currentShapes, targetShape.id]);
        setShowSaveDialog(false);
        setShapeName('');
    };

    useEffect(() => {
        if (progressScore >= 70 && !discoveredShapeIds.includes(targetShape.id)) {
            setDiscoveredShapeIds((currentShapes) => {
                if (currentShapes.includes(targetShape.id)) {
                    return currentShapes;
                }

                return [...currentShapes, targetShape.id];
            });
        }
    }, [discoveredShapeIds, progressScore, targetShape.id]);
    
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
        setCurrentStage("resting");
        setLatentVector([...INITIAL_LEVEL_TWO_VECTOR]);
        setLatentVectorResetKey((currentKey) => currentKey + 1);
    };

    // This function gets called EVERY time the user draws/edits your input canvas
    const handleInputCanvasEdit = () => {
        // 1. Instantly reset everything back to "resting" if an animation was playing
        setCurrentStage("resting");
        clearActiveTimeline();

        // 2. Clear the previous 2-second countdown timer (The Debounce)
        if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        }

        // 3. Start a fresh 2-second countdown
        debounceTimerRef.current = setTimeout(() => {
            //Run the VAE model
            runAnimationOrchestration();
        }, 1000); // 2000 milliseconds = 2 seconds of zero user interaction
    };

    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        let isCancelled = false;

        const runDecoder = async () => {
            const result = await runLevelTwoInference(latentVector);
            if (!isCancelled && result) {
                setOutputGridData(result.outputMatrix);
            }
        };

        runDecoder();

        return () => {
            isCancelled = true;
        };
    }, [isLoaded, latentVector, runLevelTwoInference]);

    // Runs the complete step-by-step VAE animation from start to finish
    const runAnimationOrchestration = () => {
        // Stage A: Move to inputting highlighting mode
        setCurrentStage("inputting");

        // Stage B: Fly left shapes into the center box (Compression)
        const timer1 = setTimeout(() => {
        setCurrentStage("compressing");
        }, 500); // Wait briefly after highlight before flying inward

        // Stage C: The bottleneck cube pulses (Thinking)
        const timer2 = setTimeout(() => {
        setCurrentStage("thinking");
        }, 1700); // 500ms + 1200ms compression animation duration

        // Stage D: Reconstruct shapes out to the right side (Decoder)
        const timer3 = setTimeout(() => {
        setCurrentStage("reconstructing");
        }, 3300); // 1700ms + 800ms thinking pulse duration

        // Stage E: Safely return back to resting state
        const timer4 = setTimeout(() => {
        setCurrentStage("resting");
        // Optional: This is where you reveal your actual output canvas artwork!
        }, 4300); // 2500ms + 1000ms reconstruction duration + slight buffer

        // Keep track of timers so we can instantly kill them if the user edits the canvas mid-flight
        timelineTimersRef.current = [timer1, timer2, timer3, timer4];
    };

    return <div>
        {/* NAV BAR */}
        <AppBar onSave={() => {}}></AppBar>

        {/* TITLE AREA */}
        <section className={style.levelIntro}>
            <h2>Level 2</h2>
            <p>
                <span className={style.goalText}>Goal:</span>
                {' '}
                Draw on the Input canvas until your DNA Code/Latent Vector matches this target:
            </p>
            <div className={style.goalVector} aria-label="Random target latent vector">
                {target.vector.map((value, index) => (
                    <span key={index}>D{index + 1}: {value.toFixed(2)}</span>
                ))}
            </div>
            <ClarityDisplay metrics={metrics} />
            <ProgressBar value={progressScore} showPercentage={false}/>
        </section>

        {/* GAME AREA */}
        <section className={style.gameArea}>
            {/* INPUT */}
            <div className={style.panelColumn}>
                <h3>Input</h3>
                <PixelCanvas onChange={handleInputCanvasEdit} rows={32} cols={32} cellSize={12} />
            </div>

            {/* LATENT */}
            <div className={style.latentColumn}>
                {/* <LatentSpaceSVGWC stage={currentStage}></LatentSpaceSVGWC> */}
                <LatentVector
                    key={latentVectorResetKey}
                    stage={currentStage}
                    onValueChange={(index, value) => {
                        setLatentVector((prev) => {
                            const nextVector = [...prev];
                            nextVector[index] = Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
                            return nextVector;
                        });
                    }}
                />
            </div>

            {/* OUTPUT */}
            <div className={style.panelColumn}>
                <h3>Output {isLoaded ? ' ' : '(Loading Models...)'}</h3>
                <PixelCanvas rows={32} cols={32} cellSize={12} readOnly grid={outputGridData} injectedStyle={{ pointerEvents: 'none', opacity: 0.4 }} />
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
                onClick={() => navigate('/level-3')}>
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

        <Dialog
            open={showSaveDialog}
            onClose={() => setShowSaveDialog(false)}
            aria-labelledby="level-2-save-title"
            fullWidth
            maxWidth="md"
        >
            <DialogTitle id="level-2-save-title">Save discovered shape</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    fullWidth
                    margin="dense"
                    label="Shape name"
                    value={shapeName}
                    onChange={(event) => setShapeName(event.target.value)}
                    inputProps={{ maxLength: 60 }}
                />
                <div className={style.savePreview}>
                    <section className={style.savePreviewSection}>
                        <h3>DNA Code/ Latent vector</h3>
                        <div className={style.latentValues}>
                            {latentVector.map((value, index) => (
                                <div className={style.latentValue} key={index}>
                                    <span>z{index + 1}</span>
                                    <strong>{value.toFixed(1)}</strong>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className={style.savePreviewSection}>
                        <h3>Output image</h3>
                        {outputGridData ? (
                            <PixelCanvas rows={32} cols={32} cellSize={8} readOnly grid={outputGridData} />
                        ) : (
                            <p role="status">Output image is loading…</p>
                        )}
                    </section>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                <Button
                    onClick={saveDiscoveredShape}
                    disabled={!shapeName.trim() || !outputGridData}
                    variant="contained"
                >
                    Save shape
                </Button>
            </DialogActions>
        </Dialog>
    </div>;
}

export default LevelThree;