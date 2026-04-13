import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ExternalLink, Coffee, UtensilsCrossed, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Place {
  name: string;
  category: string;
  address: string;
  phone: string | null;
  distance_m: number;
  distance_km: string;
  place_url: string;
  lat: number;
  lng: number;
  place_id: string;
}

interface NearbyPlacesProps {
  lat: number;
  lng: number;
  mountainName: string;
}

export function NearbyPlaces({ lat, lng, mountainName }: NearbyPlacesProps) {
  const [restaurants, setRestaurants] = useState<Place[]>([]);
  const [cafes, setCafes] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("nearby-places", {
          body: { lat, lng, radius: 5000, sort: "distance" },
        });
        if (fnError) throw fnError;
        if (data?.restaurants) setRestaurants(data.restaurants);
        if (data?.cafes) setCafes(data.cafes);
      } catch (e: any) {
        setError("주변 맛집 정보를 불러올 수 없습니다");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaces();
  }, [lat, lng]);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const allPlaces = [...restaurants, ...cafes].sort((a, b) => a.distance_m - b.distance_m);

  return (
    <div className="space-y-6">
      <PlaceSection
        title="🍜 주변 맛집 & 카페"
        subtitle={`${mountainName} 근처 추천 식당 · 카페`}
        icon={UtensilsCrossed}
        places={allPlaces}
        loading={loading}
      />
    </div>
  );
}

function PlaceSection({
  title,
  subtitle,
  icon: Icon,
  places,
  loading,
}: {
  title: string;
  subtitle: string;
  icon: any;
  places: Place[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (places.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {places.map((place) => (
          <div
            key={place.place_id}
            className="rounded-xl bg-secondary/50 p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                  {place.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {place.category}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {place.distance_km}km
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{place.address}</span>
            </div>

            {place.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{place.phone}</span>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 mt-1"
              onClick={() => window.open(place.place_url, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              카카오맵에서 보기
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
