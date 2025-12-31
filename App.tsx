import React, { useState, useEffect, useMemo } from 'react';
import { Moon, Sun, ArrowLeft, Mic, MessageCircle } from 'lucide-react';
import MapComponent from './components/MapComponent';
import { HomeScreen, RouteCarousel, RouteDetails, NavigationHUD, FeedbackModal } from './components/UI';
import { fetchRoutes, reverseGeocode, searchLocation, fetchSafeLandmarks } from './services/routeService';
import { analyzeRoutes, getDestinationInsights, refineSearchQuery } from './services/geminiService';
import { Coordinate, NavigationRoute, Landmark, DestinationInsight, UserPreference } from './types';
import { VoiceAssistant } from './components/VoiceAssistant';
import { ChatBot } from './components/ChatBot';

type ScreenState = 'HOME' | 'SELECT' | 'DETAILS' | 'NAV' | 'FEEDBACK';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('HOME');
  
  // Data State
  const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
  const [endPoint, setEndPoint] = useState<Coordinate | null>(null);
  const [startAddress, setStartAddress] = useState<string>("");
  const [endAddress, setEndAddress] = useState<string>("");
  const [searchCategory, setSearchCategory] = useState<string>("All"); 
  const [routes, setRoutes] = useState<NavigationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [destInsights, setDestInsights] = useState<DestinationInsight | null>(null);
  const [searchSources, setSearchSources] = useState<string[]>([]);
  
  // UI State
  const [isNight, setIsNight] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false); 
  const [preference, setPreference] = useState<UserPreference>('Safety');
  const [error, setError] = useState<string | null>(null);
  const [showVoice, setShowVoice] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);

  // Auto-detect night mode
  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour < 6 || hour >= 18);
  }, []);

  const handleStartInputChange = (val: string) => {
     setStartAddress(val);
     setStartPoint(null);
  };

  const handleEndInputChange = (val: string) => {
     setEndAddress(val);
     setEndPoint(null);
  };

  // REFACTORED: Prioritize Accuracy over Speed
  // 1. Try Hardware GPS (High Accuracy)
  // 2. Try Google Geolocation API (Medium/Low Accuracy)
  // 3. Try IP Fallback (Low Accuracy)
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);

    // Helper to process valid location result
    const processLocation = async (lat: number, lng: number, sourceName: string) => {
        console.log(`Location locked via ${sourceName}:`, lat, lng);
        setStartPoint({ lat, lng });
        const addr = await reverseGeocode({ lat, lng });
        setStartAddress(addr);
        setIsLocating(false);
    };

    try {
        // STEP 1: Browser Geolocation (High Accuracy)
        await new Promise<void>((resolve, reject) => {
            if (!navigator.geolocation) {
                reject("GPS not supported"); 
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await processLocation(pos.coords.latitude, pos.coords.longitude, "GPS");
                    resolve();
                },
                (err) => {
                    console.warn("GPS failed, trying fallback...", err.message);
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Wait up to 10s for precise lock
            );
        });
        return; // Exit if GPS succeeded
    } catch (gpsError) {
        // GPS failed, continue to Step 2
    }

    try {
        // STEP 2: Google Geolocation API (Fallback)
        if (!process.env.API_KEY) throw new Error("No API Key");
        
        const res = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ considerIp: true })
        });
        
        if (!res.ok) throw new Error("Google API failed");
        
        const data = await res.json();
        if (data.location) {
            await processLocation(data.location.lat, data.location.lng, "GoogleAPI");
            return;
        }
    } catch (googleError) {
        // Google API failed, continue to Step 3
    }

    try {
        // STEP 3: IP Fallback (Last Resort)
        // Try multiple IP providers in parallel, take first success
        const ipProviders = [
             fetch('https://api.bigdatacloud.net/data/reverse-geocode-client').then(r => r.json()).then(d => d.latitude ? { lat: d.latitude, lng: d.longitude } : Promise.reject()),
             fetch('https://ipapi.co/json/').then(r => r.json()).then(d => d.latitude ? { lat: d.latitude, lng: d.longitude } : Promise.reject()),
             fetch('https://ipwho.is/').then(r => r.json()).then(d => d.success !== false ? { lat: d.latitude, lng: d.longitude } : Promise.reject())
        ];

        // Emulate Promise.any
        const ipLoc = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
             let rejectedCount = 0;
             if (ipProviders.length === 0) reject(new Error("No providers"));

             ipProviders.forEach(p => {
                 p.then(resolve).catch(() => {
                     rejectedCount++;
                     if (rejectedCount === ipProviders.length) reject(new Error("All providers failed"));
                 });
             });
        });

        await processLocation(ipLoc.lat, ipLoc.lng, "IP");
        return;
    } catch (ipError) {
        console.error("All location methods failed");
        // FINAL RESORT: Default to San Francisco
        const fallback = { lat: 37.7749, lng: -122.4194 };
        setStartPoint(fallback);
        setStartAddress("San Francisco (Default)");
        alert("We couldn't detect your location. Defaulting to San Francisco. Please check your device location settings.");
        setIsLocating(false);
    }
  };

  const handleSearch = async () => {
    if (!startAddress && !endAddress) return; 
    
    setIsAnalyzing(true);
    setScreen('SELECT'); 
    setRoutes([]);
    setError(null);

    let currentStartAddr = startAddress;
    let start = startPoint;
    let end = endPoint;

    // 1. Handle "Current Location" explicitly if coords are missing
    if ((!currentStartAddr || currentStartAddr.toLowerCase().includes('current location') || currentStartAddr.toLowerCase().includes('approx') || currentStartAddr.includes('Default')) && !start) {
         try {
             setIsLocating(true);
             await handleUseCurrentLocation(); 
             setIsAnalyzing(false); 
             return; 
         } catch (e) {
             console.warn("Manual location retry failed", e);
             setError("Please enter address manually.");
             setScreen('HOME');
             setIsAnalyzing(false);
             return;
         }
    }

    // 2. AI Refinement
    let refinedStart = currentStartAddr;
    let refinedEnd = endAddress;
    
    try {
        const [rStart, rEnd] = await Promise.all([
            (currentStartAddr && !currentStartAddr.toLowerCase().includes('current location')) ? refineSearchQuery(currentStartAddr) : Promise.resolve(currentStartAddr),
            endAddress ? refineSearchQuery(endAddress) : Promise.resolve(endAddress)
        ]);
        refinedStart = rStart;
        refinedEnd = rEnd;
    } catch (e) {
        console.warn("AI search refinement failed, using raw inputs.");
    }

    // 3. Resolve Coordinates if missing
    if (refinedStart && !start) {
        if (!refinedStart.toLowerCase().includes("current location") && !refinedStart.toLowerCase().includes("approx")) {
           const res = await searchLocation(refinedStart);
           if (res) {
             start = { lat: res.lat, lng: res.lng };
             setStartPoint(start);
           }
        }
    }
    
    if (refinedEnd && !end) {
       const res = await searchLocation(refinedEnd, searchCategory);
       if (res) {
         end = { lat: res.lat, lng: res.lng };
         setEndPoint(end);
       } else if (refinedEnd !== endAddress) {
           const res2 = await searchLocation(endAddress, searchCategory);
           if (res2) {
              end = { lat: res2.lat, lng: res2.lng };
              setEndPoint(end);
           }
       }
    }

    if (start && end) {
       // Effect trigger handles logic
    } else {
       if (!start) setError("Could not find start location.");
       else if (!end) setError("Could not find destination.");
       
       if (!start || !end) {
          setIsAnalyzing(false);
       }
    }
  };

  useEffect(() => {
    if (!startPoint || !endPoint) return;
    if (screen === 'HOME') return;

    let isActive = true;

    const execute = async () => {
        setIsAnalyzing(true);
        const fetchedRoutes = await fetchRoutes(startPoint, endPoint);
        
        if (!isActive) return;

        if (fetchedRoutes.length > 0) {
           let minLat = startPoint.lat, maxLat = startPoint.lat, minLng = startPoint.lng, maxLng = startPoint.lng;
           fetchedRoutes.forEach(r => {
             r.geometry.forEach(p => {
               minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
               minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
             });
           });
           
           const [lms, analysisRes, insights] = await Promise.all([
              fetchSafeLandmarks(minLat - 0.005, maxLat + 0.005, minLng - 0.005, maxLng + 0.005),
              analyzeRoutes(fetchedRoutes, startAddress, endAddress, isNight),
              getDestinationInsights(endPoint.lat, endPoint.lng)
           ]);

           if (!isActive) return;

           const analyzedRoutes = fetchedRoutes.map(r => ({
              ...r,
              analysis: analysisRes.analysis[r.id]
           }));
           
           setRoutes(analyzedRoutes);
           setLandmarks(lms);
           setDestInsights(insights);
           setSearchSources(analysisRes.sources);
           
           if (analyzedRoutes.length > 0) setSelectedRouteId(analyzedRoutes[0].id);
        } else {
           setError("No routes found.");
        }
        setIsAnalyzing(false);
    };

    execute();
    return () => { isActive = false; };
  }, [startPoint, endPoint, isNight, screen]);

  const activeRoute = routes.find(r => r.id === selectedRouteId);
  const chatContext = useMemo(() => ({
    screen,
    route: activeRoute,
    destination: endAddress || undefined
  }), [screen, activeRoute, endAddress]);

  return (
    <div className={`h-screen w-screen overflow-hidden relative ${isNight ? 'dark' : ''} bg-slate-50 dark:bg-slate-900`}>
      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${screen === 'HOME' ? 'opacity-30' : 'opacity-100'}`}>
        <MapComponent 
           start={startPoint} 
           end={endPoint} 
           routes={routes} 
           selectedRouteId={selectedRouteId}
           landmarks={landmarks}
           onMapClick={() => {}} 
           onRouteClick={setSelectedRouteId}
           isNight={isNight}
           isNavigating={screen === 'NAV'}
        />
      </div>

      <div className="absolute top-4 right-4 z-50 flex gap-3">
         <button 
           onClick={() => { setShowChat(!showChat); setShowVoice(false); }} 
           className={`p-2 rounded-full shadow-lg backdrop-blur transition-all ${showChat ? 'bg-blue-600 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-blue-500'}`}
         >
            <MessageCircle size={20} />
         </button>
         <button 
           onClick={() => { setShowVoice(!showVoice); setShowChat(false); }} 
           className={`p-2 rounded-full shadow-lg backdrop-blur transition-all ${showVoice ? 'bg-blue-600 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-blue-500'}`}
         >
            <Mic size={20} />
         </button>
         <button onClick={() => setIsNight(!isNight)} className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-full shadow-lg backdrop-blur">
            {isNight ? <Moon size={20} className="text-indigo-400"/> : <Sun size={20} className="text-orange-400"/>}
         </button>
      </div>

      {screen === 'HOME' && (
        <HomeScreen 
          startAddr={startAddress}
          endAddr={endAddress}
          setStartAddress={handleStartInputChange}
          setEndAddress={handleEndInputChange}
          onSearch={handleSearch}
          preference={preference}
          setPreference={setPreference}
          isNight={isNight}
          onUseCurrentLocation={handleUseCurrentLocation}
          isLocating={isLocating} // Passed prop
          searchCategory={searchCategory}
          setSearchCategory={setSearchCategory}
        />
      )}

      {screen === 'SELECT' && (
         <>
           <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-white/90 to-transparent dark:from-slate-900/90 z-20 pt-safe">
              <div className="flex items-center gap-3">
                 <button onClick={() => setScreen('HOME')} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                    <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                 </button>
                 <div>
                    <h2 className="font-bold text-slate-900 dark:text-white leading-tight">Select Route</h2>
                    <p className="text-xs text-slate-500">{routes.length} options found</p>
                 </div>
              </div>
           </div>
           {isAnalyzing && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-bold text-slate-700 dark:text-white">Analyzing Safety & Traffic...</p>
                 </div>
              </div>
           )}
           {!isAnalyzing && routes.length > 0 && (
             <RouteCarousel 
               routes={routes} 
               selectedRouteId={selectedRouteId} 
               onSelectRoute={setSelectedRouteId} 
               onViewDetails={() => setScreen('DETAILS')}
             />
           )}
         </>
      )}

      {screen === 'DETAILS' && activeRoute && (
        <RouteDetails 
           route={activeRoute}
           allRoutes={routes} 
           onClose={() => setScreen('SELECT')} 
           onStartNavigation={() => setScreen('NAV')}
           insight={destInsights}
        />
      )}

      {screen === 'NAV' && activeRoute && (
         <NavigationHUD 
            route={activeRoute} 
            onExit={() => setScreen('FEEDBACK')} 
         />
      )}

      {screen === 'FEEDBACK' && (
         <FeedbackModal onClose={() => setScreen('HOME')} />
      )}

      {showVoice && (
        <VoiceAssistant 
          onClose={() => setShowVoice(false)}
          onUpdateStart={setStartAddress}
          onUpdateEnd={setEndAddress}
          onSearch={handleSearch}
        />
      )}

      {showChat && (
        <ChatBot 
          onClose={() => setShowChat(false)} 
          context={chatContext}
        />
      )}
    </div>
  );
};

export default App;