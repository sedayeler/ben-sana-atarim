using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BenSanaAtarim.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LowercaseTableNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "Bills", newName: "bills");
            migrationBuilder.RenameTable(name: "Participants", newName: "participants");
            migrationBuilder.RenameTable(name: "BillItems", newName: "bill_items");
            migrationBuilder.RenameTable(name: "ItemSelections", newName: "item_selections");

            migrationBuilder.RenameIndex(name: "IX_Bills_Code", table: "bills", newName: "IX_bills_Code");
            migrationBuilder.RenameIndex(name: "IX_BillItems_BillId", table: "bill_items", newName: "IX_bill_items_BillId");
            migrationBuilder.RenameIndex(name: "IX_Participants_BillId", table: "participants", newName: "IX_participants_BillId");
            migrationBuilder.RenameIndex(name: "IX_Participants_BillId_UsernameNormalized", table: "participants", newName: "IX_participants_BillId_UsernameNormalized");
            migrationBuilder.RenameIndex(name: "IX_ItemSelections_BillItemId", table: "item_selections", newName: "IX_item_selections_BillItemId");
            migrationBuilder.RenameIndex(name: "IX_ItemSelections_ParticipantId_BillItemId", table: "item_selections", newName: "IX_item_selections_ParticipantId_BillItemId");

            migrationBuilder.Sql("ALTER TABLE \"bills\" RENAME CONSTRAINT \"PK_Bills\" TO \"PK_bills\";");
            migrationBuilder.Sql("ALTER TABLE \"participants\" RENAME CONSTRAINT \"PK_Participants\" TO \"PK_participants\";");
            migrationBuilder.Sql("ALTER TABLE \"bill_items\" RENAME CONSTRAINT \"PK_BillItems\" TO \"PK_bill_items\";");
            migrationBuilder.Sql("ALTER TABLE \"item_selections\" RENAME CONSTRAINT \"PK_ItemSelections\" TO \"PK_item_selections\";");

            migrationBuilder.Sql("ALTER TABLE \"participants\" RENAME CONSTRAINT \"FK_Participants_Bills_BillId\" TO \"FK_participants_bills_BillId\";");
            migrationBuilder.Sql("ALTER TABLE \"bill_items\" RENAME CONSTRAINT \"FK_BillItems_Bills_BillId\" TO \"FK_bill_items_bills_BillId\";");
            migrationBuilder.Sql("ALTER TABLE \"item_selections\" RENAME CONSTRAINT \"FK_ItemSelections_BillItems_BillItemId\" TO \"FK_item_selections_bill_items_BillItemId\";");
            migrationBuilder.Sql("ALTER TABLE \"item_selections\" RENAME CONSTRAINT \"FK_ItemSelections_Participants_ParticipantId\" TO \"FK_item_selections_participants_ParticipantId\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"item_selections\" RENAME CONSTRAINT \"FK_item_selections_participants_ParticipantId\" TO \"FK_ItemSelections_Participants_ParticipantId\";");
            migrationBuilder.Sql("ALTER TABLE \"item_selections\" RENAME CONSTRAINT \"FK_item_selections_bill_items_BillItemId\" TO \"FK_ItemSelections_BillItems_BillItemId\";");
            migrationBuilder.Sql("ALTER TABLE \"bill_items\" RENAME CONSTRAINT \"FK_bill_items_bills_BillId\" TO \"FK_BillItems_Bills_BillId\";");
            migrationBuilder.Sql("ALTER TABLE \"participants\" RENAME CONSTRAINT \"FK_participants_bills_BillId\" TO \"FK_Participants_Bills_BillId\";");

            migrationBuilder.Sql("ALTER TABLE \"item_selections\" RENAME CONSTRAINT \"PK_item_selections\" TO \"PK_ItemSelections\";");
            migrationBuilder.Sql("ALTER TABLE \"bill_items\" RENAME CONSTRAINT \"PK_bill_items\" TO \"PK_BillItems\";");
            migrationBuilder.Sql("ALTER TABLE \"participants\" RENAME CONSTRAINT \"PK_participants\" TO \"PK_Participants\";");
            migrationBuilder.Sql("ALTER TABLE \"bills\" RENAME CONSTRAINT \"PK_bills\" TO \"PK_Bills\";");

            migrationBuilder.RenameIndex(name: "IX_item_selections_ParticipantId_BillItemId", table: "item_selections", newName: "IX_ItemSelections_ParticipantId_BillItemId");
            migrationBuilder.RenameIndex(name: "IX_item_selections_BillItemId", table: "item_selections", newName: "IX_ItemSelections_BillItemId");
            migrationBuilder.RenameIndex(name: "IX_participants_BillId_UsernameNormalized", table: "participants", newName: "IX_Participants_BillId_UsernameNormalized");
            migrationBuilder.RenameIndex(name: "IX_participants_BillId", table: "participants", newName: "IX_Participants_BillId");
            migrationBuilder.RenameIndex(name: "IX_bill_items_BillId", table: "bill_items", newName: "IX_BillItems_BillId");
            migrationBuilder.RenameIndex(name: "IX_bills_Code", table: "bills", newName: "IX_Bills_Code");

            migrationBuilder.RenameTable(name: "item_selections", newName: "ItemSelections");
            migrationBuilder.RenameTable(name: "bill_items", newName: "BillItems");
            migrationBuilder.RenameTable(name: "participants", newName: "Participants");
            migrationBuilder.RenameTable(name: "bills", newName: "Bills");
        }
    }
}
