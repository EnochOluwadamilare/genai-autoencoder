import React from 'react';
import style from './ClarityDisplay.module.css';


type ClarityDisplayProps = {
  // Accepts a rating from 0 to 5 (e.g., 2.5 or 4)
  score: number; 
};

export function ClarityDisplay({ score }: ClarityDisplayProps) {
    // 1. Round the score to the nearest whole number for star counting
    const totalStars = 5;
    const filledStarsCount = Math.round(score);

    // 2. Dynamic status text mapping based on the rounded score
    const getStatusText = (roundedScore: number) => {
        switch (roundedScore) {
        case 0: return "Blurry static...";
        case 1: return "Unrecognizable shapes.";
        case 2: return "Something is forming...";
        case 3: return "Getting clearer!";
        case 4: return "Highly recognizable shape.";
        case 5: return "Perfect reconstruction!";
        default: return "Analyzing latent data...";
        }
    };

    return (
    <div className={style.claritySection}>
      <span>Clarity:</span>

      <div className={style.stars} aria-label={`Clarity rating: ${score} out of 5 stars`}>
        {/* 3. Create an array of 5 elements to loop over */}
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
        {getStatusText(filledStarsCount)}
      </span>
    </div>
  );
}