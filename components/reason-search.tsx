import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, BookA, Sparkles, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface StreamUpdate {
    id: string;
    type: 'plan' | 'web' | 'academic' | 'analysis' | 'progress';
    status: 'running' | 'completed';
    timestamp: number;
    message: string;
    plan?: {
        search_queries: Array<{
            query: string;
            rationale: string;
            source: 'web' | 'academic' | 'both';
            priority: number;
        }>;
        required_analyses: Array<{
            type: string;
            description: string;
            importance: number;
        }>;
        special_considerations: string[];
    };
    query?: string;
    source?: string;
    results?: Array<{
        url: string;
        title: string;
        content: string;
        source: 'web' | 'academic';
    }>;
    findings?: Array<{
        insight: string;
        evidence: string[];
        confidence: number;
    }>;
    analysisType?: string;
    completedSteps?: number;
    totalSteps?: number;
    isComplete?: boolean;
    title?: string;
    overwrite?: boolean;
    advancedSteps?: number;
    gaps?: Array<{
        topic: string;
        reason: string;
        additional_queries: string[];
    }>;
    recommendations?: Array<{
        action: string;
        rationale: string;
        priority: number;
    }>;
    uncertainties?: string[];
}

const ResearchStep = ({ 
    update, 
    isExpanded,
    onToggle,
    id
}: { 
    update: StreamUpdate, 
    isExpanded: boolean,
    onToggle: () => void,
    id: string
}) => {
    const icons = {
        plan: Search,
        web: FileText,
        academic: BookA,
        progress: Loader2,
        analysis: Sparkles,
        'gap-search': Search,
    } as const;
    
    const isGapSearch = update.id.startsWith('gap-search');
    const Icon = isGapSearch ? icons['gap-search'] : icons[update.type];

    return (
        <div id={id} className="group">
            <motion.div 
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors duration-200",
                    isExpanded ? "bg-neutral-50 dark:bg-neutral-800/50" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}
                layout
            >
                <div className={cn(
                    "flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-300",
                    update.status === 'completed'
                        ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                )}>
                    {update.status === 'running' ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                </div>

                <button 
                    onClick={onToggle}
                    className="flex items-center justify-between flex-1 text-left min-w-0"
                >
                    <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">
                                {update.title || (update.type === 'plan' ? 'Research Plan' : 'Analysis')}
                            </span>
                            {update.type === 'plan' && update.plan && (
                                <span className="text-xs text-neutral-500 flex-shrink-0">
                                    ({update.plan.search_queries.length} queries, {update.plan.required_analyses.length} analyses{update.advancedSteps ? `, +${update.advancedSteps} advanced` : ''})
                                </span>
                            )}
                        </div>
                        {update.message && (
                            <p className="text-xs text-neutral-500 truncate">
                                {isGapSearch ? (
                                    <span className="flex items-center gap-1">
                                        <Search className="w-3 h-3" />
                                        {update.message}
                                    </span>
                                ) : (
                                    update.message
                                )}
                            </p>
                        )}
                    </div>

                    <ChevronRight className={cn("h-4 w-4 text-neutral-400 flex-shrink-0 ml-2 transition-transform", isExpanded && "rotate-90")} />
                </button>
            </motion.div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ 
                            height: "auto", 
                            opacity: 1,
                            transition: {
                                height: { duration: 0.2, ease: "easeOut" },
                                opacity: { duration: 0.15, delay: 0.05 }
                            }
                        }}
                        exit={{ 
                            height: 0, 
                            opacity: 0,
                            transition: {
                                height: { duration: 0.2, ease: "easeIn" },
                                opacity: { duration: 0.1 }
                            }
                        }}
                        className="overflow-hidden"
                    >
                        <div className="pl-8 pr-2 py-2 space-y-2">
                            {/* Plan Details */}
                            {update.type === 'plan' && update.plan && (
                                <div className="space-y-2">
                                    {update.plan.search_queries.map((query, idx) => (
                                        <motion.div 
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                                        >
                                            <div className="flex items-start gap-2">
                                                <Search className="h-3.5 w-3.5 text-neutral-500 mt-1" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{query.query}</span>
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {query.source}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-neutral-500 mt-1">
                                                        {query.rationale}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Search Results */}
                            {(update.type === 'web' || update.type === 'academic') && update.results && (
                                <div className="space-y-2">
                                    {update.results.map((result, idx) => (
                                        <motion.a
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                                        >
                                            <div className="flex-shrink-0 mt-1">
                                                <img 
                                                    src={`https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=128`}
                                                    alt=""
                                                    className="w-4 h-4"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                                <div className="hidden">
                                                    {update.type === 'web' ? 
                                                        <FileText className="h-4 w-4 text-neutral-500" /> : 
                                                        <BookA className="h-4 w-4 text-neutral-500" />
                                                    }
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium leading-tight">
                                                    {result.title}
                                                </h4>
                                                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                                    {result.content}
                                                </p>
                                            </div>
                                        </motion.a>
                                    ))}
                                </div>
                            )}

                            {update.type === 'analysis' && update.findings && (
                                <div className="space-y-2">
                                    {update.findings.map((finding, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-1.5">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        finding.confidence > 0.7 
                                                            ? "bg-neutral-900 dark:bg-neutral-50" 
                                                            : "bg-neutral-400 dark:bg-neutral-600"
                                                    )} />
                                                </div>
                                                <div className="space-y-2 flex-1">
                                                    <p className="text-sm font-medium">
                                                        {finding.insight}
                                                    </p>
                                                    {finding.evidence.length > 0 && (
                                                        <div className="pl-4 border-l-2 border-neutral-200 dark:border-neutral-700 space-y-1.5">
                                                            {finding.evidence.map((evidence, i) => (
                                                                <p key={i} className="text-xs text-neutral-500">
                                                                    {evidence}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StepCarousel = ({ updates }: { updates: StreamUpdate[] }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Handle toggle for a specific step
    const handleToggle = (stepId: string) => {
        setExpandedSteps(current => {
            const newSet = new Set(current);
            if (newSet.has(stepId)) {
                newSet.delete(stepId);
            } else {
                newSet.add(stepId);
            }
            return newSet;
        });
    };

    // Auto-scroll to running step
    useEffect(() => {
        const runningStep = updates.find(update => update.status === 'running');
        if (runningStep) {
            const stepElement = document.getElementById(`step-${runningStep.id}`);
            if (stepElement && scrollContainerRef.current) {
                stepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [updates]);

    return (
        <div ref={scrollContainerRef} className="h-[300px] overflow-y-auto">
            {updates.map((update, index) => {
                const isExpanded = update.status === 'running' || expandedSteps.has(update.id);

                return (
                    <ResearchStep 
                        key={update.id}
                        id={`step-${update.id}`}
                        update={update}
                        isExpanded={isExpanded}
                        onToggle={() => handleToggle(update.id)}
                    />
                );
            })}
        </div>
    );
};

const SourcesList = ({ sources, type }: { sources: StreamUpdate['results'], type: 'web' | 'academic' }) => {
    return (
        <div className="space-y-2">
            {sources?.map((source, i) => (
                <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                            <img 
                                src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=128`}
                                alt=""
                                className="w-4 h-4"
                                onError={(e) => {
                                    // Fallback to type icon if favicon fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            {/* Fallback icon */}
                            <div className="hidden">
                                {type === 'web' ? <FileText className="h-4 w-4 text-neutral-500" /> : <BookA className="h-4 w-4 text-neutral-500" />}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium leading-tight">{source.title}</h4>
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                {source.content}
                            </p>
                        </div>
                    </div>
                </a>
            ))}
        </div>
    );
};

const AllSourcesView = ({ 
    sources, 
    type,
    id 
}: { 
    sources: StreamUpdate['results'], 
    type: 'web' | 'academic',
    id?: string
}) => {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const title = `${type === 'web' ? 'Web' : 'Academic'} Sources`;

    if (isDesktop) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <button id={id} className="hidden">
                        Show All
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <SourcesList sources={sources} type={type} />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <button id={id} className="hidden">
                    Show All
                </button>
            </DrawerTrigger>
            <DrawerContent className="h-[85vh]">
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 overflow-y-auto">
                    <SourcesList sources={sources} type={type} />
                </div>
            </DrawerContent>
        </Drawer>
    );
};

// First, let's create a new component for the animated tab content
const AnimatedTabContent = ({ children, value, selected }: { 
    children: React.ReactNode, 
    value: string, 
    selected: string 
}) => (
    <motion.div
        role="tabpanel"
        initial={{ opacity: 0, x: 10 }}
        animate={{ 
            opacity: value === selected ? 1 : 0,
            x: value === selected ? 0 : 10,
            pointerEvents: value === selected ? "auto" : "none"
        }}
        transition={{ 
            duration: 0.2,
            ease: "easeOut"
        }}
        className={cn(
            "absolute top-0 left-0 right-0",
            value === selected ? "relative" : "hidden"
        )}
    >
        {children}
    </motion.div>
);

// Add this new component for empty states
const EmptyState = ({ type }: { type: 'web' | 'academic' | 'analysis' }) => {
    const icons = {
        web: FileText,
        academic: BookA,
        analysis: Sparkles
    } as const;
    const Icon = icons[type];
    
    const messages = {
        web: "Web sources will appear here once found",
        academic: "Academic sources will appear here once found",
        analysis: "Analysis results will appear here once complete"
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-800">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 text-center">
                {messages[type]}
            </p>
        </div>
    );
};

const ReasonSearch = ({ updates }: { updates: StreamUpdate[] }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedTab, setSelectedTab] = useState("web");

    // Get the research plan update—prefer the completed update if available
    const planUpdateFromUpdates = React.useMemo(() => {
        return updates.find(u => u.type === 'plan' && u.status === 'completed') || updates.find(u => u.type === 'plan');
    }, [updates]);

    const additionalAdvancedSteps = React.useMemo(() => {
        return updates.filter(u => u.id === 'gap-analysis' || u.id === 'final-synthesis').length;
    }, [updates]);

    const planUpdate = React.useMemo(() => {
        if (planUpdateFromUpdates && additionalAdvancedSteps > 0) {
             return { ...planUpdateFromUpdates, advancedSteps: additionalAdvancedSteps };
        }
        return planUpdateFromUpdates;
    }, [planUpdateFromUpdates, additionalAdvancedSteps]);

    const totalExpectedSteps = React.useMemo(() => {
        if (planUpdate?.totalSteps) return planUpdate.totalSteps;
        if (!planUpdate?.plan) return 0;

        // Count search steps (web/academic/both)
        const searchSteps = planUpdate.plan.search_queries.reduce((acc, query) =>
            acc + (query.source === 'both' ? 2 : 1), 0);

        // Count analysis steps
        const analysisSteps = planUpdate.plan.required_analyses.length;

        // For gap analysis, count each gap if available, otherwise count 1.
        // Always count final synthesis as one step.
        const additionalSteps = updates.reduce((acc, u) => {
            if (u.id === 'gap-analysis') {
                return acc + (u.gaps ? u.gaps.length : 1);
            } else if (u.id === 'final-synthesis') {
                return acc + 1;
            }
            return acc;
        }, 0);

        return searchSteps + analysisSteps + additionalSteps;
    }, [planUpdate, updates]);

    // Track all steps and progress in one memo
    const { completedSteps, runningSteps, totalSteps, progress, isComplete, showRunningIndicators } = React.useMemo(() => {
        const stepsById = new Map(updates.map(u => [u.id, u]));
        const excludedIds = new Set(['research-plan', 'research-progress']);

        // Filter out excluded steps and calculate total completed and running steps.
        const allSteps = Array.from(stepsById.values()).filter(u => !excludedIds.has(u.id));
        const completed = allSteps.filter(u => u.status === 'completed').length;
        const running = allSteps.filter(u => u.status === 'running').length;

        // Determine the total step count from final synthesis if available, fallback to totalExpectedSteps.
        const finalSynthesis = updates.find(u => u.id === 'final-synthesis');
        const total = finalSynthesis?.totalSteps || totalExpectedSteps;
        const currentProgress = total === 0 ? 0 : (completed / total) * 100;

        // Check progress update to reflect completion as well.
        const progressUpdate = updates.find(u => u.type === 'progress');
        // Research is considered complete if either the progress update's isComplete flag is set
        // or if the final synthesis update indicates completion.
        const complete = (progressUpdate?.isComplete === true) ||
                         (finalSynthesis?.isComplete === true) ||
                         (finalSynthesis?.status === 'completed');

        return {
            completedSteps: completed,
            runningSteps: running,
            totalSteps: total,
            progress: currentProgress,
            isComplete: complete,
            showRunningIndicators: !complete && running > 0
        };
    }, [updates, totalExpectedSteps]);

    // Deduplicate updates by id so that a "completed" state overwrites its running version.
    const dedupedUpdates = React.useMemo(() => {
        const updateMap = new Map<string, StreamUpdate>();
        
        // Sort updates by timestamp to process newer updates last
        const sortedUpdates = [...updates].sort((a, b) => a.timestamp - b.timestamp);
        
        sortedUpdates.forEach(u => {
            if (u.overwrite || !updateMap.has(u.id)) {
                updateMap.set(u.id, u);
            } else {
                const existing = updateMap.get(u.id)!;
                if (u.status === 'completed' && existing.status !== 'completed') {
                    updateMap.set(u.id, u);
                }
            }
        });
        
        return Array.from(updateMap.values());
    }, [updates]);

    // Use the deduplicated updates to generate our sorted list
    const sortedUpdates = React.useMemo(() => {
        // Modified filtering logic: allow running gap analysis updates if analysisType==='gaps'
        const filteredUpdates = isComplete
            ? dedupedUpdates.filter(u => (
                  (u.status === 'completed' || u.type === 'plan' || (u.analysisType === 'gaps' && u.status === 'running'))
                  && u.id !== 'research-progress'
              ))
            : dedupedUpdates.filter(u => u.id !== 'research-progress');

        const otherUpdates = filteredUpdates
            .filter(u => u.type !== 'plan')
            .sort((a, b) => a.timestamp - b.timestamp);

        return planUpdate ? [planUpdate, ...otherUpdates] : otherUpdates;
    }, [dedupedUpdates, isComplete, planUpdate]);

    // Group sources by type (web/academic)
    const sourceGroups = React.useMemo(() => {
        const webSources = updates
            .filter(u => u.type === 'web' && u.status === 'completed' && u.results)
            .flatMap(u => u.results || []);

        const academicSources = updates
            .filter(u => u.type === 'academic' && u.status === 'completed' && u.results)
            .flatMap(u => u.results || []);

        const analysisResults = updates
            .filter(u => u.type === 'analysis' && u.status === 'completed')
            .map(u => ({
                type: u.analysisType || 'Analysis',
                findings: u.findings || [],
                gaps: u.gaps,
                recommendations: u.recommendations,
                uncertainties: u.uncertainties
            }));

        return {
            web: webSources,
            academic: academicSources,
            analysis: analysisResults
        };
    }, [updates]);

    // Check if final synthesis update is completed
    const finalSynthesisDone = React.useMemo(() => {
         return dedupedUpdates.some(u => u.id === 'final-synthesis' && u.status === 'completed');
    }, [dedupedUpdates]);

    // Automatically collapse (close) the main accordion once final synthesis is done
    useEffect(() => {
         if (finalSynthesisDone) {
             setIsCollapsed(true);
         }
    }, [finalSynthesisDone]);

    return (
        <div className="space-y-8">
            {/* Progress Card */}
            <Card className="w-full shadow-none hover:shadow-none">
                <div
                    className={cn(
                        "flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-xl",
                        isComplete && "cursor-pointer",
                        isComplete && "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    )}
                    onClick={() => isComplete && setIsCollapsed(!isCollapsed)}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium">
                                {isComplete 
                                    ? "Research Complete"
                                    : "Research Progress"
                                }
                            </h3>
                            {isComplete ? (
                                <Badge variant="secondary" className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                    Complete
                                </Badge>
                            ) : showRunningIndicators && (
                                <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                    In Progress
                                </Badge>
                            )}
                        </div>
                        <Progress
                            value={progress}
                            className={cn(
                                "h-1 w-24 sm:w-32",
                                showRunningIndicators && "animate-pulse"
                            )}
                        />
                    </div>
                    {isComplete && (
                        <ChevronDown className={cn(
                            "h-4 w-4 text-neutral-500 transition-transform flex-shrink-0",
                            isCollapsed ? "rotate-180" : ""
                        )} />
                    )}
                </div>

                <motion.div
                    initial={false}
                    animate={{
                        height: isCollapsed ? 0 : "auto",
                        opacity: isCollapsed ? 0 : 1
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <CardContent className="px-2 sm:px-4 pt-2 sm:pt-4">
                        <StepCarousel updates={sortedUpdates} />
                    </CardContent>
                </motion.div>
            </Card>

            {/* Sources Section - Only show when complete */}
            {finalSynthesisDone && (sourceGroups.web.length > 0 || sourceGroups.academic.length > 0 || sourceGroups.analysis.length > 0) && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        <h3 className="text-sm font-medium">Sources</h3>
                    </div>
                    <Tabs defaultValue="web" className="w-full" onValueChange={setSelectedTab} value={selectedTab}>
                        <TabsList className="w-full h-10 grid grid-cols-3 bg-neutral-100/50 dark:bg-neutral-800/50 p-1 rounded-lg">
                            <TabsTrigger 
                                value="web" 
                                className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                            >
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3 w-3" />
                                    <span className="hidden sm:inline">Web</span>
                                    {sourceGroups.web.length > 0 && (
                                        <Badge variant="secondary" className="h-4 px-1">
                                            {sourceGroups.web.length}
                                        </Badge>
                                    )}
                                </div>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="academic" 
                                className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                            >
                                <div className="flex items-center gap-1.5">
                                    <BookA className="h-3 w-3" />
                                    <span className="hidden sm:inline">Academic</span>
                                    {sourceGroups.academic.length > 0 && (
                                        <Badge variant="secondary" className="h-4 px-1">
                                            {sourceGroups.academic.length}
                                        </Badge>
                                    )}
                                </div>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="analysis" 
                                className="h-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 rounded-md"
                            >
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3" />
                                    <span className="hidden sm:inline">Analysis</span>
                                    {sourceGroups.analysis.length > 0 && (
                                        <Badge variant="secondary" className="h-4 px-1">
                                            {sourceGroups.analysis.length}
                                        </Badge>
                                    )}
                                </div>
                            </TabsTrigger>
                        </TabsList>

                        <div className="relative mt-4">
                            <AnimatedTabContent value="web" selected={selectedTab}>
                                {sourceGroups.web.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {sourceGroups.web.slice(0, 3).map((source, i) => (
                                                <a
                                                    key={i}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-shrink-0 mt-0.5">
                                                            <img 
                                                                src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=128`}
                                                                alt=""
                                                                className="w-3.5 h-3.5"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    target.nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                            <div className="hidden">
                                                                <FileText className="h-3.5 w-3.5 text-neutral-500" />
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-xs font-medium leading-snug truncate">
                                                                {source.title}
                                                            </h4>
                                                            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
                                                                {source.content}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </a>
                                            ))}
                                            {sourceGroups.web.length > 3 && (
                                                <button
                                                    onClick={() => document.getElementById('show-all-web-sources')?.click()}
                                                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                                                >
                                                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
                                                    <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                                                        Show {sourceGroups.web.length - 3} More Sources
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                        {sourceGroups.web.length > 3 && (
                                            <div className="hidden">
                                                <AllSourcesView sources={sourceGroups.web} type="web" id="show-all-web-sources" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyState type="web" />
                                )}
                            </AnimatedTabContent>
                            <AnimatedTabContent value="academic" selected={selectedTab}>
                                {sourceGroups.academic.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {sourceGroups.academic.slice(0, 3).map((source, i) => (
                                                <a
                                                    key={i}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-shrink-0 mt-0.5">
                                                            <img 
                                                                src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=128`}
                                                                alt=""
                                                                className="w-3.5 h-3.5"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    target.nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                            <div className="hidden">
                                                                <BookA className="h-3.5 w-3.5 text-neutral-500" />
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-xs font-medium leading-snug truncate">
                                                                {source.title}
                                                            </h4>
                                                            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
                                                                {source.content}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </a>
                                            ))}
                                            {sourceGroups.academic.length > 3 && (
                                                <button
                                                    onClick={() => document.getElementById('show-all-academic-sources')?.click()}
                                                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                                                >
                                                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
                                                    <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                                                        Show {sourceGroups.academic.length - 3} More Sources
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                        {sourceGroups.academic.length > 3 && (
                                            <div className="hidden">
                                                <AllSourcesView sources={sourceGroups.academic} type="academic" id="show-all-academic-sources" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyState type="academic" />
                                )}
                            </AnimatedTabContent>
                            <AnimatedTabContent value="analysis" selected={selectedTab}>
                                {sourceGroups.analysis.length > 0 || updates.some(u => u.id === 'gap-analysis' && u.status === 'running') || updates.some(u => u.id === 'final-synthesis' && u.status === 'running') ? (
                                    <div className="space-y-2">
                                        {/* Regular Analysis Results */}
                                        {sourceGroups.analysis.filter(a => a.type !== 'gaps' && a.type !== 'synthesis').map((analysis, i) => (
                                            <Accordion
                                                key={i}
                                                type="single"
                                                collapsible
                                                className="bg-card rounded-lg border border-border"
                                            >
                                                <AccordionItem value={`analysis-${i}`} className="border-none">
                                                    <AccordionTrigger className="px-2 py-1 hover:no-underline text-xs">
                                                        <div className="flex items-center gap-1.5 text-neutral-600">
                                                            <Sparkles className="h-3 w-3" />
                                                            {analysis.type}
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-2 pb-2">
                                                        <div className="grid gap-1.5">
                                                            {analysis.findings.map((finding, j) => (
                                                                <div
                                                                    key={j}
                                                                    className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        <div className="flex-shrink-0 mt-1">
                                                                            <div className="w-1 h-1 rounded-full bg-primary/80" />
                                                                        </div>
                                                                        <div className="space-y-1.5 min-w-0">
                                                                            <p className="text-xs font-medium">{finding.insight}</p>
                                                                            {finding.evidence.length > 0 && (
                                                                                <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                                                                    {finding.evidence.map((evidence, k) => (
                                                                                        <p key={k} className="text-[11px] text-neutral-500">
                                                                                            {evidence}
                                                                                        </p>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        ))}

                                        {/* Gap Analysis Results */}
                                        {sourceGroups.analysis.find(a => a.type === 'gaps') && (
                                            <Accordion
                                                type="single"
                                                collapsible
                                                className="bg-card rounded-lg border border-border"
                                            >
                                                <AccordionItem value="gaps" className="border-none">
                                                    <AccordionTrigger className="px-2 py-1 hover:no-underline text-xs">
                                                        <div className="flex items-center gap-1.5 text-neutral-600">
                                                            <Search className="h-3 w-3" />
                                                            Research Gaps and Limitations
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-2 pb-2">
                                                        <div className="grid gap-1.5">
                                                            {/* Limitations */}
                                                            {sourceGroups.analysis
                                                                .find(a => a.type === 'gaps')
                                                                ?.findings.map((finding, j) => (
                                                                    <div
                                                                        key={j}
                                                                        className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                                                    >
                                                                        <div className="flex items-start gap-2">
                                                                            <div className="flex-shrink-0 mt-1">
                                                                                <div className="w-1 h-1 rounded-full bg-neutral-400" />
                                                                            </div>
                                                                            <div className="space-y-1.5 min-w-0">
                                                                                <p className="text-xs font-medium">{finding.insight}</p>
                                                                                {finding.evidence.length > 0 && (
                                                                                    <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                                                                        {finding.evidence.map((solution, k) => (
                                                                                            <p key={k} className="text-[11px] text-neutral-500">
                                                                                                {solution}
                                                                                            </p>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                            {/* Knowledge Gaps */}
                                                            {sourceGroups.analysis.find(a => a.type === 'gaps')?.gaps?.map((gap, j) => (
                                                                <div
                                                                    key={j}
                                                                    className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        <div className="flex-shrink-0 mt-1">
                                                                            <div className="w-1 h-1 rounded-full bg-neutral-400" />
                                                                        </div>
                                                                        <div className="space-y-1.5 min-w-0">
                                                                            <p className="text-xs font-medium">{gap.topic}</p>
                                                                            <p className="text-[11px] text-neutral-500">{gap.reason}</p>
                                                                            {gap.additional_queries.length > 0 && (
                                                                                <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                                                                    {gap.additional_queries.map((query, k) => (
                                                                                        <p key={k} className="text-[11px] text-neutral-500">
                                                                                            {query}
                                                                                        </p>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        )}

                                        {/* Final Synthesis Results */}
                                        {sourceGroups.analysis.find(a => a.type === 'synthesis') && (
                                            <Accordion
                                                type="single"
                                                collapsible
                                                className="bg-card rounded-lg border border-border"
                                            >
                                                <AccordionItem value="synthesis" className="border-none">
                                                    <AccordionTrigger className="px-2 py-1 hover:no-underline text-xs">
                                                        <div className="flex items-center gap-1.5 text-neutral-600">
                                                            <Sparkles className="h-3 w-3" />
                                                            Final Research Synthesis
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-2 pb-2">
                                                        <div className="grid gap-2.5">
                                                            {/* Key Findings */}
                                                            <div className="space-y-2">
                                                                <h4 className="text-[11px] font-medium text-neutral-600 px-1">Key Findings</h4>
                                                                <div className="grid gap-1.5">
                                                                    {sourceGroups.analysis
                                                                        .find(a => a.type === 'synthesis')
                                                                        ?.findings.map((finding, j) => (
                                                                            <div
                                                                                key={j}
                                                                                className="p-2 sm:p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                                                            >
                                                                                <div className="flex items-start gap-1.5 sm:gap-2">
                                                                                    <div className="flex-shrink-0 mt-1">
                                                                                        <div className="w-1 h-1 rounded-full bg-green-500" />
                                                                                    </div>
                                                                                    <div className="space-y-1.5 min-w-0">
                                                                                        <p className="text-[11px] sm:text-xs font-medium leading-normal">{finding.insight}</p>
                                                                                        {finding.evidence.length > 0 && (
                                                                                            <div className="pl-2 sm:pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
                                                                                                {finding.evidence.map((evidence, k) => (
                                                                                                    <p key={k} className="text-[10px] sm:text-[11px] text-neutral-500 leading-normal">
                                                                                                        {evidence}
                                                                                                    </p>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>

                                                            {/* Remaining Uncertainties */}
                                                            {sourceGroups.analysis.find(a => a.type === 'synthesis')?.uncertainties && (
                                                                <div className="space-y-2">
                                                                    <h4 className="text-[11px] font-medium text-neutral-600 px-1">Remaining Uncertainties</h4>
                                                                    <div className="grid gap-1.5">
                                                                        {sourceGroups.analysis
                                                                            .find(a => a.type === 'synthesis')
                                                                            ?.uncertainties?.map((uncertainty, j) => (
                                                                                <div
                                                                                    key={j}
                                                                                    className="p-2 sm:p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                                                                >
                                                                                    <p className="text-[11px] sm:text-xs text-neutral-600 leading-normal">{uncertainty}</p>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Recommendations - Add this new section */}
                                                            {sourceGroups.analysis.find(a => a.type === 'synthesis')?.recommendations && (
                                                                <div className="space-y-2">
                                                                    <h4 className="text-[11px] font-medium text-neutral-600 px-1">Recommendations</h4>
                                                                    <div className="grid gap-1.5">
                                                                        {sourceGroups.analysis
                                                                            .find(a => a.type === 'synthesis')
                                                                            ?.recommendations?.map((rec, j) => (
                                                                                <div
                                                                                    key={j}
                                                                                    className="p-2 sm:p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                                                                                >
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-[11px] sm:text-xs font-medium leading-normal">{rec.action}</p>
                                                                                        <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-normal">{rec.rationale}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyState type="analysis" />
                                )}
                            </AnimatedTabContent>
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
};

export default ReasonSearch; 