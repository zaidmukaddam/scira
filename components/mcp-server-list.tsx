import React from 'react';
import { motion } from 'framer-motion';
import { 
    Copy, 
    ExternalLink, 
    Server, 
    Database, 
    Network,
    Code
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface MCPServer {
    qualifiedName: string;
    displayName: string;
    description?: string;
    homepage?: string;
    useCount?: string;
    isDeployed?: boolean;
    deploymentUrl?: string;
    connections?: Array<{
        type: string;
        url?: string;
        configSchema?: any;
    }>;
    createdAt?: string;
}

interface MCPServerListProps {
    servers: MCPServer[];
    query: string;
    pagination?: {
        currentPage: number;
        pageSize: number;
        totalPages: number;
        totalCount: number;
    };
    isLoading?: boolean;
    error?: string;
}

export const MCPServerList: React.FC<MCPServerListProps> = ({ 
    servers, 
    query, 
    isLoading,
    error
}) => {
    if (isLoading) {
        return (
            <div className="flex overflow-x-auto pb-3 space-x-3 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-shrink-0 w-80 h-28 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <Server className="h-5 w-5 text-red-500 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
        );
    }

    if (!servers || servers.length === 0) {
        return (
            <div className="flex items-center justify-center py-8 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mr-4">
                    <Server className="h-5 w-5 text-neutral-400" />
                </div>
                <div>
                    <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                        No Servers Found
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        No MCP servers matching &quot;{query}&quot; were found.
                    </p>
                </div>
            </div>
        );
    }

    // Connection type icons
    const connectionIcons: Record<string, React.ReactNode> = {
        ws: <Network className="h-3.5 w-3.5" />,
        stdio: <Code className="h-3.5 w-3.5" />,
        default: <Database className="h-3.5 w-3.5" />
    };

    return (
        <div className="space-y-3">
            <div className="px-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {servers.length} server{servers.length !== 1 ? 's' : ''} found
                </p>
            </div>

            <div className="flex overflow-x-auto pb-3 gap-3 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                {servers.map((server, idx) => {
                    return (
                        <motion.div
                            key={server.qualifiedName}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            className="flex-shrink-0 w-80 rounded-lg border border-neutral-200 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/40"
                        >
                            <div className="p-3.5">
                                <div className="flex items-start space-x-3 mb-2.5">
                                    <div className="h-9 w-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                        <Server className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate leading-tight">
                                                {server.displayName || server.qualifiedName}
                                            </h3>
                                            
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                                {server.homepage && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => window.open(server.homepage, '_blank')}
                                                        className="h-6 w-6 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(server.qualifiedName);
                                                        toast.success("Server ID copied!");
                                                    }}
                                                    className="h-6 w-6 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                            {server.qualifiedName}
                                        </p>
                                    </div>
                                </div>
                                
                                {server.description && (
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2.5 line-clamp-2">
                                        {server.description}
                                    </p>
                                )}
                                
                                {/* Connection badges */}
                                <div className="flex flex-wrap gap-1.5">
                                    {server.connections?.map((conn, idx) => (
                                        <TooltipProvider key={`${conn.type}-${idx}`}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge 
                                                        className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:!bg-neutral-700 hover:text-neutral-900 dark:hover:text-white border-0 px-2 py-0.5 text-xs flex items-center gap-1 cursor-pointer transition-colors duration-150"
                                                        onClick={() => {
                                                            if (conn.url) {
                                                                navigator.clipboard.writeText(conn.url);
                                                                toast.success(`${conn.type} URL copied!`);
                                                            }
                                                        }}
                                                    >
                                                        {connectionIcons[conn.type] || connectionIcons.default}
                                                        {conn.type}
                                                    </Badge>
                                                </TooltipTrigger>
                                                {conn.url && (
                                                    <TooltipContent className="max-w-xs">
                                                        <code className="text-xs font-mono break-all">
                                                            {conn.url}
                                                        </code>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                    
                                    {server.deploymentUrl && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge 
                                                        className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 hover:text-emerald-800 dark:hover:text-emerald-200 border-0 px-2 py-0.5 text-xs flex items-center gap-1 cursor-pointer transition-colors duration-150"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(server.deploymentUrl!);
                                                            toast.success("Deployment URL copied!");
                                                        }}
                                                    >
                                                        <Server className="h-3.5 w-3.5" />
                                                        deployed
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    <code className="text-xs font-mono break-all">
                                                        {server.deploymentUrl}
                                                    </code>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                                
                                {server.useCount && parseInt(server.useCount) > 0 && (
                                    <div className="flex justify-between text-[10px] text-neutral-500 mt-2.5">
                                        <span>Usage: {server.useCount}</span>
                                        {server.createdAt && (
                                            <span>Added: {new Date(server.createdAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default MCPServerList; 