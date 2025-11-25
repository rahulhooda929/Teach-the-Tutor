import React, { useEffect, useState } from 'react';
import { Mic, MicOff, BookOpen, Brain, GraduationCap, Play, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useLiveSession } from './hooks/useLiveSession';
import { AppMode } from './types';
import { MODE_CONFIG, PHOTOSYNTHESIS_CONTENT } from './constants';
import { AudioVisualizer } from './components/AudioVisualizer';

export default function App() {
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  
  // If API key is not in env, we might need to handle it (though instructions say assume env)
  // We'll trust the env variable is injected.

  const { 
    connect, 
    disconnect, 
    isConnected, 
    isConnecting, 
    currentMode, 
    volume,
    error
  } = useLiveSession({
    apiKey: apiKey,
    initialMode: AppMode.INTRO,
    modeConfig: MODE_CONFIG,
    topicContent: PHOTOSYNTHESIS_CONTENT
  });

  const activeConfig = MODE_CONFIG[currentMode];
  
  const getModeIcon = (mode: AppMode) => {
    switch (mode) {
      case AppMode.LEARN: return <BookOpen className="w-6 h-6" />;
      case AppMode.QUIZ: return <Brain className="w-6 h-6" />;
      case AppMode.TEACH_BACK: return <GraduationCap className="w-6 h-6" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  const getModeColor = (mode: AppMode) => {
    switch (mode) {
      case AppMode.LEARN: return 'text-emerald-400';
      case AppMode.QUIZ: return 'text-amber-400';
      case AppMode.TEACH_BACK: return 'text-purple-400';
      default: return 'text-blue-400';
    }
  };
  
  const getVisualizerColor = (mode: AppMode) => {
    switch (mode) {
      case AppMode.LEARN: return '#34d399'; // Emerald
      case AppMode.QUIZ: return '#fbbf24'; // Amber
      case AppMode.TEACH_BACK: return '#c084fc'; // Purple
      default: return '#60a5fa'; // Blue
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      
      {/* Header / Meta Info */}
      <header className="absolute top-6 left-6 flex items-center gap-3 opacity-80">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
          <Sparkles className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 leading-tight">Teach-the-Tutor</h1>
          <p className="text-xs text-slate-400">Active Recall Coach</p>
        </div>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md bg-slate-800/80 border border-slate-700 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentMode === AppMode.LEARN ? 'emerald' : currentMode === AppMode.QUIZ ? 'amber' : currentMode === AppMode.TEACH_BACK ? 'purple' : 'blue'}-500 to-transparent opacity-50`} />

        {/* Connection Status / Error */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-800/50 text-red-200 text-sm p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Mode Display */}
        <div className="flex flex-col items-center text-center mb-10 transition-all duration-500">
          <div className={`w-20 h-20 rounded-full bg-slate-900 border-4 ${isConnected ? 'border-slate-700' : 'border-dashed border-slate-700'} flex items-center justify-center mb-4 shadow-inner relative`}>
            {/* Inner glowing ring if active */}
            {isConnected && (
              <div className={`absolute inset-0 rounded-full animate-pulse opacity-20 bg-current ${getModeColor(currentMode)}`} />
            )}
            <div className={`${getModeColor(currentMode)} transition-colors duration-500`}>
              {getModeIcon(currentMode)}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">
            {currentMode === AppMode.INTRO ? 'Welcome' : activeConfig.voice.label}
          </h2>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
            {currentMode === AppMode.INTRO ? 'Select a Mode via Voice' : 'Active Session'}
          </p>
        </div>

        {/* Visualizer */}
        <div className="mb-10">
          <AudioVisualizer 
            volume={volume} 
            isActive={isConnected} 
            color={getVisualizerColor(currentMode)}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {!isConnected && !isConnecting && (
            <button
              onClick={() => connect()}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-xl font-semibold text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Session
            </button>
          )}

          {isConnecting && (
            <button
              disabled
              className="w-full h-14 bg-slate-700 rounded-xl font-medium text-slate-300 flex items-center justify-center gap-2 cursor-wait"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </button>
          )}

          {isConnected && (
            <button
              onClick={disconnect}
              className="w-full h-14 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 hover:text-red-300 transition-colors rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5 fill-current" />
              End Session
            </button>
          )}
        </div>

        {/* Instructions/Tips */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-slate-500 text-xs">
            Try saying: <br/>
            <span className="text-slate-400 italic">"Switch to Quiz Mode"</span> or <span className="text-slate-400 italic">"Let's Learn"</span>
          </p>
        </div>

      </main>
      
      {/* Current Topic Indicator (Sticky Bottom or below card) */}
      <div className="mt-8 text-center opacity-60">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Current Topic</p>
        <p className="text-slate-300 font-medium">{PHOTOSYNTHESIS_CONTENT.title}</p>
      </div>

    </div>
  );
}