from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta

from fsrs import Card, Rating, Scheduler, State


@dataclass(frozen=True, slots=True)
class ScheduledReview:
    state_json: str
    due_at: datetime
    is_short: bool


def build_scheduler() -> Scheduler:
    return Scheduler(
        desired_retention=0.9,
        learning_steps=(timedelta(minutes=1), timedelta(minutes=10)),
        relearning_steps=(timedelta(minutes=10),),
        enable_fuzzing=False,
    )


def schedule_review(
    state_json: str | None, rating: int, reviewed_at: datetime
) -> ScheduledReview:
    card = Card.from_dict(json.loads(state_json)) if state_json else Card(due=reviewed_at)
    updated, _ = build_scheduler().review_card(card, Rating(rating), reviewed_at)
    return ScheduledReview(
        state_json=json.dumps(updated.to_dict(), ensure_ascii=False, separators=(",", ":")),
        due_at=updated.due,
        is_short=updated.state in (State.Learning, State.Relearning),
    )
