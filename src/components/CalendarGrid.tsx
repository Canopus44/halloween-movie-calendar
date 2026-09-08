import { CalendarEntry } from '../types';
import { OctoberDay } from '../types';
import DayCard from './DayCard';
import { FilterValue } from './FilterTabs';

interface CalendarGridProps {
  days: OctoberDay[];
  entries: Map<string, CalendarEntry>;
  filter: FilterValue;
  onOpen: (day: number) => void;
}

export default function CalendarGrid({ days, entries, filter, onOpen }: CalendarGridProps) {
  const filtered = days.filter((d) => {
    const e = entries.get(d.dateKey);
    switch (filter) {
      case 'watched':
        return !!e?.watched;
      case 'pending':
        return !e?.watched;
      case 'p1':
        return e?.selected_by === 'p1';
      case 'p2':
        return e?.selected_by === 'p2';
      default:
        return true;
    }
  });

  return (
    <div className="calendar-grid">
      {filtered.map((d) => (
        <DayCard key={d.dateKey} day={d} entry={entries.get(d.dateKey)} onOpen={onOpen} />
      ))}
      {filtered.length === 0 && (
        <p className="empty-filter">No hay días con este filtro. 👻</p>
      )}
    </div>
  );
}
