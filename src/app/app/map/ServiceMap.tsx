"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, LayerGroup, DivIcon } from "leaflet";
import { MAP_STATUS_COLORS, MAP_STATUS_LABELS, mapMarkerHtml, mapPopupHtml } from "./map-markers";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  client: string;
  address: string;
  services: MapService[];
}

export interface MapService {
  id: string;
  href: string;
  code: string;
  client: string;
  serviceType: string;
  date: string;
  time: string;
  sortKey: string;
  status: "planned" | "in_progress" | "completed" | "postponed" | "cancelled";
  assigneeId: string | null;
  assignee: string;
  assigneeShortName: string;
  assigneeJobTitle: string;
  assigneeAvatarUrl: string | null;
}

interface AssigneeOption {
  id: string;
  name: string;
}

// Centre par défaut : Saint-Denis, La Réunion (974).
const DEFAULT_CENTER: [number, number] = [-20.8823, 55.4504];

interface VisiblePoint extends MapPoint {
  visibleServices: MapService[];
}

function matchesFilters(
  service: MapService,
  assigneeFilter: string,
  statusFilter: string,
): boolean {
  if (assigneeFilter !== "all") {
    if (assigneeFilter === "none" ? service.assigneeId !== null : service.assigneeId !== assigneeFilter) return false;
  }
  if (statusFilter === "active" && (service.status === "completed" || service.status === "cancelled")) return false;
  if (statusFilter !== "active" && statusFilter !== "all" && service.status !== statusFilter) return false;
  return true;
}

export function ServiceMap({
  points,
  assignees,
  showAssigneeFilter,
}: {
  points: MapPoint[];
  assignees: AssigneeOption[];
  showAssigneeFilter: boolean;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const filtered = useMemo<VisiblePoint[]>(() => {
    return points.flatMap((point) => {
      const visibleServices = point.services.filter((service) => matchesFilters(service, assigneeFilter, statusFilter));
      return visibleServices.length > 0 ? [{ ...point, visibleServices }] : [];
    });
  }, [points, assigneeFilter, statusFilter]);
  const visibleServiceCount = filtered.reduce((count, point) => count + point.visibleServices.length, 0);

  // Initialise la carte une seule fois (Leaflet nécessite le DOM → import dynamique).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(DEFAULT_CENTER, 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      renderMarkers(L);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redessine les marqueurs à chaque changement de filtre.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      renderMarkers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  function renderMarkers(L: typeof import("leaflet")) {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const iconCache = new Map<string, DivIcon>();
    const icon = (services: MapService[]) => {
      const cacheKey = services.map((service) => `${service.assigneeId ?? "none"}:${service.assigneeAvatarUrl ?? ""}:${service.status}`).join("|");
      let ic = iconCache.get(cacheKey);
      if (!ic) {
        ic = L.divIcon({
          html: mapMarkerHtml(services),
          className: "piscine-marker",
          iconSize: [108, 58],
          iconAnchor: [54, 57],
          popupAnchor: [0, -54],
        });
        iconCache.set(cacheKey, ic);
      }
      return ic;
    };
    const markers: Marker[] = [];
    for (const p of filtered) {
      const marker = L.marker([p.lat, p.lng], { icon: icon(p.visibleServices) });
      marker.bindPopup(mapPopupHtml({ ...p, services: p.visibleServices }));
      marker.addTo(layer);
      markers.push(marker);
    }
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 15 });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {showAssigneeFilter && (
          <select
            className="input max-w-xs"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">Tous les intervenants</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="none">Non assignées</option>
          </select>
        )}
        <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="active">À venir (planifiées + en cours)</option>
          <option value="all">Toutes</option>
          <option value="planned">Planifiées</option>
          <option value="in_progress">En cours</option>
          <option value="postponed">Reportés</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </select>
        <span className="text-sm text-graphite-500">
          {filtered.length} point{filtered.length > 1 ? "s" : ""} · {visibleServiceCount} entretien{visibleServiceCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-graphite-600">
        {(["planned", "in_progress", "postponed", "completed"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-white"
              style={{ backgroundColor: MAP_STATUS_COLORS[s] }}
            />
            {MAP_STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="h-[70vh] w-full rounded-xl border border-graphite-100 shadow-card"
        style={{ minHeight: 420 }}
      />
    </div>
  );
}
