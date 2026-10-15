import { Icon } from "./Icon";

export type AppSection = "study" | "words" | "groups";

export function Tabs({ active, onChange }: { active: AppSection; onChange: (value: AppSection) => void }) {
  const items: Array<{ value: AppSection; label: string }> = [
    { value: "study", label: "Учиться" },
    { value: "words", label: "Слова" },
    { value: "groups", label: "Группы" },
  ];

  return (
    <nav className="tabs" aria-label="Разделы приложения">
      {items.map((item) => (
        <button
          aria-current={active === item.value ? "page" : undefined}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          <Icon data-testid={`tab-icon-${item.value}`} name={item.value} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
