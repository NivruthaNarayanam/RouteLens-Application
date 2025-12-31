import React, { useEffect, useState } from 'react';
import { Shield, Navigation, Sun, Users, Zap, Clock, ThumbsUp, ThumbsDown, ArrowRight, MapPin, CheckCircle2, AlertTriangle, X, ChevronRight, Signal, Car, ArrowUpRight, Locate, MoreVertical, Navigation2, ArrowLeftRight, Volume2, VolumeX, Heart, Fuel, Utensils, LayoutGrid, Loader2 } from 'lucide-react';
import { NavigationRoute, UserPreference, DestinationInsight, RouteAnalysis, LightingLevel, CrowdLevel } from '../types';

// --- Screen 1: Home / Input ---
interface HomeScreenProps {
  startAddr: string;
  endAddr: string;
  setStartAddress: (s: string) => void;
  setEndAddress: (s: string) => void;
  onSearch: () => void;
  preference: UserPreference;
  setPreference: (p: UserPreference) => void;
  isNight: boolean;
  onUseCurrentLocation: () => void;
  isLocating?: boolean;
  searchCategory: string;
  setSearchCategory: (c: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  startAddr, endAddr, setStartAddress, setEndAddress, onSearch, preference, setPreference, isNight, onUseCurrentLocation, isLocating = false, searchCategory, setSearchCategory
}) => {
  const categories = [
    { id: 'All', label: 'All', icon: LayoutGrid },
    { id: 'hospital', label: 'Hospital', icon: Heart },
    { id: 'petrol station', label: 'Fuel', icon: Fuel },
    { id: 'restaurant', label: 'Food', icon: Utensils },
  ];

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-20 bg-white dark:bg-slate-900 flex flex-col p-6 animate-fade-in">
       <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
         <div className="mb-8 text-center flex flex-col items-center">
            {/* Professional Logo */}
            <div className="relative mb-6 group cursor-default">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity duration-500"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl flex items-center justify-center transform -rotate-3 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                    <Navigation className="text-white h-10 w-10 drop-shadow-md" strokeWidth={2.5} />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl shadow-lg border-4 border-white dark:border-slate-900">
                        <Shield size={16} className="text-white" fill="currentColor" />
                    </div>
                </div>
            </div>

            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">RouteLens</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Navigate Smarter, Travel Safer</p>
         </div>

         <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="space-y-3">
              <div className="relative group">
                 <div className="absolute left-3 top-3.5 w-8 flex justify-center text-emerald-500">
                    <MapPin size={20} className="drop-shadow-sm" />
                 </div>
                 <input 
                   type="text" 
                   value={isLocating ? "Detecting location..." : startAddr}
                   onChange={(e) => setStartAddress(e.target.value)}
                   placeholder="Current Location"
                   spellCheck={true}
                   autoCapitalize="sentences"
                   disabled={isLocating}
                   className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                 />
                 <button onClick={onUseCurrentLocation} className="absolute right-3 top-3 text-slate-400 hover:text-blue-500 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    {isLocating ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Locate size={20} />}
                 </button>
              </div>
              
              {/* Connector Line */}
              <div className="pl-7 -my-2 relative z-0 hidden md:block">
                  <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-700"></div>
              </div>

              <div className="relative group">
                 <div className="absolute left-3 top-3.5 w-8 flex justify-center text-red-500">
                    <Navigation2 size={20} className="drop-shadow-sm transform rotate-90" />
                 </div>
                 <input 
                   type="text" 
                   value={endAddr}
                   onChange={(e) => setEndAddress(e.target.value)}
                   placeholder={searchCategory === 'All' ? "Where to?" : `Find nearby ${searchCategory}...`}
                   spellCheck={true}
                   autoCapitalize="sentences"
                   className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                 />
              </div>
            </div>

            {/* Category Filter */}
            <div className="pt-1">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => {
                  const isActive = searchCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSearchCategory(cat.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border
                        ${isActive 
                           ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                           : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                      `}
                    >
                      <cat.icon size={14} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2 px-1">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Route Preference</p>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                {(['Safety', 'Balanced', 'Speed'] as UserPreference[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPreference(p)}
                    className={`py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                      preference === p 
                      ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={onSearch}
              className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
              Find Best Route <ArrowRight size={20} />
            </button>
         </div>
       </div>
    </div>
  );
};

// --- Screen 2: Route Carousel (Map Overlay) ---
interface RouteCarouselProps {
  routes: NavigationRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onViewDetails: () => void;
}

export const RouteCarousel: React.FC<RouteCarouselProps> = ({ routes, selectedRouteId, onSelectRoute, onViewDetails }) => {
  return (
    <div className="absolute inset-x-0 bottom-8 z-20 overflow-x-auto snap-x flex gap-4 px-6 pb-4 scrollbar-hide">
      {routes.map((route, i) => {
        const isSelected = route.id === selectedRouteId;
        const analysis = route.analysis;
        if (!analysis) return null;

        const tags = analysis.tags || [];
        const isRecommended = i === 0 || tags.includes('Safest');
        const borderColor = isRecommended ? 'border-emerald-500 ring-1 ring-emerald-500' : isSelected ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700';

        return (
          <div 
            key={route.id}
            onClick={() => onSelectRoute(route.id)}
            className={`
              snap-center shrink-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 border-2 transition-all cursor-pointer
              ${borderColor} ${isSelected ? 'scale-100 opacity-100' : 'scale-95 opacity-90'}
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                 {isRecommended && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Recommended</span>}
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                   {Math.round(route.duration / 60)} min
                   <span className="text-sm font-normal text-slate-500 ml-2">{(route.distance / 1000).toFixed(1)} km</span>
                 </h3>
              </div>
              <div className="flex flex-col items-end">
                 <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${
                   analysis.safetyScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                 }`}>
                   <Shield size={14} />
                   <span className="text-xs font-bold">{analysis.safetyScore}% Safe</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
               <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Sun size={14} className={analysis.lightingScore === 'Good' ? 'text-amber-500' : 'text-slate-400'} />
                  <span className="text-[10px] mt-1 font-medium">{analysis.lightingScore}</span>
                  <span className="text-[8px] text-slate-400">Light</span>
               </div>
               <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Users size={14} className={analysis.crowdLevel === 'High' ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-[10px] mt-1 font-medium">{analysis.crowdLevel}</span>
                  <span className="text-[8px] text-slate-400">Crowd</span>
               </div>
               <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Car size={14} className="text-slate-500" />
                  <span className="text-[10px] mt-1 font-medium">Med</span>
                  <span className="text-[8px] text-slate-400">Traffic</span>
               </div>
               <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                   <span className="text-lg leading-none mb-1">
                     {analysis.mood === 'Calm' ? '🍃' : analysis.mood === 'Busy' ? '🏙️' : '🌑'}
                   </span>
                   <span className="text-[9px] font-medium truncate w-full text-center">{analysis.mood}</span>
               </div>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              View Details <ChevronRight size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// --- Screen 3: Recommended Route Details ---
interface RouteDetailsProps {
  route: NavigationRoute;
  allRoutes?: NavigationRoute[];
  onClose: () => void;
  onStartNavigation: () => void;
  insight: DestinationInsight | null;
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route, allRoutes, onClose, onStartNavigation, insight }) => {
  const analysis = route.analysis || {
      safetyScore: 50,
      lightingScore: LightingLevel.MODERATE,
      crowdLevel: CrowdLevel.MEDIUM,
      mood: 'Calm',
      reasoning: 'Detailed safety analysis is currently unavailable for this route.',
      drawbacks: undefined,
      landmarks: [],
      tags: [],
      confidence: 'Low',
      riskIntervals: []
  } as unknown as RouteAnalysis;
  
  const landmarks = analysis.landmarks || [];

  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-slate-900 overflow-y-auto animate-slide-up">
       <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
             <X size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Route Analysis</h2>
          <div className="w-10"></div>
       </div>

       <div className="p-6 space-y-6 pb-32">
          <div className="flex items-center justify-between">
             <div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round(route.duration/60)} min</span>
                <p className="text-slate-500">Fastest & Safest Option</p>
             </div>
             <div className="text-right">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${analysis.safetyScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Shield size={16} />
                  <span className="font-bold">{analysis.safetyScore}/100 Safety</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-400">
                   <Signal size={12} />
                   <span>{analysis.confidence} Confidence</span>
                </div>
             </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
             <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Why this route?</h3>
             <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
               {analysis.reasoning}
             </p>
             {analysis.drawbacks && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-start">
                   <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                   <p className="text-xs text-amber-700 dark:text-amber-400">{analysis.drawbacks}</p>
                </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                   <Sun size={18} /> <span className="text-xs font-bold uppercase">Lighting</span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{analysis.lightingScore}</p>
                <p className="text-xs text-slate-400 mt-1">Based on infrastructure & density</p>
             </div>
             <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                   <Users size={18} /> <span className="text-xs font-bold uppercase">Crowd</span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{analysis.crowdLevel}</p>
                <p className="text-xs text-slate-400 mt-1">Estimated human presence</p>
             </div>
          </div>

          {allRoutes && allRoutes.length > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
               <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowLeftRight size={16} className="text-blue-500"/> 
                    Compare with Alternatives
                  </h3>
               </div>
               <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {allRoutes.filter(r => r.id !== route.id).map((other) => {
                     const timeDiff = Math.round((other.duration - route.duration) / 60);
                     const safetyDiff = (other.analysis?.safetyScore || 0) - (analysis.safetyScore || 0);
                     const isOtherSafer = safetyDiff > 0;
                     const isOtherFaster = timeDiff < 0; 

                     return (
                        <div key={other.id} className="p-3 flex items-center justify-between">
                           <div className="w-1/3">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{other.summary}</p>
                              <p className="text-[10px] text-slate-400">Alternative</p>
                           </div>
                           
                           <div className="flex flex-col items-end w-1/4">
                              <span className={`text-xs font-bold ${isOtherFaster ? 'text-emerald-500' : 'text-slate-500'}`}>
                                {timeDiff > 0 ? `+${timeDiff}m` : `${timeDiff}m`}
                              </span>
                              <span className="text-[10px] text-slate-400">Time</span>
                           </div>

                           <div className="flex flex-col items-end w-1/4">
                              <span className={`text-xs font-bold ${isOtherSafer ? 'text-emerald-500' : 'text-red-500'}`}>
                                {safetyDiff > 0 ? `+${safetyDiff}%` : `${safetyDiff}%`}
                              </span>
                              <span className="text-[10px] text-slate-400">Safety</span>
                           </div>

                           <div className="flex flex-col items-end w-1/6 pl-2">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                                {other.analysis?.crowdLevel || 'N/A'}
                              </span>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Reassuring Landmarks</h3>
            <div className="flex flex-wrap gap-2">
               {landmarks.map((lm, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                    {lm}
                  </span>
               ))}
               {landmarks.length === 0 && (
                   <span className="text-xs text-slate-400 italic">No specific landmarks identified.</span>
               )}
            </div>
          </div>

          {insight && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
               <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2">Destination Intel</h3>
               <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">{insight.text}</p>
            </div>
          )}
       </div>

       <div className="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <button 
             onClick={onStartNavigation}
             className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
             <Navigation2 size={24} fill="currentColor" />
             Start Navigation
          </button>
       </div>
    </div>
  );
};

// --- Screen 4: Navigation HUD ---
interface NavigationHUDProps {
  route: NavigationRoute;
  onExit: () => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({ route, onExit }) => {
  const [isMuted, setIsMuted] = useState(false);
  const firstStep = route.steps[0];
  
  const analysis = route.analysis || {
      safetyScore: 50,
      lightingScore: LightingLevel.MODERATE,
      crowdLevel: CrowdLevel.MEDIUM,
      riskIntervals: [],
      landmarks: []
  } as unknown as RouteAnalysis;
  
  const riskIntervals = analysis.riskIntervals || [];
  const safeLandmarks = analysis.landmarks || [];

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!isMuted && riskIntervals.length > 0) {
      const msg = new SpeechSynthesisUtterance("Caution. High risk segment reported ahead. Please stay alert.");
      window.speechSynthesis.speak(msg);
    }
  }, [riskIntervals, isMuted]);

  useEffect(() => {
    if (!isMuted && safeLandmarks.length > 0) {
      const delay = riskIntervals.length > 0 ? 5000 : 1500;
      const timer = setTimeout(() => {
         const text = `Upcoming reassuring landmarks: ${safeLandmarks.join(', ')}`;
         const msg = new SpeechSynthesisUtterance(text);
         msg.rate = 0.95; 
         window.speechSynthesis.speak(msg);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [safeLandmarks, isMuted, riskIntervals.length]);

  return (
    <>
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-col gap-2">
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex gap-4 relative">
           <button 
             onClick={() => {
                 setIsMuted(!isMuted);
                 window.speechSynthesis.cancel();
             }}
             className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300 transition-colors shadow-lg"
             aria-label={isMuted ? "Unmute audio cues" : "Mute audio cues"}
           >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>

           <div className="mt-1">
              <ArrowUpRight size={40} className="text-white" />
           </div>
           <div className="flex-1 pr-10">
              <h2 className="text-2xl font-bold leading-tight">{firstStep?.instruction || "Head to Destination"}</h2>
              <p className="text-slate-400 font-medium mt-1">in {firstStep?.distance || 0} meters</p>
           </div>
        </div>

        {riskIntervals.length > 0 && (
           <div className="bg-red-500 text-white p-3 rounded-xl shadow-lg flex items-center gap-3 animate-pulse">
              <AlertTriangle size={24} className="fill-white text-red-600" />
              <div>
                 <p className="font-bold text-sm leading-none">CAUTION: Risk Zone Ahead</p>
                 <p className="text-xs text-red-100 mt-0.5">{riskIntervals[0].description || "Maintain awareness."}</p>
              </div>
           </div>
        )}
      </div>

      <div className="absolute bottom-8 left-4 right-4 z-30 flex items-end gap-4">
         <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-end">
               <div>
                  <span className="text-3xl font-bold text-emerald-600">{Math.round(route.duration/60)}</span>
                  <span className="text-sm font-medium text-slate-500 ml-1">min</span>
               </div>
               <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {new Date(Date.now() + route.duration * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  <p className="text-xs text-slate-400">Arrival</p>
               </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Traffic
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                   <Sun size={12} className={analysis.lightingScore === 'Poor' ? 'text-red-500' : 'text-amber-500'} /> Light
                </div>
                 <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                   <Users size={12} className={analysis.crowdLevel === 'Low' ? 'text-red-500' : 'text-blue-500'} /> Crowd
                </div>
            </div>
         </div>

         <button 
           onClick={onExit}
           className="h-14 w-14 bg-red-500 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-red-600 transition-colors"
         >
           <X size={28} />
         </button>
      </div>
    </>
  );
};

// --- Screen 5: Feedback Modal ---
interface FeedbackModalProps {
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
       <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">You've Arrived!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Help us make this route safer for others.</p>

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6">
             <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Would you take this route again at this time?</p>
             <div className="flex gap-4">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-all flex flex-col items-center gap-1">
                   <ThumbsUp size={20} />
                   <span className="text-xs font-bold">Yes</span>
                </button>
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:bg-red-50 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-all flex flex-col items-center gap-1">
                   <ThumbsDown size={20} />
                   <span className="text-xs font-bold">No</span>
                </button>
             </div>
          </div>
          
          <button onClick={onClose} className="text-slate-400 text-sm hover:text-slate-600">Skip Feedback</button>
       </div>
    </div>
  );
};