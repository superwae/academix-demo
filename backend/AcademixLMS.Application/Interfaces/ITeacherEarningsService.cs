using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;

namespace AcademixLMS.Application.Interfaces;

public interface ITeacherEarningsService
{
    /// <summary>
    /// Monthly earnings summary for the given teacher. Amounts are in their currency unit (decimal).
    /// When year+month are null, returns the current calendar month.
    /// </summary>
    Task<Result<TeacherEarningsSummaryDto>> GetMonthlySummaryAsync(Guid teacherUserId, int? year, int? month, CancellationToken cancellationToken = default);
}
