interface Props { message: string | null | undefined; }

export function ErrorMessage({ message }: Props) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-50 border border-accent-red/30 px-4 py-3 text-sm font-medium text-accent-red">
      {message}
    </div>
  );
}
