import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { TiltCard } from './TiltCard';
import { fetchSentenceLevels, levelPercent, type SentenceLevelMeta } from '../lib/sentences';

interface SentencePacksProps {
    onSelectLevel: (id: number) => void;
    compact?: boolean;
}

/** 首页入口卡：列出 5 册句子精背及各自进度。 */
export const SentencePacks: React.FC<SentencePacksProps> = ({ onSelectLevel, compact = false }) => {
    const [levels, setLevels] = useState<SentenceLevelMeta[]>([]);

    useEffect(() => { fetchSentenceLevels().then(setLevels).catch(() => {}); }, []);
    if (levels.length === 0) return null;

    return (
        <TiltCard className={`glass-panel overflow-hidden ${compact ? 'rounded-2xl p-4 sm:p-5' : 'rounded-2xl p-5'}`}>
            <div className={`flex items-center gap-2 text-zinc-100 ${compact ? 'mb-4' : 'mb-5'}`}>
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-[17px] font-semibold tracking-tight">句子精背</h3>
            </div>
            <div className={compact ? 'grid grid-cols-5 gap-1.5' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5'}>
                {levels.map(lv => {
                    const pct = levelPercent(lv.id, lv.days);
                    return (
                        <motion.button
                            key={lv.id}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 550, damping: 35 }}
                            onClick={() => onSelectLevel(lv.id)}
                            className={`group/lv text-left rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 border border-white/5 hover:border-white/10 transition-colors ${compact ? 'min-h-14 px-2 py-2.5' : 'p-3'}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="truncate text-sm font-medium text-zinc-200">{lv.title}</span>
                                {!compact && <ChevronRight className="w-4 h-4 text-zinc-600 group-hover/lv:text-zinc-400 transition-colors" />}
                            </div>
                            {!compact && (
                                <div className="mt-2.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                </div>
                            )}
                            <p className="mt-1 text-[10px] text-zinc-600 tabular-nums">{compact ? `${pct}%` : `${lv.count} 句 · ${pct}%`}</p>
                        </motion.button>
                    );
                })}
            </div>
        </TiltCard>
    );
};
