import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Play, Star, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { speak } from '../lib/tts';
import { applyRating, dueFavorites, type ReviewRating, type ReviewStateMap } from '../lib/review';
import type { FavoriteItem } from './FavoritesModal';

interface ReviewViewProps {
    favorites: FavoriteItem[];
    reviewState: ReviewStateMap;
    onStateChange: (state: ReviewStateMap) => void;
    onBack: () => void;
    onPlayFavorite: (videoId: string, start: number) => void;
}

const ratingLabels: Array<{ id: ReviewRating; label: string; hint: string; className: string }> = [
    { id: 'again', label: '忘记', hint: '10 分钟后', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15' },
    { id: 'hard', label: '困难', hint: '稍后复习', className: 'bg-zinc-800/60 text-zinc-500 border-white/10 hover:bg-zinc-800' },
    { id: 'good', label: '记得', hint: '明天', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15' },
    { id: 'easy', label: '简单', hint: '延后复习', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15' },
];

export const ReviewView: React.FC<ReviewViewProps> = ({ favorites, reviewState, onStateChange, onBack, onPlayFavorite }) => {
    const queue = useMemo(() => dueFavorites(favorites, reviewState), [favorites, reviewState]);
    const card = queue[0];
    const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
    const revealed = !!card && revealedCardId === card.id;

    const rate = (rating: ReviewRating) => {
        if (!card) return;
        onStateChange({ ...reviewState, [card.id]: applyRating(reviewState[card.id], rating) });
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-transparent">
            <div className="flex-none flex items-center justify-between px-4 md:px-6 py-3 bg-zinc-950/60 backdrop-blur-xl border-b border-white/5">
                <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> 返回
                </button>
                <div className="text-center">
                    <p className="text-[17px] font-semibold tracking-tight text-zinc-100">今日复习</p>
                    <p className="text-[11px] text-zinc-500 tabular-nums">还剩 {queue.length} 张</p>
                </div>
                <div className="w-16" />
            </div>

            {!card ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                        <Check className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-100">今天复习完成</h2>
                    <p className="text-sm text-zinc-500 mt-2 max-w-sm">新的收藏会自动加入下一轮复习。你也可以继续观看视频，收集更多值得记住的句子。</p>
                    <button onClick={onBack} className="mt-6 h-10 px-5 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white active:scale-[0.98] transition-[background-color,transform]">回到首页</button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-8 md:py-14">
                    <motion.div key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                <Star className="w-3 h-3 fill-current" /> {card.type === 'vocabulary' ? '生词' : '收藏句'}
                            </span>
                            <span className="text-[11px] text-zinc-500 tabular-nums">第 1 / {queue.length} 张</span>
                        </div>

                        <div className="glass-panel rounded-3xl p-7 md:p-10 min-h-[300px] flex flex-col justify-center">
                            <p className="text-2xl md:text-3xl leading-relaxed tracking-tight text-zinc-100">{card.en_text}</p>
                            {card.type === 'vocabulary' && card.context_en && <p className="mt-5 text-base leading-relaxed text-zinc-500">{card.context_en}</p>}
                            <div className="mt-8 flex items-center gap-2">
                                <button onClick={() => speak(card.en_text)} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors" title="朗读英文">
                                    <Volume2 className="w-3.5 h-3.5" /> 朗读
                                </button>
                                {card.videoId && !card.videoId.startsWith('sentence-pack-') && (
                                    <button onClick={() => onPlayFavorite(card.videoId, card.start)} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-blue-500 hover:bg-blue-500/10 transition-colors">
                                        <Play className="w-3.5 h-3.5 fill-current" /> 回到原文
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 glass-card rounded-2xl p-5 min-h-[124px]">
                            {!revealed ? (
                                <button onClick={() => setRevealedCardId(card.id)} className="w-full h-full min-h-[84px] flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors">
                                    <Eye className="w-5 h-5" />
                                    <span className="text-sm">点击揭示答案</span>
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500"><EyeOff className="w-3.5 h-3.5" /> 中文释义</div>
                                    <p className="text-base leading-relaxed text-zinc-300">{card.zh_text}</p>
                                    {card.type === 'vocabulary' && card.context_zh && card.context_zh !== card.zh_text && (
                                        <p className="text-sm leading-relaxed text-zinc-500">{card.context_zh}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
                            {ratingLabels.map(rating => (
                                <button key={rating.id} disabled={!revealed} onClick={() => rate(rating.id)} className={`h-14 rounded-xl border text-sm font-medium transition-[background-color,opacity,transform] active:scale-[0.98] disabled:opacity-35 ${rating.className}`}>
                                    {rating.label}<span className="block text-[10px] opacity-70 mt-0.5">{rating.hint}</span>
                                </button>
                            ))}
                        </div>
                        {!revealed && <p className="text-center text-xs text-zinc-600 mt-4">先回想，再揭示答案并选择记忆程度</p>}
                    </motion.div>
                </div>
            )}
        </div>
    );
};
