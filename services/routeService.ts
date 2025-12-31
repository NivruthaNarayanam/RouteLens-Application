import { Coordinate, NavigationRoute, Landmark, LandmarkType, RouteStep } from "../types";

const OSRM_API_URL = "https://router.project-osrm.org/route/v1/driving";

// Helper to format OSRM maneuvers into readable text
const formatInstruction = (step: any): string => {
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;
  const name = step.name || "the road";

  if (type === 'depart') return `Head ${modifier || ''} on ${name}`;
  if (type === 'arrive') return `Arrive at destination on ${modifier || 'your right'}`;
  if (type === 'roundabout') return `At roundabout, take exit ${step.maneuver.exit} onto ${name}`;
  
  const turn = modifier ? modifier.replace('_', ' ') : 'turn';
  return `Turn ${turn} onto ${name}`;
};

// Helper to map OSRM response to our format
const mapOSRMResponseToRoutes = (data: any, startIndex: number = 0): NavigationRoute[] => {
  if (!data || !data.routes || !Array.isArray(data.routes)) return [];
  
  return data.routes.map((route: any, index: number) => {
    // Defensive check for geometry
    const rawCoords = route.geometry?.coordinates;
    const geometry: Coordinate[] = Array.isArray(rawCoords) 
      ? rawCoords.map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0],
        }))
      : [];

    // Map steps
    const steps: RouteStep[] = route.legs?.[0]?.steps?.map((step: any) => ({
      instruction: formatInstruction(step),
      distance: step.distance,
      duration: step.duration
    })) || [];

    return {
      id: `route-${startIndex + index}-${Date.now()}`, // Ensure unique IDs
      summary: route.legs?.[0]?.summary || "Alternative Route",
      duration: route.duration || 0,
      distance: route.distance || 0,
      geometry: geometry,
      steps: steps,
      color: '#94a3b8',
    };
  });
};

const fetchRouteSegment = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const fetchRoutes = async (start: Coordinate, end: Coordinate): Promise<NavigationRoute[]> => {
  try {
    // 1. Try standard request with alternatives
    const mainUrl = `${OSRM_API_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    const mainData = await fetchRouteSegment(mainUrl);
    
    let allRoutes: NavigationRoute[] = [];

    if (mainData) {
      allRoutes = mapOSRMResponseToRoutes(mainData, 0);
    }

    // 2. If we don't have enough routes, try to force alternatives via waypoints
    if (allRoutes.length < 3) {
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0.001) { 
        const midLat = (start.lat + end.lat) / 2;
        const midLng = (start.lng + end.lng) / 2;
        
        const offsetScale = dist * 0.2; 
        const normX = -dy / dist;
        const normY = dx / dist;

        // Waypoint 1 (Right side)
        const wp1Lat = midLat + (normY * offsetScale);
        const wp1Lng = midLng + (normX * offsetScale);

        // Waypoint 2 (Left side)
        const wp2Lat = midLat - (normY * offsetScale);
        const wp2Lng = midLng - (normX * offsetScale);

        // Fetch via WP1
        if (allRoutes.length < 3) {
           const wp1Url = `${OSRM_API_URL}/${start.lng},${start.lat};${wp1Lng},${wp1Lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
           const wp1Data = await fetchRouteSegment(wp1Url);
           if (wp1Data) {
             const newRoutes = mapOSRMResponseToRoutes(wp1Data, allRoutes.length);
             if (newRoutes.length > 0) {
                const isDuplicate = allRoutes.some(r => 
                  Math.abs(r.duration - newRoutes[0].duration) < r.duration * 0.01 &&
                  Math.abs(r.distance - newRoutes[0].distance) < r.distance * 0.01
                );
                
                if (!isDuplicate) {
                    newRoutes[0].summary += " (Alt 1)";
                    allRoutes.push(newRoutes[0]);
                }
             }
           }
        }

        // Fetch via WP2 if still needed
        if (allRoutes.length < 3) {
           const wp2Url = `${OSRM_API_URL}/${start.lng},${start.lat};${wp2Lng},${wp2Lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
           const wp2Data = await fetchRouteSegment(wp2Url);
           if (wp2Data) {
             const newRoutes = mapOSRMResponseToRoutes(wp2Data, allRoutes.length);
             if (newRoutes.length > 0) {
                 const isDuplicate = allRoutes.some(r => 
                   Math.abs(r.duration - newRoutes[0].duration) < r.duration * 0.01 &&
                   Math.abs(r.distance - newRoutes[0].distance) < r.distance * 0.01
                 );
                 
                 if (!isDuplicate) {
                    newRoutes[0].summary += " (Alt 2)";
                    allRoutes.push(newRoutes[0]);
                 }
             }
           }
        }
      }
    }

    // Limit to 3 max just in case
    return allRoutes.slice(0, 3);

  } catch (error) {
    console.error("Route fetch error:", error);
    return [];
  }
};

export const fetchSafeLandmarks = async (
  minLat: number, 
  maxLat: number, 
  minLng: number, 
  maxLng: number
): Promise<Landmark[]> => {
  try {
    // Construct viewbox for Nominatim
    const viewbox = `${minLng},${maxLat},${maxLng},${minLat}`;
    
    // We will make parallel requests for different categories to save time
    const categories: Record<string, LandmarkType> = {
      'hospital': 'hospital',
      'police': 'police',
      'fuel': 'fuel',
      'pharmacy': 'pharmacy',
      'convenience_store': 'shop' // approximating 24x7 stores
    };

    const promises = Object.entries(categories).map(async ([query, type]) => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&viewbox=${viewbox}&bounded=1&limit=5`;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'RouteLens/1.0' }});
        if (!res.ok) return [];
        const data = await res.json();
        
        // Critical Fix: Ensure data is an array before mapping
        if (!Array.isArray(data)) return [];

        return data.map((item: any) => ({
          id: item.place_id.toString(),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          name: item.display_name.split(',')[0],
          type: type
        }));
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();

  } catch (error) {
    console.warn("Error fetching landmarks:", error);
    return [];
  }
};

