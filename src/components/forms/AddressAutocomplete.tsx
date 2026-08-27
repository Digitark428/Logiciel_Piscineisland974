"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Autocomplétion d'adresse basée sur la Base Adresse Nationale (BAN),
 * le service officiel du gouvernement français — https://api-adresse.data.gouv.fr.
 * Gratuit, sans clé API, couvre la métropole et les DROM (dont La Réunion 974).
 *
 * Le patron tape le début d'une adresse → une liste de propositions officielles
 * apparaît → il clique → l'adresse, le code postal, la ville ET les coordonnées
 * GPS (latitude/longitude) sont remplies automatiquement. Aucune saisie X/Y.
 */

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";

interface Suggestion {
  label: string;
  name: string; // n° + voie (ex: "8 Rue de la Plage")
  postcode: string;
  city: string;
  context: string; // ex: "974, La Réunion"
  type: string; // housenumber | street | locality | municipality
  lat: number;
  lon: number;
}

interface Defaults {
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geo_label?: string | null;
  geo_precision?: string | null;
}

export function AddressAutocomplete({
  defaults,
  showComplement = true,
}: {
  defaults?: Defaults;
  showComplement?: boolean;
}) {
  const [query, setQuery] = useState(defaults?.address_line1 ?? "");
  const [postal, setPostal] = useState(defaults?.postal_code ?? "");
  const [city, setCity] = useState(defaults?.city ?? "");
  const [lat, setLat] = useState<number | null>(defaults?.latitude ?? null);
  const [lon, setLon] = useState<number | null>(defaults?.longitude ?? null);
  const [geoLabel, setGeoLabel] = useState(defaults?.geo_label ?? "");
  const [geoPrecision, setGeoPrecision] = useState(defaults?.geo_precision ?? "");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextFetch = useRef(false);

  // Ferme la liste au clic extérieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Recherche BAN (debounce 250 ms).
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`${BAN_URL}?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("BAN indisponible");
        const data = await res.json();
        const items: Suggestion[] = (data.features ?? []).map((f: any) => ({
          label: f.properties.label,
          name: f.properties.name,
          postcode: f.properties.postcode ?? "",
          city: f.properties.city ?? "",
          context: f.properties.context ?? "",
          type: f.properties.type ?? "",
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }));
        setSuggestions(items);
        setOpen(items.length > 0);
        setActive(-1);
      } catch {
        // silencieux : réseau/annulation — l'utilisateur peut toujours saisir à la main
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function choose(s: Suggestion) {
    skipNextFetch.current = true;
    setQuery(s.name || s.label);
    setPostal(s.postcode);
    setCity(s.city);
    setLat(s.lat);
    setLon(s.lon);
    setGeoLabel(s.label);
    setGeoPrecision(s.type);
    setOpen(false);
    setSuggestions([]);
  }

  // Si l'adresse est modifiée manuellement, les coordonnées ne sont plus fiables.
  function onQueryChange(v: string) {
    setQuery(v);
    if (lat !== null || lon !== null) {
      setLat(null);
      setLon(null);
      setGeoLabel("");
      setGeoPrecision("");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const geocoded = lat !== null && lon !== null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative sm:col-span-2" ref={boxRef}>
        <label className="label" htmlFor="address_line1">
          Adresse
        </label>
        <input
          id="address_line1"
          name="address_line1"
          className="input"
          autoComplete="off"
          placeholder="Commencez à taper une adresse…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-9 text-xs text-graphite-400">
            …
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul data-leti-overlay="popover" className="absolute z-[var(--leti-layer-popover)] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-graphite-100 bg-white shadow-float">
            {suggestions.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(s)}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    i === active ? "bg-pool-50" : "hover:bg-graphite-50"
                  }`}
                >
                  <span className="font-medium text-graphite-900">{s.name || s.label}</span>
                  <span className="text-xs text-graphite-500">
                    {[s.postcode, s.city, s.context].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-graphite-400">
          {geocoded ? (
            <span className="text-emerald-600">📍 Adresse localisée — coordonnées enregistrées.</span>
          ) : (
            "Choisissez une proposition pour localiser automatiquement le client sur la carte."
          )}
        </p>
      </div>

      {showComplement && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address_line2">
            Complément (bâtiment, résidence, étage…)
          </label>
          <input
            id="address_line2"
            name="address_line2"
            className="input"
            defaultValue={defaults?.address_line2 ?? ""}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="postal_code">
          Code postal
        </label>
        <input
          id="postal_code"
          name="postal_code"
          className="input"
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="city">
          Ville
        </label>
        <input
          id="city"
          name="city"
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {/* Coordonnées + métadonnées de géocodage (renseignées automatiquement). */}
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lon ?? ""} />
      <input type="hidden" name="geo_label" value={geoLabel} />
      <input type="hidden" name="geo_precision" value={geoPrecision} />
    </div>
  );
}
