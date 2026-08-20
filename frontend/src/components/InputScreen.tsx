import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { ArrowRight, Bell, Clock, Loader2, Play, RotateCcw, Search, Trash2, Tv, Youtube } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { HistoryItem } from './ChannelVideoList';
import { ModelSelectionModal } from './ModelSelectionModal';
import type { EstimationData } from './ModelSelectionModal';
import { ShowBrowser } from './ShowBrowser';
import { TiltCard } from './TiltCard';
import { AuroraBackground } from './AuroraBackground';
import { SentencePacks } from './SentencePacks';
import { progressPercent, removeProgress } from '../lib/progress';
import { describeApiError, toast } from '../lib/toast';

interface ChannelUpdate {
    videoId: string;
    title: string;
    channel: string;
    thumbnail?: string;
}

interface InputScreenProps {
    onSubmit: (url: string, model?: string) => void;
    onLoadHistory: (filename: string) => void;
    onSelectEpisode: (showId: string, season: number, episode: number) => void;
    onSelectSentenceLevel: (id: number) => void;
    isLoading?: boolean;
    loadingState?: 'processing' | 'loading' | 'asr' | null;
    subscriptions?: { id: string; name: string }[];
    onSelectChannel: (channelName: string) => void;
    onUnsubscribe?: (channelId: string) => void;
    onOpenReview: () => void;
    reviewDueCount: number;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 30, mass: 0.9 } }
};

