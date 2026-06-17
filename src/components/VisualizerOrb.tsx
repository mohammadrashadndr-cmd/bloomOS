import React, { useRef, useEffect } from "react";
import { useBloomOSStore } from "../store";
import { audioLevels } from "../audioEngine";

export default function VisualizerOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionState = useBloomOSStore((s) => s.sessionState);
  const isMuted = useBloomOSStore((s) => s.isMuted);
  const currentMood = useBloomOSStore((s) => s.currentMood);
  const emotionalIntensity = useBloomOSStore((s) => s.emotionalIntensity);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{ x: number; y: number; size: number; alpha: number; speed: number; angle: number; color: string }> = [];

    // Map Zoya's emotional states to specific color profiles
    const getMoodColors = (mood: string) => {
      switch (mood) {
        case "playful":
          return {
            glowColor: "rgba(236, 72, 153, 0.55)", // Pink/Vibrant Purple
            innerColor: "#ec4899",
            strokeColor: "#f43f5e",
            particleColors: ["#db2777", "#ec4899", "#f43f5e"],
            speedMultiplier: 1.4,
            amplitudeMultiplier: 1.2
          };
        case "romantic":
          return {
            glowColor: "rgba(168, 85, 247, 0.6)", // Soft purple / pink velvet
            innerColor: "#a855f7",
            strokeColor: "#db2777",
            particleColors: ["#a855f7", "#db2777", "#c084fc"],
            speedMultiplier: 0.7,
            amplitudeMultiplier: 0.85
          };
        case "caring":
        case "supportive":
        case "protective":
        case "soft":
          return {
            glowColor: "rgba(244, 63, 94, 0.55)", // Beautiful warm peach / rose pink
            innerColor: "#f43f5e",
            strokeColor: "#fda4af",
            particleColors: ["#f43f5e", "#fda4af", "#fb7185"],
            speedMultiplier: 0.6,
            amplitudeMultiplier: 0.8
          };
        case "focused":
        case "deep-focus":
          return {
            glowColor: "rgba(6, 182, 212, 0.6)", // Sharp modern teal/cyan
            innerColor: "#06b6d4",
            strokeColor: "#0891b2",
            particleColors: ["#06b6d4", "#22d3ee", "#0891b2"],
            speedMultiplier: 1.1,
            amplitudeMultiplier: 1.0
          };
        case "sleepy":
        case "night-mode":
        case "low-energy":
        default_calm:
          return {
            glowColor: "rgba(30, 58, 138, 0.4)", // Calmer deep celestial space blue / deep purple
            innerColor: "#1e3a8a",
            strokeColor: "#4f46e5",
            particleColors: ["#1e3a8a", "#4f46e5", "#3b82f6"],
            speedMultiplier: 0.4,
            amplitudeMultiplier: 0.6
          };
        case "trading-mode":
          return {
            glowColor: "rgba(245, 158, 11, 0.7)", // Gold bullions and bright amber charts
            innerColor: "#f59e0b",
            strokeColor: "#eab308",
            particleColors: ["#f59e0b", "#eab308", "#facc15"],
            speedMultiplier: 1.5,
            amplitudeMultiplier: 1.3
          };
        case "excited":
        case "dramatic":
          return {
            glowColor: "rgba(249, 115, 22, 0.75)", // Flame orange & bright heat wave highlights
            innerColor: "#f97316",
            strokeColor: "#f59e0b",
            particleColors: ["#f97316", "#f59e0b", "#fbbf24"],
            speedMultiplier: 1.6,
            amplitudeMultiplier: 1.45
          };
        default: // "warm" or "calm" general state
          return {
            glowColor: "rgba(249, 115, 22, 0.45)", // Coral custom amber
            innerColor: "#f97316",
            strokeColor: "#ea580c",
            particleColors: ["#f97316", "#ea580c", "#fb923c"],
            speedMultiplier: 0.85,
            amplitudeMultiplier: 0.95
          };
      }
    };

    const config = getMoodColors(currentMood);

    // Initialize decorative ambient quantum particles matching current neural mood
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
        speed: (Math.random() * 0.4 + 0.1) * config.speedMultiplier,
        angle: Math.random() * Math.PI * 2,
        color: config.particleColors[i % config.particleColors.length],
      });
    }

    let phase = 0;

    const render = () => {
      // Clear with absolute black / trace-fade
      ctx.fillStyle = "rgba(5, 5, 5, 0.22)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Compute standard dimensions adjusting for emotional intensity (1 to 10)
      const intensityScale = 0.8 + (emotionalIntensity / 10) * 0.4;
      let baseRadius = 80 * intensityScale;
      let glowColor = config.glowColor;
      let innerColor = config.innerColor;
      let strokeColor = config.strokeColor;
      let linesCount = 3 + Math.floor((emotionalIntensity / 10) * 4); // more lines for high intensity

      if (sessionState === "connecting" || sessionState === "booting") {
        baseRadius = (75 + Math.sin(phase * 4) * 4) * intensityScale;
        glowColor = "rgba(249, 115, 22, 0.3)";
        innerColor = "#f97316";
        strokeColor = "#f59e0b";
      } else if (sessionState === "listening") {
        // Pulses with microphone amplitude (blue glow index)
        const micBoost = audioLevels.inputMicLevel * 250;
        baseRadius = (85 + Math.min(60, micBoost)) * intensityScale;
        glowColor = "rgba(59, 130, 246, 0.65)"; 
        innerColor = "#3b82f6";
        strokeColor = "#60a5fa";
        linesCount = 5;
      } else if (sessionState === "speaking") {
        // Pulses strongly with Zoya's speaking amplitude
        const voiceBoost = audioLevels.outputAudioLevel * 350;
        baseRadius = (90 + Math.min(80, voiceBoost)) * intensityScale;
        glowColor = config.glowColor.replace("0.", "0.8"); // boost glow opacity when voice peaks
        innerColor = config.innerColor;
        strokeColor = config.strokeColor;
        linesCount = 6 + Math.floor((emotionalIntensity / 10) * 3);
      } else if (sessionState === "thinking") {
        baseRadius = (80 + Math.abs(Math.sin(phase * 3)) * 10) * intensityScale;
        glowColor = "rgba(245, 158, 11, 0.5)";
        innerColor = "#f59e0b";
        strokeColor = "#d97706";
        linesCount = 4;
      } else if (isMuted || sessionState === "muted") {
        baseRadius = 70;
        glowColor = "rgba(100, 116, 139, 0.15)"; 
        innerColor = "#64748b";
        strokeColor = "#475569";
        linesCount = 2;
      }

      // 1. Draw central coordinate radar/scopes (Clean sci-fi OS vibe)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.4, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Render particle fields with dynamic velocity vectors
      particles.forEach((p) => {
        p.angle += 0.01 * config.speedMultiplier;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Reset if drifted too far from orb center
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 180 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnRadius = baseRadius * 0.4 + Math.random() * 60;
          p.x = centerX + Math.cos(spawnAngle) * spawnRadius;
          p.y = centerY + Math.sin(spawnAngle) * spawnRadius;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 3. Draw outer glowing aura
      ctx.shadowBlur = baseRadius * 0.65;
      ctx.shadowColor = glowColor;

      // 4. Render rotating wave rings
      for (let ring = 0; ring < linesCount; ring++) {
        const ringRadius = baseRadius - ring * 7;
        if (ringRadius < 5) continue;

        ctx.strokeStyle = ring === 0 ? innerColor : strokeColor;
        ctx.lineWidth = Math.max(0.5, 2.2 - ring * 0.3);
        ctx.beginPath();

        const steps = 72;
        for (let j = 0; j <= steps; j++) {
          const theta = (j / steps) * Math.PI * 2;
          
          let modulation = 0;
          if (sessionState === "speaking") {
            modulation = Math.sin(theta * 6 + phase * 4.5) * (audioLevels.outputAudioLevel * 50 * config.amplitudeMultiplier);
          } else if (sessionState === "listening") {
            modulation = Math.sin(theta * 9 + phase * 5.5) * (audioLevels.inputMicLevel * 35);
          } else {
            // Calm ambient oscillation
            modulation = Math.sin(theta * 4 + phase * 1.8 + ring) * 3.5 * config.speedMultiplier;
          }

          const currentRadius = ringRadius + modulation;
          const x = centerX + Math.cos(theta) * currentRadius;
          const y = centerY + Math.sin(theta) * currentRadius;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 5. Core inner interactive holographic visual fill
      ctx.shadowBlur = 18;
      ctx.fillStyle = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, baseRadius * 0.48);
      ctx.fillStyle.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      ctx.fillStyle.addColorStop(0.3, innerColor);
      ctx.fillStyle.addColorStop(1, "rgba(10, 10, 18, 0.92)");
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // Mini concentric technical details inside core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.18, 0, Math.PI * 2);
      ctx.stroke();

      phase += 0.04 * config.speedMultiplier;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = Math.max(280, parent.clientHeight);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [sessionState, isMuted, currentMood, emotionalIntensity]);

  // Visual text descriptor & emoji for the active neural mood state
  const getMoodDescriptor = (mood: string) => {
    switch (mood) {
      case "playful":
        return { label: "Playful & Mischievous", emoji: "😈", styles: "text-pink-400 bg-pink-500/10 border-pink-500/25" };
      case "romantic":
        return { label: "Romantic, Warm & Caring", emoji: "💖", styles: "text-purple-400 bg-purple-500/10 border-purple-500/25" };
      case "caring":
        return { label: "Gentle, Empathetic & Comforting", emoji: "🌸", styles: "text-rose-400 bg-rose-500/10 border-rose-500/25" };
      case "focused":
      case "deep-focus":
        return { label: "Productive Focus Engine", emoji: "👁️", styles: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" };
      case "sleepy":
      case "night-mode":
        return { label: "Late-Night Quiet Mode", emoji: "🥱", styles: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25" };
      case "trading-mode":
        return { label: "Bullion Speculator Sharp Active", emoji: "💰", styles: "text-amber-400 bg-amber-500/10 border-amber-500/25" };
      case "excited":
        return { label: "Highly Charged Enthusiastic", emoji: "🔥", styles: "text-orange-400 bg-orange-500/10 border-orange-500/25" };
      default:
        return { label: "Supportive Operating Standing", emoji: "😌", styles: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" };
    }
  };

  const moodDesc = getMoodDescriptor(currentMood);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden min-h-[320px]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* HUD Active Neural Mood Subscript Display */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 items-start bg-black/45 backdrop-blur-md px-3 py-1.5 border border-white/5 rounded-lg">
        <span className="text-[9px] font-mono tracking-widest text-[#666] uppercase">ZOYA NEURAL STATE</span>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 mt-0.5 border text-xs font-medium font-mono rounded ${moodDesc.styles}`}>
          <span>{moodDesc.emoji}</span>
          <span>{moodDesc.label}</span>
        </div>
      </div>

      {/* Real-time emotional intensity scale bar on left margin */}
      <div className="absolute left-4 bottom-6 flex flex-col items-center gap-2 bg-black/40 border border-white/5 backdrop-blur-md px-2 py-3 rounded-lg">
        <span className="text-[8px] font-mono text-gray-500 rotate-270 uppercase h-6 w-2 overflow-visible origin-center inline-block -translate-y-2 whitespace-nowrap">INTENSITY</span>
        <div className="w-1.5 h-16 bg-white/5 rounded-full overflow-hidden flex flex-col justify-end mt-2">
          <div 
            className="w-full bg-gradient-to-t from-orange-600 via-rose-500 to-amber-400 transition-all duration-500"
            style={{ height: `${emotionalIntensity * 10}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-white/80 font-bold scale-90">{emotionalIntensity}</span>
      </div>
      
      {/* Dynamic Voice state badge centered perfectly under the orb */}
      <div className="absolute bottom-6 flex flex-col items-center">
        <span className="text-[10px] font-mono tracking-widest text-orange-500/85 uppercase mb-1">
          Zoya AI Status Node
        </span>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-white/10 rounded-full backdrop-blur-md shadow-lg shadow-black/40">
          <span className={`w-2 h-2 rounded-full animate-pulse ${
            sessionState === "speaking" ? "bg-orange-500" :
            sessionState === "listening" ? "bg-blue-500" :
            sessionState === "thinking" ? "bg-amber-500" :
            sessionState === "connecting" ? "bg-orange-400" :
            isMuted ? "bg-red-500" : "bg-emerald-400"
          }`} />
          <span className="text-xs font-mono font-medium text-white/90 capitalize">
            {isMuted ? "muted" : sessionState}
          </span>
        </div>
      </div>
    </div>
  );
}
