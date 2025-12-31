import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shield, Plus, Fuel, ShoppingCart, AlertTriangle, Cross } from 'lucide-react';
import { Coordinate, NavigationRoute, Landmark } from '../types';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to create safe HTML string from React component
const getIconHtml = (component: React.ReactElement, color: string) => {
    const svgString = renderToStaticMarkup(component);
    return `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); color: white;">${svgString}</div>`;
};

// Custom Landmark Icons
const getLandmarkIcon = (type: string) => {
    let icon = <Shield size={16} />;
    let color = '#64748b'; // default slate

    switch(type) {
        case 'hospital':
            icon = <Plus size={16} strokeWidth={4} />;
            color = '#ef4444'; // red
            break;
        case 'police':
            icon = <Shield size={16} />;
            color = '#3b82f6'; // blue
            break;
        case 'fuel':
            icon = <Fuel size={16} />;
            color = '#f59e0b'; // amber
            break;
        case 'shop':
        case 'pharmacy':
            icon = <ShoppingCart size={16} />;
            color = '#10b981'; // emerald
            break;
    }

    return new L.DivIcon({
        className: 'custom-landmark-icon',
        html: getIconHtml(icon, color),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
};

const createCustomIcon = (color: string) => new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface MapProps {
  start: Coordinate | null;
  end: Coordinate | null;
  routes: NavigationRoute[];
  selectedRouteId: string | null;
  landmarks?: Landmark[];
  onMapClick: (coord: Coordinate) => void;
  onRouteClick: (routeId: string) => void;
  isNight: boolean;
  isNavigating?: boolean;
}

const MapBoundsInfo = ({ routes, start, end, isNavigating }: { routes: NavigationRoute[], start: Coordinate | null, end: Coordinate | null, isNavigating?: boolean }) => {
  const map = useMap();

  useEffect(() => {
    if (isNavigating && start) {
      // Navigation Mode: Very close zoom
      map.flyTo([start.lat, start.lng], 18, { animate: true, duration: 1.5 });
      return;
    }

    if (routes.length > 0) {
      const bounds = L.latLngBounds([]);
      routes.forEach(route => {
        route.geometry.forEach(pt => bounds.extend([pt.lat, pt.lng]));
      });
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (start && end) {
      const bounds = L.latLngBounds([start.lat, start.lng], [end.lat, end.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (start) {
      // High zoom for start location to indicate precision (Level 16 vs default 13)
      map.flyTo([start.lat, start.lng], 16, { animate: true, duration: 1 });
    }
  }, [routes, start, end, map, isNavigating]);

  return null;
};

const MapComponent: React.FC<MapProps> = ({ 
  start, 
  end, 
  routes, 
  selectedRouteId, 
  landmarks = [],
  onMapClick, 
  onRouteClick,
  isNight,
  isNavigating = false
}) => {
  
  const tileUrl = isNight 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const attribution = '&copy; OpenStreetMap &copy; CARTO';

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        
        <MapBoundsInfo routes={routes} start={start} end={end} isNavigating={isNavigating} />

        {start && (
          <Marker position={[start.lat, start.lng]} icon={createCustomIcon('#10b981')}>
            <Popup>Start Location</Popup>
          </Marker>
        )}

        {end && (
          <Marker position={[end.lat, end.lng]} icon={createCustomIcon('#ef4444')}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          // Hide non-selected routes during navigation
          if (isNavigating && !isSelected) return null;

          const tags = route.analysis?.tags || [];
          
          let color = '#94a3b8'; // Default grey
          if (tags.includes('Safest') || (route.analysis?.safetyScore ?? 0) > 80) color = '#10b981'; // Green
          else if ((route.analysis?.safetyScore ?? 0) > 60) color = '#f59e0b'; // Yellow
          else color = '#ef4444'; // Red
          
          if (!isSelected) {
             color = '#94a3b8';
          } else {
             if (tags.includes('Safest') || (route.analysis?.safetyScore ?? 0) > 80) color = '#10b981'; 
             else if ((route.analysis?.safetyScore ?? 0) > 60) color = '#f59e0b';
             else color = '#ef4444';
          }

          return (
            <React.Fragment key={route.id}>
              {/* Main Route Line */}
              <Polyline
                positions={route.geometry.map(p => [p.lat, p.lng])}
                pathOptions={{ 
                  color: color,
                  weight: isSelected ? 8 : 5,
                  opacity: isSelected ? 1 : 0.4,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => !isNavigating && onRouteClick(route.id)
                }}
              />
              
              {/* Risky Segments Overlay */}
              {isSelected && isNavigating && route.analysis?.riskIntervals?.map((interval, idx) => {
                  const len = route.geometry.length;
                  const startIdx = Math.floor(len * interval.startPct);
                  const endIdx = Math.floor(len * interval.endPct);
                  const segmentCoords = route.geometry.slice(startIdx, endIdx).map(p => [p.lat, p.lng]);
                  
                  if (segmentCoords.length < 2) return null;

                  return (
                    <Polyline
                      key={`risk-${route.id}-${idx}`}
                      positions={segmentCoords as [number, number][]}
                      pathOptions={{
                        color: '#ef4444', 
                        weight: 8,
                        opacity: 0.9,
                        dashArray: '10, 15',
                        lineCap: 'butt'
                      }}
                    >
                      <Popup>
                        <div className="flex items-start gap-2 p-1">
                          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-1" />
                          <div>
                             <strong className="block text-xs font-bold text-red-600">Caution: {interval.type} Risk</strong>
                             <span className="text-xs text-slate-600">{interval.description}</span>
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                  );
              })}
            </React.Fragment>
          );
        })}

        {landmarks.map((lm) => (
           <Marker 
             key={lm.id} 
             position={[lm.lat, lm.lng]} 
             icon={getLandmarkIcon(lm.type)}
             zIndexOffset={100}
           >
             <Popup>
                <div className="text-center">
                    <strong className="block text-sm capitalize">{lm.type}</strong>
                    <span className="text-xs">{lm.name}</span>
                </div>
             </Popup>
           </Marker>
        ))}

      </MapContainer>
    </div>
  );
};

export default MapComponent;