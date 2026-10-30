import { z } from 'zod';
const target = z.string().regex(/^e\d+$/);
export const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), target }),
  z.object({ type: z.literal('fill'), target, value: z.string() }),
  z.object({ type: z.literal('select'), target, value: z.string() }),
  z.object({ type: z.literal('press'), target, key: z.enum(['Enter','Tab','Escape','ArrowDown','ArrowUp','Space']) }),
  z.object({ type: z.literal('navigate'), url: z.string().url() }),
  z.object({ type: z.literal('back') }),
  z.object({ type: z.literal('scroll'), direction: z.enum(['up','down']) }),
  z.object({ type: z.literal('wait'), milliseconds: z.number().int().min(250).max(5000) }),
  z.object({ type: z.literal('ask'), question: z.string().min(1) }),
  z.object({ type: z.literal('blocked'), reason: z.string().min(1) }),
  z.object({ type: z.literal('finish'), summary: z.string().min(1), evidence: z.array(z.object({
    kind: z.enum(['text','url','value']), expected: z.string().min(1), target: target.optional()
  })).min(1), data: z.record(z.string(),z.unknown()).optional() })
]);
export type Action = z.infer<typeof Action>;
export const Decision = z.object({ reason: z.string(), action: Action });
export type Decision = z.infer<typeof Decision>;
export function publicUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP(S) URL without embedded credentials');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host === '::1' || host.startsWith('127.') || host.startsWith('169.254.') || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '0.0.0.0') throw new Error('Only public sandbox sites are supported');
  return url.href;
}
