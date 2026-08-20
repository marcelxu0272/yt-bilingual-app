import React, { useMemo, useState } from 'react';
import { BookOpen, Check, ChevronRight, Clock3, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StudyGuide } from '../lib/studyGuide';

interface StudyGuideModalProps {
    isOpen: boolean;
    guide: StudyGuide | null;
    transcript: Array<{ id: number; start: number; en_text: string; zh_text: string }>;
    favorites: string[];
    onClose: () => void;
    onSeek: (time: number) => void;
    onToggleExpressionFavorite: (expression: StudyGuide['expressions'][number]) => void;
}

const tabs = ['概览', '章节', '表达', '测验'] as const;

export const StudyGuideModal: React.FC<StudyGuideModalProps> = ({ isOpen, guide, transcript, favorites, onClose, onSeek, onToggleExpressionFavorite }) => {
    const [tab, setTab] = useState<typeof tabs[number]>('概览');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const blockById = useMemo(() => new Map(transcript.map(block => [block.id, block])), [transcript]);

    const nextQuestion = () => {
        setSelectedAnswer(null);
        setQuestionIndex(index => Math.min(index + 1, (guide?.questions.length ?? 1) - 1));
    };

    return (
        <AnimatePresence>
            {isOpen && guide && (
                <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div initial={{ y: 18, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 10, scale: 0.99, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="w-full max-w-3xl max-h-[88vh] flex flex-col glass-panel rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
                            <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-blue-500" /><h2 className="text-xl font-semibold tracking-tight text-zinc-100">视频学习导读</h2></div>
                            <button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/5 overflow-x-auto">
                            {tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`relative h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === item ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'}`}>{tab === item && <motion.span layoutId="studyGuideTab" className="absolute inset-0 bg-zinc-100 rounded-lg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}<span className="relative z-10">{item}</span></button>)}
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-6 min-h-0">
                            {tab === '概览' && <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{guide.summary || '暂无概览。'}</div>}
                            {tab === '章节' && <div className="space-y-3">{guide.chapters.map((chapter, index) => { const block = blockById.get(chapter.start_id); return <button key={`${chapter.start_id}-${index}`} onClick={() => block && onSeek(block.start)} className="w-full text-left flex gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"><span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-medium shrink-0">{index + 1}</span><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-medium text-zinc-200">{chapter.title}<ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-500" /></span><span className="block text-xs text-zinc-500 mt-1">{chapter.description}</span>{block && <span className="block text-xs text-zinc-600 mt-2 line-clamp-1"><Clock3 className="inline w-3 h-3 mr-1" />{block.en_text}</span>}</span></button>; })}</div>}
                            {tab === '表达' && <div className="space-y-3">{guide.expressions.map(expression => { const block = blockById.get(expression.source_id); const favoriteId = `phrase-${block?.id ?? expression.source_id}-${expression.phrase.toLowerCase().replace(/\s+/g, '-')}`; return <div key={favoriteId} className="p-4 rounded-xl bg-white/5 border border-white/5"><div className="flex items-start justify-between gap-3"><div><p className="text-base font-medium text-zinc-100">{expression.phrase}</p><p className="text-sm text-amber-500 mt-1">{expression.meaning}</p></div><button onClick={() => onToggleExpressionFavorite(expression)} className={`p-2 rounded-lg transition-colors ${favorites.includes(favoriteId) ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-600 hover:text-amber-500 hover:bg-amber-500/10'}`} title="收藏表达"><Star className="w-4 h-4" fill={favorites.includes(favoriteId) ? 'currentColor' : 'none'} /></button></div><p className="text-sm text-zinc-400 mt-3">{expression.example}</p>{block && <button onClick={() => onSeek(block.start)} className="text-xs text-blue-500 hover:text-blue-400 mt-3">回到来源句</button>}</div>; })}</div>}
                            {tab === '测验' && <div>{guide.questions.length === 0 ? <p className="text-sm text-zinc-500">暂无测验题。</p> : (() => { const question = guide.questions[questionIndex]; return <div><div className="flex items-center justify-between mb-4"><span className="text-[11px] text-zinc-500 tabular-nums">第 {questionIndex + 1} / {guide.questions.length} 题</span>{selectedAnswer !== null && selectedAnswer === question.answer && <span className="inline-flex items-center gap-1 text-xs text-emerald-500"><Check className="w-3.5 h-3.5" />回答正确</span>}</div><p className="text-lg leading-relaxed text-zinc-100 mb-5">{question.question}</p><div className="space-y-2">{question.options.map((option, index) => <button key={option} disabled={selectedAnswer !== null} onClick={() => setSelectedAnswer(index)} className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${selectedAnswer === index ? (index === question.answer ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500') : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'}`}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{selectedAnswer !== null && <div className="mt-5 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-zinc-300"><p>{question.explanation}</p>{questionIndex < guide.questions.length - 1 && <button onClick={nextQuestion} className="mt-3 text-blue-500 hover:text-blue-400">下一题</button>}</div>}</div>; })()}</div>}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
