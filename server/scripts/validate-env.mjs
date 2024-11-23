import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  JWT_SECRET: z.string().min(32),
  ADMIN_USERNAME: z.string().min(3),
  ADMIN_PASSWORD: z.string().min(8),
  USER_USERNAME: z.string().min(3),
  USER_PASSWORD: z.string().min(8),
});

export function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error.errors);
    process.exit(1);
  }
} 