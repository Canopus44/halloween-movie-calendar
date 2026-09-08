import { PERSONAS } from '../config';

export type FilterValue = 'all' | 'watched' | 'pending' | 'p1' | 'p2';

interface FilterTabsProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

const TABS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'watched', label: 'Vistas' },
  { value: 'pending', label: 'Pendientes' },
  ...PERSONAS.map((p) => ({ value: p.id as FilterValue, label: p.display })),
];

export default function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Filtros">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={`filter-tab ${value === tab.value ? 'active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
