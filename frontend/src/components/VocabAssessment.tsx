import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, HelpCircle } from 'lucide-react';
import {
    assessmentOptions,
    completeVocabAssessment,
    nextAssessmentWord,
    updateAssessmentBand,
    type VocabularyProfile,
} from '../lib/vocabProfile';

const QUESTION_COUNT = 12;

interface VocabAssessmentProps {
    profile: VocabularyProfile;
    onComplete: (profile: VocabularyProfile) => void;
    onCancel: () => void;
}

export const VocabAssessment: React.FC<VocabAssessmentProps> = ({ profile, onComplete, onCancel }) => {
    const [band, setBand] = useState(profile.assessment ? profile.baselineBand : 2);
    const [usedIds, setUsedIds] = useState<string[]>([]);
    const [correct, setCorrect] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const advanceTimer = useRef<number | null>(null);
    const item = useMemo(() => nextAssessmentWord(band, usedIds), [band, usedIds]);
    const options = useMemo(() => item ? assessmentOptions(item) : [], [item]);

    useEffect(() => () => {
        if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    }, []);

    if (!item) return null;

    const answer = (meaning: string | null) => {
        if (selected !== null) return;
        const isCorrect = meaning === item.meaning;
        const nextBand = updateAssessmentBand(band, item.band, isCorrect);
        const nextCorrect = correct + (isCorrect ? 1 : 0);
        const nextUsedIds = [...usedIds, item.id];
        setSelected(meaning ?? '__unknown__');
        advanceTimer.current = window.setTimeout(() => {
            if (nextUsedIds.length >= QUESTION_COUNT) {
                onComplete(completeVocabAssessment(profile, {
                    baselineBand: nextBand,
                    answered: nextUsedIds.length,
                    correct: nextCorrect,
                }));
                return;
            }
            setBand(nextBand);
            setCorrect(nextCorrect);
            setUsedIds(nextUsedIds);
            setSelected(null);
        }, 420);
    };

    const progress = Math.round((usedIds.length / QUESTION_COUNT) * 100);

    return (
        <div className="px-6 pb-7 pt-5">
            <button onClick={onCancel} className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-100">
                <ArrowLeft className="h-4 w-4" /> 返回设置
            </button>
            <div className="mb-7">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>词汇校准</span><span>{usedIds.length + 1} / {QUESTION_COUNT}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <div className="mb-7 text-center">
                <p className="text-xs tracking-[0.16em] text-zinc-500">选择最接近的中文释义</p>
                <h3 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-zinc-100">{item.word}</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                {options.map(option => {
                    const isSelected = selected === option;
                    const isCorrectOption = selected !== null && option === item.meaning;
                    return (
                        <button
                            key={option}
                            disabled={selected !== null}
                            onClick={() => answer(option)}
                            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${isCorrectOption
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                : isSelected
                                    ? 'border-red-400 bg-red-50 text-red-700'
                                    : 'border-zinc-200 bg-white/60 text-zinc-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
                        >
                            <span className="flex items-center justify-between gap-2">
                                {option}{isCorrectOption && <Check className="h-4 w-4" />}
                            </span>
                        </button>
                    );
                })}
            </div>
            <button
                disabled={selected !== null}
                onClick={() => answer(null)}
                className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm transition-colors ${selected === '__unknown__' ? 'bg-zinc-200 text-zinc-100' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-100'}`}
            >
                <HelpCircle className="h-4 w-4" /> 不认识
            </button>
        </div>
    );
};
