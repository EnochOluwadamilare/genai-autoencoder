import { LangSelect, PercentageBar } from '@genai-fi/base';
import { Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import style from './style.module.css';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { color } from 'framer-motion';
import {LatentSpaceSVG, type VAEStage} from "../../components/LatentSpace/LatentSpaceSVG";
import PixelCanvas from '../../components/PixelCanvas/PixelCanvas';
import { useRef, useState } from 'react';
import { ClarityDisplay } from '../../components/ClarityDisplay/ClarityDisplay';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';

function LevelOne() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const [aiClarityScore, setAiClarityScore] = useState<number>(3.4);
    const [progressScore, setProgressScore] = useState<number>(40.4);
    const [currentStage, setCurrentStage] = useState<VAEStage>("resting");
    // Create refs to keep track of our active timers
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timelineTimersRef = useRef<NodeJS.Timeout[]>([]);
    // Clear any running animation timeline timers
    const clearActiveTimeline = () => {
        timelineTimersRef.current.forEach((timer) => clearTimeout(timer));
        timelineTimersRef.current = [];
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
        <AppBar onSave={null}></AppBar>

        {/* TITLE AREA */}
        <section className={style.levelIntro}>
            <h2>Level 1</h2>
            <p>
                <span className={style.goalText}>Goal:</span>
                {' '}
                Can you guess what the AI learned?
                Adjust the Input until the Output picture makes sense.
            </p>
            <ClarityDisplay score={aiClarityScore} />
            {/* <PercentageBar colour={'blue'} value={26}></PercentageBar> */}
            <ProgressBar value={progressScore} showPercentage={false}/>
        </section>

        {/* GAME AREA */}
        <section className={style.gameArea}>
            {/* INPUT */}
            <div className={style.panelColumn}>
                <h3>Input</h3>
                <PixelCanvas onChange={handleInputCanvasEdit} rows={12} cols={12} cellSize={30} />
                {/* <div className={style.canvasPanel}></div> */}
            </div>

            {/* LATENT */}
            <div className={style.latentColumn}>
                <LatentSpaceSVG stage={currentStage}></LatentSpaceSVG>
            </div>

            {/* OUTPUT */}
            <div className={style.panelColumn}>
                <h3>Output</h3>
                <PixelCanvas rows={12} cols={12} cellSize={30} />
                {/* <div className={style.outputPanel}>
                    <img
                        src="/placeholder-image.png"
                        alt="output"
                        className={style.outputImage}
                    />
                </div> */}
            </div>
        </section>

        {/* ACTION BUTTONS */}
        <section className={style.bottomActions}>
            <Button
                variant="outlined"
                onClick={() => navigate('/level-1')}
                style={{color:"#008298", borderColor: "#008298"}}
            >
                {t('home.actions.reset')}
            </Button>

            <Button
                variant="outlined"
                style={{color:"#008298", borderColor: "#008298"}}
                // onClick={runSimulation}
                >
                Hint 👁️
            </Button>

            <Button
                variant="outlined"
                style={{color:"#008298", borderColor: "#008298"}}
                onClick={() => navigate('/level-2')}>
                Submit
            </Button>
        </section>
    </div>;
}

export default LevelOne;