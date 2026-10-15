import { useCallback, useEffect, useMemo, useState } from "react";
import { listCards, type CardView } from "../../api/cards";
import { getLearningSummary, type LearningSummary } from "../../api/learning";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Notice } from "../../components/Notice";

interface StudyHomeProps {
  groupId?: string;
  groupName?: string;
  displayName: string;
  onStart: () => void;
  onChooseGroup: () => void;
  onAddWords: () => void;
}

function taskLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} новых заданий`;
  if (last === 1) return `${count} новое задание`;
  if (last >= 2 && last <= 4) return `${count} новых задания`;
  return `${count} новых заданий`;
}

export function StudyHome({
  groupId,
  groupName,
  displayName,
  onStart,
  onChooseGroup,
  onAddWords,
}: StudyHomeProps) {
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [cards, setCards] = useState<CardView[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setSummary(null);
    setCards(null);
    setError(false);
    try {
      const [nextSummary, nextCards] = await Promise.all([
        getLearningSummary(groupId),
        listCards({ groupId }),
      ]);
      setSummary(nextSummary);
      setCards(nextCards);
    } catch {
      setError(true);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    shared: cards?.filter((card) => card.visibility === "group").length ?? 0,
    personal: cards?.filter((card) => card.visibility === "personal").length ?? 0,
  }), [cards]);
  const initial = displayName.trim().charAt(0).toLocaleUpperCase("ru-RU") || "•";

  return (
    <section className="study-home" aria-labelledby="study-title">
      <header className="home-header">
        <div>
          <p className="eyebrow">Language Cards</p>
          <h1 id="study-title">С возвращением.</h1>
        </div>
        <span className="avatar" aria-label={`Пользователь ${displayName}`}>{initial}</span>
      </header>

      <button className="set-picker" onClick={onChooseGroup} type="button">
        <span>
          <small>Сейчас учим</small>
          <strong>{groupName ?? "Личные слова"}</strong>
        </span>
        <Icon name="chevron" size={19} />
      </button>

      {error && (
        <div className="load-error">
          <Notice error>Не удалось загрузить задания</Notice>
          <button className="text-button" onClick={() => void load()} type="button">Повторить</button>
        </div>
      )}

      {!error && (!summary || !cards) && (
        <div className="study-skeleton" aria-label="Загрузка заданий">
          <span /><span /><span />
        </div>
      )}

      {summary && cards && cards.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon"><Icon name="plus" size={24} /></span>
          <h2>Добавьте слова, чтобы начать</h2>
          <p>Вставьте список пар или добавьте одну карточку.</p>
          <Button onClick={onAddWords}>Добавить слова</Button>
        </div>
      )}

      {summary && cards && cards.length > 0 && (
        <>
          <article className="study-hero" data-testid="study-hero">
            <Icon className="study-hero__spark" name="spark" size={28} />
            <p>Вернём слова в память.</p>
            <div className="study-hero__count">
              <strong>{summary.due_count}</strong>
              <span>к повторению</span>
            </div>
            <div className="study-hero__meta">
              <span>{taskLabel(summary.new_count)}</span>
              <span>оба направления</span>
            </div>
            {summary.can_start ? (
              <Button onClick={onStart}>Начать повторение</Button>
            ) : (
              <div className="study-hero__empty">
                <strong>На сейчас всё.</strong>
                <button className="text-button" onClick={onAddWords} type="button">Перейти к словам</button>
              </div>
            )}
          </article>

          <section className="source-card" aria-labelledby="sources-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Состав набора</p>
                <h2 id="sources-title">Ваши слова</h2>
              </div>
              <button aria-label="Добавить слова" className="icon-button" onClick={onAddWords} type="button">
                <Icon name="plus" size={21} />
              </button>
            </div>
            <ul className="source-list">
              {groupId && (
                <li><span><i className="source-dot source-dot--shared" />Общие слова</span><strong>{counts.shared}</strong></li>
              )}
              <li><span><i className="source-dot" />Личные слова</span><strong>{counts.personal}</strong></li>
            </ul>
            <p className="source-note">Слова могут быть общими, а ваш прогресс всегда остаётся личным.</p>
          </section>
        </>
      )}
    </section>
  );
}
