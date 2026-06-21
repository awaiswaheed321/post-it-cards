import type { Note, UserProfile } from './types';

export type ValidationResult = { ok: true; value: string } | { ok: false; reason: string };

export function validateNoteText(raw: string, max: number): ValidationResult {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if (value.length > max) return { ok: false, reason: 'too-long' };
  return { ok: true, value };
}

export function unseenCount(notes: Note[], myUid: string, lastSeenAt: number): number {
  return notes.filter((n) => n.authorUid !== myUid && n.createdAt > lastSeenAt).length;
}

export function otherPerson(profiles: UserProfile[], myUid: string): UserProfile | undefined {
  return profiles.find((p) => p.uid !== myUid);
}
