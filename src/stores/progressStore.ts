import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LevelOneQuestionnaireAnswers = {
    category: string;
    shape: string;
};

export type LevelTwoSavedShape = {
    id: string;
    name: string;
    vector: number[];
    outputGrid: number[][];
};

type LevelOneProgress = {
    questionnaire: LevelOneQuestionnaireAnswers;
    inputGrid: number[][] | null;
    outputGrid: number[][] | null;
};

type LevelTwoProgress = {
    discoveredShapeIds: string[];
    savedShapes: LevelTwoSavedShape[];
};

type ProgressStore = {
    levelOne: LevelOneProgress;
    levelTwo: LevelTwoProgress;
    setLevelOneQuestionnaire: (answers: Partial<LevelOneQuestionnaireAnswers>) => void;
    setLevelOneInputGrid: (grid: number[][] | null) => void;
    setLevelOneOutputGrid: (grid: number[][] | null) => void;
    clearLevelOneImages: () => void;
    discoverLevelTwoShape: (shapeId: string) => void;
    saveLevelTwoShape: (shape: LevelTwoSavedShape) => void;
};

const initialLevelOneProgress: LevelOneProgress = {
    questionnaire: { category: '', shape: '' },
    inputGrid: null,
    outputGrid: null,
};

const initialLevelTwoProgress: LevelTwoProgress = {
    discoveredShapeIds: [],
    savedShapes: [],
};

export const useProgressStore = create<ProgressStore>()(
    persist(
        (set) => ({
            levelOne: initialLevelOneProgress,
            levelTwo: initialLevelTwoProgress,
            setLevelOneQuestionnaire: (answers) =>
                set((state) => ({
                    levelOne: {
                        ...state.levelOne,
                        questionnaire: { ...state.levelOne.questionnaire, ...answers },
                    },
                })),
            setLevelOneInputGrid: (inputGrid) =>
                set((state) => ({
                    levelOne: { ...state.levelOne, inputGrid },
                })),
            setLevelOneOutputGrid: (outputGrid) =>
                set((state) => ({
                    levelOne: { ...state.levelOne, outputGrid },
                })),
            clearLevelOneImages: () =>
                set((state) => ({
                    levelOne: { ...state.levelOne, inputGrid: null, outputGrid: null },
                })),
            discoverLevelTwoShape: (shapeId) =>
                set((state) => ({
                    levelTwo: {
                        ...state.levelTwo,
                        discoveredShapeIds: state.levelTwo.discoveredShapeIds.includes(shapeId)
                            ? state.levelTwo.discoveredShapeIds
                            : [...state.levelTwo.discoveredShapeIds, shapeId],
                    },
                })),
            saveLevelTwoShape: (shape) =>
                set((state) => ({
                    levelTwo: {
                        ...state.levelTwo,
                        savedShapes: [
                            ...state.levelTwo.savedShapes.filter((savedShape) => savedShape.id !== shape.id),
                            shape,
                        ],
                    },
                })),
        }),
        {
            name: 'genai-autoencoder-progress',
            storage: createJSONStorage(() => localStorage),
            partialize: ({ levelOne, levelTwo }) => ({ levelOne, levelTwo }),
        },
    ),
);