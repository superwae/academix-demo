using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcademixLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRevenueSplit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PlatformFeePercentOverride",
                table: "Users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "InstructorAmount",
                table: "Payments",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InstructorUserId",
                table: "Payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "OrgAmount",
                table: "Payments",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "PlatformAmount",
                table: "Payments",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlatformFeePercentOverride",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "InstructorAmount",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "InstructorUserId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "OrgAmount",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PlatformAmount",
                table: "Payments");
        }
    }
}
