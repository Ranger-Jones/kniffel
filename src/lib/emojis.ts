/** Handverlesene Reaktionen (60). Nur diese werden gesendet und angezeigt. */
export const EMOJI_CATALOG = [
  '🎉', '😂', '😱', '🔥', '👏', '😭',
  '😀', '🤣', '😊', '😍', '🥳', '😎', '🤩', '😜', '🤪', '😏', '😅', '😬', '🙃', '😇',
  '🤔', '🤨', '😴', '😤', '😡', '🤯', '🥶', '🥵', '😈', '💀', '🤡', '👻', '🙈', '🫠',
  '🙌', '👍', '👎', '🤞', '✌️', '💪', '🙏', '👀', '🫡', '💯', '✨', '⭐', '🏆', '🥇',
  '🎲', '🍀', '💸', '❤️', '💔', '💥', '🚀', '🐐', '🍿', '🍻', '☕', '🧠',
] as const;

export const DEFAULT_QUICK_EMOJIS = ['🎉', '😂', '😱', '🔥', '👏', '😭'] as const;
export const QUICK_EMOJI_COUNT = 6;

export function isAllowedEmoji(value: unknown): value is string {
  return typeof value === 'string' && (EMOJI_CATALOG as readonly string[]).includes(value);
}

export function isValidQuickEmojis(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === QUICK_EMOJI_COUNT
    && value.every(isAllowedEmoji) && new Set(value).size === QUICK_EMOJI_COUNT;
}

export function normalizeQuickEmojis(value: unknown): string[] {
  return isValidQuickEmojis(value) ? [...value] : [...DEFAULT_QUICK_EMOJIS];
}
