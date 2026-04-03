import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ConfirmDialog } from './ui/confirm-dialog';
import { StickyNote, Plus, Trash2, Clock } from 'lucide-react';
import { notesService, type LessonNote } from '../services/notesService';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface LessonNotesPanelProps {
  lessonId: string;
  courseId: string;
  currentTime: number;
  onSeekToTimestamp: (timestamp: number) => void;
}

export function LessonNotesPanel({ lessonId, courseId, currentTime, onSeekToTimestamp }: LessonNotesPanelProps) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const currentTimeRef = useRef(currentTime);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    loadNotes();
  }, [lessonId]);

  const loadNotes = () => {
    const lessonNotes = notesService.getLessonNotes(lessonId);
    setNotes(lessonNotes);
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) {
      toast.error('Please enter a note');
      return;
    }

    notesService.createNote(lessonId, courseId, currentTimeRef.current, noteContent.trim());
    setNoteContent('');
    setIsAddingNote(false);
    loadNotes();
    toast.success('Note added');
  };

  const handleDeleteNote = (noteId: string) => {
    notesService.deleteNote(noteId);
    loadNotes();
    toast.success('Note deleted');
  };

  const formatTimestamp = (seconds: number): string => {
    return notesService.formatTimestamp(seconds);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNote(!isAddingNote)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        <AnimatePresence>
          {isAddingNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 p-3 border rounded-lg bg-muted/50"
            >
              <div className="text-sm text-muted-foreground">
                At {formatTimestamp(currentTime)}
              </div>
              <Textarea
                placeholder="Write your note here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNote}>
                  Save Note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNoteContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notes yet. Add a note while watching the lesson!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <button
                      onClick={() => onSeekToTimestamp(note.timestamp)}
                      className="flex items-center gap-1 text-sm text-primary hover:underline mb-1"
                    >
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(note.timestamp)}
                    </button>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteNoteId(note.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteNoteId(null); }}
        title="Delete Note"
        description="Delete this note?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteNoteId) handleDeleteNote(deleteNoteId);
        }}
      />
    </Card>
  );
}











