import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { z } from 'zod';
import axios from 'axios';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
const APP_TOKEN = process.env.APP_TOKEN;

if (!GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY in environment');
}

if (!APP_TOKEN) {
  throw new Error('Missing APP_TOKEN in environment');
}

// Middleware
app.use(express.json({ limit: '16kb' }));
app.set('trust proxy', 1);

// CORS: restrict to the app (native apps send no origin, so this is mostly for curl/testing)
app.use(cors({ origin: false }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 500, // 500 requests per day globally
  keyGenerator: () => 'global',
  message: 'Service rate limit exceeded. Please try again tomorrow.',
});

app.use(limiter);
app.use(globalLimiter);

// Auth middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.get('X-App-Token');
  console.log('[AUTH] Token received:', token ? 'yes' : 'missing');
  if (!token || token !== APP_TOKEN) {
    console.log('[AUTH] Token mismatch or missing. Expected:', APP_TOKEN, 'Got:', token);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log('[AUTH] Token valid');
  next();
};

// Validation schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

const ContextSchema = z.object({
  trip: z.object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    stops: z.array(
      z.object({
        parkName: z.string(),
        parkCode: z.string(),
      })
    ),
    notes: z.string().max(300).optional(),
  }).optional(),
  alerts: z.array(
    z.object({
      id: z.string(),
      parkCode: z.string(),
      title: z.string(),
      description: z.string(),
      category: z.string(),
    })
  ).max(5).optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).max(20),
  context: ContextSchema.optional(),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

const SYSTEM_PROMPT = `You are a helpful assistant for the FeatherGlobe app, which helps users plan trips to US National Parks.

Your role is to:
- Answer questions about national parks, their features, facilities, and attractions
- Help users plan park visits and trips
- Provide information about park amenities and activities
- Suggest parks based on user interests

Important guidelines:
- You are NOT a source of official information. Always encourage users to visit nps.gov or contact ranger stations for authoritative information about park status, closures, and safety.
- Do NOT provide medical, legal, or safety advice. Defer to official authorities.
- Do NOT provide information outside the scope of National Park planning and travel.
- If asked something off-topic, politely redirect to parks and travel planning.
- Be concise and friendly.

When you see trip or park context below, use it to provide personalized suggestions.`;

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/v1/chat', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('[CHAT] Request received');
    console.log('[CHAT] Body:', JSON.stringify(req.body, null, 2));

    // Validate request
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const { messages, context } = parsed.data;

    // Build context string
    let contextStr = '';
    if (context?.trip) {
      const { trip } = context;
      const stopNames = trip.stops.map((s) => `${s.parkName} (${s.parkCode})`).join(', ');
      contextStr += `\n\nUser's Trip:\n`;
      contextStr += `- Name: ${trip.name}\n`;
      contextStr += `- Dates: ${trip.startDate} to ${trip.endDate}\n`;
      contextStr += `- Parks: ${stopNames}\n`;
      if (trip.notes) {
        contextStr += `- Notes: ${trip.notes}\n`;
      }
    }

    if (context?.alerts && context.alerts.length > 0) {
      contextStr += `\n\nActive Park Alerts (Urgent):\n`;
      context.alerts.forEach((alert) => {
        contextStr += `- ${alert.parkCode}: ${alert.title}\n`;
      });
      contextStr += `(User should check nps.gov for full details.)\n`;
    }

    // Build Groq request with validated messages
    const groqMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT + contextStr },
      ...messages,
    ];

    // Call Groq API
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const reply = groqResponse.data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ error: 'No response from Groq API' });
    }

    res.json({ reply });
  } catch (error: unknown) {
    console.error('Chat error:', error);

    if (axios.isAxiosError(error)) {
      console.error('[GROQ ERROR] Status:', error.response?.status);
      console.error('[GROQ ERROR] Data:', JSON.stringify(error.response?.data, null, 2));

      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'Upstream timeout' });
      }
      if (error.response?.status === 429) {
        return res.status(429).json({ error: 'Groq rate limit exceeded' });
      }
      if (error.response?.status === 401) {
        return res.status(500).json({ error: 'Invalid Groq API key' });
      }
      if (error.response?.status === 400) {
        return res.status(400).json({ error: 'Bad request to Groq', details: error.response?.data });
      }
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling for oversized requests
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message.includes('payload too large')) {
    return res.status(413).json({ error: 'Request too large' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`FeatherGlobe chat proxy listening on port ${PORT}`);
});
