using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BenSanaAtarim.Infrastructure.Migrations
{
    public partial class RenameParticipantNameToUsername : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM "Participants"
                        GROUP BY "BillId", lower("Name")
                        HAVING COUNT(*) > 1
                    ) THEN
                        RAISE EXCEPTION 'Cannot enforce case-insensitive participant username uniqueness: existing duplicates were found within a bill.';
                    END IF;
                END $$;
                """);

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Participants",
                newName: "Username");

            migrationBuilder.AddColumn<string>(
                name: "UsernameNormalized",
                table: "Participants",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(\"Username\")",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Participants_BillId_UsernameNormalized",
                table: "Participants",
                columns: new[] { "BillId", "UsernameNormalized" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Participants_BillId_UsernameNormalized",
                table: "Participants");

            migrationBuilder.DropColumn(
                name: "UsernameNormalized",
                table: "Participants");

            migrationBuilder.RenameColumn(
                name: "Username",
                table: "Participants",
                newName: "Name");
        }
    }
}
