import { Loader2 } from "lucide-react";
import React from "react";

const LoadingSpinner = React.memo(({ message = "불러오는 중..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
));

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;