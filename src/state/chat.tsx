import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatContext, sendChat } from '@/api/chat';

export type ChatStatus = 'idle' | 'sending' | 'error';

export interface ChatThread {
  messages: ChatMessage[];
  error?: string;
}

interface ChatContextValue {
  messages: ChatMessage[];
  status: ChatStatus;
  error?: string;
  send: (content: string, context?: ChatContext) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => Promise<void>;
}

const ChatContextInstance = createContext<ChatContextValue | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'parksguide/chat/v1';
const MAX_HISTORY = 10;

async function loadChatThread(threadId: string): Promise<ChatThread> {
  try {
    const key = `${STORAGE_KEY_PREFIX}:${threadId}`;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return { messages: [] };
    }
    return JSON.parse(stored);
  } catch (err) {
    console.error('Failed to load chat thread:', err);
    return { messages: [] };
  }
}

async function saveChatThread(threadId: string, thread: ChatThread): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}:${threadId}`;
    await AsyncStorage.setItem(key, JSON.stringify(thread));
  } catch (err) {
    console.error('Failed to save chat thread:', err);
  }
}

export function useChatProvider(threadId: string = 'general') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<string>();
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const lastContextRef = useRef<ChatContext | undefined>(undefined);

  // Load messages on mount
  useEffect(() => {
    loadChatThread(threadId).then((thread) => {
      setMessages(thread.messages);
      if (thread.error) {
        setError(thread.error);
      }
    });
  }, [threadId]);

  const send = useCallback(
    async (content: string, context?: ChatContext) => {
      if (!content.trim()) return;

      setError(undefined);
      lastContextRef.current = context;

      const userMessage: ChatMessage = { role: 'user', content };
      const updatedMessages = [...messages, userMessage];

      // Trim to last MAX_HISTORY turns
      const trimmedMessages = updatedMessages.slice(-MAX_HISTORY);

      setMessages(trimmedMessages);
      setStatus('sending');

      // Abort any previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const reply = await sendChat(trimmedMessages, context, abortControllerRef.current.signal);
        const assistantMessage: ChatMessage = { role: 'assistant', content: reply };
        const finalMessages = [...trimmedMessages, assistantMessage];

        setMessages(finalMessages);
        setStatus('idle');

        // Save to storage
        await saveChatThread(threadId, { messages: finalMessages });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return;
        }

        const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMsg);
        setStatus('error');

        // Save error state
        await saveChatThread(threadId, { messages: trimmedMessages, error: errorMsg });
      }
    },
    [messages, threadId]
  );

  const retry = useCallback(async () => {
    if (messages.length === 0) return;

    // Get the last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) return;

    // Remove assistant messages after the last user message
    const trimmedMessages = messages.slice(0, lastUserIdx + 1);
    setMessages(trimmedMessages);

    // Resend
    setError(undefined);
    setStatus('sending');

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const reply = await sendChat(trimmedMessages, lastContextRef.current, abortControllerRef.current.signal);
      const assistantMessage: ChatMessage = { role: 'assistant', content: reply };
      const finalMessages = [...trimmedMessages, assistantMessage];

      setMessages(finalMessages);
      setStatus('idle');

      await saveChatThread(threadId, { messages: finalMessages });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      setStatus('error');

      await saveChatThread(threadId, { messages: trimmedMessages, error: errorMsg });
    }
  }, [messages, threadId]);

  const clear = useCallback(async () => {
    setMessages([]);
    setError(undefined);
    setStatus('idle');
    abortControllerRef.current?.abort();

    // Clear from storage
    const key = `${STORAGE_KEY_PREFIX}:${threadId}`;
    await AsyncStorage.removeItem(key);
  }, [threadId]);

  return {
    messages,
    status,
    error,
    send,
    retry,
    clear,
  };
}

export function ChatProvider({ threadId = 'general', children }: { threadId?: string; children: ReactNode }) {
  const value = useChatProvider(threadId);
  return <ChatContextInstance.Provider value={value}>{children}</ChatContextInstance.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContextInstance);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
