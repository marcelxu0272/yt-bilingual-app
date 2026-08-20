import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, RefreshCcw, Settings2, Trash2, X } from 'lucide-react';
import { VOCAB_LEVELS } from '../lib/settings';
import {
    nearestVocabLevel,
    resetVocabProfile,
    setManualProfileLevel,
    setProfileMode,
    type VocabularyProfile,
} from '../lib/vocabProfile';
import { VocabAssessment } from './VocabAssessment';
import { VocabAxis } from './VocabAxis';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: VocabularyProfile;
    onProfileChange: (profile: VocabularyProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, profile, onProfileChange }) => {
    const [view, setView] = useState<'settings' | 'assessment'>('settings');
    const selected = VOCAB_LEVELS.find(level => level.id === (
        profile.mode === 'manual' ? profile.manualLevel : nearestVocabLevel(profile.baselineBand)
    )) ?? VOCAB_LEVELS[1];

    const handleClose = () => {
        setView('settings');
        onClose();
    };

    const handleReset = () => {
        if (!window.confirm('重置词汇画像？已掌握和学习中的词也会清空。')) return;
        onProfileChange(resetVocabProfile());
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
                >
                    <motion.div
                        role="dialog" aria-modal="true" aria-labelledby="settings-title"
                        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.99 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="glass-panel relative w-full max-w-xl overflow-hidden rounded-2xl"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
                            <div className="flex items-center gap-2.5">
                                <Settings2 className="h-5 w-5 text-blue-600" />
                                <h2 id="settings-title" className="text-xl font-semibold tracking-tight text-zinc-100">设置</h2>
                            </div>
                            <button onClick={handleClose} aria-label="关闭设置" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {view === 'assessment' ? (
                            <VocabAssessment
                                profile={profile}
                                onCancel={() => setView('settings')}
                                onComplete={next => { onProfileChange(next); setView('settings'); }}
                            />
                        ) : (
                            <div className="px-6 py-7">
                                <div className="mb-6 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-[17px] font-semibold tracking-tight text-zinc-100">生词识别</h3>
                                        <p className="mt-1 text-sm text-zinc-500">只影响生词高亮，不改变翻译</p>
                                    </div>
                                    <span className="text-sm font-medium text-blue-600">{selected.label}</span>
                                </div>

                                <div className="mb-7 grid grid-cols-2 rounded-xl bg-zinc-100 p-1" aria-label="生词识别方式">
                                    {(['auto', 'manual'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => onProfileChange(setProfileMode(profile, mode))}
                                            className={`min-h-10 rounded-lg text-sm font-medium transition-colors ${profile.mode === mode ? 'bg-white text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-100'}`}
                                        >
                                            {mode === 'auto' ? '自动画像' : '手动难度'}
                                        </button>
                                    ))}
                                </div>

                                {profile.mode === 'auto' ? (
                                    <div>
                                        <div className="rounded-2xl border border-zinc-200 bg-white/55 p-5">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                    <Brain className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-zinc-100">{profile.assessment ? `当前基线：${selected.label}` : '先做一次 2 分钟校准'}</p>
                                                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                                                        {profile.assessment
                                                            ? `画像可信度 ${Math.round(profile.confidence * 100)}%，使用中会根据你的反馈继续调整。`
                                                            : '完成 12 个词义判断，之后会从点词、收藏和复习结果持续学习。'}
                                                    </p>
                                                </div>
                                            </div>
                                            {profile.assessment && (
                                                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-4 text-center">
                                                    <ProfileStat value={`${Math.round(profile.confidence * 100)}%`} label="可信度" />
                                                    <ProfileStat value={profile.knownWords.length} label="已掌握" />
                                                    <ProfileStat value={profile.learningWords.length} label="学习中" />
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={() => setView('assessment')} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                                            {profile.assessment ? <RefreshCcw className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                                            {profile.assessment ? '重新校准' : '开始校准'}
                                        </button>

                                        {(profile.assessment || profile.knownWords.length > 0 || profile.learningWords.length > 0) && (
                                            <button onClick={handleReset} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" /> 重置画像
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <VocabAxis value={profile.manualLevel} onChange={level => onProfileChange(setManualProfileLevel(profile, level))} />
                                        <p className="mt-5 min-h-5 text-center text-sm text-zinc-500">{selected.tagline}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ProfileStat: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
    <div>
        <p className="text-lg font-semibold text-zinc-100">{value}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
);
