import { Persona } from '../types';
import { PERSONAS } from '../config';
import { useModalA11y } from '../hooks/useModalA11y';

interface PersonaPickerProps {
  open: boolean;
  onSelect: (p: Persona) => void;
  current: Persona | null;
  onClose: () => void;
}

export default function PersonaPicker({ open, onSelect, current, onClose }: PersonaPickerProps) {
  const panelRef = useModalA11y(open, onClose);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Elige tu persona">
      <div className="modal-panel persona-picker" ref={panelRef}>
        <h2 className="persona-title">¿Quién eres?</h2>
        <p className="persona-subtitle">Elige tu usuario para guardar tus calificaciones y notas por separado.</p>
        <div className="persona-options">
          {PERSONAS.map((p) => (
            <button key={p.id} className="btn btn-secondary persona-btn" onClick={() => onSelect(p.id)}>
              {p.name} {p.emoji}
            </button>
          ))}
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