export const InputScreen: React.FC<InputScreenProps> = ({ onSubmit, onLoadHistory, onSelectEpisode, onSelectSentenceLevel, isLoading, loadingState, subscriptions = [], onSelectChannel, onOpenReview, reviewDueCount }) => {
    const [url, setUrl] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [channelUpdates, setChannelUpdates] = useState<ChannelUpdate[]>([]);
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimationData, setEstimationData] = useState<EstimationData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingUrl, setPendingUrl] = useState('');
    const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

    useEffect(() => {
        apiFetch('/api/history')
            .then(res => res.json())
            .then(data => setHistory(data))
            .catch(err => console.error("Failed to fetch history:", err));

        if (subscriptions.length > 0) {
            apiFetch('/api/channel-updates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channels: subscriptions.map(s => s.id) })
            })
                .then(res => res.json())
                .then(data => setChannelUpdates(data.updates || []))
                .catch(err => console.error("Failed to fetch channel updates:", err));
        }
    }, [subscriptions]);

    const handleInterceptSubmit = async (targetUrl: string) => {
        setIsEstimating(true);
        setPendingUrl(targetUrl);
        try {
            const response = await apiFetch(`/api/estimate-cost?url=${encodeURIComponent(targetUrl)}`);

            if (!response.ok) {
                throw new Error("Failed to estimate cost");
            }
            const data = await response.json();
            setEstimationData(data);
            setIsModalOpen(true);
        } catch (err) {
            console.error("Estimation failed:", err);
            onSubmit(targetUrl);
        } finally {
            setIsEstimating(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            handleInterceptSubmit(url.trim());
        }
    };

    const handleConfirmModel = (modelId: string) => {
        setIsModalOpen(false);
        onSubmit(pendingUrl, modelId);
    };

    const handleDeleteHistory = async (event: React.MouseEvent, item: HistoryItem) => {
        event.stopPropagation();
        const target = item.metadata?.title ? `“${item.metadata.title}”的` : '这条';
        if (!window.confirm(`删除${target}学习记录和本地字幕缓存？\n\n删除后无法恢复，再次打开需要重新处理。`)) return;
        setDeletingFilename(item.filename);
        try {
            const response = await apiFetch(`/api/history/${encodeURIComponent(item.filename)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await describeApiError(response));
            setHistory(previous => previous.filter(entry => entry.filename !== item.filename));
            if (item.videoId) removeProgress(item.videoId);
            toast.success('学习记录已删除');
        } catch (error) {
            toast.error(await describeApiError(error));
        } finally {
            setDeletingFilename(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:px-6 lg:px-8 lg:py-8 overflow-y-auto custom-scrollbar relative bg-[#ede6d8]">
            {/* Quiet paper grain and ruled texture */}
            <AuroraBackground />

            <AnimatePresence>
                {((isLoading || loadingState) && !isEstimating) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-md flex flex-col items-center justify-center"
                    >
                        <Loader2 className="w-12 h-12 text-zinc-300 animate-spin mb-6" />
                        <h2 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">
                            {loadingState === 'asr' ? '本地转写中' : loadingState === 'processing' ? '获取字幕中' : '加载中'}
                        </h2>
                        {loadingState === 'processing' && (
                            <p className="text-zinc-400">英文字幕会先显示</p>
                        )}
                        {loadingState === 'asr' && (
                            <p className="text-zinc-400">首次使用需要下载转写模型</p>
                        )}
                    </motion.div>
                )}

                {isEstimating && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-md flex flex-col items-center justify-center"
                    >
                        <Loader2 className="w-12 h-12 text-zinc-300 animate-spin mb-6" />
                        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">分析视频中</h2>
                    </motion.div>
                )}
            </AnimatePresence>

            <ModelSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmModel}
                estimationData={estimationData}
            />

            <motion.main
                className="max-w-[1480px] w-full space-y-4 shrink-0 z-10"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <form className="relative" onSubmit={handleSubmit}>
                        <div className="relative flex h-full min-h-16 items-center rounded-2xl glass-card border border-white/10 p-2 pl-4 sm:pl-5 focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/15 transition-[border-color,box-shadow] duration-200 ease-apple">
                            <Search className="hidden h-5 w-5 text-zinc-400 sm:block" />
                            <input
                                id="video-url" name="url" type="url" disabled={isLoading} required
                                className="min-w-0 w-full bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-500 px-3 sm:px-4 py-3 text-base"
                                placeholder="粘贴 YouTube 链接"
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                            />
                            <button
                                type="submit" disabled={isLoading || !url.trim()}
                                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-zinc-100 px-4 sm:px-5 text-sm font-semibold text-zinc-900 hover:bg-white active:scale-[0.98] transition-[background-color,transform,opacity] duration-200 ease-apple disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : '开始'}
                                {!isLoading && <ArrowRight className="h-4 w-4" />}
                            </button>
                        </div>
                    </form>

                    <button onClick={onOpenReview} className="glass-panel min-h-16 rounded-2xl px-4 flex items-center justify-between text-left hover:bg-white/5 active:scale-[0.98] transition-[background-color,transform] duration-200 ease-apple group">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
                                <RotateCcw className="h-5 w-5 text-amber-500" />
                            </div>
                            <p className="text-[17px] font-semibold tracking-tight text-zinc-100">今日复习</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-500 tabular-nums">{reviewDueCount > 0 ? `${reviewDueCount} 张` : '已完成'}</span>
                            <ArrowRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-200" />
                        </div>
                    </button>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="flex flex-col gap-4 lg:col-span-8">
                    <TiltCard className="glass-panel rounded-2xl p-4 sm:p-5 overflow-hidden">
                        <SectionTitle icon={<Clock className="h-5 w-5" />} title="最近学习" />
                        {history.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-center"><p className="text-sm text-zinc-500">暂无记录</p></div>
                        ) : (
                            <div className="grid gap-2.5 xl:grid-cols-2">
                                {history.slice(0, 6).map(item => {
                                    const percent = item.videoId ? progressPercent(item.videoId) : null;
                                    const deleting = deletingFilename === item.filename;
                                    return (
                                        <motion.div
                                            key={item.filename}
                                            whileTap={{ scale: 0.98 }}
                                            transition={{ type: 'spring', stiffness: 550, damping: 35 }}
                                            onClick={() => onLoadHistory(item.filename)}
                                            data-testid="history-card"
                                            className="group/card flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-zinc-800/30 p-2.5 transition-[background-color,border-color] hover:border-white/10 hover:bg-zinc-800/60"
                                        >
                                            <div className="relative w-20 sm:w-24 aspect-video shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                                                {item.metadata?.thumbnail && <img src={item.metadata.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover/card:opacity-100">
                                                    <Play className="h-4 w-4 fill-current text-white" />
                                                </div>
                                                {percent !== null && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60"><div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="truncate text-sm font-medium text-zinc-200">{item.metadata?.title || '本地视频'}</h4>
                                                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-zinc-500">
                                                    <Youtube className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{item.metadata?.channel || '本地文件'}</span>
                                                    {percent !== null && <span className="shrink-0 text-emerald-500/90">· {percent}%</span>}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={deleting}
                                                onClick={(event) => handleDeleteHistory(event, item)}
                                                aria-label={`删除${item.metadata?.title || '学习记录'}`}
                                                title="删除学习记录"
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-600 opacity-50 transition-[background-color,color,opacity] hover:bg-red-500/10 hover:text-red-500 hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait"
                                            >
                                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </TiltCard>

                    <TiltCard className="glass-panel rounded-2xl p-4 sm:p-5 overflow-hidden">
                        <SectionTitle icon={<Tv className="h-5 w-5 text-blue-400" />} title="本地剧集" />
                        <ShowBrowser onSelectEpisode={onSelectEpisode} isLoading={!!isLoading} />
                    </TiltCard>
                    </div>

                    <div className="flex flex-col gap-4 lg:col-span-4">
                    <TiltCard className="glass-panel rounded-2xl p-4 sm:p-5 overflow-hidden">
                        <SectionTitle icon={<Bell className="h-5 w-5 text-amber-400" />} title="最近更新" />
                        <div className="grid gap-2.5">
                            {channelUpdates.length === 0 ? (
                                <div className="flex items-center justify-center py-12 text-center"><p className="text-sm text-zinc-500">暂无更新</p></div>
                            ) : channelUpdates.slice(0, 4).map((update, index) => (
                                <motion.button
                                    key={`${update.videoId}-${index}`}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: 'spring', stiffness: 550, damping: 35 }}
                                    onClick={() => handleInterceptSubmit(`https://youtube.com/watch?v=${update.videoId}`)}
                                    className="group flex w-full items-center gap-3 rounded-lg border border-white/5 bg-zinc-800/30 p-2.5 text-left transition-[background-color,border-color] hover:border-white/10 hover:bg-zinc-800/60"
                                >
                                    <div className="w-20 aspect-video shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                                        {update.thumbnail && <img src={update.thumbnail} className="h-full w-full object-cover" loading="lazy" alt="" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="line-clamp-2 text-sm font-medium text-zinc-300 transition-colors group-hover:text-zinc-100">{update.title}</h4>
                                        <p className="mt-1 truncate text-xs text-zinc-500">{update.channel}</p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </TiltCard>

                    <div className="contents">
                        {subscriptions.length > 0 && (
                            <TiltCard className="glass-panel rounded-2xl p-4 sm:p-5">
                                <SectionTitle icon={<Youtube className="h-5 w-5 text-red-500" />} title="订阅" />
                                <div className="flex flex-wrap gap-2">
                                    {subscriptions.slice(0, 8).map(subscription => (
                                        <motion.button
                                            whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 550, damping: 35 }}
                                            key={subscription.id} onClick={() => onSelectChannel(subscription.name)}
                                            className="inline-flex min-h-10 items-center rounded-lg border border-white/5 bg-zinc-800/60 px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100"
                                        >
                                            {subscription.name}
                                        </motion.button>
                                    ))}
                                </div>
                            </TiltCard>
                        )}
                        <SentencePacks compact onSelectLevel={onSelectSentenceLevel} />
                    </div>
                    </div>
                </motion.div>
            </motion.main>
        </div>
    );
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="mb-4 flex items-center gap-2 text-zinc-100">
        {icon}
        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
    </div>
);
