// Notes and annotations service for lessons
// This service manages timestamped notes during lessons

export interface LessonNote {
  id: string;
  lessonId: string;
  courseId: string;
  timestamp: number; // video timestamp in seconds
  content: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

class NotesService {
  private storageKey = 'academix_lesson_notes';

  // Get all notes from localStorage
  private getNotesData(): Record<string, LessonNote> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  // Save notes to localStorage
  private saveNotesData(data: Record<string, LessonNote>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  }

  // Create a new note
  createNote(lessonId: string, courseId: string, timestamp: number, content: string): LessonNote {
    const data = this.getNotesData();
    const now = new Date().toISOString();
    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const note: LessonNote = {
      id,
      lessonId,
      courseId,
      timestamp,
      content,
      createdAt: now,
      updatedAt: now,
    };

    data[id] = note;
    this.saveNotesData(data);

    return note;
  }

  // Update an existing note
  updateNote(noteId: string, content: string): LessonNote | null {
    const data = this.getNotesData();
    const note = data[noteId];

    if (!note) return null;

    note.content = content;
    note.updatedAt = new Date().toISOString();

    data[noteId] = note;
    this.saveNotesData(data);

    return note;
  }

  // Delete a note
  deleteNote(noteId: string): boolean {
    const data = this.getNotesData();
    if (!data[noteId]) return false;

    delete data[noteId];
    this.saveNotesData(data);
    return true;
  }

  // Get all notes for a lesson
  getLessonNotes(lessonId: string): LessonNote[] {
    const data = this.getNotesData();
    return Object.values(data)
      .filter((note) => note.lessonId === lessonId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get all notes for a course
  getCourseNotes(courseId: string): LessonNote[] {
    const data = this.getNotesData();
    return Object.values(data)
      .filter((note) => note.courseId === courseId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Search notes by content
  searchNotes(query: string, courseId?: string): LessonNote[] {
    const data = this.getNotesData();
    const lowerQuery = query.toLowerCase();

    return Object.values(data)
      .filter((note) => {
        const matchesCourse = courseId ? note.courseId === courseId : true;
        const matchesContent = note.content.toLowerCase().includes(lowerQuery);
        return matchesCourse && matchesContent;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /** Format timestamp as M:SS or H:MM:SS for long videos */
  formatTimestamp(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (h > 0) {
      return `${h}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const notesService = new NotesService();











