export type AppSection = "study" | "words" | "groups";

export function Tabs({ active, onChange }: { active: AppSection; onChange: (value: AppSection) => void }) {
  return (
    <nav className="tabs" aria-label="Разделы приложения">
      <button aria-current={active === "study" ? "page" : undefined} onClick={() => onChange("study")}>Учиться</button>
      <button aria-current={active === "words" ? "page" : undefined} onClick={() => onChange("words")}>Слова</button>
      <button aria-current={active === "groups" ? "page" : undefined} onClick={() => onChange("groups")}>Группы</button>
    </nav>
  );
}
