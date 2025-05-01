import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AlignLeft, ArrowRight, ChevronLeft, ChevronRight, Copy, Download, X } from 'lucide-react';
import { TextUIPart, ReasoningUIPart, ToolInvocationUIPart, SourceUIPart } from '@ai-sdk/ui-utils';

// Define MessagePart type
type MessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart;

interface MessageProps {
  message: any;
  index: number;
  lastUserMessageIndex: number;
  isEditingMessage: boolean;
  editingMessageIndex: number;
  input: string;
  setInput: (value: string) => void;
  setIsEditingMessage: (value: boolean) => void;
  setEditingMessageIndex: (value: number) => void;
  renderPart: (
    part: MessagePart,
    messageIndex: number,
    partIndex: number,
    parts: MessagePart[],
    message: any
  ) => React.ReactNode;
  status: string;
  messages: any[];
  setMessages: (messages: any[]) => void;
  append: (message: any, options?: any) => Promise<string | null | undefined>;
  reload: () => Promise<string | null | undefined>;
  setSuggestedQuestions: (questions: string[]) => void;
  suggestedQuestions: string[];
}

export const Message: React.FC<MessageProps> = ({
  message,
  index,
  lastUserMessageIndex,
  isEditingMessage,
  editingMessageIndex,
  input,
  setInput,
  setIsEditingMessage,
  setEditingMessageIndex,
  renderPart,
  status,
  messages,
  setMessages,
  append,
  reload,
  setSuggestedQuestions,
  suggestedQuestions
}) => {
  // Move handlers inside the component
  const handleMessageEdit = useCallback((index: number) => {
    setIsEditingMessage(true);
    setEditingMessageIndex(index);
    setInput(messages[index].content);
  }, [messages, setInput, setIsEditingMessage, setEditingMessageIndex]);

  const handleMessageUpdate = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      // Get the history *before* the message being edited
      const historyBeforeEdit = messages.slice(0, editingMessageIndex);

      // Get the original message to preserve attachments if any
      const originalMessage = messages[editingMessageIndex];

      // Update the hook's message state to remove messages after the edited one
      setMessages(historyBeforeEdit);

      // Store the edited message content for the next step
      const editedContent = input.trim();

      // Clear the input field immediately
      setInput('');

      // Reset suggested questions
      setSuggestedQuestions([]);

      // Extract attachments from the original message
      const attachments = originalMessage?.experimental_attachments || [];

      // Append the edited message with proper attachments using chatRequestOptions format
      append(
        {
          role: 'user', // Role is always 'user' for edited messages
          content: editedContent,
        },
        {
          experimental_attachments: attachments
        }
      );

      // Reset editing state
      setIsEditingMessage(false);
      setEditingMessageIndex(-1);
    } else {
      toast.error("Please enter a valid message.");
    }
  }, [input, messages, editingMessageIndex, setMessages, setInput, append, setSuggestedQuestions, setIsEditingMessage, setEditingMessageIndex]);

  const handleSuggestedQuestionClick = useCallback(async (question: string) => {
    setSuggestedQuestions([]);

    await append({
      content: question.trim(),
      role: 'user'
    });
  }, [append, setSuggestedQuestions]);

  const handleRegenerate = useCallback(async () => {
    if (status !== 'ready') {
      toast.error("Please wait for the current response to complete!");
      return;
    }

    const lastUserMessage = messages.findLast(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Remove the last assistant message
    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);
    setSuggestedQuestions([]);

    // Resubmit the last user message
    await reload();
  }, [status, messages, setMessages, reload, setSuggestedQuestions]);

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 px-0"
      >
        <div className="grow min-w-0">
          {isEditingMessage && editingMessageIndex === index ? (
            <form onSubmit={handleMessageUpdate} className="w-full">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Edit Query
                  </span>
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-[9px] border border-neutral-200 dark:border-neutral-700 flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setInput('');
                      }}
                      className="h-7 w-7 rounded-l-lg! rounded-r-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                      disabled={status === 'submitted' || status === 'streaming'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-7 bg-neutral-200 dark:bg-neutral-700" />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-r-lg! rounded-l-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                      disabled={status === 'submitted' || status === 'streaming'}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
                    placeholder="Edit your message..."
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="group relative">
              <div className="relative">
                <p className="text-xl font-medium font-sans break-words text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12">
                  {message.content}
                </p>
                {!isEditingMessage && index === lastUserMessageIndex && (
                  <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent rounded-[9px] border border-neutral-200 dark:border-neutral-700 flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMessageEdit(index)}
                      className="h-7 w-7 rounded-l-lg! rounded-r-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                      disabled={status === 'submitted' || status === 'streaming'}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                      >
                        <path
                          d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L9.94915 6.83442L13.5382 3.24535L12.5 2.20711ZM8.99997 1.49997C9.27611 1.49997 9.49997 1.72383 9.49997 1.99997C9.49997 2.27611 9.27611 2.49997 8.99997 2.49997H4.49997C3.67154 2.49997 2.99997 3.17154 2.99997 3.99997V11C2.99997 11.8284 3.67154 12.5 4.49997 12.5H11.5C12.3284 12.5 13 11.8284 13 11V6.49997C13 6.22383 13.2238 5.99997 13.5 5.99997C13.7761 5.99997 14 6.22383 14 6.49997V11C14 12.3807 12.8807 13.5 11.5 13.5H4.49997C3.11926 13.5 1.99997 12.3807 1.99997 11V3.99997C1.99997 2.61926 3.11926 1.49997 4.49997 1.49997H8.99997Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Button>
                    <Separator orientation="vertical" className="h-7" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        toast.success("Copied to clipboard");
                      }}
                      className="h-7 w-7 rounded-r-lg! rounded-l-none! text-neutral-500 dark:text-neutral-400 hover:text-primary"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                <AttachmentsBadge attachments={message.experimental_attachments} />
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <>
        {message.parts?.map((part: MessagePart, partIndex: number) =>
          renderPart(
            part,
            index,
            partIndex,
            message.parts as MessagePart[],
            message,
          )
        )}

        {/* Add suggested questions if this is the last message */}
        {suggestedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl sm:max-w-2xl mt-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlignLeft className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-base text-neutral-800 dark:text-neutral-200">Suggested questions</h2>
            </div>
            <div className="space-y-2 flex flex-col">
              {suggestedQuestions.map((question, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="w-fit font-medium rounded-2xl p-1 justify-start text-left h-auto py-2 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 whitespace-normal"
                  onClick={() => handleSuggestedQuestionClick(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </>
    );
  }

  return null;
};

// Export the attachments badge component for reuse
export const AttachmentsBadge = ({ attachments }: { attachments: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const imageAttachments = attachments.filter(att => att.contentType?.startsWith('image/'));

  if (imageAttachments.length === 0) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {imageAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `Image ${i + 1}`;
          const truncatedName = fileName.length > 15
            ? fileName.substring(0, 12) + '...'
            : fileName;

          return (
            <button
              key={i}
              onClick={() => {
                setSelectedIndex(i);
                setIsOpen(true);
              }}
              className="flex items-center gap-1.5 max-w-xs rounded-full pl-1 pr-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                <img
                  src={attachment.url}
                  alt={fileName}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                {truncatedName}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 bg-white dark:bg-neutral-900 sm:max-w-4xl">
          <div className="flex flex-col h-full">
            <header className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(imageAttachments[selectedIndex].url);
                    toast.success("Image URL copied to clipboard");
                  }}
                  className="h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  href={imageAttachments[selectedIndex].url}
                  download={imageAttachments[selectedIndex].name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mr-8">
                  {selectedIndex + 1} of {imageAttachments.length}
                </Badge>
              </div>

              <div className="w-8"></div> {/* Spacer to balance the header and avoid overlap with close button */}
            </header>

            <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
              <div className="relative max-w-full max-h-[60vh]">
                <img
                  src={imageAttachments[selectedIndex].url}
                  alt={imageAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                  className="max-w-full max-h-[60vh] object-contain rounded-md"
                />

                {imageAttachments.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex(prev => (prev === 0 ? imageAttachments.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedIndex(prev => (prev === imageAttachments.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-xs"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {imageAttachments.length > 1 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {imageAttachments.map((attachment, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`relative h-12 w-12 rounded-md overflow-hidden shrink-0 transition-all ${selectedIndex === idx
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'opacity-70 hover:opacity-100'
                        }`}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.name || `Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <footer className="border-t border-neutral-200 dark:border-neutral-800 p-3">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                <span className="truncate max-w-[80%]">
                  {imageAttachments[selectedIndex].name || `Image ${selectedIndex + 1}`}
                </span>
                {imageAttachments[selectedIndex].size && (
                  <span>
                    {Math.round(imageAttachments[selectedIndex].size / 1024)} KB
                  </span>
                )}
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 