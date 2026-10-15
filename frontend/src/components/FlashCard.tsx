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
      className={`flash-card ${revealed ? "flash-card--revealed" : ""}`.trim()}
      data-testid="flash-card"
      role={revealed ? undefined : "button"}
      tabIndex={revealed ? undefined : 0}
      aria-label={revealed ? undefined : "Показать ответ"}
      onClick={() => !revealed && onReveal()}
      onKeyDown={keyDown}
    >
      <span className="flash-card__side">{question}</span>{revealed && <span className="flash-card__side flash-card__answer" aria-live="polite">{answer}</span>}
    </div>
  );
}
