export const EMOJIS = ['🎉', '😂', '😱', '🔥', '👏', '😭'] as const;

export function isAllowedEmoji(value: unknown): value is (typeof EMOJIS)[number] {
  return typeof value === 'string' && (EMOJIS as readonly string[]).includes(value);
}
