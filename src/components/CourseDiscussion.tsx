import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ConfirmDialog } from './ui/confirm-dialog';
import { MessageSquare, ThumbsUp, Reply, Edit, Trash2, Send } from 'lucide-react';
import { discussionService, type DiscussionPost } from '../services/discussionService';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/useAuthStore';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/cn';

interface CourseDiscussionProps {
  courseId: string;
  lessonId?: string;
  title?: string;
}

export function CourseDiscussion({ courseId, lessonId, title }: CourseDiscussionProps) {
  const { t } = useTranslation(['student', 'common']);
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  useEffect(() => {
    loadDiscussions();
  }, [courseId, lessonId]);

  const loadDiscussions = () => {
    const discussions = discussionService.getDiscussions(courseId, lessonId);
    // Debug: log to see if replies are present
    console.log('Loaded discussions:', discussions);
    discussions.forEach((post, index) => {
      console.log(`Post ${index} (${post.id}):`, {
        content: post.content.substring(0, 50),
        repliesCount: post.replies?.length || 0,
        replies: post.replies
      });
    });
    setPosts(discussions);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast.error(t('student:components.discussion.toasts.enterMessage'));
      return;
    }

    if (!user) {
      toast.error(t('student:components.discussion.toasts.loginToPost'));
      return;
    }

    const userName = user.fullName ||
                     (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) ||
                     user.email?.split('@')[0] ||
                     t('student:components.discussion.anonymous');

    discussionService.createPost(
      courseId,
      newPostContent,
      user.id,
      userName,
      lessonId
    );
    setNewPostContent('');
    loadDiscussions();
    toast.success(t('student:components.discussion.toasts.postCreated'));
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error(t('student:components.discussion.toasts.enterReply'));
      return;
    }

    if (!user) {
      toast.error(t('student:components.discussion.toasts.loginToReply'));
      return;
    }

    const userName = user.fullName ||
                     (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) ||
                     user.email?.split('@')[0] ||
                     t('student:components.discussion.anonymous');

    discussionService.createPost(
      courseId,
      replyContent,
      user.id,
      userName,
      lessonId,
      parentId
    );
    setReplyContent('');
    setReplyingTo(null);
    loadDiscussions();
    toast.success(t('student:components.discussion.toasts.replyPosted'));
  };

  const handleUpvote = (postId: string) => {
    discussionService.toggleUpvote(postId, courseId, lessonId);
    loadDiscussions();
  };

  const handleDelete = (postId: string) => {
    if (!user) {
      toast.error(t('student:components.discussion.toasts.loginToDelete'));
      return;
    }

    if (discussionService.deletePost(postId, courseId, lessonId)) {
      loadDiscussions();
      toast.success(t('student:components.discussion.toasts.postDeleted'));
    } else {
      toast.error(t('student:components.discussion.toasts.deleteFailed'));
    }
  };

  const handleEdit = (post: DiscussionPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = (postId: string) => {
    if (!user) {
      toast.error(t('student:components.discussion.toasts.loginToEdit'));
      return;
    }

    if (!editContent.trim()) {
      toast.error(t('student:components.discussion.toasts.enterContent'));
      return;
    }

    const updated = discussionService.updatePost(postId, editContent, courseId, lessonId);
    if (updated) {
      setEditingPostId(null);
      setEditContent('');
      loadDiscussions();
      toast.success(t('student:components.discussion.toasts.postUpdated'));
    } else {
      toast.error(t('student:components.discussion.toasts.updateFailed'));
    }
  };

  const renderPost = (post: DiscussionPost, depth: number = 0) => {
    // Check if current user is the author - works for both posts and replies
    const isAuthor = user && post.userId && user.id === post.userId;
    const isEditing = editingPostId === post.id;

    return (
      <motion.div
        key={post.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'border rounded-lg p-4 space-y-3',
          depth > 0 && 'ms-8 mt-3 bg-muted/30'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">
                {post.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{post.userName}</span>
                {post.isInstructor && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {t('student:components.discussion.instructor')}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
                {post.updatedAt !== post.createdAt && (
                  <span className="text-xs text-muted-foreground">{t('student:components.discussion.edited')}</span>
                )}
              </div>
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(post.id)}>
                      {t('common:save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPostId(null);
                        setEditContent('');
                      }}
                    >
                      {t('common:cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap mt-1">{post.content}</p>
              )}
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => handleUpvote(post.id)}
              className={cn(
                'flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors',
                post.userUpvoted && 'text-primary'
              )}
            >
              <ThumbsUp className={cn('h-4 w-4', post.userUpvoted && 'fill-current')} />
              <span>{post.upvotes}</span>
            </button>
            {/* Reply button - only show on top-level posts */}
            {depth === 0 && (
              <button
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="h-4 w-4" />
                {t('student:components.discussion.reply')}
              </button>
            )}
            {/* Edit and Delete buttons - show for both posts and replies if user is author */}
            {isAuthor && (
              <>
                <button
                  onClick={() => handleEdit(post)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  title={t('student:components.discussion.editTooltip')}
                >
                  <Edit className="h-4 w-4" />
                  {t('common:edit')}
                </button>
                <button
                  onClick={() => setDeletePostId(post.id)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                  title={t('student:components.discussion.deleteTooltip')}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common:delete')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply Form */}
        <AnimatePresence>
          {replyingTo === post.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-2 border-t"
            >
              <Textarea
                placeholder={t('student:components.discussion.replyPlaceholder')}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleReply(post.id)}>
                  <Send className="h-3 w-3 me-1" />
                  {t('student:components.discussion.postReply')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                >
                  {t('common:cancel')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies Section - Always show if there are replies */}
        {post.replies && Array.isArray(post.replies) && post.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-border/50"
          >
            <div className="flex items-center gap-2 mb-3">
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {post.replies.length === 1
                  ? t('student:components.discussion.replyCountOne', { count: post.replies.length })
                  : t('student:components.discussion.replyCountOther', { count: post.replies.length })}
              </span>
            </div>
            <div className="space-y-3 ps-2 border-l-2 border-primary/20">
              {post.replies.map((reply) => renderPost(reply, depth + 1))}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {title || (lessonId ? t('student:components.discussion.lessonDiscussionTitle') : t('student:components.discussion.courseDiscussionTitle'))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Post Form */}
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <Textarea
            placeholder={lessonId ? t('student:components.discussion.placeholderLesson') : t('student:components.discussion.placeholderCourse')}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleCreatePost} size="sm">
              <Send className="h-4 w-4 me-2" />
              {t('student:components.discussion.post')}
            </Button>
          </div>
        </div>

        {/* Discussion Posts */}
        <ScrollArea className="h-[400px] max-h-[60vh]">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('student:components.discussion.noneTitle')}</p>
            </div>
          ) : (
            <div className="space-y-3 pe-4">
              {posts.map((post) => renderPost(post))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <ConfirmDialog
        open={deletePostId !== null}
        onOpenChange={(open) => { if (!open) setDeletePostId(null); }}
        title={t('student:components.discussion.deleteDialogTitle')}
        description={t('student:components.discussion.deleteDialogDescription')}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={() => {
          if (deletePostId) handleDelete(deletePostId);
        }}
      />
    </Card>
  );
}

