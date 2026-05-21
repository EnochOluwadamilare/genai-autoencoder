import React from 'react';
import style from './ProgressBar.module.css';

type ProgressBarProps = {
  /** A number between 0 and 100 representing the current AI progress */
  value: number;
  showPercentage?: boolean;
};

export function ProgressBar({ value, showPercentage=true}: ProgressBarProps) {
  // Ensure the value stays safely between 0% and 100%
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={style.progressSection}>
      <span>Progress:</span>
      
      {/* Accessibility wrapper for screen readers */}
      <div 
        className={style.progressBar}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div 
          className={style.progressFill} 
          /* Dynamically override the static width with the real-time score */
          style={{ width: `${clampedValue}%` }} 
        />
      </div>

      {showPercentage && (
        <span style={{ minWidth: '45px', fontSize: '0.9rem', color: '#475569' }}>
            {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}