using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcademixLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseCertificateSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "IssueCertificates" boolean NOT NULL DEFAULT false;
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "CertificateSummary" character varying(2000) NULL;
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "CertificateDisplayHours" numeric(8,2) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Courses" DROP COLUMN IF EXISTS "CertificateDisplayHours";
                ALTER TABLE "Courses" DROP COLUMN IF EXISTS "CertificateSummary";
                ALTER TABLE "Courses" DROP COLUMN IF EXISTS "IssueCertificates";
                """);
        }
    }
}
