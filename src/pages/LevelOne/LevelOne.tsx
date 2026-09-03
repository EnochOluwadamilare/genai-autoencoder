import { LangSelect, PercentageBar } from '@genai-fi/base';
import { Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
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
import { ClarityProgressBar } from '../../components/ClarityDisplay/ClarityProgressBar';

function LevelOne() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const [aiClarityScore, setAiClarityScore] = useState<number>(3.4);
    // const [progressScore, setProgressScore] = useState<number>(40.4);
    const [currentStage, setCurrentStage] = useState<VAEStage>("resting");
    const [metrics, setMetrics] = useState<ClarityMetrics | null>(null);
    // const [clarityMetrics, setClarityMetrics] = useState<ClarityMetrics | null>(null);

    // Star bias strength (0.0 = no bias, 0.4 = subtle starish features, 1.0 = star)
    const [starBiasAlpha] = useState<number>(0.4);

    // Grid data states for input and reconstructed output
    const [inputGridData, setInputGridData] = useState<number[][] | null>(null);
    const [outputGridData, setOutputGridData] = useState<number[][] | null>(null);

    // Initialize ONNX inference hook
    const { runInferenceWithBias, isLoaded } = useVaeInferenceAlpha();

    // Refs for active animation timers
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timelineTimersRef = useRef<NodeJS.Timeout[]>([]);

    const clearActiveTimeline = () => {
        timelineTimersRef.current.forEach((timer) => clearTimeout(timer));
        timelineTimersRef.current = [];
    };

    // Triggered when user draws on input canvas
    const handleInputCanvasEdit = (gridMatrix?: number[][]) => {
        if (gridMatrix) {
            setInputGridData(gridMatrix);
        }

        setCurrentStage("resting");
        clearActiveTimeline();

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            runAnimationOrchestration(gridMatrix || inputGridData);
        }, 1000);
    };

    // Orchestrates LatentSpaceSVG timeline and executes browser VAE model
    const runAnimationOrchestration = async (latestInputData: number[][] | null) => {
        setCurrentStage("inputting");

        const timer1 = setTimeout(() => {
            setCurrentStage("compressing");
        }, 500);

        const timer2 = setTimeout(async () => {
            setCurrentStage("thinking");

            // Execute ONNX model + Latent Star Bias during 'thinking' stage
            if (latestInputData && isLoaded) {
                const reconstructedResult = await runInferenceWithBias(latestInputData, starBiasAlpha);
                if (reconstructedResult) {
                    setOutputGridData(reconstructedResult.outputMatrix);
                    setMetrics(reconstructedResult.metrics);
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
                <h2>Level 1</h2>
                <p>
                    <span className={style.goalText}>Goal:</span>
                    {' '}
                    Can you guess what the AI learned?
                    Adjust the Input until the Output picture makes sense.
                </p>
                {/* <ClarityProgressBar metrics={clarityMetrics} /> */}
                <ClarityDisplay metrics={metrics} />
                <ProgressBar value={metrics?.progressPercentage ?? 0} showPercentage={false} />
            </section>

            {/* GAME AREA */}
            <section className={style.gameArea}>
                {/* INPUT */}
                <div className={style.panelColumn}>
                    <h3>Input</h3>
                    <PixelCanvas 
                        onChange={(matrix) => handleInputCanvasEdit(matrix)} 
                        rows={32} 
                        cols={32} 
                        cellSize={12} 
                    />
                </div>

                {/* LATENT */}
                <div className={style.latentColumn}>
                    <LatentSpaceSVG stage={currentStage} />
                </div>

                {/* OUTPUT */}
                <div className={style.panelColumn}>
                    <h3>Output {isLoaded ? ' ' : '(Loading Models...)'}</h3>
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
                    onClick={() => navigate('/level-1')}
                    style={{ color: "#008298", borderColor: "#008298" }}
                >
                    {t('home.actions.reset')}
                </Button>

                <Button
                    variant="outlined"
                    style={{ color: "#008298", borderColor: "#008298" }}
                >
                    Hint 👁️
                </Button>

                <Button
                    variant="outlined"
                    style={{ color: "#008298", borderColor: "#008298" }}
                    onClick={() => navigate('/level-2')}
                >
                    Submit
                </Button>
            </section>
        </div>
    );
}

export default LevelOne;