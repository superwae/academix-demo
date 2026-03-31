using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.User;

namespace AcademixLMS.Application.Interfaces;

public interface IUserService
{
    // Get operations
    Task<Result<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<UserDto>>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    
    // User lifecycle
    Task<Result<UserDto>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
    Task<Result<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    
    // User status
    Task<Result> ActivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result> SuspendAsync(Guid id, CancellationToken cancellationToken = default);
    
    // Role management
    Task<Result> AssignRolesAsync(Guid userId, AssignRolesRequest request, CancellationToken cancellationToken = default);
    Task<Result> RevokeRoleAsync(Guid userId, Guid roleId, CancellationToken cancellationToken = default);

    Task<Result<UserDto>> UpdateMyUiPreferencesAsync(Guid userId, UserUiPreferencesDto request, CancellationToken cancellationToken = default);
}


