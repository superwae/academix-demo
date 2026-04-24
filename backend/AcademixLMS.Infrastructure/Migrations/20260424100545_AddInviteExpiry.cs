using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcademixLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInviteExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "InviteExpiresAt",
                table: "OrganizationMembers",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InviteExpiresAt",
                table: "OrganizationMembers");
        }
    }
}
