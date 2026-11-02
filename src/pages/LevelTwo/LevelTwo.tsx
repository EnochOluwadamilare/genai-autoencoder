import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import style from './style.module.css';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type VAEStage } from '../../components/LatentSpace/LatentSpaceSVG';
import PixelCanvas from '../../components/PixelCanvas/PixelCanvas';
import DiscoveredImages from '../../components/DiscoveredImages/DiscoveredImages';
import { useEffect, useMemo, useState } from 'react';
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
import { useProgressStore } from '../../stores/progressStore';

function LevelTwo() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const [currentStage, setCurrentStage] = useState<VAEStage>("resting");
    const [latentVector, setLatentVector] = useState<number[]>(INITIAL_LEVEL_TWO_VECTOR);
    const [latentVectorResetKey, setLatentVectorResetKey] = useState(0);
    const [outputGridData, setOutputGridData] = useState<number[][] | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [shapeName, setShapeName] = useState('');
    const savedShapes = useProgressStore((state) => state.levelTwo.savedShapes);
    const discoveredShapeIds = useProgressStore((state) => state.levelTwo.discoveredShapeIds);
    const discoverShape = useProgressStore((state) => state.discoverLevelTwoShape);
    const saveShape = useProgressStore((state) => state.saveLevelTwoShape);
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

        saveShape({
                id: targetShape.id,
                name: shapeName.trim(),
                vector: [...latentVector],
                outputGrid: outputGridData.map((row) => [...row]),
            });

        discoverShape(targetShape.id);
        setShowSaveDialog(false);
        setShapeName('');
    };

    useEffect(() => {
        if (progressScore >= 70 && !discoveredShapeIds.includes(targetShape.id)) {
            discoverShape(targetShape.id);
        }
    }, [discoverShape, discoveredShapeIds, progressScore, targetShape.id]);
    
    const handleReset = () => {
        setCurrentStage("resting");
        setLatentVector([...INITIAL_LEVEL_TWO_VECTOR]);
        setLatentVectorResetKey((currentKey) => currentKey + 1);
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

    return <div>
        {/* NAV BAR */}
        <AppBar onSave={() => {}}></AppBar>

        {/* TITLE AREA */}
        <section className={style.levelIntro}>
            <h2>Level 2</h2>
            <p>
                <span className={style.goalText}>Goal:</span>
                {' '}
                Now can you tweak the Latent Space to see what shapes or numbers the AI has learned, and how it affects the output?<br/>Adjust the DNA Code/ Latent vector until the decoder output makes sense.
            </p>
            {/* <ClarityDisplay metrics={metrics} /> */}
            {/* <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: '#008298' }}>Target shape: {targetShape.label}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    Discovered: {discoveredShapeIds.length}/{LEVEL_TWO_SHAPE_PRESETS.length} shapes
                </div>
            </div>
            <ProgressBar value={progressScore} showPercentage={false}/> */}
        </section>

        {/* GAME AREA */}
        <section className={style.gameArea}>
            <div className={style.panelColumn}>
                <h3>Images Discovered</h3>
                <DiscoveredImages
                    images={savedShapes.map((shape) => ({
                        name: shape.name,
                        grid: shape.outputGrid,
                    }))}
                />
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
                <PixelCanvas rows={32} cols={32} cellSize={12} readOnly grid={outputGridData} />
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

            <Button
                variant="outlined"
                style={{color:"#008298", borderColor: "#008298"}}
                onClick={() => setShowSaveDialog(true)}
                >
                Save Discovered Shape
            </Button>

            <Button
                variant="outlined"
                style={{ color: "#008298", borderColor: "#008298" }}
                sx={{
                    opacity: canSubmit ? 1 : 0.5,
                    '&.Mui-disabled': {
                        borderColor: '#a7b7bc',
                        color: '#6f7d85'
                    }
                }}
                disabled={!canSubmit}
                onClick={() => navigate('/level-3')}>
                Submit
            </Button>
        </section>

        <Dialog open={showHint} onClose={() => setShowHint(false)} aria-labelledby="level-2-hint-title">
            <DialogTitle id="level-2-hint-title">Hint</DialogTitle>
            <DialogContent>
                <DialogContentText align="justify" sx={{ mb: 2 }}>
                    <strong>1.</strong> Start by looking at each number as a hidden feature knob. Change only one value at a time and ask: Does the picture get taller, wider, rounder, sharper, brighter, or more stretched?
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

export default LevelTwo;