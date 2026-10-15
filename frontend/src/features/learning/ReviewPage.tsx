import { useCallback, useEffect, useState } from "react";
import { LearningItem, Rating, getNextItem, submitReview } from "../../api/learning";
import { Button } from "../../components/Button";
import { FlashCard } from "../../components/FlashCard";
import { Notice } from "../../components/Notice";
import { RatingControls } from "../../components/RatingControls";
import { Icon } from "../../components/Icon";
import { setTelegramBackAction } from "../../telegram/bridge";

function operationKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface ReviewPageProps {
  groupId?: string;
  onExit: () => void;
  onOpenWords?: () => void;
  onAddWords?: () => void;
}

function ReviewHeader({ onExit }: { onExit: () => void }) {
  return (
    <header className="review-header">
      <div><p className="eyebrow">Тренировка</p><strong>Повторение</strong></div>
      <button onClick={onExit} type="button"><Icon name="close" size={18} />Закончить</button>
    </header>
  );
}

export function ReviewPage({ groupId, onExit, onOpenWords = onExit, onAddWords = onOpenWords }: ReviewPageProps) {
  const [item, setItem] = useState<LearningItem | null | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ rating: Rating; key: string } | null>(null);

  const load = useCallback(async (lastCardId?: string) => {
    setItem(await getNextItem(groupId, lastCardId));
    setRevealed(false);
  }, [groupId]);

  useEffect(() => {
    load().catch(() => {
      setItem(null);
      setMessage("Не удалось загрузить карточку");
    });
  }, [load]);

  useEffect(() => setTelegramBackAction(onExit), [onExit]);

  async function send(rating: Rating, key: string) {
    if (!item || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await submitReview({
        card_id: item.card_id,
        direction: item.direction,
        rating,
        group_id: groupId ?? null,
        expected_content_version: item.content_version,
        expected_state_version: item.state_version,
      }, key);
      const previousCard = item.card_id;
      setPending(null);
      await load(previousCard);
    } catch (error) {
      if (typeof error === "object" && error !== null && "status" in error && error.status === 409) {
        setPending(null);
        setMessage("Карточка изменилась на другом устройстве. Загружена актуальная версия.");
        await load(item.card_id);
      } else if (typeof error === "object" && error !== null && "status" in error && error.status === 403) {
        setPending(null);
        setItem(null);
        setMessage("Доступ к группе изменился. Вернитесь к выбору набора.");
      } else if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
        setPending(null);
        setMessage("Карточка больше недоступна. Загружено следующее задание.");
        await load(item.card_id);
      } else {
        setPending({ rating, key });
        setMessage("Оценка не отправлена. Ответ сохранён на экране.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (item === undefined) return <main className="review-page"><ReviewHeader onExit={onExit} /><p className="review-loading">Загрузка карточки…</p></main>;
  if (item === null) {
    return (
      <main className="review-page">
        <ReviewHeader onExit={onExit} />
        <section className="review-complete">
          <span className="review-complete__mark"><Icon name="spark" size={26} /></span>
          <h1>На сейчас всё.</h1>
          <p>Можно вернуться к словарю или добавить новые карточки.</p>
          {message && <Notice error>{message}</Notice>}
          <Button onClick={onOpenWords}>К словам</Button>
          <button className="secondary-button" onClick={onAddWords} type="button">Добавить слова</button>
        </section>
      </main>
    );
  }

  return (
    <main className="review-page">
      <ReviewHeader onExit={onExit} />
      <FlashCard
        question={item.question}
        answer={item.answer}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
      />
      <div className="review-controls">
        {message && <Notice error>{message}</Notice>}
        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>Показать перевод</Button>
        ) : (
          <RatingControls disabled={saving || pending !== null} onRate={(rating) => void send(rating, operationKey())} />
        )}
        {pending && (
          <Button disabled={saving} onClick={() => void send(pending.rating, pending.key)}>
            Повторить отправку
          </Button>
        )}
      </div>
    </main>
  );
}
