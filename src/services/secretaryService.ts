import { apiClient } from '../lib/api';
import type { PagedRequest, PagedResult } from './courseService';
import type { AdminUserDto } from './adminService';
import type { EnrollmentDto } from './enrollmentService';

function toQuery(request: PagedRequest = {}) {
  const params = new URLSearchParams();
  if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
  if (request.pageSize) params.append('pageSize', request.pageSize.toString());
  if (request.searchTerm) params.append('searchTerm', request.searchTerm);
  if (request.sortBy) params.append('sortBy', request.sortBy);
  if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());
  const query = params.toString();
  return query ? `?${query}` : '';
}

class SecretaryService {
  async getDirectory(request: PagedRequest = {}): Promise<PagedResult<AdminUserDto>> {
    return apiClient.get<PagedResult<AdminUserDto>>(`/users/directory${toQuery(request)}`);
  }

  async getEnrollments(request: PagedRequest = {}): Promise<PagedResult<EnrollmentDto>> {
    return apiClient.get<PagedResult<EnrollmentDto>>(`/enrollments${toQuery(request)}`);
  }
}

export const secretaryService = new SecretaryService();
