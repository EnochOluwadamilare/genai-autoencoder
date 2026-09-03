import React from 'react';
import style from './ClarityDisplay.module.css';
import { type ClarityMetrics } from '../../hooks/useVaeInference';

type ClarityDisplayProps = {
  metrics: ClarityMetrics | null;
};

export function ClarityDisplay({ metrics }: ClarityDisplayProps) {
  const totalStars = 5;
  const filledStarsCount = metrics?.starRating ?? 0;
  const feedbackText = metrics?.feedbackText ?? "Draw something!";

  return (
    <div className={style.claritySection}>
      <span>Clarity:</span>

      <div className={style.stars} aria-label={`Clarity rating: ${filledStarsCount} out of 5 stars`}>
        {Array.from({ length: totalStars }).map((_, index) => {
          const isActive = index < filledStarsCount;
          return (
            <span 
              key={index} 
              className={isActive ? style.starFilled : style.starEmpty}
            >
              {isActive ? '★' : '☆'}
            </span>
          );
        })}
      </div>

      <span className={style.statusText}>
        {feedbackText}
      </span>
    </div>
  );
}