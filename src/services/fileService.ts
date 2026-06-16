import { apiClient, type ApiError } from '../lib/api';

export interface FileUploadResponse {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

class FileService {
  async uploadFile(file: File, folder: string = 'assignments'): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const baseUrl = '/api/v1';
    const url = `${baseUrl}/files/upload?folder=${encodeURIComponent(folder)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload file';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Opens a protected file (assignment submission, course material) in a new tab.
   * These are served with auth required, so a plain <a href> won't work — we fetch
   * with the Bearer token and open a blob URL instead.
   */
  async openProtectedFile(fileUrl: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    // Give the new tab time to load the blob before revoking.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
}

export const fileService = new FileService();
