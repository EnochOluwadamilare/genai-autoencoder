import { useState } from 'react';
import style from './style.module.css';

const categories = ['Numbers', 'Alphabets', 'animals', 'cars', 'shapes', 'stickman'];
const shapes = [
    'Squares',
    'Rectangles',
    '4 point Stars',
    '5 point stars',
    '5 point black star',
    'Circle',
    'Triangle',
];
const correctStarAnswers = new Set(['5 point stars', '5 point black star']);

function LevelOneQuestionnaire() {
    const [category, setCategory] = useState('');
    const [shape, setShape] = useState('');
    const isCorrect = category === 'shapes' && correctStarAnswers.has(shape);

    const handleCategoryChange = (value: string) => {
        setCategory(value);
        setShape('');
    };

    return (
        <section className={style.questionnaire} aria-labelledby="questionnaire-title">
            <h2 id="questionnaire-title">Questionnaire</h2>
            <div className={style.questionnaireContent}>
                <div className={style.questions} aria-hidden={isCorrect}>
                    <label className={style.question}>
                        <span>1. What is the AI good at?</span>
                        <select
                            value={category}
                            onChange={(event) => handleCategoryChange(event.target.value)}
                            disabled={isCorrect}
                        >
                            <option value="">Choose an answer</option>
                            {categories.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>

                    {category === 'shapes' && (
                        <label className={style.question}>
                            <span>2. What specific shape is it good at?</span>
                            <select
                                value={shape}
                                onChange={(event) => setShape(event.target.value)}
                                disabled={isCorrect}
                            >
                                <option value="">Choose an answer</option>
                                {shapes.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
                {isCorrect && (
                    <div className={style.correctOverlay} role="status" aria-live="polite">
                        CORRECT 🎉
                    </div>
                )}
            </div>
        </section>
    );
}

export default LevelOneQuestionnaire;
