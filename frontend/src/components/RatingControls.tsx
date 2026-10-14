import type { Rating } from "../api/learning";

const RATINGS: Array<{ value: Rating; label: string; className: string }> = [
  { value: 1, label: "Не вспомнил", className: "rating--again" },
  { value: 2, label: "С трудом", className: "rating--hard" },
  { value: 3, label: "Вспомнил", className: "rating--good" },
  { value: 4, label: "Легко", className: "rating--easy" },
];

export function RatingControls({ disabled, onRate }: { disabled: boolean; onRate: (rating: Rating) => void }) {
  return (
    <div className="ratings" aria-label="Оценка ответа">
      {RATINGS.map((rating) => (
        <button
          className={`rating ${rating.className}`}
          disabled={disabled}
          key={rating.value}
          onClick={() => onRate(rating.value)}
        >
          {rating.label}
        </button>
      ))}
    </div>
  );
}
