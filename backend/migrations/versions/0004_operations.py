"""Create idempotent operation receipts."""

from alembic import op
import sqlalchemy as sa

revision = "0004_operations"
down_revision = "0003_cards"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operation_receipts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("key", sa.Uuid(), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "kind", "key", name="uq_operation_user_kind_key"),
    )
    op.create_index("ix_operation_receipts_user_id", "operation_receipts", ["user_id"])


def downgrade() -> None:
    op.drop_table("operation_receipts")
