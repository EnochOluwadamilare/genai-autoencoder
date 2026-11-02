import React from 'react';
import { type ClarityMetrics } from '../../hooks/useVaeInference';

interface ClarityProgressBarProps {
  metrics: ClarityMetrics | null;
}

export const ClarityProgressBar: React.FC<ClarityProgressBarProps> = ({ metrics }) => {
  const percentage = metrics?.clarityPercentage ?? 0;
  const rating = metrics?.starRating ?? 1;
  const feedback = metrics?.feedbackText ?? 'Draw a shape to start!';
  const hint = metrics?.hint ?? 'Try drawing a Square, Box, or Plus (+)!';

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-slate-900/90 text-white rounded-xl shadow-lg border border-slate-700">
      {/* Top Row: Title & Percentage */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
          AI Clarity Score
        </span>
        <span className="text-lg font-bold text-cyan-400">{percentage}%</span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Star Rating Display */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-xl transition-colors duration-200 ${
                star <= rating ? 'text-amber-400 scale-110' : 'text-slate-600'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-xs font-medium text-slate-400">
          Tier {rating} / 5
        </span>
      </div>

      {/* Dynamic Feedback Message */}
      <p className="mt-3 text-sm font-medium text-slate-200 animate-pulse">
        {feedback}
      </p>

      {/* Dynamic Shape Hint Callout */}
      <div className="mt-2 p-2.5 bg-slate-800/80 rounded-lg border border-indigo-500/30 text-xs text-indigo-300 flex items-start space-x-2">
        <span className="text-base">💡</span>
        <span>
          <strong className="text-indigo-200">Hint: </strong>
          {hint}
        </span>
      </div>
    </div>
  );
};