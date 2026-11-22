"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

// Esri World Imagery: satellite photos without labels (so the map doesn't give the answer away).
const SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ATTRIBUTION = "© Esri, Maxar";

export default function GeoMap({ lat, lon, zoom, revealed }: { lat: number; lon: number; zoom: number; revealed: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const m = L.map(el.current, {
      center: [lat, lon],
      zoom,
      scrollWheelZoom: false,
      dragging: !touch, // on phones a swipe should scroll the page, not move the map
      touchZoom: touch,
      attributionControl: true,
    });
    m.attributionControl.setPrefix(false);
    L.tileLayer(SATELLITE, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [lat, lon, zoom]);

  useEffect(() => {
    const m = map.current;
    if (!m || !revealed) return;
    // After she answers: show place names and pull back so she sees where it is in the country.
    const labels = L.tileLayer(LABELS, { maxZoom: 18 }).addTo(m);
    const marker = L.circleMarker([lat, lon], { radius: 10, color: "#fff", weight: 3, fillColor: "#e4572e", fillOpacity: 1 }).addTo(m);
    m.flyTo([lat, lon], Math.max(5, Math.min(zoom - 6, 8)), { duration: 1.5 });
    return () => {
      labels.remove();
      marker.remove();
    };
  }, [revealed, lat, lon, zoom]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded-2xl border-2 border-border sm:h-80" />;
}
