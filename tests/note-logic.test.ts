import { describe, it, expect } from 'vitest';
import { validateNoteText, unseenCount, otherPerson } from '../lib/note-logic';
import type { Note, UserProfile } from '../lib/types';

const note = (id: string, authorUid: string, createdAt: number): Note => ({
  id, authorUid, createdAt, text: 'hi', color: '#FFD9A0', style: {},
});

describe('validateNoteText', () => {
  it('accepts non-empty text within the cap', () => {
    expect(validateNoteText('hello', 280)).toEqual({ ok: true, value: 'hello' });
  });
  it('trims surrounding whitespace', () => {
    expect(validateNoteText('  hi  ', 280)).toEqual({ ok: true, value: 'hi' });
  });
  it('rejects empty/whitespace-only text', () => {
    expect(validateNoteText('   ', 280).ok).toBe(false);
  });
  it('rejects text longer than the cap', () => {
    expect(validateNoteText('x'.repeat(281), 280).ok).toBe(false);
  });
});

describe('unseenCount', () => {
  const notes = [note('1', 'me', 100), note('2', 'them', 200), note('3', 'them', 300)];
  it('counts notes from others newer than lastSeen', () => {
    expect(unseenCount(notes, 'me', 150)).toBe(2);
  });
  it('never counts your own notes', () => {
    expect(unseenCount(notes, 'them', 0)).toBe(1); // only note 1 (from "me")
  });
  it('returns 0 when caught up', () => {
    expect(unseenCount(notes, 'me', 999)).toBe(0);
  });
});

describe('otherPerson', () => {
  const me: UserProfile = { uid: 'me', displayName: 'Me', photoURL: '', email: 'm@x.com' };
  const them: UserProfile = { uid: 'them', displayName: 'Them', photoURL: '', email: 't@x.com' };
  it('returns the profile that is not the current uid', () => {
    expect(otherPerson([me, them], 'me')?.uid).toBe('them');
  });
  it('returns undefined when the other profile is missing', () => {
    expect(otherPerson([me], 'me')).toBeUndefined();
  });
});
