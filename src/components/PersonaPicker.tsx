import { Persona } from '../types';

interface PersonaPickerProps {
  open: boolean;
  onSelect: (p: Persona) => void;
  current: Persona | null;
  onClose: () => void;
}

export default function PersonaPicker({ open, onSelect, current, onClose }: PersonaPickerProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Elige tu persona">
      <div className="modal-panel persona-picker">
        <h2 className="persona-title">¿Quién eres?</h2>
        <p className="persona-subtitle">Elige tu usuario para guardar tus calificaciones y notas por separado.</p>
        <div className="persona-options">
          <button className="btn btn-secondary persona-btn" onClick={() => onSelect('p1')}>
            🧙 Persona 1
          </button>
          <button className="btn btn-secondary persona-btn" onClick={() => onSelect('p2')}>
            🧛 Persona 2
          </button>
        </div>
        {current && (
          <button className="btn btn-ghost persona-close" onClick={onClose}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
