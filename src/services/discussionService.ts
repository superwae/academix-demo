// Discussion and Q&A service for courses and lessons
// This service manages course discussions, questions, and answers

import { useAuthStore } from '../store/useAuthStore';

export interface DiscussionPost {
  id: string;
  courseId: string;
  lessonId?: string; // Optional - if null, it's a course-level discussion
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  isInstructor: boolean;
  upvotes: number;
  userUpvoted: boolean;
  replies: DiscussionPost[];
  parentId?: string; // For replies
}

class DiscussionService {
  private storageKey = 'academix_discussions';

  // Get all discussions from localStorage
  private getDiscussionsData(): Record<string, DiscussionPost[]> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  // Save discussions to localStorage
  private saveDiscussionsData(data: Record<string, DiscussionPost[]>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save discussions:', error);
    }
  }

  // Get current user ID (from auth store)
  private getCurrentUserId(): string {
    if (typeof window === 'undefined') return 'anonymous';
    try {
      const user = useAuthStore.getState().user;
      return user?.id || 'anonymous';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'anonymous';
    }
  }

  // Create a new discussion post
  createPost(
    courseId: string,
    content: string,
    userId: string,
    userName: string,
    lessonId?: string,
    parentId?: string
  ): DiscussionPost {
    const data = this.getDiscussionsData();
    const now = new Date().toISOString();
    const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const post: DiscussionPost = {
      id,
      courseId,
      lessonId,
      userId,
      userName,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      isInstructor: false, // Could be enhanced to check user role
      upvotes: 0,
      userUpvoted: false,
      replies: [],
      parentId,
    };

    const key = lessonId ? `${courseId}_${lessonId}` : courseId;
    if (!data[key]) {
      data[key] = [];
    }

    if (parentId) {
      // Add as reply - need to find parent and add to its replies array
      const findAndAddReply = (posts: DiscussionPost[]): boolean => {
        for (const existingPost of posts) {
          if (existingPost.id === parentId) {
            // Found the parent - ensure replies array exists and add the reply
            if (!existingPost.replies) {
              existingPost.replies = [];
            }
            existingPost.replies.push(post);
            return true;
          }
          // Recursively search in nested replies
          if (existingPost.replies && existingPost.replies.length > 0) {
            if (findAndAddReply(existingPost.replies)) {
              return true;
            }
          }
        }
        return false;
      };
      
      const added = findAndAddReply(data[key]);
      if (!added) {
        console.warn(`Could not find parent post with id: ${parentId}. Adding as top-level post instead.`);
        // Fallback: add as top-level post if parent not found
        data[key].push(post);
      }
    } else {
      // Add as top-level post
      data[key].push(post);
    }

    this.saveDiscussionsData(data);
    return post;
  }

  // Recursively ensure all posts have replies array initialized
  private ensureRepliesInitialized(posts: DiscussionPost[]): DiscussionPost[] {
    return posts.map((post) => ({
      ...post,
      replies: post.replies ? this.ensureRepliesInitialized(post.replies) : [],
    }));
  }

  // Get discussions for a course or lesson
  getDiscussions(courseId: string, lessonId?: string): DiscussionPost[] {
    const data = this.getDiscussionsData();
    const key = lessonId ? `${courseId}_${lessonId}` : courseId;
    const allPosts = data[key] || [];

    // Ensure all posts have replies array initialized
    const postsWithReplies = this.ensureRepliesInitialized(allPosts);

    // Filter out replies (posts with parentId) - only return top-level posts
    // Replies are already nested in their parent's replies array
    const topLevelPosts = postsWithReplies.filter((post) => !post.parentId);

    // Sort by upvotes and date
    return topLevelPosts.sort((a, b) => {
      if (b.upvotes !== a.upvotes) {
        return b.upvotes - a.upvotes;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Upvote a post
  toggleUpvote(postId: string, courseId: string, lessonId?: string): boolean {
    const data = this.getDiscussionsData();
    const key = lessonId ? `${courseId}_${lessonId}` : courseId;
    const posts = data[key] || [];

    const findAndToggle = (postList: DiscussionPost[]): boolean => {
      for (const post of postList) {
        if (post.id === postId) {
          if (post.userUpvoted) {
            post.upvotes--;
            post.userUpvoted = false;
          } else {
            post.upvotes++;
            post.userUpvoted = true;
          }
          return true;
        }
        if (post.replies.length > 0 && findAndToggle(post.replies)) {
          return true;
        }
      }
      return false;
    };

    if (findAndToggle(posts)) {
      this.saveDiscussionsData(data);
      return true;
    }
    return false;
  }

  // Delete a post (only by author) - works for both posts and replies
  deletePost(postId: string, courseId: string, lessonId?: string): boolean {
    const data = this.getDiscussionsData();
    const key = lessonId ? `${courseId}_${lessonId}` : courseId;
    const posts = data[key] || [];
    const userId = this.getCurrentUserId();

    if (!userId || userId === 'anonymous') {
      console.error('Cannot delete: User not authenticated');
      return false;
    }

    const removePost = (postList: DiscussionPost[]): DiscussionPost[] => {
      return postList.filter((post) => {
        // Check if this is the post to delete and user is the author
        if (post.id === postId) {
          if (post.userId === userId) {
            return false; // Remove this post/reply
          } else {
            console.warn(`User ${userId} attempted to delete post ${postId} owned by ${post.userId}`);
            return true; // Keep it - not the author
          }
        }
        // Recursively check and remove from replies
        if (post.replies && post.replies.length > 0) {
          post.replies = removePost(post.replies);
        }
        return true;
      });
    };

    const filtered = removePost(posts);
    if (filtered.length !== posts.length) {
      data[key] = filtered;
      this.saveDiscussionsData(data);
      return true;
    }
    return false;
  }

  // Update a post (only by author) - works for both posts and replies
  updatePost(
    postId: string,
    content: string,
    courseId: string,
    lessonId?: string
  ): DiscussionPost | null {
    const data = this.getDiscussionsData();
    const key = lessonId ? `${courseId}_${lessonId}` : courseId;
    const posts = data[key] || [];
    const userId = this.getCurrentUserId();

    if (!userId || userId === 'anonymous') {
      console.error('Cannot update: User not authenticated');
      return null;
    }

    const findAndUpdate = (postList: DiscussionPost[]): boolean => {
      for (const post of postList) {
        if (post.id === postId) {
          if (post.userId === userId) {
            post.content = content.trim();
            post.updatedAt = new Date().toISOString();
            return true;
          } else {
            console.warn(`User ${userId} attempted to update post ${postId} owned by ${post.userId}`);
            return false; // Not the author
          }
        }
        // Recursively search in replies
        if (post.replies && post.replies.length > 0) {
          if (findAndUpdate(post.replies)) {
            return true;
          }
        }
      }
      return false;
    };

    if (findAndUpdate(posts)) {
      this.saveDiscussionsData(data);
      // Need to find the updated post in the full structure (including nested replies)
      const findPost = (postList: DiscussionPost[]): DiscussionPost | null => {
        for (const post of postList) {
          if (post.id === postId) {
            return post;
          }
          if (post.replies && post.replies.length > 0) {
            const found = findPost(post.replies);
            if (found) return found;
          }
        }
        return null;
      };
      return findPost(posts);
    }
    return null;
  }
}

export const discussionService = new DiscussionService();

