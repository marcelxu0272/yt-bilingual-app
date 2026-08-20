import { loadVocabLevel, saveVocabLevel, VOCAB_LEVELS, type VocabLevelId } from './settings';

export type VocabProfileMode = 'auto' | 'manual';
export type WordKnowledge = 'known' | 'learning' | 'unset';

export interface VocabularyAssessment {
    completedAt: number;
    answered: number;
    correct: number;
}

export interface VocabularyProfile {
    version: 1;
    mode: VocabProfileMode;
    baselineBand: number;
    confidence: number;
    manualLevel: VocabLevelId;
    knownWords: string[];
    learningWords: string[];
    assessment?: VocabularyAssessment;
    updatedAt: number;
}

export interface CalibrationWord {
    id: string;
    word: string;
    meaning: string;
    band: number;
}

export interface VocabProfileRequest {
    mode: 'auto';
    baseline_band: number;
    confidence: number;
    known_words: string[];
    learning_words: string[];
}

const PROFILE_KEY = 'yt_bilingual_vocab_profile';
const MAX_PROFILE_WORDS = 500;
const MAX_PROMPT_WORDS = 120;

export const CALIBRATION_WORDS: CalibrationWord[] = [
    { id: '0-kitchen', word: 'kitchen', meaning: '厨房', band: 0 },
    { id: '0-borrow', word: 'borrow', meaning: '借入', band: 0 },
    { id: '0-quiet', word: 'quiet', meaning: '安静的', band: 0 },
    { id: '0-enough', word: 'enough', meaning: '足够的', band: 0 },
    { id: '0-decide', word: 'decide', meaning: '决定', band: 0 },
    { id: '0-improve', word: 'improve', meaning: '改善', band: 0 },
    { id: '1-achieve', word: 'achieve', meaning: '实现', band: 1 },
    { id: '1-concern', word: 'concern', meaning: '担忧', band: 1 },
    { id: '1-likely', word: 'likely', meaning: '可能的', band: 1 },
    { id: '1-require', word: 'require', meaning: '需要', band: 1 },
    { id: '1-approach', word: 'approach', meaning: '方法', band: 1 },
    { id: '1-maintain', word: 'maintain', meaning: '维持', band: 1 },
    { id: '2-subtle', word: 'subtle', meaning: '微妙的', band: 2 },
    { id: '2-reluctant', word: 'reluctant', meaning: '不情愿的', band: 2 },
    { id: '2-coherent', word: 'coherent', meaning: '连贯的', band: 2 },
    { id: '2-compelling', word: 'compelling', meaning: '令人信服的', band: 2 },
    { id: '2-alleviate', word: 'alleviate', meaning: '缓解', band: 2 },
    { id: '2-inevitable', word: 'inevitable', meaning: '不可避免的', band: 2 },
    { id: '3-arbitrary', word: 'arbitrary', meaning: '任意的', band: 3 },
    { id: '3-ambiguous', word: 'ambiguous', meaning: '含糊的', band: 3 },
    { id: '3-unprecedented', word: 'unprecedented', meaning: '前所未有的', band: 3 },
    { id: '3-scrutiny', word: 'scrutiny', meaning: '仔细审查', band: 3 },
    { id: '3-inherent', word: 'inherent', meaning: '固有的', band: 3 },
    { id: '3-reconcile', word: 'reconcile', meaning: '调和', band: 3 },
    { id: '4-ubiquitous', word: 'ubiquitous', meaning: '无处不在的', band: 4 },
    { id: '4-corroborate', word: 'corroborate', meaning: '证实', band: 4 },
    { id: '4-idiosyncratic', word: 'idiosyncratic', meaning: '独特怪异的', band: 4 },
    { id: '4-tenuous', word: 'tenuous', meaning: '薄弱的', band: 4 },
    { id: '4-exacerbate', word: 'exacerbate', meaning: '使恶化', band: 4 },
    { id: '4-circumvent', word: 'circumvent', meaning: '规避', band: 4 },
    { id: '5-perspicacious', word: 'perspicacious', meaning: '有洞察力的', band: 5 },
    { id: '5-obfuscate', word: 'obfuscate', meaning: '故意使模糊', band: 5 },
    { id: '5-recondite', word: 'recondite', meaning: '深奥的', band: 5 },
    { id: '5-inchoate', word: 'inchoate', meaning: '尚未成形的', band: 5 },
    { id: '5-parsimonious', word: 'parsimonious', meaning: '极度吝啬的', band: 5 },
    { id: '5-apocryphal', word: 'apocryphal', meaning: '真伪可疑的', band: 5 },
];

const clampBand = (value: number) => Math.max(0, Math.min(5, Math.round(value * 100) / 100));

export function normalizeProfileWord(word: string): string {
    return word
        .toLowerCase()
        .trim()
        .replace(/^[^a-z]+|[^a-z]+$/g, '')
        .replace(/\s+/g, ' ');
}

function defaultProfile(): VocabularyProfile {
    const manualLevel = loadVocabLevel();
    return {
        version: 1,
        mode: 'auto',
        baselineBand: 1,
        confidence: 0.2,
        manualLevel,
        knownWords: [],
        learningWords: [],
        updatedAt: Date.now(),
    };
}

