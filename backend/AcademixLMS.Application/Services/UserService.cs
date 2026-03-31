using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.User;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Application.Mapping;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class UserService : IUserService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IApplicationDbContext context,
        ILogger<UserService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<UserDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<UserDto>.Failure("User not found.");
        }

        var userDto = MapToUserDto(user);
        return Result<UserDto>.Success(userDto);
    }

    public async Task<Result<PagedResult<UserDto>>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => !u.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(u =>
                u.Email.ToLower().Contains(searchTerm) ||
                u.FirstName.ToLower().Contains(searchTerm) ||
                u.LastName.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "email" => request.SortDescending
                ? query.OrderByDescending(u => u.Email)
                : query.OrderBy(u => u.Email),
            "name" => request.SortDescending
                ? query.OrderByDescending(u => u.LastName).ThenByDescending(u => u.FirstName)
                : query.OrderBy(u => u.LastName).ThenBy(u => u.FirstName),
            "created" => request.SortDescending
                ? query.OrderByDescending(u => u.CreatedAt)
                : query.OrderBy(u => u.CreatedAt),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Pagination
        var skip = (request.PageNumber - 1) * request.PageSize;
        var users = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var userDtos = users.Select(MapToUserDto).ToList();

        var pagedResult = new PagedResult<UserDto>
        {
            Items = userDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };

        return Result<PagedResult<UserDto>>.Success(pagedResult);
    }

    public async Task<Result<UserDto>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        // Check if email already exists
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);

        if (existingUser != null)
        {
            return Result<UserDto>.Failure("Email is already registered.");
        }

        // Validate roles exist
        if (request.RoleIds.Any())
        {
            var roleIds = request.RoleIds.Distinct().ToList();
            var existingRoles = await _context.Roles
                .Where(r => roleIds.Contains(r.Id) && !r.IsDeleted)
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            if (existingRoles.Count != roleIds.Count)
            {
                return Result<UserDto>.Failure("One or more roles do not exist.");
            }
        }

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Create user
        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            IsActive = true,
            IsEmailVerified = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        // Assign roles
        if (request.RoleIds.Any())
        {
            foreach (var roleId in request.RoleIds.Distinct())
            {
                var userRole = new UserRole
                {
                    UserId = user.Id,
                    RoleId = roleId,
                    AssignedAt = DateTime.UtcNow
                };
                _context.UserRoles.Add(userRole);
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Reload with roles
        var createdUser = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstAsync(u => u.Id == user.Id, cancellationToken);

        var userDto = MapToUserDto(createdUser);
        return Result<UserDto>.Success(userDto);
    }

    public async Task<Result<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<UserDto>.Failure("User not found.");
        }

        // Update fields if provided
        if (!string.IsNullOrWhiteSpace(request.FirstName))
            user.FirstName = request.FirstName;

        if (!string.IsNullOrWhiteSpace(request.LastName))
            user.LastName = request.LastName;

        if (request.PhoneNumber != null)
            user.PhoneNumber = request.PhoneNumber;

        if (request.ProfilePictureUrl != null)
            user.ProfilePictureUrl = request.ProfilePictureUrl;

        if (request.IsActive.HasValue)
            user.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        var userDto = MapToUserDto(user);
        return Result<UserDto>.Success(userDto);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.");
        }

        // Soft delete
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ActivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.");
        }

        if (user.IsActive)
        {
            return Result.Failure("User is already active.");
        }

        user.IsActive = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> SuspendAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.");
        }

        if (!user.IsActive)
        {
            return Result.Failure("User is already suspended.");
        }

        user.IsActive = false;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> AssignRolesAsync(Guid userId, AssignRolesRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.");
        }

        // Validate roles exist
        var roleIds = request.RoleIds.Distinct().ToList();
        var existingRoles = await _context.Roles
            .Where(r => roleIds.Contains(r.Id) && !r.IsDeleted)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        if (existingRoles.Count != roleIds.Count)
        {
            return Result.Failure("One or more roles do not exist.");
        }

        // Get existing user role IDs
        var existingUserRoleIds = user.UserRoles
            .Where(ur => !ur.IsDeleted)
            .Select(ur => ur.RoleId)
            .ToList();

        // Add new roles (prevent duplicates)
        foreach (var roleId in roleIds)
        {
            if (!existingUserRoleIds.Contains(roleId))
            {
                var userRole = new UserRole
                {
                    UserId = userId,
                    RoleId = roleId,
                    AssignedAt = DateTime.UtcNow
                };
                _context.UserRoles.Add(userRole);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> RevokeRoleAsync(Guid userId, Guid roleId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.");
        }

        var userRole = user.UserRoles
            .FirstOrDefault(ur => ur.RoleId == roleId && !ur.IsDeleted);

        if (userRole == null)
        {
            return Result.Failure("User does not have this role assigned.");
        }

        // Check if this is the last Admin role (prevent removing last Admin)
        if (userRole.Role.Name == "Admin" || userRole.Role.Name == "SuperAdmin")
        {
            var adminRoles = user.UserRoles
                .Where(ur => !ur.IsDeleted && 
                    (ur.Role.Name == "Admin" || ur.Role.Name == "SuperAdmin"))
                .ToList();

            if (adminRoles.Count == 1)
            {
                return Result.Failure("Cannot revoke the last Admin/SuperAdmin role from a user.");
            }
        }

        // Soft delete the user role
        userRole.IsDeleted = true;
        userRole.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result<UserDto>> UpdateMyUiPreferencesAsync(Guid userId, UserUiPreferencesDto request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
            return Result<UserDto>.Failure("User not found.");

        var dto = new UserUiPreferencesDto
        {
            Theme = string.IsNullOrWhiteSpace(request.Theme) ? "light" : request.Theme.Trim(),
            CustomThemeColor = string.IsNullOrWhiteSpace(request.CustomThemeColor) ? null : request.CustomThemeColor.Trim(),
            MixTheme = string.IsNullOrWhiteSpace(request.MixTheme) ? null : request.MixTheme.Trim()
        };

        user.UiPreferencesJson = UserUiPreferencesJson.Serialize(dto);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<UserDto>.Success(MapToUserDto(user));
    }

    private static UserDto MapToUserDto(User user)
    {
        var roles = user.UserRoles
            .Where(ur => !ur.IsDeleted)
            .Select(ur => ur.Role.Name)
            .ToList();

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            ProfilePictureUrl = user.ProfilePictureUrl,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAt = user.CreatedAt,
            Roles = roles,
            UiPreferences = UserUiPreferencesJson.Deserialize(user.UiPreferencesJson)
        };
    }
}

