import { useEffect, useState } from "react";
import { getLearningSummary, LearningSummary } from "../../api/learning";
import { Button } from "../../components/Button";
import { Notice } from "../../components/Notice";

export function StudyHome({ groupId, groupName, onStart }: { groupId?: string; groupName?: string; onStart: () => void }) {
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSummary(null);
    setError(false);
    getLearningSummary(groupId).then(setSummary).catch(() => setError(true));
  }, [groupId]);

  return (
    <section className="study-home">
      <h1>Повторение</h1>
      <p className="muted">Набор: {groupName ?? "Личные слова"}</p>
      {error && <Notice error>Не удалось загрузить задания</Notice>}
      {summary && (
        <>
          <div className="summary-grid">
            <p><strong>{summary.due_count}</strong><span>к повторению</span></p>
            <p><strong>{summary.new_count}</strong><span>новых направлений</span></p>
          </div>
          <Button disabled={!summary.can_start} onClick={onStart}>Начать</Button>
        </>
      )}
    </section>
  );
}
