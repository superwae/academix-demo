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
}

export const fileService = new FileService();
