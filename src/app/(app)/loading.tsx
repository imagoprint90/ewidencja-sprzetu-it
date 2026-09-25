// Pokazywane natychmiast przy przechodzeniu między stronami, zanim dane się załadują.
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Ładowanie">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}