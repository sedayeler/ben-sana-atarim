using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BenSanaAtarim.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddParticipantAccessTokenHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessTokenHash",
                table: "participants",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccessTokenHash",
                table: "participants");
        }
    }
}
