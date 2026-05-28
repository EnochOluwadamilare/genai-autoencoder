import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export default function VaeAnimation({ isTriggered, onComplete, children }) {
  // Animation controllers for each distinct section
  const leftCanvasControls = useAnimation();
  const centerCubeControls = useAnimation();
  const rightCanvasControls = useAnimation();
  const flowLineControls = useAnimation();

  useEffect(() => {
    if (isTriggered) {
      runVaePipeline();
    }
  }, [isTriggered]);

  const runVaePipeline = async () => {
    // RESET ALL STATES
    await Promise.all([
      leftCanvasControls.set({ scale: 1, boxShadow: "0px 0px 0px rgba(56, 189, 248, 0)" }),
      centerCubeControls.set({ scale: 1, filter: "drop-shadow(0px 0px 0px rgba(255,255,255,0))" }),
      rightCanvasControls.set({ scale: 0, opacity: 0, boxShadow: "0px 0px 0px rgba(168, 85, 247, 0)" }),
      flowLineControls.set({ pathLength: 0, opacity: 0 })
    ]);

    // 1. INPUT BORDER GLOW
    await leftCanvasControls.start({
      boxShadow: "0px 0px 25px 4px rgba(56, 189, 248, 0.7)",
      transition: { duration: 0.4 }
    });

    // 2. SHRINKING ANIMATION (Encoding toward center)
    await leftCanvasControls.start({
      scale: 0.1,
      x: 180, // Adjust based on your layout spacing
      y: 0,
      opacity: 0.3,
      transition: { duration: 0.8, ease: "anticipate" }
    });

    // 3. FLOW PULSE ANIMATION (Energy flows & Center Cube pulses)
    // We run flow lines and the cube pulse simultaneously
    await Promise.all([
      flowLineControls.start({
        pathLength: 1,
        opacity: [0, 1, 0],
        transition: { duration: 0.6, ease: "linear" }
      }),
      centerCubeControls.start({
        scale: [1, 1.25, 1],
        filter: [
          "drop-shadow(0px 0px 0px rgba(34, 211, 238, 0))",
          "drop-shadow(0px 0px 20px rgba(34, 211, 238, 1))",
          "drop-shadow(0px 0px 0px rgba(34, 211, 238, 0))"
        ],
        transition: { duration: 0.8, ease: "easeInOut" }
      })
    ]);

    // Reset left canvas seamlessly in the background for the next run
    leftCanvasControls.set({ scale: 1, x: 0, opacity: 1, boxShadow: "0px 0px 0px rgba(0,0,0,0)" });

    // 4. MAXIMIZATION ANIMATION (Decoding away from center)
    // Start small at the center and expand outward
    rightCanvasControls.set({ x: -180, scale: 0.1, opacity: 1 });
    await rightCanvasControls.start({
      scale: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    });

    // 5. OUTPUT BORDER GLOW
    await rightCanvasControls.start({
      boxShadow: [
        "0px 0px 0px 0px rgba(168, 85, 247, 0)",
        "0px 0px 25px 6px rgba(168, 85, 247, 0.8)",
        "0px 0px 10px 2px rgba(168, 85, 247, 0.3)"
      ],
      transition: { duration: 0.6 }
    });

    // Callback to let parent application know the process is finished
    if (onComplete) onComplete();
  };

  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto p-8 bg-slate-900 rounded-2xl overflow-hidden relative select-none">
      
      {/* LEFT: INPUT CANVAS */}
      <motion.div 
        animate={leftCanvasControls}
        className="w-40 h-40 bg-slate-800 rounded-xl border border-sky-500/30 flex flex-col items-center justify-center relative z-10 p-4"
      >
        <span className="text-xs font-semibold tracking-wider text-sky-400 mb-2 uppercase">Input</span>
        {children?.[0] || <div className="text-3xl">📐🔴🔵</div>}
      </motion.div>

      {/* SVG CONNECTIONS & FLOW LINES */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        {/* Left-to-Center static guide path */}
        <path d="M 180, 112 H 380" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="2" strokeDasharray="4 4" />
        {/* Right-to-Center static guide path */}
        <path d="M 460, 112 H 660" stroke="rgba(168, 85, 247, 0.15)" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Animated Pulse Path */}
        <motion.path 
          d="M 180, 112 H 420 H 660" 
          stroke="url(#pulseGradient)" 
          strokeWidth="3" 
          fill="none"
          animate={flowLineControls}
        />
        
        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      {/* CENTER: LATENT SPACE CUBE */}
      <motion.div 
        animate={centerCubeControls}
        className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex flex-col items-center justify-center shadow-lg border border-cyan-300/40 z-20 relative cursor-pointer"
      >
        {/* Sparkle icon representation */}
        <svg className="w-8 h-8 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
        </svg>
        <span className="text-[10px] text-cyan-100 font-bold mt-1 tracking-tight">Latent (Z)</span>
      </motion.div>

      {/* RIGHT: OUTPUT CANVAS */}
      <motion.div 
        animate={rightCanvasControls}
        className="w-40 h-40 bg-slate-800 rounded-xl border border-purple-500/30 flex flex-col items-center justify-center relative z-10 p-4"
        style={{ opacity: 0, scale: 0 }} // Initial state hidden before first run
      >
        <span className="text-xs font-semibold tracking-wider text-purple-400 mb-2 uppercase">Output</span>
        {children?.[1] || <div className="text-3xl">📐🔺🔷</div>}
      </motion.div>

    </div>
  );
}