"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, LayerGroup, DivIcon } from "leaflet";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  code: string;
  serviceType: string;
  client: string;
  address: string;
  date: string;
  time: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  assigneeId: string | null;
  assignee: string;
}

interface AssigneeOption {
  id: string;
  name: string;
}

// Centre par défaut : Saint-Denis, La Réunion (974).
const DEFAULT_CENTER: [number, number] = [-20.8823, 55.4504];

const STATUS_COLORS: Record<MapPoint["status"], string> = {
  planned: "#2563eb", // bleu piscine
  in_progress: "#f59e0b", // ambre
  completed: "#10b981", // vert
  cancelled: "#9ca3af", // gris
};

const STATUS_LABELS: Record<MapPoint["status"], string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

// Marqueur personnalisé « goutte d'eau / piscine » aux couleurs de Piscine Island,
// teinté selon le statut (jamais rouge). Épingle SVG + petite vague à l'intérieur.
function markerHtml(status: MapPoint["status"]): string {
  const color = STATUS_COLORS[status];
  return `
    <div style="position:relative;width:34px;height:44px;filter:drop-shadow(0 2px 3px rgba(15,23,42,.35))">
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 1C8.7 1 2 7.6 2 15.7 2 26 17 43 17 43s15-17 15-27.3C32 7.6 25.3 1 17 1z"
              fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="17" cy="15.5" r="8.5" fill="#ffffff"/>
        <path d="M9.5 16.2c1 0 1-.9 2.1-.9s1.1.9 2.1.9 1-.9 2.1-.9 1.1.9 2.1.9 1-.9 2.1-.9 1.1.9 2.1.9"
              stroke="${color}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        <path d="M9.5 19.4c1 0 1-.9 2.1-.9s1.1.9 2.1.9 1-.9 2.1-.9 1.1.9 2.1.9 1-.9 2.1-.9 1.1.9 2.1.9"
              stroke="${color}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".55"/>
      </svg>
    </div>`;
}

function popupHtml(p: MapPoint): string {
  const wazeUrl = `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const when = [p.date, p.time].filter(Boolean).join(" à ");
  return `
    <div style="min-width:190px">
      <div style="font-weight:600;color:#111827">${esc(p.client)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(p.serviceType)} · ${esc(STATUS_LABELS[p.status])}</div>
      ${when ? `<div style="font-size:12px;color:#6b7280">${esc(when)}</div>` : ""}
      ${p.address ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(p.address)}</div>` : ""}
      ${p.assignee ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">👤 ${esc(p.assignee)}</div>` : ""}
      <div style="display:flex;gap:6px;margin-top:8px">
        <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer"
           style="flex:1;text-align:center;background:#2563eb;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;text-decoration:none">🚗 Waze</a>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
           style="flex:1;text-align:center;background:#f3f4f6;color:#111827;border-radius:8px;padding:6px 8px;font-size:12px;text-decoration:none">Maps</a>
      </div>
      <a href="/app/services/${p.id}" style="display:block;margin-top:6px;font-size:12px;color:#2563eb;text-decoration:none">Ouvrir la fiche →</a>
    </div>`;
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

  const filtered = useMemo(() => {
    return points.filter((p) => {
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "none" ? p.assigneeId !== null : p.assigneeId !== assigneeFilter) return false;
      }
      if (statusFilter === "active" && (p.status === "completed" || p.status === "cancelled")) return false;
      if (statusFilter !== "active" && statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [points, assigneeFilter, statusFilter]);

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
    const icon = (status: MapPoint["status"]) => {
      let ic = iconCache.get(status);
      if (!ic) {
        ic = L.divIcon({
          html: markerHtml(status),
          className: "piscine-marker",
          iconSize: [34, 44],
          iconAnchor: [17, 43],
          popupAnchor: [0, -38],
        });
        iconCache.set(status, ic);
      }
      return ic;
    };
    const markers: Marker[] = [];
    for (const p of filtered) {
      const marker = L.marker([p.lat, p.lng], { icon: icon(p.status) });
      marker.bindPopup(popupHtml(p));
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
          <option value="completed">Terminées</option>
        </select>
        <span className="text-sm text-graphite-500">
          {filtered.length} prestation{filtered.length > 1 ? "s" : ""} sur la carte
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-graphite-600">
        {(["planned", "in_progress", "completed"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-white"
              style={{ backgroundColor: STATUS_COLORS[s] }}
            />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="h-[70vh] w-full rounded-xl border border-graphite-200"
        style={{ minHeight: 420 }}
      />
    </div>
  );
}
