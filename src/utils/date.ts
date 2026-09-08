import { OctoberDay } from '../types';
import { HALLOWEEN_YEAR } from '../config';

export function buildOctoberDays(year: number = HALLOWEEN_YEAR): OctoberDay[] {
  return Array.from({ length: 31 }, (_, i) => ({
    dateKey: `${year}-10-${String(i + 1).padStart(2, '0')}`,
    day: i + 1,
  }));
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isToday(dateKey: string): boolean {
  return formatDateKey(new Date()) === dateKey;
}
