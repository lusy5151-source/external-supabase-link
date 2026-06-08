import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

const LazyImage = React.memo(({ src, alt, className, fallbackClassName, ...props }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {!isLoaded && (
        <div className={cn("absolute inset-0 animate-pulse bg-muted rounded-inherit", fallbackClassName)} />
      )}
      {isInView && (
        <img src={normalizeImageUrl(src as string | undefined)} alt={alt || ""} className={cn("h-full w-full object-cover transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0")} onLoad={() => setIsLoaded(true)} loading="lazy" {...props} />
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";

export default LazyImage;