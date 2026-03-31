// Bookmarks and favorites service
// This service manages bookmarked lessons and favorite courses

export interface Bookmark {
  id: string;
  lessonId: string;
  courseId: string;
  timestamp: number; // video timestamp in seconds (optional)
  note?: string; // optional note about the bookmark
  createdAt: string; // ISO date string
}

export interface Favorite {
  courseId: string;
  createdAt: string; // ISO date string
}

class BookmarkService {
  private bookmarksKey = 'academix_bookmarks';
  private favoritesKey = 'academix_favorites';

  // Bookmarks
  private getBookmarksData(): Record<string, Bookmark> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(this.bookmarksKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveBookmarksData(data: Record<string, Bookmark>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.bookmarksKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }

  // Favorites
  private getFavoritesData(): Record<string, Favorite> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(this.favoritesKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveFavoritesData(data: Record<string, Favorite>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.favoritesKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }

  // Bookmark a lesson
  addBookmark(lessonId: string, courseId: string, timestamp?: number, note?: string): Bookmark {
    const data = this.getBookmarksData();
    const id = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const bookmark: Bookmark = {
      id,
      lessonId,
      courseId,
      timestamp: timestamp || 0,
      note,
      createdAt: new Date().toISOString(),
    };

    data[id] = bookmark;
    this.saveBookmarksData(data);

    return bookmark;
  }

  // Remove a bookmark
  removeBookmark(bookmarkId: string): boolean {
    const data = this.getBookmarksData();
    if (!data[bookmarkId]) return false;

    delete data[bookmarkId];
    this.saveBookmarksData(data);
    return true;
  }

  // Check if a lesson is bookmarked
  isBookmarked(lessonId: string): boolean {
    const data = this.getBookmarksData();
    return Object.values(data).some((b) => b.lessonId === lessonId);
  }

  // Get all bookmarks for a lesson
  getLessonBookmarks(lessonId: string): Bookmark[] {
    const data = this.getBookmarksData();
    return Object.values(data)
      .filter((b) => b.lessonId === lessonId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get all bookmarks for a course
  getCourseBookmarks(courseId: string): Bookmark[] {
    const data = this.getBookmarksData();
    return Object.values(data)
      .filter((b) => b.courseId === courseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get all bookmarks
  getAllBookmarks(): Bookmark[] {
    return Object.values(this.getBookmarksData()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Favorites
  addFavorite(courseId: string): Favorite {
    const data = this.getFavoritesData();

    const favorite: Favorite = {
      courseId,
      createdAt: new Date().toISOString(),
    };

    data[courseId] = favorite;
    this.saveFavoritesData(data);

    return favorite;
  }

  removeFavorite(courseId: string): boolean {
    const data = this.getFavoritesData();
    if (!data[courseId]) return false;

    delete data[courseId];
    this.saveFavoritesData(data);
    return true;
  }

  isFavorite(courseId: string): boolean {
    const data = this.getFavoritesData();
    return !!data[courseId];
  }

  getAllFavorites(): Favorite[] {
    return Object.values(this.getFavoritesData()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const bookmarkService = new BookmarkService();











