import { beforeEach, describe, expect, it } from 'vitest';

const storageValues = new Map<string, string>();
const testStorage: Storage = {
    get length() {
        return storageValues.size;
    },
    clear: () => storageValues.clear(),
    getItem: (key) => storageValues.get(key) ?? null,
    key: (index) => [...storageValues.keys()][index] ?? null,
    removeItem: (key) => storageValues.delete(key),
    setItem: (key, value) => storageValues.set(key, value),
};

Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: testStorage,
});

const { useProgressStore } = await import('./progressStore');

describe('progress store', () => {
    beforeEach(() => {
        testStorage.clear();
        useProgressStore.setState({
            levelOne: {
                questionnaire: { category: '', shape: '' },
                inputGrid: null,
                outputGrid: null,
            },
            levelTwo: {
                discoveredShapeIds: [],
                savedShapes: [],
            },
        });
    });

    it('persists Level One answers, input and output grids', () => {
        const grid = [[0, 1], [1, 0]];

        useProgressStore.getState().setLevelOneQuestionnaire({
            category: 'shapes',
            shape: '5 point stars',
        });
        useProgressStore.getState().setLevelOneInputGrid(grid);
        useProgressStore.getState().setLevelOneOutputGrid(grid);

        const persisted = JSON.parse(
            testStorage.getItem('genai-autoencoder-progress') ?? '{}',
        ) as {
            state: {
                levelOne: {
                    questionnaire: { category: string };
                    inputGrid: number[][];
                    outputGrid: number[][];
                };
            };
        };

        expect(persisted.state.levelOne.questionnaire.category).toBe('shapes');
        expect(persisted.state.levelOne.inputGrid).toEqual(grid);
        expect(persisted.state.levelOne.outputGrid).toEqual(grid);
        useProgressStore.getState().clearLevelOneImages();
        expect(useProgressStore.getState().levelOne.questionnaire.category).toBe('shapes');
    });

    it('deduplicates Level Two discoveries and replaces saved images by shape id', () => {
        const store = useProgressStore.getState();
        store.discoverLevelTwoShape('star_5');
        store.discoverLevelTwoShape('star_5');
        store.saveLevelTwoShape({
            id: 'star_5',
            name: 'Star first pass',
            vector: [0.2],
            outputGrid: [[1]],
        });
        store.saveLevelTwoShape({
            id: 'star_5',
            name: 'Star updated',
            vector: [0.5],
            outputGrid: [[0, 1]],
        });

        const levelTwo = useProgressStore.getState().levelTwo;
        expect(levelTwo.discoveredShapeIds).toEqual(['star_5']);
        expect(levelTwo.savedShapes).toHaveLength(1);
        expect(levelTwo.savedShapes[0].name).toBe('Star updated');
    });
});