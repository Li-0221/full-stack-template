"""add auth session expiry index

Revision ID: 4c7e8f1a2b3d
Revises: 9f8e7d6c5b4a
Create Date: 2026-08-31 05:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "4c7e8f1a2b3d"
down_revision: str | Sequence[str] | None = "9f8e7d6c5b4a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        op.f("ix_auth_sessions_expires_at"),
        "auth_sessions",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_sessions_expires_at"), table_name="auth_sessions")
