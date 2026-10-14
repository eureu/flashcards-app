interface FlashCardProps {
  question: string;
  answer: string;
  revealed: boolean;
  onReveal: () => void;
}

export function FlashCard({ question, answer, revealed, onReveal }: FlashCardProps) {
  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!revealed && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onReveal();
    }
  }

  return (
    <div
      className="flash-card"
      data-testid="flash-card"
      role="button"
      tabIndex={0}
      aria-label={revealed ? "Ответ показан" : "Показать ответ"}
      onClick={() => !revealed && onReveal()}
      onKeyDown={keyDown}
    >
      <span className="flash-card__side">{question}</span>{revealed && <span className="flash-card__side flash-card__answer" aria-live="polite">{answer}</span>}
    </div>
  );
}
