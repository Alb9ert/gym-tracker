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
  note: string | null;
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
  const [note, setNote] = useState(initial?.note ?? '');

  function handleSubmit() {
    const parsedWeight = weight.trim() === '' ? null : parseFloat(weight);
    onSubmit({
      name: name.trim(),
      sets: parseInt(sets, 10) || 3,
      reps: reps.trim(),
      weight: parsedWeight,
      note: note.trim() || null,
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

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-secondary">
          Note <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          placeholder="e.g. keep elbows tucked, pause at chest…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          className="bg-white text-primary placeholder-gray-400 rounded-xl px-4 py-3 text-base outline-none border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 transition resize-none"
        />
        {note.length > 240 && (
          <p className="text-xs text-secondary text-right">{note.length}/300</p>
        )}
      </div>

      <ErrorMessage message={error} />

      <Button onClick={handleSubmit} loading={loading} disabled={!isValid} className="w-full mt-1">
        {submitLabel}
      </Button>
    </div>
  );
}
