import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => (
  <div className="-mx-4 -mt-6 pb-24 space-y-6">
    <div className="px-5 pt-6 pb-8" style={{ background: "hsl(205, 50%, 88%)" }}>
      <Skeleton className="h-6 w-40 mb-2" />
      <Skeleton className="h-4 w-56 mb-4" />
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <Skeleton className="h-12 flex-1 rounded-2xl" />
      </div>
    </div>
    <div className="px-5 space-y-6">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="flex gap-3">
        <Skeleton className="h-14 flex-1 rounded-2xl" />
        <Skeleton className="h-14 flex-1 rounded-2xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ))}
    </div>
  </div>
);

export default DashboardSkeleton;