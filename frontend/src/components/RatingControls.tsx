import type { Rating } from "../api/learning";

const RATINGS: Array<{ value: Rating; label: string; hint: string; symbol: string; className: string }> = [
  { value: 1, label: "Не вспомнил", hint: "Попробую снова", symbol: "×", className: "rating--again" },
  { value: 2, label: "С трудом", hint: "Было трудно", symbol: "≈", className: "rating--hard" },
  { value: 3, label: "Вспомнил", hint: "Вспомнил сам", symbol: "✓", className: "rating--good" },
  { value: 4, label: "Легко", hint: "Без усилий", symbol: "✦", className: "rating--easy" },
];

export function RatingControls({ disabled, onRate }: { disabled: boolean; onRate: (rating: Rating) => void }) {
  return (
    <div className="ratings" aria-label="Оценка ответа">
      {RATINGS.map((rating) => (
        <button
          aria-label={rating.label}
          className={`rating ${rating.className}`}
          disabled={disabled}
          key={rating.value}
          onClick={() => onRate(rating.value)}
        >
          <span className="rating__symbol" aria-hidden="true">{rating.symbol}</span>
          <span className="rating__copy"><strong>{rating.label}</strong><small>{rating.hint}</small></span>
        </button>
      ))}
    </div>
  );
}