export function loadVocabProfile(): VocabularyProfile {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return defaultProfile();
        const parsed = JSON.parse(raw) as Partial<VocabularyProfile>;
        const manualLevel = VOCAB_LEVELS.some(level => level.id === parsed.manualLevel)
            ? parsed.manualLevel as VocabLevelId
            : loadVocabLevel();
        const knownWords = Array.isArray(parsed.knownWords)
            ? [...new Set(parsed.knownWords.map(normalizeProfileWord).filter(Boolean))].slice(-MAX_PROFILE_WORDS)
            : [];
        const knownSet = new Set(knownWords);
        const learningWords = Array.isArray(parsed.learningWords)
            ? [...new Set(parsed.learningWords.map(normalizeProfileWord).filter(word => word && !knownSet.has(word)))].slice(-MAX_PROFILE_WORDS)
            : [];
        return {
            version: 1,
            mode: parsed.mode === 'manual' ? 'manual' : 'auto',
            baselineBand: clampBand(Number.isFinite(parsed.baselineBand) ? Number(parsed.baselineBand) : 1),
            confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.2)),
            manualLevel,
            knownWords,
            learningWords,
            assessment: parsed.assessment && Number.isFinite(parsed.assessment.answered) ? parsed.assessment : undefined,
            updatedAt: Number(parsed.updatedAt) || Date.now(),
        };
    } catch {
        return defaultProfile();
    }
}

export function saveVocabProfile(profile: VocabularyProfile): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    saveVocabLevel(profile.manualLevel);
}

export function nearestVocabLevel(band: number): VocabLevelId {
    return VOCAB_LEVELS[Math.max(0, Math.min(5, Math.round(band)))].id;
}

export function setProfileMode(profile: VocabularyProfile, mode: VocabProfileMode): VocabularyProfile {
    return { ...profile, mode, updatedAt: Date.now() };
}

export function setManualProfileLevel(profile: VocabularyProfile, manualLevel: VocabLevelId): VocabularyProfile {
    return { ...profile, manualLevel, updatedAt: Date.now() };
}

export function getWordKnowledge(profile: VocabularyProfile, word: string): WordKnowledge {
    const normalized = normalizeProfileWord(word);
    if (!normalized) return 'unset';
    if (profile.knownWords.includes(normalized)) return 'known';
    if (profile.learningWords.includes(normalized)) return 'learning';
    return 'unset';
}

export function setWordKnowledge(profile: VocabularyProfile, word: string, status: WordKnowledge): VocabularyProfile {
    const normalized = normalizeProfileWord(word);
    if (!normalized) return profile;
    const knownWords = profile.knownWords.filter(item => item !== normalized);
    const learningWords = profile.learningWords.filter(item => item !== normalized);
    if (status === 'known') knownWords.push(normalized);
    if (status === 'learning') learningWords.push(normalized);
    return {
        ...profile,
        knownWords: knownWords.slice(-MAX_PROFILE_WORDS),
        learningWords: learningWords.slice(-MAX_PROFILE_WORDS),
        updatedAt: Date.now(),
    };
}

export function completeVocabAssessment(
    profile: VocabularyProfile,
    result: { baselineBand: number; answered: number; correct: number },
): VocabularyProfile {
    return {
        ...profile,
        mode: 'auto',
        baselineBand: clampBand(result.baselineBand),
        confidence: Math.min(0.95, 0.35 + result.answered * 0.05),
        assessment: { completedAt: Date.now(), answered: result.answered, correct: result.correct },
        updatedAt: Date.now(),
    };
}

export function resetVocabProfile(): VocabularyProfile {
    const profile = defaultProfile();
    saveVocabProfile(profile);
    return profile;
}

export function nextAssessmentWord(baselineBand: number, usedIds: string[]): CalibrationWord | null {
    const used = new Set(usedIds);
    return [...CALIBRATION_WORDS]
        .filter(item => !used.has(item.id))
        .sort((a, b) => Math.abs(a.band - baselineBand) - Math.abs(b.band - baselineBand) || a.id.localeCompare(b.id))[0] ?? null;
}

export function assessmentOptions(item: CalibrationWord): string[] {
    const distractors = CALIBRATION_WORDS
        .filter(candidate => candidate.id !== item.id && candidate.meaning !== item.meaning)
        .sort((a, b) => Math.abs(a.band - item.band) - Math.abs(b.band - item.band) || a.id.localeCompare(b.id))
        .slice(0, 3)
        .map(candidate => candidate.meaning);
    const correctIndex = item.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
    const options = [...distractors];
    options.splice(correctIndex, 0, item.meaning);
    return options;
}

export function updateAssessmentBand(currentBand: number, questionBand: number, correct: boolean): number {
    const distance = Math.abs(questionBand - currentBand);
    const step = Math.max(0.35, 0.5 - Math.min(0.15, distance * 0.05));
    return clampBand(currentBand + (correct ? step : -step));
}

export function vocabProfileForRequest(profile: VocabularyProfile): VocabProfileRequest | undefined {
    if (profile.mode !== 'auto') return undefined;
    return {
        mode: 'auto',
        baseline_band: clampBand(profile.baselineBand),
        confidence: Math.round(profile.confidence * 100) / 100,
        known_words: profile.knownWords.slice(-MAX_PROMPT_WORDS),
        learning_words: profile.learningWords.slice(-MAX_PROMPT_WORDS),
    };
}
