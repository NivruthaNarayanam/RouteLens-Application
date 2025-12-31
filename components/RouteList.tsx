import React, { useState } from 'react';
import { NavigationRoute, DestinationInsight } from '../types';
import { Clock, Navigation, Shield, Sun, Users, Zap, AlertCircle, CheckCircle2, MapPin, Fuel, Plus, ShoppingCart, ThumbsUp, ThumbsDown, AlertTriangle, X, Globe, Map, Signal } from 'lucide-react';

interface RouteListProps {
  routes: NavigationRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  searchSources?: string[];
  destinationInsight?: DestinationInsight | null;
}

const RouteList: React.FC<RouteListProps> = ({ routes, selectedRouteId, onSelectRoute, isLoading, error, searchSources, destinationInsight }) => {
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center text-slate-500">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="font-medium text-slate-700 dark:text-slate-300">Finding routes...</p>
        <p className="text-xs mt-2 max-w-[200px]">Checking traffic, safety, and finding nearby help.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center text-red-500">
        <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
        <p className="font-medium">No routes found</p>
        <p className="text-sm mt-1 opacity-70">{error}</p>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center text-slate-500">
        <Navigation className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm font-medium mb-1">Ready to Navigate?</p>
        <p className="text-xs opacity-70">Enter a start and destination to see safe routes with landmarks.</p>
      </div>
    );
  }

  // Feedback Form View
  if (showFeedback) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Trip Feedback</h2>
          <button onClick={() => setShowFeedback(false)} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        {feedbackSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 size={32} />
             </div>
             <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">Thank You!</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Your feedback helps improve safety recommendations for everyone.</p>
             <button 
               onClick={() => { setShowFeedback(false); setFeedbackSubmitted(false); }}
               className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
             >
               Close
             </button>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                 Would you take this route again at this time?
               </label>
               <div className="flex gap-4">
                 <button 
                    onClick={() => setFeedbackSubmitted(true)}
                    className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-all"
                 >
                   <ThumbsUp className="text-emerald-500" />
                   <span className="text-xs font-medium">Yes</span>
                 </button>
                 <button 
                    onClick={() => setFeedbackSubmitted(true)}
                    className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-all"
                 >
                   <ThumbsDown className="text-red-500" />
                   <span className="text-xs font-medium">No</span>
                 </button>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                 How accurate was the lighting info?
               </label>
               <div className="flex gap-2">
                 {['Poor', 'Fair', 'Accurate'].map((opt) => (
                   <button key={opt} onClick={() => setFeedbackSubmitted(true)} className="flex-1 py-2 text-xs border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                     {opt}
                   </button>
                 ))}
               </div>
             </div>

             <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
               <p className="text-xs text-slate-400">Silent Learning: Your input refines future route scoring.</p>
             </div>
          </div>
        )}
      </div>
    );
  }

  // Standard List View
  return (
    <div className="flex flex-col h-full relative">
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Top {routes.length} Route Options
        </h2>
        <p className="text-xs text-slate-500">Highlighted markers show hospitals & safety zones</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 md:pb-20">
        
        {/* Destination Insights (Google Maps Grounding) */}
        {destinationInsight && (
           <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-1.5">
                 <Map size={14} className="text-indigo-600 dark:text-indigo-400" />
                 <h3 className="text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase">Destination Intel (Google Maps)</h3>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                 {destinationInsight.text}
              </p>
              {destinationInsight.sources && destinationInsight.sources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                   {destinationInsight.sources.map((src, i) => (
                     <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline truncate max-w-[150px]">
                       {src.title || "Map Source"}
                     </a>
                   ))}
                </div>
              )}
           </div>
        )}

        {/* Routes */}
        {routes.map((route, index) => {
          const analysis = route.analysis;
          const isSelected = route.id === selectedRouteId;
          const tags = analysis?.tags || [];
          
          let mainBadge = null;
          let badgeColor = "bg-slate-500";
          if (tags.includes("Safest")) {
             mainBadge = "SAFEST";
             badgeColor = "bg-emerald-500";
          } else if (tags.includes("Fastest")) {
             mainBadge = "FASTEST";
             badgeColor = "bg-blue-500";
          } else if (tags.includes("Balanced")) {
             mainBadge = "BALANCED";
             badgeColor = "bg-purple-500";
          } else if (index === 0) {
              mainBadge = "RECOMMENDED";
              badgeColor = "bg-blue-500";
          }

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              className={`
                relative rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group
                ${isSelected 
                  ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-lg ring-1 ring-blue-500/20' 
                  : 'border-transparent bg-white dark:bg-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex justify-between items-stretch h-full">
                <div className={`w-1.5 shrink-0 ${isSelected ? badgeColor : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                
                <div className="flex-1 p-3">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Option {index + 1}</span>
                        {mainBadge && (
                          <span className={`${badgeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm`}>
                            {mainBadge}
                          </span>
                        )}
                     </div>
                     {isSelected && <CheckCircle2 size={16} className="text-blue-500" />}
                  </div>

                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                      {Math.round(route.duration / 60)} min
                    </h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                       {(route.distance / 1000).toFixed(1)} km
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">
                    via {route.summary}
                  </p>

                  {analysis ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1.5">
                        <div className="flex-1 flex flex-col items-center border-r border-slate-200 dark:border-slate-700 last:border-0">
                          <Shield size={10} className={analysis.safetyScore > 80 ? 'text-emerald-500' : 'text-amber-500'} />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{analysis.safetyScore}%</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center border-r border-slate-200 dark:border-slate-700 last:border-0">
                          <Sun size={10} className={analysis.lightingScore === 'Good' ? 'text-amber-400' : 'text-slate-400'} />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{analysis.lightingScore}</span>
                        </div>
                         <div className="flex-1 flex flex-col items-center">
                          <Users size={10} className={analysis.crowdLevel === 'High' ? 'text-blue-500' : 'text-slate-400'} />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{analysis.crowdLevel}</span>
                        </div>
                      </div>

                      {/* Confidence Indicator */}
                      <div className="flex items-center justify-end">
                          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                              analysis.confidence === 'High' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' :
                              analysis.confidence === 'Medium' ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' :
                              'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                          }`}>
                            <Signal size={10} />
                            <span className="font-medium">{analysis.confidence || 'Medium'} Confidence</span>
                          </div>
                      </div>

                      {/* Positive Reasoning */}
                      <div className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700/50">
                        {analysis.reasoning}
                      </div>

                      {/* Why Not This Route? (Drawbacks) */}
                      {analysis.drawbacks && analysis.drawbacks !== 'None' && analysis.drawbacks !== 'Minor' && (
                         <div className="flex items-start gap-1.5 p-2 rounded bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                            <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
                               <strong>Caution:</strong> {analysis.drawbacks}
                            </span>
                         </div>
                      )}

                      {/* Explicit Landmark Tags */}
                      {analysis.landmarks && analysis.landmarks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.landmarks.slice(0, 3).map((lm, i) => {
                             let Icon = MapPin;
                             if (lm.toLowerCase().includes('hospital')) Icon = Plus;
                             if (lm.toLowerCase().includes('pump') || lm.toLowerCase().includes('fuel')) Icon = Fuel;
                             if (lm.toLowerCase().includes('store') || lm.toLowerCase().includes('shop')) Icon = ShoppingCart;
                             
                             return (
                               <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-slate-700 rounded text-[10px] text-blue-700 dark:text-blue-200 border border-blue-100 dark:border-slate-600">
                                 <Icon size={10} />
                                 <span className="truncate max-w-[100px]">{lm}</span>
                               </div>
                             );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                       <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                       Analyzing route safety...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Search Grounding Sources */}
        {searchSources && searchSources.length > 0 && (
           <div className="mt-4 px-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Globe size={10} />
                Information Sources (Google Search)
              </h4>
              <ul className="space-y-1">
                {searchSources.slice(0, 3).map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline block truncate">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
           </div>
        )}
      </div>

      {/* Floating Action Button for Selected Route */}
      {selectedRouteId && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <button 
            onClick={() => setShowFeedback(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 font-semibold flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <CheckCircle2 size={18} />
            <span>Complete Trip</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteList;