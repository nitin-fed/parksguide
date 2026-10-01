export class MissingChatConfigError extends Error {
  constructor() {
    super('Chat API is not configured. Set EXPO_PUBLIC_CHAT_API_URL and EXPO_PUBLIC_CHAT_APP_TOKEN in .env');
    this.name = 'MissingChatConfigError';
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  trip?: {
    name: string;
    startDate: string;
    endDate: string;
    stops: { parkName: string; parkCode: string }[];
    notes?: string;
  };
  alerts?: {
    id: string;
    parkCode: string;
    title: string;
    description: string;
    category: string;
  }[];
}

export interface ChatResponse {
  reply: string;
}

export async function sendChat(
  messages: ChatMessage[],
  context?: ChatContext,
  signal?: AbortSignal
): Promise<string> {
  const apiUrl = process.env.EXPO_PUBLIC_CHAT_API_URL;
  const appToken = process.env.EXPO_PUBLIC_CHAT_APP_TOKEN;

  if (!apiUrl || !appToken) {
    throw new MissingChatConfigError();
  }

  const response = await fetch(`${apiUrl}/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Token': appToken,
    },
    body: JSON.stringify({
      messages,
      context,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Chat API authentication failed');
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    if (response.status === 504) {
      throw new Error('Chat service temporarily unavailable');
    }
    if (response.status === 413) {
      throw new Error('Request too large');
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat API error: ${response.status}`);
  }

  const data: ChatResponse = await response.json();
  return data.reply;
}
