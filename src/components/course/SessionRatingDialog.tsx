import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { RatingStars } from './RatingStars';
import { Star } from 'lucide-react';
import { useState, useEffect } from 'react';

export type SessionRatingKind = 'lesson' | 'live';

export interface SessionRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: SessionRatingKind;
  courseTitle: string;
  sessionTitle: string;
  initialRating?: number | null;
  onSubmit: (rating: number) => Promise<void>;
}

export function SessionRatingDialog({
  open,
  onOpenChange,
  kind,
  courseTitle,
  sessionTitle,
  initialRating,
  onSubmit,
}: SessionRatingDialogProps) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRating(initialRating ?? 0);
  }, [open, initialRating]);

  const headline =
    kind === 'lesson' ? 'How was this lesson?' : 'How was this live session?';

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;
    setSaving(true);
    try {
      await onSubmit(rating);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <DialogTitle>{headline}</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-1 pt-1 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{courseTitle}</p>
              <p className="text-foreground/90">{sessionTitle}</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <RatingStars value={rating} onChange={setRating} size="md" />
          <p className="text-xs text-muted-foreground mt-2">Tap a star to rate from 1 to 5.</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          {kind === 'live' && (
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Later
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={saving || rating < 1}>
            {saving ? 'Saving…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
