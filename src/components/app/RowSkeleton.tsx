import { Skeleton } from "@/components/ui/skeleton";

export function RowSkeleton() {
  return (
    <section>
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-52 shrink-0 rounded-lg" />
        ))}
      </div>
    </section>
  );
}
