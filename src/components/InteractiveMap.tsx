import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Driver, RouteStop } from '../types';

interface InteractiveMapProps {
  drivers: Driver[];
  selectedDriver: Driver | null;
  onSelectDriver: (driver: Driver) => void;
  onSelectStop?: (stop: RouteStop, driver: Driver) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  drivers,
  selectedDriver,
  onSelectDriver,
  onSelectStop,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center around Mexico City (or drivers centroid)
    const map = L.map(mapContainerRef.current, {
      center: [19.4326, -99.1332],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Standard OpenStreetMap tiles (Free, no API key required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const routesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    routesLayerRef.current = routesLayer;
    markersLayerRef.current = markersLayer;

    // Invalidate size on resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const prevDriverIdRef = useRef<string | null>(null);

  // Update Markers & Polylines when drivers or selectedDriver changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !markersLayer || !routesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    const activeDrivers = selectedDriver ? [selectedDriver] : drivers;

    activeDrivers.forEach((driver) => {
      const isSelected = selectedDriver?.id === driver.id;

      // Color coding based on status & eco
      let markerColor = '#06b6d4'; // cyan default
      if (driver.status === 'exceso_velocidad') markerColor = '#ef4444'; // red
      else if (driver.status === 'detenido_ralenti') markerColor = '#f59e0b'; // amber
      else if (driver.status === 'en_cliente') markerColor = '#8b5cf6'; // purple
      else if (driver.status === 'en_ruta') markerColor = '#10b981'; // emerald

      // 1. Draw Route Polyline from Stops
      const stopCoords: [number, number][] = driver.stops.map((s) => [s.lat, s.lng]);
      if (stopCoords.length > 0) {
        // Draw route line
        L.polyline(stopCoords, {
          color: markerColor,
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 0.85 : 0.4,
          dashArray: '6, 8',
        }).addTo(routesLayer);
      }

      // 2. Draw Trail Polyline (Real driven path)
      if (driver.trail && driver.trail.length > 1) {
        const trailCoords: [number, number][] = driver.trail.map((t) => [t.lat, t.lng]);
        L.polyline(trailCoords, {
          color: markerColor,
          weight: isSelected ? 5 : 3,
          opacity: 0.9,
        }).addTo(routesLayer);
      }

      // 3. Client Stop Pins
      driver.stops.forEach((stop, index) => {
        let stopBg = '#3b82f6';
        let stopIcon = `${index + 1}`;
        if (stop.status === 'completado') {
          stopBg = '#10b981';
          stopIcon = '✓';
        } else if (stop.status === 'en_atencion') {
          stopBg = '#f59e0b';
          stopIcon = '⏳';
        }

        const clientCustomIcon = L.divIcon({
          className: 'custom-stop-marker',
          html: `
            <div style="
              background-color: ${stopBg};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: bold;
              color: white;
              cursor: pointer;
            ">
              ${stopIcon}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: clientCustomIcon });
        
        stopMarker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
              Parada #${index + 1} • ${stop.scheduledTime}
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">
              ${stop.clientName}
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              ${stop.address}
            </div>
            <div style="margin-top: 6px; padding: 4px 6px; background: #f1f5f9; border-radius: 4px; font-size: 11px; display: flex; justify-content: space-between;">
              <span>Pedido: <b>$${stop.orderValue.toLocaleString()}</b></span>
              <span style="font-weight: 600; text-transform: capitalize; color: ${stopBg};">${stop.status.replace('_', ' ')}</span>
            </div>
          </div>
        `);

        stopMarker.on('click', () => {
          if (onSelectStop) onSelectStop(stop, driver);
        });

        stopMarker.addTo(markersLayer);
      });

      // 4. Vehicle Marker with pulse, direction arrow and speed badge
      const vehicleHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <!-- Pulse ring -->
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: ${markerColor};
            opacity: 0.35;
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          
          <!-- Vehicle circular body -->
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #0f172a;
            border: 3px solid ${markerColor};
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${driver.headingDeg}deg); transition: transform 0.4s ease;">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>

          <!-- Speed indicator bubble -->
          <div style="
            position: absolute;
            bottom: -8px;
            background: #0f172a;
            border: 1px solid ${markerColor};
            color: #ffffff;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 8px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            ${driver.currentSpeedKmH} km/h
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: vehicleHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const vehicleMarker = L.marker([driver.currentLat, driver.currentLng], {
        icon: vehicleIcon,
        zIndexOffset: isSelected ? 1000 : 500,
      });

      vehicleMarker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <img src="${driver.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
            <div>
              <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${driver.name}</div>
              <div style="font-size: 11px; color: #64748b;">${driver.routeCode} • ${driver.vehiclePlate}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f8fafc; padding: 6px; border-radius: 6px;">
            <div>Velocidad: <b>${driver.currentSpeedKmH} km/h</b></div>
            <div>Score Eco: <b>${driver.ecoScore}/100</b></div>
            <div>Consumo: <b>${driver.estimatedFuelConsumedLiters} L</b></div>
            <div>Batería: <b>${driver.batteryLevel}%</b></div>
          </div>
        </div>
      `);

      vehicleMarker.on('click', () => {
        onSelectDriver(driver);
      });

      vehicleMarker.addTo(markersLayer);
    });

    // Only pan camera if the selected driver changed, NOT on every telemetric coordinate update tick
    if (selectedDriver && prevDriverIdRef.current !== selectedDriver.id) {
      prevDriverIdRef.current = selectedDriver.id;
      map.flyTo([selectedDriver.currentLat, selectedDriver.currentLng], 14, {
        duration: 0.6,
      });
    }
  }, [drivers, selectedDriver, onSelectDriver, onSelectStop]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full" id="fleet-live-leaflet-map" />
      
      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs space-y-1.5 pointer-events-auto">
        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Estado en Vivo</div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>En Ruta</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>En Cliente</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Ralentí &gt; 5m</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Exceso Velocidad</span>
        </div>
      </div>
    </div>
  );
};
