import { Skeleton } from "@/components/ui/skeleton";

const PageSkeleton = () => (
  <div className="space-y-4 py-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-64" />
    <div className="space-y-3 mt-6">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);

export default PageSkeleton;