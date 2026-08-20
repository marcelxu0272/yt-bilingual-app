// Learner profile settings (persisted in localStorage).

export const VOCAB_LEVEL_KEY = 'yt_bilingual_vocab_level';

// Six levels along a vocabulary-size axis (~4k → 20k+ words), named after a
// journey into space — numbers stay backstage, the metaphor does the talking.
export const VOCAB_LEVELS = [
    { id: 'liftoff', label: 'Liftoff', tagline: '日常英语刚刚起步' },
    { id: 'orbit', label: 'Orbit', tagline: '能稳定理解，字幕仍是好帮手' },
    { id: 'moonwalk', label: 'Moonwalk', tagline: '能应对多数陌生表达' },
    { id: 'interstellar', label: 'Interstellar', tagline: '长视频也很少需要帮助' },
    { id: 'deep-space', label: 'Deep Space', tagline: '几乎能独立理解任何内容' },
    { id: 'supernova', label: 'Supernova', tagline: '接近母语水平，只标记罕见词' },
] as const;

export type VocabLevelId = typeof VOCAB_LEVELS[number]['id'];

// Earlier releases stored exam-based ids; map them onto the new axis.
const LEGACY_LEVELS: Record<string, VocabLevelId> = {
    cet4: 'liftoff',
    cet6: 'orbit',
    kaoyan: 'moonwalk',
    ielts: 'interstellar',
    advanced: 'deep-space',
};

export function loadVocabLevel(): VocabLevelId {
    const saved = localStorage.getItem(VOCAB_LEVEL_KEY) || '';
    if (VOCAB_LEVELS.some(l => l.id === saved)) return saved as VocabLevelId;
    if (saved in LEGACY_LEVELS) return LEGACY_LEVELS[saved];
    return 'orbit';
}

export function saveVocabLevel(level: VocabLevelId) {
    localStorage.setItem(VOCAB_LEVEL_KEY, level);
}
