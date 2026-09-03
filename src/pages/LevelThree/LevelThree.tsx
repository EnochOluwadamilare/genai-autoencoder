import { Button, Slider, Typography, Box } from '@mui/material';
import style from './style.module.css';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LatentSpaceSVG, type VAEStage } from "../../components/LatentSpace/LatentSpaceSVG";
import PixelCanvas from '../../components/PixelCanvas/PixelCanvas';
import { useRef, useState } from 'react';
import { ClarityDisplay } from '../../components/ClarityDisplay/ClarityDisplay';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { useVaeInferenceAlpha, type ClarityMetrics } from '../../hooks/useVaeInference';

function LevelThree() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    
    // UI Game score states
    const [aiClarityScore, setAiClarityScore] = useState<number>(3.4);
    const [progressScore, setProgressScore] = useState<number>(40.4);
    const [currentStage, setCurrentStage] = useState<VAEStage>("resting");
    const [metrics, setMetrics] = useState<ClarityMetrics | null>(null);

    // Strategy 3: Interactive UI Bias Scale (1.0 = Default Auto-Adaptive, 0.0 - 2.0 multiplier)
    const [biasUserScale, setBiasUserScale] = useState<number>(1.0);
    const [activeAlpha, setActiveAlpha] = useState<number>(0.0);

    // Canvas matrix states
    const [inputGridData, setInputGridData] = useState<number[][] | null>(null);
    const [outputGridData, setOutputGridData] = useState<number[][] | null>(null);

    // ONNX Inference Hook
    const { runInferenceWithBias, isLoaded } = useVaeInferenceAlpha();

    // Timer refs
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timelineTimersRef = useRef<NodeJS.Timeout[]>([]);

    const clearActiveTimeline = () => {
        timelineTimersRef.current.forEach((timer) => clearTimeout(timer));
        timelineTimersRef.current = [];
    };

    // Called when user edits input canvas or adjusts bias slider
    const handleInputCanvasEdit = (gridMatrix?: number[][], newScale?: number) => {
        const matrixToUse = gridMatrix || inputGridData;
        const scaleToUse = newScale !== undefined ? newScale : biasUserScale;

        if (gridMatrix) setInputGridData(gridMatrix);

        setCurrentStage("resting");
        clearActiveTimeline();

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            runAnimationOrchestration(matrixToUse, scaleToUse);
        }, 800);
    };

    // Orchestrates LatentSpaceSVG animation sequence and runs model
    const runAnimationOrchestration = async (latestInputData: number[][] | null, scale: number) => {
        setCurrentStage("inputting");

        const timer1 = setTimeout(() => {
            setCurrentStage("compressing");
        }, 500);

        const timer2 = setTimeout(async () => {
            setCurrentStage("thinking");

            if (latestInputData && isLoaded) {
                const res = await runInferenceWithBias(latestInputData, scale);
                if (res) {
                    setOutputGridData(res.outputMatrix);
                    setActiveAlpha(res.computedAlpha);
                    
                    // Update Clarity Score based on active alpha alignment
                    const clarity = Math.min(5.0, Number((2.5 + res.computedAlpha * 1.1).toFixed(1)));
                    setAiClarityScore(clarity);
                }
            }
        }, 1700);

        const timer3 = setTimeout(() => {
            setCurrentStage("reconstructing");
        }, 3300);

        const timer4 = setTimeout(() => {
            setCurrentStage("resting");
        }, 4300);

        timelineTimersRef.current = [timer1, timer2, timer3, timer4];
    };

    return (
        <div>
            {/* NAV BAR */}
            <AppBar onSave={() => {}} />

            {/* TITLE AREA */}
            <section className={style.levelIntro}>
                <h2>Level 3</h2>
                <p>
                    <span className={style.goalText}>Goal:</span>
                    {' '}
                    Can you guess what the AI learned?
                    Adjust the Input or Bias intensity until the Output picture morphs.
                </p>
                <ClarityDisplay metrics={metrics} />
                <ProgressBar value={metrics?.progressPercentage ?? 0} showPercentage={false} />
            </section>

            {/* GAME AREA */}
            <section className={style.gameArea}>
                {/* INPUT CANVAS */}
                <div className={style.panelColumn}>
                    <h3>Input</h3>
                    <PixelCanvas 
                        onChange={(matrix) => handleInputCanvasEdit(matrix, biasUserScale)} 
                        rows={32} 
                        cols={32} 
                        cellSize={12} 
                    />
                </div>

                {/* LATENT SPACE SVG */}
                <div className={style.latentColumn}>
                    <LatentSpaceSVG stage={currentStage} />
                    
                    {/* Strategy 3: Dynamic Alpha & Interactive Slider Controls */}
                    <Box sx={{ width: '80%', margin: '12px auto', textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#008298', fontWeight: 'bold' }}>
                            AI Bias Intensity (α): {activeAlpha.toFixed(2)}
                        </Typography>
                        <Slider
                            value={biasUserScale}
                            min={0.0}
                            max={2.0}
                            step={0.1}
                            onChange={(_, val) => {
                                const newScale = val as number;
                                setBiasUserScale(newScale);
                                handleInputCanvasEdit(inputGridData || undefined, newScale);
                            }}
                            sx={{ color: '#008298' }}
                        />
                    </Box>
                </div>

                {/* OUTPUT CANVAS */}
                <div className={style.panelColumn}>
                    <h3>Output {isLoaded ? '⚡' : '(Loading Models...)'}</h3>
                    <PixelCanvas 
                        rows={32} 
                        cols={32} 
                        cellSize={12} 
                        readOnly 
                        grid={outputGridData} 
                    />
                </div>
            </section>

            {/* ACTION BUTTONS */}
            <section className={style.bottomActions}>
                <Button
                    variant="outlined"
                    onClick={() => {
                        setBiasUserScale(1.0);
                        navigate('/level-2');
                    }}
                    style={{ color: "#008298", borderColor: "#008298" }}
                >
                    {t('home.actions.reset')}
                </Button>

                <Button
                    variant="outlined"
                    style={{ color: "#008298", borderColor: "#008298" }}
                    onClick={() => {
                        // Boost scale for curved/stubborn shapes as a hint
                        const boostedScale = 1.5;
                        setBiasUserScale(boostedScale);
                        handleInputCanvasEdit(inputGridData || undefined, boostedScale);
                    }}
                >
                    Hint 👁️
                </Button>

                <Button
                    variant="outlined"
                    style={{ color: "#008298", borderColor: "#008298" }}
                    onClick={() => navigate('/level-4')}
                >
                    Submit
                </Button>
            </section>
        </div>
    );
}

export default LevelThree;