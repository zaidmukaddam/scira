'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ConversationViewerDialogProps {
  chatId: string;
  open: boolean;
  onClose: () => void;
}

export function ConversationViewerDialog({ chatId, open, onClose }: ConversationViewerDialogProps) {
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['admin-conversation', chatId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/chats/${chatId}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Conversation: {conversation?.chat?.title || 'Chargement...'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {conversation?.messages?.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>{msg.role}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                      {msg.model && <Badge variant="outline">{msg.model}</Badge>}
                    </div>

                    <div
                      className={`p-4 rounded-lg ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {msg.parts?.map((part: any, idx: number) => (
                        <div key={idx}>
                          {part.type === 'text' && <p className="whitespace-pre-wrap">{part.text}</p>}
                          {part.type === 'tool-call' && (
                            <div className="text-sm opacity-70">🔧 Tool: {part.toolName}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {msg.inputTokens && `${msg.inputTokens} tokens in`}
                      {msg.outputTokens && ` • ${msg.outputTokens} tokens out`}
                      {msg.completionTime && ` • ${(msg.completionTime / 1000).toFixed(2)}s`}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation?.user?.image} />
                      <AvatarFallback>{conversation?.user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
