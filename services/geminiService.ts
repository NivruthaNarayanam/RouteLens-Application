import { GoogleGenAI, Chat } from "@google/genai";
import { NavigationRoute, DestinationInsight, RiskInterval } from "../types";

// Removed global initialization to prevent startup crashes if environment is not ready.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createChatSession = (): Chat => {
  const chatAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return chatAi.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are the RouteLens Assistant, an AI built into a navigation app. Your goal is to help users find safe routes, explain safety scores (Traffic, Lighting, Crowd), and locate landmarks like hospitals or police stations. Keep your answers concise, helpful, and friendly. If a user asks about route specific data, ask them to select a route first if they haven't, or explain generally how the scoring works.",
    }
  });
};

/**
 * Uses Gemini Flash (Fast) to convert natural language intents into 
 * crisp search queries for the mapping provider.
 */
export const refineSearchQuery = async (query: string): Promise<string> => {
  if (!process.env.API_KEY || !query) return query;
  
  // Skip optimization for coordinates or very short/simple queries to save latency
  if (query.length < 4 || /^\-?\d/.test(query)) return query;
  if (query === "Current Location") return query;

  try {
     const fastAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
     const response = await fastAi.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a query optimizer for a navigation app. Convert the user's natural language input into a precise search term for a places database (like OpenStreetMap/Nominatim).
        
        Rules:
        1. Extract the core place, category, or address.
        2. Remove conversational fillers ("find a", "take me to", "navigate to").
        3. If the user asks for a category with an adjective (e.g. "safe parking"), keep the category ("parking") or a common synonym ("parking garage").
        4. Output ONLY the refined search string.

        Examples:
        Input: "Find a 24 hour pharmacy" -> Output: "Pharmacy"
        Input: "Safest place to park my car" -> Output: "Parking Garage"
        Input: "123 Main St, New York" -> Output: "123 Main St, New York"
        
        Input: "${query}"`,
     });
     
     const refined = response.text?.trim();
     return refined || query;
  } catch (e) {
     console.warn("Query refinement failed", e);
     return query;
  }
};

export const analyzeRoutes = async (
  routes: NavigationRoute[],
  startAddr: string,
  endAddr: string,
  isNight: boolean
): Promise<{ analysis: Record<string, any>; sources: string[] }> => {
  
  if (!process.env.API_KEY) {
    console.error("No API KEY found");
    return { analysis: {}, sources: [] };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using Flash for analysis
  const modelId = "gemini-2.5-flash"; 

  const routeDescriptions = routes.map((r, index) => ({
    id: r.id,
    summary: r.summary,
    durationText: `${Math.round(r.duration / 60)} mins`,
    distanceText: `${(r.distance / 1000).toFixed(1)} km`,
  }));

  // Explicit JSON structure in prompt since we can't use responseSchema with Google Search tool
  const prompt = `
    Analyze these navigation routes from "${startAddr}" to "${endAddr}".
    Current Time Condition: ${isNight ? "Night/Evening (Dark)" : "Daytime (Light)"}.
    
    Use Google Search to verify current traffic incidents, road closures, or safety reports along these general paths if possible.

    Routes Data: ${JSON.stringify(routeDescriptions)}

    Task:
    1. Estimate a Safety Score (0-100), Lighting Quality (Good/Moderate/Poor), and Crowd Level (High/Medium/Low).
    2. Identify potential reassuring landmarks (Max 3 items per route).
    3. Categorize tags: 'Fastest', 'Safest', 'Balanced'.
    4. Determine Route Mood: 'Calm', 'Busy', or 'Isolated'.
    5. **Critical**: Provide a 'drawbacks' string for EACH route (Max 15 words).
    6. Provide reasoning (Max 30 words) and confidence.

    Respond with ONLY valid JSON fitting this structure (no markdown):
    {
      "analysis": [
        {
          "routeId": "string (matching input id)",
          "safetyScore": number,
          "lightingScore": "Good" | "Moderate" | "Poor",
          "crowdLevel": "High" | "Medium" | "Low",
          "mood": "Calm" | "Busy" | "Isolated",
          "reasoning": "string",
          "drawbacks": "string",
          "landmarks": ["string"],
          "tags": ["string"],
          "confidence": "High" | "Medium" | "Low"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Search Grounding
        // Note: responseMimeType: "application/json" is NOT supported with tools in this model version
        // We rely on the prompt to enforce JSON structure.
      }
    });

    let text = response.text;
    if (!text) return { analysis: {}, sources: [] };
    
    // Sanitize JSON string in case of Markdown artifacts
    text = text.trim();
    if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch (parseError) {
        console.warn("Raw JSON parsing failed, attempting repair or partial parse.");
        // Fallback: Try to find the last closing brace if truncated
        const lastBrace = text.lastIndexOf('}');
        if (lastBrace > 0) {
            try {
                json = JSON.parse(text.substring(0, lastBrace + 1));
            } catch (e) {
                console.error("Failed to parse fixed JSON", e);
                return { analysis: {}, sources: [] };
            }
        } else {
             return { analysis: {}, sources: [] };
        }
    }

    const analysisMap: Record<string, any> = {};
    if (json.analysis && Array.isArray(json.analysis)) {
        json.analysis.forEach((item: any) => {
            // Programmatically generate Risk Intervals for visualization
            const intervals: RiskInterval[] = [];
            
            // If lighting is poor, mark a segment in the middle as risky
            if (item.lightingScore === 'Poor') {
               intervals.push({
                 startPct: 0.4, 
                 endPct: 0.55, 
                 type: 'Lighting', 
                 description: 'Low visibility detected'
               });
            }
            
            // If safety score is low, mark another segment
            if (item.safetyScore < 75) {
               intervals.push({
                 startPct: 0.7, 
                 endPct: 0.8, 
                 type: 'Crowd', 
                 description: 'Isolated area reported'
               });
            }

            item.riskIntervals = intervals;
            analysisMap[item.routeId] = item;
        });
    }

    // Extract Search Grounding Sources
    const sources: string[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push(chunk.web.uri);
        }
      });
    }

    return { analysis: analysisMap, sources: [...new Set(sources)] };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return { analysis: {}, sources: [] };
  }
};

export const getDestinationInsights = async (lat: number, lng: number): Promise<DestinationInsight | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: "Summarize the area's activity level and list key safety amenities (Hospitals, Police, 24/7 Stores) found nearby. Be concise.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });

    const sources: { title: string; uri: string }[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
           sources.push({ title: chunk.web.title || "Web Source", uri: chunk.web.uri });
        }
      });
    }

    return {
      text: response.text || "No insights available.",
      sources: sources
    };

  } catch (e) {
    console.error("Maps grounding failed", e);
    return null;
  }
};