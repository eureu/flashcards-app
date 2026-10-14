from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_now() -> datetime:
    """FastAPI dependency kept separate so tests can replace the clock."""
    return utc_now()
