import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseAIChatOptions {
  teamData?: any;
  gameweekId: number | null;
  predictions?: Map<number, number>;
}

export function useAIChat({ teamData, gameweekId, predictions }: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id.startsWith('stream-')) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: `stream-${Date.now()}`,
            role: 'assistant' as const,
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-fpl-assistant`;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: userMessage.content,
          team_data: teamData,
          gameweek_id: gameweekId,
          predictions: predictions ? Object.fromEntries(predictions) : {},
          conversation_history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          throw new Error(errorData.error || 'Rate limit exceeded. Please wait a moment.');
        }
        if (resp.status === 402) {
          throw new Error(errorData.error || 'AI credits depleted. Please add credits.');
        }
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      // If no content was streamed at all, show a fallback
      if (!assistantContent) {
        upsertAssistant("I couldn't generate a response. Please try rephrasing your question.");
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setMessages(prev => [
        ...prev.filter(m => !m.id.startsWith('stream-') || m.content),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, teamData, gameweekId, predictions]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