// IMPROVED: Prefer Google Maps Geocoding API if key available, else Nominatim
export const reverseGeocode = async (coord: Coordinate): Promise<string> => {
  // 1. Try Google Maps Geocoding (Higher Quality)
  if (process.env.API_KEY) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coord.lat},${coord.lng}&key=${process.env.API_KEY}`;
      const gRes = await fetch(googleUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.results && gData.results.length > 0) {
           // Return the first formatted address (usually the most specific)
           // e.g. "1600 Amphitheatre Pkwy, Mountain View, CA..."
           return gData.results[0].formatted_address;
        }
      }
    } catch (e) {
      console.warn("Google Geocoding failed, falling back to Nominatim", e);
    }
  }

  // 2. Fallback to Nominatim (OpenStreetMap)
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'RouteLens/1.0'
      }
    });
    
    if (!response.ok) {
      return "Location";
    }

    const data = await response.json();
    
    // Improved logic: Use display_name components if robust
    if (data.display_name) {
       // Often Nominatim returns "123, Main St, District..."
       const parts = data.display_name.split(', ');
       if (parts.length >= 2) {
         // Return first 3 parts (usually Name/Number, Street, CityPart)
         return parts.slice(0, 3).join(', ');
       }
       return parts[0];
    }
    
    const addr = data.address;
    if (addr) {
        const parts = [];
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.road) parts.push(addr.road);
        else if (addr.pedestrian) parts.push(addr.pedestrian);
        
        if (parts.length > 0) return parts.join(' ');
        return addr.hamlet || addr.town || addr.city || "Selected Location";
    }
    return "Unknown Location";
  } catch (e) {
    console.warn("Geocoding failed", e);
    return "Location";
  }
};

export const searchLocation = async (query: string, category?: string): Promise<{ lat: number; lng: number; display_name: string } | null> => {
  try {
    let searchQuery = query;
    if (category && category !== 'All') {
      searchQuery = `${category} ${query}`;
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
       headers: {
        'User-Agent': 'RouteLens/1.0'
      }
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    // Critical Fix: Ensure data is an array
    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  } catch (e) {
    console.error("Search failed", e);
    return null;
  }
};