import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, X, Loader2, Volume2, Radio, AlertCircle } from 'lucide-react';

// --- Audio Encoding/Decoding Helpers ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Tools Definition ---
const navigationTools: FunctionDeclaration[] = [
  {
    name: 'updateLocation',
    description: 'Update the start location or destination address.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationType: {
          type: Type.STRING,
          enum: ['start', 'destination'],
          description: 'Whether to update the start point or the destination.',
        },
        address: {
          type: Type.STRING,
          description: 'The address, landmark, or place name provided by the user.',
        },
      },
      required: ['locationType', 'address'],
    },
  },
  {
    name: 'startRouteSearch',
    description: 'Trigger the route search process to find paths between the start and destination.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  }
];

// --- Component ---

interface VoiceAssistantProps {
  onClose: () => void;
  onUpdateStart: (addr: string) => void;
  onUpdateEnd: (addr: string) => void;
  onSearch: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, onUpdateStart, onUpdateEnd, onSearch }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        if (!process.env.API_KEY) {
            console.error("No API Key");
            if (mounted) setStatus('error');
            return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Setup Audio Contexts
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputContextRef.current = inputCtx;
        outputContextRef.current = outputCtx;

        const outputNode = outputCtx.createGain();
        outputNode.connect(outputCtx.destination);

        // Get Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              if (!mounted) return;
              setStatus('connected');
              
              // Process Input Audio
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                if (!mounted) {
                    scriptProcessor.disconnect();
                    source.disconnect();
                    return;
                }
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                
                sessionPromise.then(sess => {
                    sess.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
               if (!mounted) return;

               // Handle Tool Calls (Function Calling)
               if (message.toolCall) {
                  const functionResponses = message.toolCall.functionCalls.map(fc => {
                      let result = { status: 'ok' };
                      
                      if (fc.name === 'updateLocation') {
                          const args = fc.args as any;
                          if (args.locationType === 'start') {
                              onUpdateStart(args.address);
                          } else {
                              onUpdateEnd(args.address);
                          }
                          result = { status: `Updated ${args.locationType} to ${args.address}` };
                      } else if (fc.name === 'startRouteSearch') {
                          onSearch();
                          result = { status: 'Search started' };
                      }

                      return {
                          id: fc.id,
                          name: fc.name,
                          response: result
                      };
                  });

                  sessionPromise.then(sess => {
                      sess.sendToolResponse({ functionResponses });
                  });
               }

               // Handle Audio Output
               const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
               if (base64Audio) {
                  if (outputCtx.state === 'suspended') {
                      await outputCtx.resume();
                  }
                  
                  setIsSpeaking(true);
                  
                  // Ensure playback doesn't overlap weirdly
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                  
                  const audioBuffer = await decodeAudioData(
                      decode(base64Audio),
                      outputCtx,
                      24000,
                      1
                  );
                  
                  const source = outputCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNode);
                  
                  source.addEventListener('ended', () => {
                      sourcesRef.current.delete(source);
                      // Only set speaking false if queue is empty
                      if (sourcesRef.current.size === 0 && mounted) {
                        setIsSpeaking(false);
                      }
                  });
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
               }

               // Handle Interruption
               if (message.serverContent?.interrupted) {
                  sourcesRef.current.forEach(src => {
                      try { src.stop(); } catch(e){}
                  });
                  sourcesRef.current.clear();
                  nextStartTimeRef.current = 0;
                  if (mounted) setIsSpeaking(false);
               }
            },
            onclose: () => {
                if (mounted) setStatus('error'); 
            },
            onerror: (e) => {
                console.error(e);
                if (mounted) setStatus('error');
            }
          },
          config: {
             responseModalities: [Modality.AUDIO],
             tools: [{ functionDeclarations: navigationTools }],
             speechConfig: {
                 voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
             },
             systemInstruction: "You are RouteLens's AI co-pilot. You help users navigate by updating their start/destination and starting searches. If the user wants to go somewhere, use the tools to update the address and then start the search. Keep responses concise and conversational."
          }
        });
        
        sessionPromiseRef.current = sessionPromise;
        // Wait for connection to ensure we can cleanup later if needed
        await sessionPromise;

      } catch (e) {
        console.error(e);
        if (mounted) setStatus('error');
      }
    };

    startSession();

    return () => {
        mounted = false;
        if (inputContextRef.current) inputContextRef.current.close();
        if (outputContextRef.current) outputContextRef.current.close();
        // Close session if supported in future
        sessionPromiseRef.current?.then(s => s.close && s.close());
    };
  }, [onUpdateStart, onUpdateEnd, onSearch]);

  return (
    <div className="fixed bottom-24 right-4 z-50 animate-fade-in-up">
       <div className="bg-slate-900/95 backdrop-blur-md text-white p-6 rounded-3xl shadow-2xl w-72 flex flex-col items-center relative border border-slate-700/50">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="mb-4 mt-2 relative">
             {status === 'connected' && (
                <div className={`absolute inset-0 rounded-full bg-blue-500 blur-lg transition-opacity duration-300 ${isSpeaking ? 'opacity-60 scale-125' : 'opacity-20 scale-100'}`}></div>
             )}
             <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${isSpeaking ? 'bg-blue-600 scale-105' : 'bg-slate-800'}`}>
                {status === 'connecting' ? <Loader2 className="animate-spin text-slate-400" /> : 
                 status === 'error' ? <AlertCircle className="text-red-400" /> :
                 <Radio className={`text-white transition-all duration-300 ${isSpeaking ? 'scale-110' : 'opacity-80'}`} size={28} />
                }
             </div>
          </div>
          
          <h3 className="font-bold text-lg mb-1">RouteLens Voice</h3>
          <p className="text-sm text-slate-400 text-center mb-4 font-medium">
             {status === 'connecting' ? 'Connecting...' : 
              status === 'error' ? 'Unavailable' : 
              isSpeaking ? 'Speaking...' : 'Listening...'}
          </p>
          
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
             {status === 'connected' && (
                 <div className={`h-full bg-blue-500 transition-all duration-500 ${isSpeaking ? 'w-full animate-pulse' : 'w-1/2 opacity-50'}`}></div>
             )}
          </div>
       </div>
    </div>
  );
};