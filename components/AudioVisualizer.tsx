import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  volume: number; // 0 to 1
  isActive: boolean;
  color?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, isActive, color = '#3b82f6' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    // Smooth the volume for visualization
    let smoothVol = 0;
    
    const render = () => {
      // Approach target volume
      const target = isActive ? volume : 0;
      smoothVol += (target - smoothVol) * 0.2;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);
      
      if (isActive || smoothVol > 0.01) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        // Draw a wave
        const points = 50;
        const spacing = width / points;
        
        for (let i = 0; i <= points; i++) {
          const x = i * spacing;
          // Sine wave modulated by volume and time
          const time = Date.now() * 0.005;
          const amplitude = smoothVol * (height / 2.5); 
          const wave = Math.sin(i * 0.5 + time) * Math.cos(i * 0.2 + time);
          const y = centerY + wave * amplitude;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.stroke();
      } else {
        // Draw flat line when inactive
        ctx.strokeStyle = '#475569'; // Slate 600
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      }
      
      animationId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 rounded-lg bg-slate-800/50 backdrop-blur-sm shadow-inner"
    />
  );
};