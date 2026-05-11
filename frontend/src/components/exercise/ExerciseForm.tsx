import { useState } from 'react';
import type { Exercise } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

interface FormData {
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
}

interface Props {
  initial?: Exercise;
  onSubmit: (data: FormData) => void;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
}

export function ExerciseForm({ initial, onSubmit, loading, error, submitLabel = 'Save' }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sets, setSets] = useState(String(initial?.sets ?? 3));
  const [reps, setReps] = useState(initial?.reps ?? '10');
  const [weight, setWeight] = useState(initial?.weight != null ? String(initial.weight) : '');

  function handleSubmit() {
    const parsedWeight = weight.trim() === '' ? null : parseFloat(weight);
    onSubmit({
      name: name.trim(),
      sets: parseInt(sets, 10) || 3,
      reps: reps.trim(),
      weight: parsedWeight,
    });
  }

  const isValid = name.trim().length > 0 && reps.trim().length > 0 && parseInt(sets, 10) > 0;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Exercise name"
        placeholder="e.g. Bench Press"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus={!initial}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Sets"
          type="number"
          inputMode="numeric"
          placeholder="3"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          min="1"
        />
        <Input
          label="Reps"
          placeholder="10 or 8-12"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
      </div>

      <Input
        label="Weight (kg) — leave blank for bodyweight"
        type="number"
        inputMode="decimal"
        placeholder="e.g. 80"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        min="0"
        step="0.5"
      />

      <ErrorMessage message={error} />

      <Button onClick={handleSubmit} loading={loading} disabled={!isValid} className="w-full mt-1">
        {submitLabel}
      </Button>
    </div>
  );
}
