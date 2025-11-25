import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GoogleGenAI, 
  LiveSession, 
  LiveServerMessage, 
  Modality, 
  FunctionDeclaration, 
  Type 
} from '@google/genai';
import { createPcmBlob, decodeBase64, decodeAudioData } from '../utils/audio';
import { AppMode, ModeConfig } from '../types';

interface UseLiveSessionProps {
  apiKey: string | undefined;
  initialMode: AppMode;
  modeConfig: ModeConfig;
  topicContent: any;
}

export function useLiveSession({ apiKey, initialMode, modeConfig, topicContent }: UseLiveSessionProps) {
  const [currentMode, setCurrentMode] = useState<AppMode>(initialMode);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0); // For visualization
  const [error, setError] = useState<string | null>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // Session Refs
  const sessionRef = useRef<LiveSession | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Function Declaration for Mode Switching
  const switchModeTool: FunctionDeclaration = {
    name: 'switchMode',
    parameters: {
      type: Type.OBJECT,
      description: 'Switch the learning mode of the application.',
      properties: {
        mode: {
          type: Type.STRING,
          enum: [AppMode.LEARN, AppMode.QUIZ, AppMode.TEACH_BACK],
          description: 'The mode to switch to.',
        },
      },
      required: ['mode'],
    },
  };

  const cleanupAudio = useCallback(() => {
    // Stop all playing sources
    if (sourcesRef.current) {
      sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      sourcesRef.current.clear();
    }

    // Disconnect input
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    
    // Close output context (optional, can keep open, but safer to close for full reset)
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Reset volume
    setVolume(0);
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
      } catch (e) {
        console.error('Error closing session:', e);
      }
      sessionRef.current = null;
    }
    cleanupAudio();
    setIsConnected(false);
    setIsConnecting(false);
  }, [cleanupAudio]);

  const connect = useCallback(async (modeOverride?: AppMode) => {
    if (!apiKey) {
      setError("API Key is missing");
      return;
    }

    const modeToUse = modeOverride || currentMode;
    
    try {
      setIsConnecting(true);
      setError(null);
      
      // Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      outputNodeRef.current = outputCtx.createGain();
      outputNodeRef.current.connect(outputCtx.destination);
      
      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const config = modeConfig[modeToUse];

      const ai = new GoogleGenAI({ apiKey });
      
      // Establish Connection
      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice.voiceName } }
          },
          systemInstruction: config.systemInstruction(topicContent),
          tools: [{ functionDeclarations: [switchModeTool] }]
        },
        callbacks: {
          onopen: () => {
            console.log('Session Opened');
            setIsConnected(true);
            setIsConnecting(false);
            
            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5)); // Boost slightly for visual effect

              // Send to API
              const blob = createPcmBlob(inputData);
              session.sendRealtimeInput({ media: blob });
            };
            
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Function Calling (Mode Switching)
             if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                  if (fc.name === 'switchMode') {
                     const newMode = (fc.args as any).mode as AppMode;
                     console.log('Switching mode to:', newMode);
                     
                     // Send confirmation to current session before closing
                     await session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result: "Switching mode now..." }
                        }
                     });

                     // Trigger the mode switch
                     // We must disconnect and reconnect with new config
                     setCurrentMode(newMode);
                     // We use a timeout to allow the cleanup to happen cleanly
                     setTimeout(() => {
                        disconnect();
                        setTimeout(() => connect(newMode), 500); 
                     }, 100);
                     return;
                  }
                }
             }

             // Handle Audio Output
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && outputAudioContextRef.current && outputNodeRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                try {
                  const audioBuffer = await decodeAudioData(
                    decodeBase64(audioData),
                    ctx
                  );
                  
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNodeRef.current);
                  
                  source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                  });
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                } catch(e) {
                  console.error('Audio decode error', e);
                }
             }
             
             // Handle Interruption
             if (msg.serverContent?.interrupted) {
               console.log('Interrupted');
               sourcesRef.current.forEach(s => {
                 try { s.stop(); } catch(e) {}
               });
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            console.log('Session Closed');
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error('Session Error', err);
            setError(err.message || 'Connection error');
            setIsConnected(false);
            setIsConnecting(false);
          }
        }
      });
      
      sessionRef.current = session;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      cleanupAudio();
    }
  }, [apiKey, currentMode, modeConfig, topicContent, disconnect, cleanupAudio]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    currentMode,
    volume,
    error
  };
}