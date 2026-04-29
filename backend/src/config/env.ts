import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    PORT: z.coerce.number().int().positive().default(3000),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    // Semantic cache — cosine similarity threshold (0–1) and TTL in hours
    SEMANTIC_CACHE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.92),
    SEMANTIC_CACHE_TTL_HOURS: z.coerce.number().int().positive().default(24),
});

const result = schema.safeParse(process.env);

if (!result.success) {
    const lines = result.error.issues
        .map(issue => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    console.error(`[Startup] Invalid or missing environment variables:\n${lines}`);
    process.exit(1);
}

export const env = result.data;
