import { useState, useEffect } from "react";
import { useMagazine, MagazinePost, MagazineSlide } from "@/hooks/useMagazine";
import MagazineSlideViewer from "@/components/MagazineSlideViewer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPUP_KEY = "magazine-popup-dismissed";

const MagazinePopup = () => {
  const { fetchFeaturedPost, fetchSlides } = useMagazine();
  const [post, setPost] = useState<MagazinePost | null>(null);
  const [firstSlide, setFirstSlide] = useState<MagazineSlide | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    // Check if dismissed today
    const dismissed = localStorage.getItem(POPUP_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed).toDateString();
      const today = new Date().toDateString();
      if (dismissedDate === today) return;
    }

    fetchFeaturedPost().then(async (featured) => {
      if (!featured) return;
      setPost(featured);
      const slides = await fetchSlides(featured.id);
      if (slides.length > 0) setFirstSlide(slides[0]);
      setShowPopup(true);
    });
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(POPUP_KEY, new Date().toISOString());
    setShowPopup(false);
  };

  const handleView = () => {
    setShowPopup(false);
    setShowViewer(true);
  };

  if (showViewer && post) {
    return <MagazineSlideViewer post={post} onClose={() => setShowViewer(false)} />;
  }

  if (!showPopup || !post) return null;

  const imageUrl = firstSlide?.image_url || post.cover_image_url;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="relative w-full max-w-sm rounded-3xl bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        {imageUrl ? (
          <div className="aspect-[4/3] w-full overflow-hidden">
            <img src={imageUrl} alt={post.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/3] w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-5xl">🏔️</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-foreground leading-snug">{post.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {post.category} {post.description && `· ${post.description.slice(0, 30)}...`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleView} className="flex-1 rounded-xl font-semibold">
              지금 보기
            </Button>
            <Button onClick={handleDismiss} variant="outline" className="rounded-xl font-semibold">
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagazinePopup;
