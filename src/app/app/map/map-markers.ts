interface MarkerService {
  href: string;
  code: string;
  client: string;
  serviceType: string;
  date: string;
  time: string;
  status: "planned" | "in_progress" | "completed" | "postponed" | "cancelled";
  assigneeId: string | null;
  assignee: string;
  assigneeShortName: string;
  assigneeJobTitle: string;
  assigneeAvatarUrl: string | null;
}

interface MarkerPoint {
  lat: number;
  lng: number;
  client: string;
  address: string;
  services: MarkerService[];
}

export const MAP_STATUS_COLORS: Record<MarkerService["status"], string> = {
  planned: "#2563eb",
  in_progress: "#f59e0b",
  completed: "#10b981",
  postponed: "#f97360",
  cancelled: "#9ca3af",
};

export const MAP_STATUS_LABELS: Record<MarkerService["status"], string> = {
  planned: "À faire",
  in_progress: "En cours",
  completed: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulée",
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? words.at(-1)?.[0] ?? "" : ""}`.toLocaleUpperCase("fr");
}

export function mapMarkerStatus(services: MarkerService[]): MarkerService["status"] {
  return services.find((service) => service.status === "in_progress")?.status
    ?? services.find((service) => service.status === "planned")?.status
    ?? services.find((service) => service.status === "postponed")?.status
    ?? services.find((service) => service.status === "completed")?.status
    ?? "cancelled";
}

export function mapMarkerHtml(services: MarkerService[]): string {
  const unique = new Map<string, MarkerService>();
  for (const service of services) unique.set(service.assigneeId ?? "unassigned", service);
  const identities = Array.from(unique.values());
  const visible = identities.slice(0, 3);
  const label = identities.length === 1
    ? (identities[0].assigneeId ? identities[0].assigneeShortName || identities[0].assignee : "Non assigné")
    : `${identities.length} intervenants`;
  const statusColor = MAP_STATUS_COLORS[mapMarkerStatus(services)];
  const bubbles = visible.map((service, index) => {
    const image = service.assigneeAvatarUrl
      ? `<img src="${escapeHtml(service.assigneeAvatarUrl)}" alt="" style="width:30px;height:30px;border-radius:999px;object-fit:cover;display:block">`
      : `<span style="display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:999px;background:${service.assigneeId ? "#DCF5FA" : "#EEF0EF"};color:${service.assigneeId ? "#247D9B" : "#667A87"};font-size:10px;font-weight:800">${escapeHtml(service.assigneeId ? initials(service.assignee) : "?")}</span>`;
    return `<span style="position:relative;z-index:${visible.length - index};display:block;margin-left:${index === 0 ? 0 : -8}px;border:2px solid #fff;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(15,45,71,.24)">${image}</span>`;
  }).join("");
  return `<div style="position:relative;display:flex;width:108px;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 4px rgba(15,45,71,.25))">
    <div style="display:flex;align-items:center;border:2px solid #fff;border-radius:999px;background:#fff;padding:3px 7px 3px 4px">
      <span style="display:flex;align-items:center">${bubbles}</span>
      <span style="margin-left:6px;max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#183A59;font-size:10px;font-weight:800">${escapeHtml(label)}</span>
      <span style="position:absolute;right:5px;top:2px;width:9px;height:9px;border:2px solid #fff;border-radius:999px;background:${statusColor}"></span>
    </div>
    <span style="display:block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #fff"></span>
  </div>`;
}

function popupIdentity(service: MarkerService): string {
  if (!service.assigneeId) {
    return `<div style="display:flex;align-items:center;gap:7px;margin-top:6px;color:#667A87;font-size:11px"><span style="display:flex;width:24px;height:24px;align-items:center;justify-content:center;border-radius:999px;background:#EEF0EF;font-weight:800">?</span><span>Non assigné</span></div>`;
  }
  const avatar = service.assigneeAvatarUrl
    ? `<img src="${escapeHtml(service.assigneeAvatarUrl)}" alt="" style="width:24px;height:24px;border-radius:999px;object-fit:cover">`
    : `<span style="display:flex;width:24px;height:24px;align-items:center;justify-content:center;border-radius:999px;background:#DCF5FA;color:#247D9B;font-size:9px;font-weight:800">${escapeHtml(initials(service.assignee))}</span>`;
  return `<div style="display:flex;align-items:center;gap:7px;margin-top:6px">${avatar}<span><strong style="display:block;color:#183A59;font-size:11px">${escapeHtml(service.assignee)}</strong>${service.assigneeJobTitle ? `<span style="display:block;color:#667A87;font-size:10px">${escapeHtml(service.assigneeJobTitle)}</span>` : ""}</span></div>`;
}

export function mapPopupHtml(point: MarkerPoint): string {
  const wazeUrl = `https://waze.com/ul?ll=${point.lat},${point.lng}&navigate=yes`;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
  const services = point.services.map((service) => {
    const when = [service.date, service.time].filter(Boolean).join(" à ");
    return `<a href="${escapeHtml(service.href)}" style="display:block;margin-top:7px;border:1px solid #DDE3E4;border-radius:10px;padding:8px 9px;text-decoration:none">
      <div style="font-size:12px;font-weight:700;color:#183A59">${escapeHtml(service.client)}</div>
      <div style="font-size:11px;font-weight:600;color:#344F63;margin-top:2px">${escapeHtml(service.serviceType)}</div>
      <div style="font-size:11px;color:#667A87;margin-top:2px">${escapeHtml(MAP_STATUS_LABELS[service.status])}${when ? ` · ${escapeHtml(when)}` : ""}${service.code ? ` · ${escapeHtml(service.code)}` : ""}</div>
      ${popupIdentity(service)}
    </a>`;
  }).join("");
  return `<div style="min-width:220px;max-width:290px">
    <div style="font-weight:700;color:#183A59">${escapeHtml(point.client)}</div>
    ${point.address ? `<div style="font-size:12px;color:#667A87;margin-top:2px">${escapeHtml(point.address)}</div>` : ""}
    <div style="margin-top:9px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#667A87">Entretiens (${point.services.length})</div>
    ${services}
    <div style="display:flex;gap:6px;margin-top:9px">
      <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;background:#247D9B;color:#fff;border-radius:8px;padding:7px 8px;font-size:12px;text-decoration:none">Waze</a>
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;background:#EEF0EF;color:#183A59;border-radius:8px;padding:7px 8px;font-size:12px;text-decoration:none">Maps</a>
    </div>
  </div>`;
}
