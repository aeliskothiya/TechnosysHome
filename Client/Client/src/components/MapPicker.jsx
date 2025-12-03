import React, { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const GOOGLE_BASE = "https://maps.googleapis.com/maps/api/js";

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src='${src}']`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

const loadCss = (href) => {
  if (document.querySelector(`link[href='${href}']`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
};

const reverseGeocode = async (lat, lon) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&addressdetails=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Reverse geocode error", err);
    return null;
  }
};

export default function MapPicker({ initialLat, initialLng, onSave, onClose }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [addressPreview, setAddressPreview] = useState(null);
  const [pos, setPos] = useState({ lat: initialLat || 21.1702, lng: initialLng || 72.8311 });
  const [hasUserLocation, setHasUserLocation] = useState(false);
  // Use only Vite env variables
  const envProvider = (import.meta.env.VITE_MAP_PROVIDER || "Leaflet").toString();
  const provider = envProvider.toLowerCase().startsWith("leaf") ? "Leaflet" : "Google";
  const [currentProvider, setCurrentProvider] = useState(provider);

  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";
  const googleScriptSrc = `${GOOGLE_BASE}?key=${encodeURIComponent(googleKey)}&libraries=places`;

  const removeGoogleScript = () => {
    try {
      const s = document.querySelector(`script[src='${googleScriptSrc}']`);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    } catch (ignore) {}
    try { delete window.gm_authFailure; } catch (e) { try { window.gm_authFailure = undefined } catch (ignore) {} }
  };

  const reverseGeoForProvider = async (lat, lng) => {
    try {
      if (
        currentProvider === "Google" &&
        typeof window !== "undefined" &&
        window.google &&
        window.google.maps &&
        window.google.maps.Geocoder
      ) {
        const geocoder = new window.google.maps.Geocoder();
        return await new Promise((resolve) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const res = results[0];
              const comps = {};
              (res.address_components || []).forEach((c) => {
                const types = c.types || [];
                types.forEach((t) => {
                  comps[t] = c.long_name;
                });
              });
              const addr = {
                house_number: comps.street_number || comps.subpremise || "",
                road: comps.route || comps.street || comps.street_address || "",
                city:
                  comps.locality || comps.postal_town || comps.administrative_area_level_2 || comps.administrative_area_level_1 || "",
                postcode: comps.postal_code || "",
              };
              resolve({ display_name: res.formatted_address, address: addr });
            } else {
              resolve(null);
            }
          });
        });
      }
    } catch (e) {
      // Silent fallback to Nominatim on any Google geocoder error
    }
    return await reverseGeocode(lat, lng);
  };

  useEffect(() => {
    let mounted = true;

    const tryGetCurrentPosition = (timeout = 5000) =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
        let resolved = false;
        const onSuccess = (p) => {
          if (resolved) return;
          resolved = true;
          resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
        };
        const onError = (err) => {
          if (resolved) return;
          resolved = true;
          reject(err);
        };
        navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, maximumAge: 0 });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error("Geolocation timeout"));
          }
        }, timeout);
      });

    (async () => {
      try {
        try {
          const userPos = await tryGetCurrentPosition(5000);
          if (!mounted) return;
          setPos(userPos);
          setHasUserLocation(true);
        } catch (e) {
          // ignore - we'll use initialLat/initialLng or default
        }

        const start = { lat: pos.lat, lng: pos.lng };

        if (currentProvider === "Google") {
          if (!googleKey) {
            setCurrentProvider("Leaflet");
            return;
          }
          try {
            window.gm_authFailure = () => {
              console.error("Google Maps authentication failed (gm_authFailure)");
              removeGoogleScript();
              setCurrentProvider("Leaflet");
            };

            await loadScript(googleScriptSrc);
          } catch (e) {
            console.error("Google Maps script load failed:", e);
            removeGoogleScript();
            setCurrentProvider("Leaflet");
            return;
          }
          if (!mounted) return;
          const g = window.google;
          if (!g || !g.maps) {
            removeGoogleScript();
            setCurrentProvider("Leaflet");
            return;
          }

          const map = new g.maps.Map(containerRef.current, {
            center: { lat: start.lat, lng: start.lng },
            zoom: 16,
          });
          mapRef.current = map;

          const marker = new g.maps.Marker({
            position: { lat: start.lat, lng: start.lng },
            map,
            draggable: true,
          });
          markerRef.current = marker;

          setTimeout(() => {
            try {
              const container = containerRef.current;
              if (container) {
                const errEl = container.querySelector('.gm-err-container, .gm-err-autocomplete');
                if (errEl || (container.textContent || '').includes('Oops! Something went wrong')) {
                  console.error('Google Maps reported an error. Falling back to Leaflet.');
                  removeGoogleScript();
                  setCurrentProvider('Leaflet');
                }
              }
            } catch (e) {
              // ignore
            }
          }, 500);

          marker.addListener("dragend", async (e) => {
            const p = marker.getPosition();
            const lat = p.lat();
            const lng = p.lng();
            setPos({ lat, lng });
            const geo = await reverseGeoForProvider(lat, lng);
            setAddressPreview(geo);
          });

          map.addListener("click", async (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition({ lat, lng });
            setPos({ lat, lng });
            const geo = await reverseGeoForProvider(lat, lng);
            setAddressPreview(geo);
          });

          const geo = await reverseGeoForProvider(start.lat, start.lng);
          setAddressPreview(geo);
          setLoadingMap(false);
        } else {
          loadCss(LEAFLET_CSS);
          await loadScript(LEAFLET_JS);
          if (!mounted) return;
          const L = window.L;
          if (!L) throw new Error("Leaflet failed to load");

          mapRef.current = L.map(containerRef.current, {
            center: [start.lat, start.lng],
            zoom: 16,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(mapRef.current);

          markerRef.current = L.marker([start.lat, start.lng], { draggable: true }).addTo(mapRef.current);

          markerRef.current.on("dragend", async (e) => {
            const p = e.target.getLatLng();
            setPos({ lat: p.lat, lng: p.lng });
            const geo = await reverseGeoForProvider(p.lat, p.lng);
            setAddressPreview(geo);
          });

          mapRef.current.on("click", async (e) => {
            const { lat, lng } = e.latlng;
            markerRef.current.setLatLng([lat, lng]);
            setPos({ lat, lng });
            const geo = await reverseGeoForProvider(lat, lng);
            setAddressPreview(geo);
          });

          const geo = await reverseGeoForProvider(start.lat, start.lng);
          setAddressPreview(geo);
          setLoadingMap(false);
        }
        } catch (err) {
          console.error(err);
          setLoadingMap(false);
        }
    })();

    return () => {
      mounted = false;
      try { if (mapRef.current) mapRef.current.remove(); } catch (e) {}
      try { removeGoogleScript(); } catch (ignore) {}
    };
  }, [currentProvider]);

  const handleSave = () => {
    const geo = addressPreview?.address || {};

    const parseDisplayNameFallback = (display_name, addr = {}) => {
      const out = Object.assign({}, addr);
      if (!display_name) return out;
      const parts = (display_name || "").split(",").map((p) => p.trim()).filter(Boolean);

      // Try to extract house number (common pattern: starts with number)
      if (!out.house_number) {
        for (let i = 0; i < Math.min(2, parts.length); i++) {
          const m = parts[i].match(/^([0-9]+[A-Za-z0-9\-\/]*)\b/);
          if (m) { out.house_number = m[1]; break; }
        }
      }

      // Try to pick a sensible road/street value from the display parts
      if (!out.road) {
        if (parts.length === 1) {
          out.road = parts[0];
        } else if (out.house_number) {
          const first = parts[0].replace(out.house_number, "").trim();
          out.road = first || parts[1] || out.road || "";
        } else {
          out.road = parts[0] || out.road || "";
        }
      }

      // City fallback: choose a middle/near-end part that looks like a city
      if (!out.city) {
        if (parts.length >= 3) out.city = parts[parts.length - 3] || parts[parts.length - 2];
        else if (parts.length >= 2) out.city = parts[parts.length - 2];
      }

      // Pincode fallback: search for 5-6 digit sequence
      if (!out.postcode) {
        const m = display_name.match(/\b(\d{5,6})\b/);
        if (m) out.postcode = m[1];
      }

      return out;
    };

    const merged = parseDisplayNameFallback(addressPreview?.display_name || "", geo);

    const addressObj = {
      houseNumber: merged.house_number || merged.house_Number || merged.houseNumber || "",
      street: merged.road || merged.pedestrian || merged.cycleway || merged.suburb || merged.neighbourhood || merged.village || "",
      city: merged.city || merged.town || merged.village || merged.county || "",
      pincode: merged.postcode || merged.postal_code || "",
    };

    onSave && onSave({ address: addressObj, lat: pos.lat, lng: pos.lng, display_name: addressPreview?.display_name || "" });
  };

  const handleUseMyLocation = async () => {
    try {
      const p = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true }
        );
      });
      setPos(p);
      setHasUserLocation(true);
      if (currentProvider === "Google") {
        try {
          if (markerRef.current && typeof markerRef.current.setPosition === "function") {
            markerRef.current.setPosition({ lat: p.lat, lng: p.lng });
          }
          if (mapRef.current && typeof mapRef.current.setCenter === "function") {
            mapRef.current.setCenter({ lat: p.lat, lng: p.lng });
            if (typeof mapRef.current.setZoom === "function") mapRef.current.setZoom(16);
          }
        } catch (e) {
          console.warn("Could not update Google marker/map position:", e);
        }

        const geo = await reverseGeoForProvider(p.lat, p.lng);
        setAddressPreview(geo);
      } else {
        if (markerRef.current && typeof markerRef.current.setLatLng === "function") {
          markerRef.current.setLatLng([p.lat, p.lng]);
        }
        if (mapRef.current && typeof mapRef.current.setView === "function") {
          mapRef.current.setView([p.lat, p.lng], 16);
        }
        const geo = await reverseGeoForProvider(p.lat, p.lng);
        setAddressPreview(geo);
      }
    } catch (err) {
      console.warn("Could not get current location:", err && err.message ? err.message : err);
      // keep existing pos
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose && onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Pick Location on Map</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">Close</button>
            <button onClick={handleUseMyLocation} className="px-3 py-1 rounded bg-green-600 text-white">Use current location</button>
            <button onClick={handleSave} className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
          </div>
        </div>
        <div className="flex">
          <div ref={containerRef} style={{ height: 480, width: "60%" }} />
          <div className="p-4 w-40%" style={{ width: "40%" }}>
            <h4 className="font-medium mb-2">Selected</h4>
            <p className="text-sm text-gray-600 mb-2">Lat: {pos.lat.toFixed(6)} , Lng: {pos.lng.toFixed(6)}</p>
            <div className="text-sm text-gray-700 mb-4">
              {addressPreview ? (
                <>
                  <div className="font-semibold">{addressPreview.display_name}</div>
                </>
              ) : (
                <div className="text-gray-400">No address preview</div>
              )}
            </div>
            <div className="text-xs text-gray-500">Tip: Drag the marker or click on the map to position the pin accurately.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
