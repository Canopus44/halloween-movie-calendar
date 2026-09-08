interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-card" role="alert">
      <span className="error-emoji">👻</span>
      <h3>Algo salió mal</h3>
      <p className="error-message">{message || 'Ocurrió un error inesperado.'}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Intentar nuevamente
        </button>
      )}
    </div>
  );
}
