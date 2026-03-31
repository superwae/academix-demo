using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcademixLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseExpectedHoursAndScheduleDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CourseEndDate",
                table: "Courses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CourseStartDate",
                table: "Courses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedDurationHours",
                table: "Courses",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            // Notifications table is created idempotently in DatabaseExtensions (CREATE IF NOT EXISTS).
            // Do not create it here — it may already exist and would fail with 42P07.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CourseEndDate",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "CourseStartDate",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "ExpectedDurationHours",
                table: "Courses");
        }
    }
}
