import React, { useEffect, useRef, useState } from "react";

// Lightweight MapPicker that dynamically loads Leaflet from CDN and uses OpenStreetMap tiles.
// onSave receives { address: { houseNumber, street, city, pincode }, lat, lng, display_name }
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

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
        // Try to obtain user location first; if successful, use it as starting pos
        try {
          const userPos = await tryGetCurrentPosition(5000);
          if (!mounted) return;
          setPos(userPos);
          setHasUserLocation(true);
        } catch (e) {
          // ignore - we'll use initialLat/initialLng or default
        }

        loadCss(LEAFLET_CSS);
        await loadScript(LEAFLET_JS);
        if (!mounted) return;
        const L = window.L;
        if (!L) throw new Error("Leaflet failed to load");

        // create map using current pos state at the time of initialisation
        const start = { lat: pos.lat, lng: pos.lng };
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
          const geo = await reverseGeocode(p.lat, p.lng);
          setAddressPreview(geo);
        });

        mapRef.current.on("click", async (e) => {
          const { lat, lng } = e.latlng;
          markerRef.current.setLatLng([lat, lng]);
          setPos({ lat, lng });
          const geo = await reverseGeocode(lat, lng);
          setAddressPreview(geo);
        });

        // initial reverse geocode for start
        const geo = await reverseGeocode(start.lat, start.lng);
        setAddressPreview(geo);
        setLoadingMap(false);
      } catch (err) {
        console.error(err);
        setLoadingMap(false);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (mapRef.current) mapRef.current.remove();
      } catch (e) {}
    };
  }, []);

  const handleSave = () => {
    const geo = addressPreview?.address || {};
    const addressObj = {
      houseNumber: geo.house_number || "",
      street: geo.road || geo.pedestrian || geo.cycleway || geo.suburb || geo.neighbourhood || geo.village || "",
      city: geo.city || geo.town || geo.village || geo.county || "",
      pincode: geo.postcode || "",
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
      if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lng]);
      if (mapRef.current) mapRef.current.setView([p.lat, p.lng], 16);
      const geo = await reverseGeocode(p.lat, p.lng);
      setAddressPreview(geo);
    } catch (err) {
      console.warn("Could not get current location:", err && err.message ? err.message : err);
      // keep existing pos
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden">
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
