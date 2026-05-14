import { z } from 'zod';

export function parseBody<T>(body: string | null | undefined, schema: z.ZodType<T>): T {
  if (!body) throw Object.assign(new Error('Request body is required'), { statusCode: 400 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const msg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw Object.assign(new Error(msg), { statusCode: 422 });
  }
  return result.data;
}
