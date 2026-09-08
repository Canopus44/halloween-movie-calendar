interface SyncButtonProps {
  lastSynced: Date | null;
  realtimeOnline: boolean;
  onSync: () => void;
  syncing?: boolean;
}

export default function SyncButton({ lastSynced, realtimeOnline, onSync, syncing }: SyncButtonProps) {
  return (
    <div className="sync-bar">
      <button className="btn btn-ghost" onClick={onSync} disabled={syncing} aria-label="Sincronizar">
        🔄 {syncing ? 'Sincronizando…' : 'Sincronizar'}
      </button>
      <span className="sync-status">
        <span className={`status-dot ${realtimeOnline ? 'live' : 'offline'}`} aria-hidden="true" />
        {realtimeOnline ? 'En vivo' : 'Sin conexión'}
      </span>
      {lastSynced && <span className="sync-time">Última sincronización: {lastSynced.toLocaleTimeString()}</span>}
    </div>
  );
}
