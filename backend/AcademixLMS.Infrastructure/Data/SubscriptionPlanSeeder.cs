using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Data;

/// <summary>
/// Seeds default subscription plans and adds prices to some demo courses.
/// Idempotent: skips if plans already exist.
/// </summary>
public static class SubscriptionPlanSeeder
{
    public static async Task EnsureAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        // Seed subscription plans
        if (!await context.SubscriptionPlans.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding subscription plans...");

            var plans = new[]
            {
                new SubscriptionPlan
                {
                    Name = "Starter",
                    Description = "For individual teachers getting started",
                    MonthlyPrice = 29.99m,
                    YearlyPrice = 299.99m,
                    MaxCourses = 3,
                    MaxSeatsPerCourse = 30,
                    MaxTotalSeats = 90,
                    SortOrder = 1,
                    IsActive = true,
                },
                new SubscriptionPlan
                {
                    Name = "Professional",
                    Description = "For growing schools and training centers",
                    MonthlyPrice = 79.99m,
                    YearlyPrice = 799.99m,
                    MaxCourses = 15,
                    MaxSeatsPerCourse = 100,
                    MaxTotalSeats = 500,
                    SortOrder = 2,
                    IsActive = true,
                },
                new SubscriptionPlan
                {
                    Name = "Enterprise",
                    Description = "Unlimited access for large organizations",
                    MonthlyPrice = 199.99m,
                    YearlyPrice = 1999.99m,
                    MaxCourses = null,     // unlimited
                    MaxSeatsPerCourse = null, // unlimited
                    MaxTotalSeats = null,   // unlimited
                    SortOrder = 3,
                    IsActive = true,
                },
            };

            context.SubscriptionPlans.AddRange(plans);
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Seeded {Count} subscription plans.", plans.Length);
        }

        // Add prices to some demo courses (first 10 get prices, rest stay free)
        var coursesWithoutPrice = await context.Courses
            .Where(c => c.Price == null || c.Price == 0)
            .OrderBy(c => c.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        if (coursesWithoutPrice.Any(c => c.Price == null || c.Price == 0))
        {
            var prices = new[] { 49.99m, 79.99m, 99.99m, 149.99m, 29.99m, 59.99m, 0m, 39.99m, 119.99m, 0m };
            for (int i = 0; i < coursesWithoutPrice.Count; i++)
            {
                coursesWithoutPrice[i].Price = prices[i % prices.Length];
            }
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Added prices to {Count} demo courses.", coursesWithoutPrice.Count);
        }

        // Add a discount to the first paid course
        if (!await context.Discounts.AnyAsync(cancellationToken))
        {
            var paidCourse = await context.Courses
                .Where(c => c.Price > 0)
                .OrderBy(c => c.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (paidCourse != null)
            {
                var discounts = new[]
                {
                    new Discount
                    {
                        CourseId = paidCourse.Id,
                        Code = "DEMO20",
                        Type = DiscountType.Percentage,
                        Value = 20,
                        IsActive = true,
                    },
                    new Discount
                    {
                        CourseId = paidCourse.Id,
                        Code = "SAVE10",
                        Type = DiscountType.FixedAmount,
                        Value = 10, // $10.00
                        IsActive = true,
                    },
                };
                context.Discounts.AddRange(discounts);
                await context.SaveChangesAsync(cancellationToken);
                logger.LogInformation("Seeded {Count} demo discounts for course '{Title}'.", discounts.Length, paidCourse.Title);
            }
        }
    }
}
