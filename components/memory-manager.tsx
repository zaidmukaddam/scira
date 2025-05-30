import React from 'react';
import { Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

    const user_id  = result.results?.user_id;

    const handleCopyUserId = async () => {
        await navigator.clipboard.writeText(user_id ?? '');
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
        <div className="font-mono text-xs">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{actionTitle}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUserId}
                    className="h-5 px-1 text-[9px] rounded-sm text-neutral-500 hover:text-violet-500"
                >
                    {user_id?.slice(0, 5)}...{copied ? <Check className="h-2.5 w-2.5 ml-0.5" /> : <Copy className="h-2.5 w-2.5 ml-0.5" />}
                </Button>
            </div>
            
            {memories.length === 0 ? (
                <div className="text-[10px] text-neutral-400 italic">No memories</div>
            ) : (
                <div className="space-y-2">
                    {memories.map((memory) => (
                        <div key={memory.id} className="pl-1.5">
                            <div className="flex items-center gap-1 text-[9px] text-neutral-400 mb-0.5">
                                <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
                                <span>{formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}</span>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute left-[-4px] top-0 bottom-0 w-[1px] bg-violet-200 dark:bg-violet-800"></div>
                                <p className="text-[10px] leading-tight border border-neutral-100 dark:border-neutral-800 rounded-sm py-1 px-2 bg-white/80 dark:bg-neutral-900/80 text-neutral-800 dark:text-neutral-200">
                                    {memory.content}
                                </p>
                            </div>

                            {memory.tags && memory.tags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-1 ml-2">
                                    {memory.tags.map((tag, tagIndex) => (
                                        <span
                                            key={tagIndex}
                                            className="inline-flex items-center text-[8px] px-1 border border-violet-100 dark:border-violet-900 rounded-full text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full my-1 px-2 py-2 border border-neutral-200 dark:border-neutral-800 border-l-violet-300 dark:border-l-violet-800 border-l-2 rounded-sm bg-white/50 dark:bg-neutral-900/50">
            <MemoryCard />
        </div>
    );
};

export default MemoryManager; 