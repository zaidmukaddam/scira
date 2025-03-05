import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Copy, Check, Clock } from 'lucide-react';
import { Memory } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getUserId } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MemoryAddResponse {
    id: string;
    data: {
        memory: string;
    };
    event: 'ADD';
}

interface MemorySearchResponse {
    id: string;
    memory: string;
    user_id: string;
    metadata: Record<string, any> | null;
    categories: string[];
    immutable: boolean;
    created_at: string;
    updated_at: string;
    message: string | null;
}

interface MemoryManagerProps {
    result: {
        success: boolean;
        action: 'add' | 'search';
        memory?: MemoryAddResponse;
        results?: MemorySearchResponse;
        message?: string;
    };
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ result }) => {
    const [copied, setCopied] = React.useState(false);
    const userId = getUserId();

    const handleCopyUserId = async () => {
        await navigator.clipboard.writeText(userId);
        setCopied(true);
        toast.success("User ID copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const getActionTitle = (action: string) => {
        switch (action) {
            case 'add':
                return 'Memory Updated';
            case 'search':
                return 'Memory Search Results';
            default:
                return 'Memory Operation';
        }
    };

    const getMemories = () => {
        if (result.action === 'add' && result.memory) {
            return [{
                id: result.memory.id,
                content: result.memory.data.memory,
                created_at: new Date().toISOString(),
                tags: []
            }];
        }

        if (result.action === 'search' && result.results) {
            const searchResult = result.results;
            return [{
                id: searchResult.id,
                content: searchResult.memory,
                created_at: searchResult.created_at,
                tags: searchResult.categories
            }];
        }

        return [];
    };

    const memories = getMemories();
    const actionTitle = getActionTitle(result.action);

    const MemoryCard = () => (
        <Card className="w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        "bg-violet-100 dark:bg-violet-900/30"
                    )}>
                        <Memory className="h-4 w-4 text-violet-500" weight="duotone" />
                    </div>
                    <div className="flex flex-col">
                        <CardTitle className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                            {actionTitle}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyUserId}
                                className="h-5 px-1.5 text-[10px] font-normal text-neutral-500 dark:text-neutral-400 hover:text-violet-500 dark:hover:text-violet-400"
                            >
                                ID: {userId.slice(0, 8)}...
                                {copied ? (
                                    <Check className="h-3 w-3 ml-1" />
                                ) : (
                                    <Copy className="h-3 w-3 ml-1" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                {memories.length === 0 ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Memory className="h-4 w-4 text-neutral-400" />
                        <span>No memories found</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {memories.map((memory, index) => (
                            <div key={memory.id} className="relative pl-4 pt-1">
                                <div className="absolute -left-0 top-0 bottom-0 w-[2px] rounded-full bg-violet-100 dark:bg-violet-900" />
                                
                                <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}</span>
                                </div>

                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                                        {memory.content}
                                    </p>
                                </div>

                                {memory.tags && memory.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {memory.tags.map((tag, tagIndex) => (
                                            <Badge
                                                key={tagIndex}
                                                variant="secondary"
                                                className="px-1.5 py-0 h-4 text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                                            >
                                                <Tag className="h-2.5 w-2.5 mr-1" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="w-full my-4">
            <MemoryCard />
        </div>
    );
};

export default MemoryManager; 