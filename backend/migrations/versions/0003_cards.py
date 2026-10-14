"""Create shared and personal cards."""

from alembic import op
import sqlalchemy as sa

revision = "0003_cards"
down_revision = "0002_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("front", sa.Text(), nullable=False),
        sa.Column("back", sa.Text(), nullable=False),
        sa.Column("visibility", sa.String(length=16), nullable=False),
        sa.Column("group_id", sa.Uuid(), nullable=True),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(visibility = 'personal' AND group_id IS NULL) OR "
            "(visibility = 'group' AND group_id IS NOT NULL)",
            name="ck_card_visibility_target",
        ),
        sa.CheckConstraint("length(front) BETWEEN 1 AND 2000", name="ck_card_front_length"),
        sa.CheckConstraint("length(back) BETWEEN 1 AND 2000", name="ck_card_back_length"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cards_author_id", "cards", ["author_id"])
    op.create_index("ix_cards_group_id", "cards", ["group_id"])


def downgrade() -> None:
    op.drop_table("cards")
