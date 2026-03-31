// Use relative URL in dev so Vite proxy forwards to backend (avoids CORS, works on any frontend port)
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  API_BASE_URL = '/api/v1';
}

export interface ApiError {
  error: string;
  errors?: string[];
  title?: string;
  status?: number;
  detail?: string;
}

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (!refreshToken) {
          return null;
        }

        // Import authService dynamically to avoid circular dependency
        const { authService } = await import('../services/authService');
        const response = await authService.refreshToken();
        
        if (response) {
          this.setAccessToken(response.accessToken);
          return response.accessToken;
        }
        return null;
      } catch (error) {
        console.error('[API] Token refresh failed:', error);
        // Clear tokens on refresh failure
        this.setAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401: boolean = true
  ): Promise<T> {
    // Force HTTP - replace any HTTPS with HTTP to prevent browser redirects
    let url = `${this.baseUrl}${endpoint}`;
    url = url.replace('https://localhost:7261', 'http://localhost:5261');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // Allow redirects but ensure we're using HTTP
        redirect: 'follow',
      });

      
      // Handle redirect responses (3xx)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          console.warn(`[API] Redirect detected to: ${location}`);
        }
      }
      
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOn401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
        const newToken = await this.refreshAccessToken();
        
        if (newToken) {
          const retryHeaders: Record<string, string> = {
            ...headers,
            'Authorization': `Bearer ${newToken}`,
          };
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            redirect: 'follow',
          });
          
          if (!retryResponse.ok) {
            // If retry still fails, handle as error
            return this.handleErrorResponse<T>(retryResponse, url);
          }
          
          return this.handleSuccessResponse<T>(retryResponse, url);
              } else {
          // Refresh failed, logout user and throw error
          console.error('[API] Token refresh failed, logging out user');
          if (typeof window !== 'undefined') {
            const { authService } = await import('../services/authService');
            authService.logout();
            // Redirect to login if we're not already there
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
          // Throw error to prevent silent failure
          throw { 
            error: 'Session expired. Please log in again.', 
            status: 401 
          } as ApiError;
            }
      }
      
      if (!response.ok) {
        return this.handleErrorResponse<T>(response, url);
          }

      return this.handleSuccessResponse<T>(response, url);
    } catch (error) {
      console.error(`[API] Fetch error:`, error instanceof Error ? error.message : String(error));
      // If it's already an ApiError, re-throw it
      if (error && typeof error === 'object' && 'error' in error) {
        throw error;
      }
      // Provide more helpful error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Network error occurred. Make sure the backend is running and accessible.';
      throw { 
        error: errorMessage,
        status: 0, // Network errors typically have status 0
        url,
      } as ApiError;
    }
      }

  private async handleSuccessResponse<T>(response: Response, url: string): Promise<T> {
      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (!text) {
          return {} as T;
        }
        try {
          const data = JSON.parse(text);
          return data;
        } catch (e) {
          console.error(`[API] Failed to parse JSON response:`, e);
          throw { error: 'Invalid JSON response from server' };
        }
      }
      return {} as T;
  }

  private async handleErrorResponse<T>(response: Response, _url: string): Promise<T> {
    let error: ApiError;
    try {
      const errorText = await response.text();
      if (errorText) {
        try {
          const parsed = JSON.parse(errorText);
          // Handle ASP.NET Core ProblemDetails format
          if (parsed.title || parsed.detail) {
            error = {
              error: parsed.detail || parsed.title || response.statusText || 'An error occurred',
              errors: parsed.errors,
              title: parsed.title,
              status: parsed.status || response.status,
              detail: parsed.detail
            };
          } else if (parsed.error || parsed.detail) {
            // Handle our custom error format (optional detail from GlobalExceptionHandler in Development)
            error = {
              ...parsed,
              error: parsed.error || parsed.detail || response.statusText,
              status: parsed.status || response.status
            };
          } else if (typeof parsed === 'string') {
            error = { error: parsed, status: response.status };
          } else {
            // Try to extract error message from various possible formats
            error = {
              error: parsed.message || parsed.error || JSON.stringify(parsed) || response.statusText || 'An error occurred',
              errors: parsed.errors,
              status: response.status
            };
          }
        } catch {
          error = { error: errorText || response.statusText || 'An error occurred', status: response.status };
        }
      } else {
        error = { error: response.statusText || 'An error occurred', status: response.status };
      }
    } catch {
      error = { error: response.statusText || 'An error occurred', status: response.status };
    }
    
    // Handle 403 Forbidden
    if (response.status === 403) {
      console.error(`[API] 403 Forbidden: ${error.error}`);
      // Don't logout on 403, just throw the error
    }
    
    console.error(`[API] Error response (${response.status}):`, error);
    throw error;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();

