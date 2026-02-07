import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageCircle,
  Loader2,
  Bot,
  X,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { ChatInput } from '@/components/ai/ChatInput';
import { EmptyState } from '@/components/ai/EmptyState';

interface AIAssistantProps {
  teamData?: any;
  gameweekId: number | null;
  predictions?: Map<number, number>;
  className?: string;
}

export function AIAssistant({
  teamData,
  gameweekId,
  predictions,
  className,
}: AIAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage, clearMessages } = useAIChat({
    teamData,
    gameweekId,
    predictions,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollEl = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    }
  }, [messages]);

  const handleQuickQuestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50',
          'gradient-primary hover:scale-105 transition-transform',
          className
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed z-50 shadow-2xl border-border transition-all duration-300 flex flex-col',
        isExpanded
          ? 'inset-4 md:inset-8'
          : 'bottom-6 right-6 w-[400px] h-[560px] max-h-[85vh]',
        className
      )}
    >
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg gradient-primary">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            FPL AI Assistant
            <Badge variant="secondary" className="text-xs">
              Live Data
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea ref={scrollRef} className="h-full p-4">
          {messages.length === 0 ? (
            <EmptyState onQuestionClick={handleQuickQuestion} />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3 mr-8">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <ChatInput
        isLoading={isLoading}
        onSend={sendMessage}
        autoFocus={isOpen}
      />
    </Card>
  );
}
