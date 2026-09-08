import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CalendarEntry } from '../types';
import { HALLOWEEN_YEAR } from '../config';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
  }
  return client;
}

export async function fetchEntries(year: number = HALLOWEEN_YEAR): Promise<CalendarEntry[]> {
  const c = getClient();
  if (!c) throw new Error('Supabase no configurado');
  const { data, error } = await c
    .from('calendar_entries')
    .select('*')
    .eq('year', year)
    .order('day', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CalendarEntry[]) || [];
}

export async function upsertEntry(entry: Partial<CalendarEntry>): Promise<void> {
  const c = getClient();
  if (!c) throw new Error('Supabase no configurado');
  const { error } = await c
    .from('calendar_entries')
    .upsert(entry, { onConflict: 'date_key' });
  if (error) throw new Error(error.message);
}

type ChangeCallback = (entry: CalendarEntry) => void;

export function subscribeToChanges(callback: ChangeCallback): () => void {
  const c = getClient();
  if (!c) return () => {};

  const handleChange = (payload: { new: CalendarEntry }) => {
    const entry = payload.new as CalendarEntry;
    if (entry) callback(entry);
  };

  const ch = c
    .channel('calendar-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendar_entries' }, handleChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calendar_entries' }, handleChange)
    .subscribe();

  return () => {
    c.removeChannel(ch);
  };
}
