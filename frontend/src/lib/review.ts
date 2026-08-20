import type { FavoriteItem } from '../components/FavoritesModal';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewState {
    dueAt: number;
    intervalDays: number;
    ease: number;
    repetitions: number;
    lapses: number;
    lastReviewedAt?: number;
}

export type ReviewStateMap = Record<string, ReviewState>;

const REVIEW_KEY = 'yt_bilingual_review_state';
const DAY = 24 * 60 * 60 * 1000;

export function loadReviewState(): ReviewStateMap {
    try {
        const raw = localStorage.getItem(REVIEW_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveReviewState(state: ReviewStateMap) {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(state));
}

export function isDue(state: ReviewState | undefined, now = Date.now()): boolean {
    return !state || state.dueAt <= now;
}

export function dueFavorites(favorites: FavoriteItem[], state: ReviewStateMap, now = Date.now()): FavoriteItem[] {
    return favorites
        .filter(favorite => isDue(state[favorite.id], now))
        .sort((a, b) => (state[a.id]?.dueAt ?? 0) - (state[b.id]?.dueAt ?? 0) || (a.added_at ?? 0) - (b.added_at ?? 0));
}

export function applyRating(previous: ReviewState | undefined, rating: ReviewRating, now = Date.now()): ReviewState {
    const current = previous ?? { dueAt: now, intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0 };
    let intervalDays = current.intervalDays;
    let ease = current.ease || 2.5;
    let repetitions = current.repetitions;
    let lapses = current.lapses;
    let dueAt = now + DAY;

    if (rating === 'again') {
        intervalDays = 0;
        repetitions = 0;
        lapses += 1;
        dueAt = now + 10 * 60 * 1000;
    } else if (rating === 'hard') {
        intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * 1.2));
        repetitions += 1;
        ease = Math.max(1.3, ease - 0.15);
        dueAt = now + intervalDays * DAY;
    } else if (rating === 'good') {
        intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(1, Math.round(intervalDays * ease));
        repetitions += 1;
        dueAt = now + intervalDays * DAY;
    } else {
        intervalDays = repetitions === 0 ? 3 : Math.max(2, Math.round(intervalDays * ease * 1.3));
        repetitions += 1;
        ease += 0.15;
        dueAt = now + intervalDays * DAY;
    }

    return { dueAt, intervalDays, ease: Math.round(ease * 100) / 100, repetitions, lapses, lastReviewedAt: now };
}

export function pruneReviewState(state: ReviewStateMap, favorites: FavoriteItem[]): ReviewStateMap {
    const validIds = new Set(favorites.map(favorite => favorite.id));
    return Object.fromEntries(Object.entries(state).filter(([id]) => validIds.has(id)));
}
