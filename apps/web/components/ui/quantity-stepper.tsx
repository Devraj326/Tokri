'use client';

import { clsx } from 'clsx';

interface QuantityStepperProps {
  qty: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  large?: boolean;
}

export function QuantityStepper({ qty, onAdd, onIncrement, onDecrement, disabled, large }: QuantityStepperProps) {
  if (qty <= 0) {
    return (
      <button onClick={onAdd} disabled={disabled} aria-label="Add" className="addbtn">
        Add
      </button>
    );
  }

  return (
    <div className={clsx('step', large && 'lg')}>
      <button onClick={onDecrement} disabled={disabled} aria-label="Remove one">
        −
      </button>
      <span>{qty}</span>
      <button onClick={onIncrement} disabled={disabled} aria-label="Add one">
        +
      </button>
    </div>
  );
}
