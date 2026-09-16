export default function LoadingSpinner({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-5xl mb-4 animate-bounce-in" aria-hidden="true">✏️</div>
      <div
        className="animate-spin rounded-full h-8 w-8 border-4 mb-4"
        style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--marker-blue)' }}
      />
      <p className="text-secondary font-medium">{message}</p>
    </div>
  );
}
