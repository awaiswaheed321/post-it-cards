export interface Note {
  id: string;
  authorUid: string;
  text: string;
  color: string;
  style: Record<string, unknown>;
  createdAt: number; // epoch ms (converted from Firestore Timestamp)
}

export type NoteInput = Pick<Note, 'text' | 'color' | 'style'>;

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}
