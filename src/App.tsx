import React, { useState, useEffect, useRef } from "react";
import { 
  useBloomOSStore 
} from "./store";
import { initAuth, googleSignIn, logout as googleLogout } from "./firebaseAuth";
import { 
  startVoiceSession, 
  stopVoiceSession, 
  audioLevels,
  sendVideoFrame
} from "./audioEngine";
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  Database, 
  Cpu, 
  Terminal, 
  Trash2, 
  Plus, 
  Sparkles, 
  Clock, 
  CloudSun, 
  Globe, 
  Tv, 
  Compass, 
  Coffee,
  Heart,
  Brain,
  Zap,
  Calendar,
  Bell,
  Hourglass,
  Unlock,
  CheckCircle,
  Briefcase,
  Eye,
  Camera,
  Monitor,
  Radio,
  MessageSquare,
  Send,
  RefreshCw,
  Power,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VisualizerOrb from "./components/VisualizerOrb";
import AmbientCompanionControls from "./components/AmbientCompanionControls";
import TradingIntelligenceCenter from "./components/TradingIntelligenceCenter";

// Available voices in Gemini Live
const voices = [
  { id: "Kore", name: "Kore", gender: "Female", desc: "Expressive, confident, and warm (recommended)" },
  { id: "Puck", name: "Puck", gender: "Male", desc: "Witty, sharp, and highly intelligent" },
  { id: "Zephyr", name: "Zephyr", gender: "Male", desc: "Futuristic, calm, and soothing tone" },
  { id: "Charon", name: "Charon", gender: "Male", desc: "Deep, mysterious, and philosophical" },
  { id: "Fenrir", name: "Fenrir", gender: "Male", desc: "Steady, direct, and focused" }
];

// Available mood options
const moods = [
  { name: "playful", emoji: "😈", color: "from-purple-500 to-pink-500" },
  { name: "teasing", emoji: "😏", color: "from-pink-500 to-rose-400" },
  { name: "caring", emoji: "💖", color: "from-rose-400 to-red-500" },
  { name: "focused", emoji: "👁️", color: "from-cyan-500 to-blue-500" },
  { name: "excited", emoji: "🔥", color: "from-amber-500 to-yellow-500" },
  { name: "sleepy", emoji: "🥱", color: "from-indigo-600 to-blue-800" },
  { name: "impressed", emoji: "🤩", color: "from-violet-500 to-yellow-400" },
  { name: "dramatic", emoji: "🎭", color: "from-purple-600 to-rose-700" },
  { name: "supportive", emoji: "🤝", color: "from-teal-400 to-emerald-500" }
];

const relationshipMetrics = [
  {
    key: "Trading Habits",
    label: "Trading Approach",
    desc: "Bespoke style, frequency & ritual setups",
    fallback: "Checks technical charts & Gold Session timing",
    icon: Zap,
    color: "text-emerald-400"
  },
  {
    key: "Favorite Pairs",
    label: "Focus Pair Asset",
    desc: "Assets under premium active observation",
    fallback: "XAUUSD (Gold) & BTCUSD (Bitcoin)",
    icon: Compass,
    color: "text-orange-400"
  },
  {
    key: "Emotional Patterns",
    label: "Emotional Resonance",
    desc: "Pre-market tension or post-session relief rhythms",
    fallback: "Focused mind, gets serious before market openings",
    icon: Heart,
    color: "text-rose-400"
  },
  {
    key: "Working Hours",
    label: "Active Work Hours",
    desc: "Core developer and trade room timestamps",
    fallback: "Predominantly active around 21:30 Daily",
    icon: Clock,
    color: "text-yellow-400"
  },
  {
    key: "Sleep Habits",
    label: "Sleep & Coffee Cycles",
    desc: "Caffeine dependency index & night rest hours",
    fallback: "Prone to late-night chart sessions & coffee grinds",
    icon: Coffee,
    color: "text-amber-500"
  },
  {
    key: "Personality Traits",
    label: "Personality Profile",
    desc: "Founder traits, meticulousness & ambition levels",
    fallback: "Highly persistent detail-oriented AI visionary builder",
    icon: Brain,
    color: "text-violet-400"
  },
  {
    key: "Recurring Goals",
    label: "Active Goal Tracking",
    desc: "Objectives logged during voice conversations",
    fallback: "Complete daily backtests, scale out operations",
    icon: Sparkles,
    color: "text-cyan-400"
  },
  {
    key: "Business Ambitions",
    label: "Business Ambitions",
    desc: "Empire scale & premium fund buildouts",
    fallback: "Scale Bond Bloom Capital & establish robotic trading",
    icon: Database,
    color: "text-blue-400"
  },
  {
    key: "Communication Style",
    label: "Communication Accent",
    desc: "Banter index, succinctness, and tone mirroring",
    fallback: "Succinct technical inputs, banter-loving & precise",
    icon: Terminal,
    color: "text-purple-400"
  }
];

// Saturation of Web Audio sound effects representing cybernetic clicks and interface link hums
const playCyberBeep = (freq = 800, dur = 0.04, type: OscillatorType = "sine") => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {
    // block until user interaction
  }
};

function TechBrackets() {
  return (
    <>
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-orange-500/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-orange-500/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-orange-500/40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-orange-500/40 pointer-events-none" />
    </>
  );
}

function NeuralSynapseUniverse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionState = useBloomOSStore(s => s.sessionState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      pulseSpeed: number;
      pulsePhase: number;
    }> = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.35 + 0.05,
        pulseSpeed: Math.random() * 0.01 + 0.003,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 5, 0.25)";
      ctx.fillRect(0, 0, width, height);

      // Radial background
      const radGrd = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height) * 0.8);
      radGrd.addColorStop(0, "rgba(5, 5, 10, 0.1)");
      radGrd.addColorStop(1, "rgba(2, 2, 3, 0.85)");
      ctx.fillStyle = radGrd;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 0.5;
      
      const pCount = particles.length;
      for (let i = 0; i < pCount; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;
        
        if (p1.x < 0) p1.x = width;
        else if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        else if (p1.y > height) p1.y = 0;

        p1.pulsePhase += p1.pulseSpeed;
        const opacity = p1.alpha * (0.6 + Math.sin(p1.pulsePhase) * 0.4);

        ctx.fillStyle = sessionState === "speaking" 
          ? `rgba(249, 115, 22, ${opacity * 1.5})` 
          : sessionState === "listening"
          ? `rgba(59, 130, 246, ${opacity * 1.5})`
          : `rgba(255, 255, 255, ${opacity})`;
          
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < pCount; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineOpacity = (1 - dist / 130) * 0.06 * opacity;
            ctx.strokeStyle = sessionState === "speaking"
              ? `rgba(249, 115, 22, ${lineOpacity})`
              : sessionState === "listening"
              ? `rgba(59, 130, 246, ${lineOpacity})`
              : `rgba(255, 255, 255, ${lineOpacity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const resize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [sessionState]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}

export default function App() {
  const {
    sessionState,
    isMuted,
    activeVoice,
    volume,
    memories,
    toolLogs,
    userSubtitle,
    modelSubtitle,
    errorMsg,
    toggleMute,
    setVoice,
    setVolume,
    addMemory,
    deleteMemory,
    clearAll,

    // Routines & Calendar State
    events,
    reminders,
    focusState,
    googleToken,
    googleUser,
    addEvent,
    updateEvent,
    deleteEvent,
    syncGoogleEvents,
    addReminder,
    toggleReminder,
    deleteReminder,
    setFocusMode,
    setGoogleAuth,

    // Automation Controller State & Actions
    activeWidgetApp,
    setActiveWidgetApp,
    activeWorkflowMode,
    automationLogs,
    addAutomationLog,
    clearAutomationLogs,
    triggerWorkflowMode,

    // WhatsApp Automation State & Actions
    whatsappStatus,
    whatsappQR,
    whatsappLogs,
    whatsappLastConnected,
    whatsappDraft,
    whatsappScreenshot,
    setWhatsAppDraft,
    setWhatsAppScreenshot,
    initializeWhatsApp,
    sendWhatsAppMessage,
    disconnectWhatsApp,
    syncWhatsAppState,

    // Neural Mood State variables
    currentMood,
    emotionalIntensity,
    founderStressLevel,
    conversationalEnergy,
    affectionLevel,
    focusLevel,
    socialComfort,
    silenceDuration,
    relationshipContinuity,
    setNeuralMoodState,
    decayNeuralMood,
    isPerformanceMode,
    togglePerformanceMode
  } = useBloomOSStore();

  const [activeTab, setActiveTab] = useState<"relationship" | "schedule" | "memories" | "tools" | "vision" | "ambient" | "whatsapp">("relationship");
  
  // Custom states for manual memory creation and filtering
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryVal, setMemoryVal] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<"short-term" | "long-term" | "emotional" | "timeline">("long-term");
  const [memoryImportance, setMemoryImportance] = useState<number>(5);
  const [memoryEmotionalTag, setMemoryEmotionalTag] = useState<string>("");
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memoryFilterTab, setMemoryFilterTab] = useState<"all" | "short-term" | "long-term" | "emotional" | "timeline">("all");
  const [detectedMood, setDetectedMood] = useState("playful");
  const [isTradingCenterOpen, setIsTradingCenterOpen] = useState(false);

  // Zoya Vision Screen Awareness states
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isVisionTracking, setIsVisionTracking] = useState(false);
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false);
  const [visionLogs, setVisionLogs] = useState<Array<{ id: string; time: string; image: string; analysis: string; prompt: string }>>([]);
  const [visionPrompt, setVisionPrompt] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop screen feed on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [screenStream]);

  // Periodic Neural Mood Decay over time (Stopped in Performance Mode to save CPU)
  useEffect(() => {
    if (isPerformanceMode) return;
    const timer = setInterval(() => {
      decayNeuralMood();
    }, 20000); // Ticks every 20s to simulate organic human emotional updates
    return () => clearInterval(timer);
  }, [decayNeuralMood, isPerformanceMode]);

  // Poll WhatsApp state in background when tab active or connecting (Slower polling in Performance Mode)
  useEffect(() => {
    syncWhatsAppState().catch(() => {});

    const interval = setInterval(() => {
      if (activeTab === "whatsapp" || whatsappStatus === "connecting" || whatsappStatus === "qr") {
        syncWhatsAppState().catch(() => {});
      }
    }, isPerformanceMode ? 15000 : 3000);

    return () => clearInterval(interval);
  }, [activeTab, whatsappStatus, syncWhatsAppState, isPerformanceMode]);

  // Capture frame as JPEG dataURL
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current || !screenStream) {
      return null;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth && video.videoHeight) {
      canvas.width = 640; // Max 640 width for optimal visual details without heavy size
      canvas.height = (640 * video.videoHeight) / video.videoWidth;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          return canvas.toDataURL("image/jpeg", 0.7);
        } catch (e) {
          console.warn("Frame acquisition warning:", e);
        }
      }
    }
    return null;
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor"
        },
        audio: false
      });
      setScreenStream(stream);
      setIsVisionTracking(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setIsVisionTracking(false);
      };
    } catch (err) {
      console.warn("Display capture rejected:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsVisionTracking(false);
  };

  // Autostream visual frames during active voice session of Zoya Live (DISABLED in Performance Optimization Mode to run on-demand only)
  useEffect(() => {
    let timer: any = null;
    const isLiveVoice = sessionState === "listening" || sessionState === "speaking" || sessionState === "thinking" || sessionState === "idle";
    if (screenStream && isVisionTracking && isLiveVoice && !isPerformanceMode) {
      timer = setInterval(() => {
        const dataUrl = captureFrame();
        if (dataUrl) {
          const rawBase64 = dataUrl.includes(";base64,") ? dataUrl.split(";base64,")[1] : dataUrl;
          sendVideoFrame(rawBase64);
        }
      }, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [screenStream, isVisionTracking, sessionState, isPerformanceMode]);

  const handleAnalyzeSnapshot = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) {
      alert("Engage Zoya Lens displaying workspace first!");
      return;
    }
    setIsAnalyzingFrame(true);
    const customPrompt = visionPrompt.trim() || "Please perform full Technical Chart / Active Setup analysis of this screen snapshot context. Speak as the witty Zoya!";
    try {
      const res = await fetch("/api/gemini/analyze-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          prompt: customPrompt
        })
      });
      const data = await res.json();
      if (data.analysis) {
        setVisionLogs(prev => [
          {
            id: Math.random().toString(),
            time: new Date().toLocaleTimeString(),
            image: dataUrl,
            prompt: customPrompt,
            analysis: data.analysis
          },
          ...prev
        ]);
        setVisionPrompt("");
      }
    } catch (err) {
      console.error("Snapshot analysis failure:", err);
    } finally {
      setIsAnalyzingFrame(false);
    }
  };

  // New states for form entries
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDate, setNewEventDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newEventDuration, setNewEventDuration] = useState("60");
  const [newReminderTask, setNewReminderTask] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Keep track of active stream volume feedback
  const [outputDb, setOutputDb] = useState(0);

  const fetchAndSyncCalendar = async (token: string) => {
    if (!token) return;
    setIsSyncingCalendar(true);
    addAutomationLog("Contacting Google Calendar primary resource...", "calendar", "running");
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const params = new URLSearchParams({
        timeMin: startOfToday.toISOString(),
        timeMax: endOfToday.toISOString(),
        singleEvents: "true",
        orderBy: "startTime"
      });

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Google Calendar API returned status ${res.status}`);
      }

      const data = await res.json();
      const googleEvents = (data.items || []).map((item: any) => {
        let eventTime = "All Day";
        let duration = 60;

        if (item.start?.dateTime) {
          const startDate = new Date(item.start.dateTime);
          const hours = startDate.getHours().toString().padStart(2, '0');
          const minutes = startDate.getMinutes().toString().padStart(2, '0');
          eventTime = `${hours}:${minutes}`;

          if (item.end?.dateTime) {
            const endDate = new Date(item.end.dateTime);
            duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
          }
        } else if (item.start?.date) {
          eventTime = "All Day";
        }

        return {
          id: `gcal-${item.id}`,
          title: item.summary || "Untitled Event",
          date: item.start?.dateTime?.split("T")[0] || item.start?.date || new Date().toISOString().split("T")[0],
          time: eventTime,
          duration: duration,
          source: "Google" as const
        };
      });

      syncGoogleEvents(googleEvents);
      addAutomationLog(`Successfully synced ${googleEvents.length} calendar events from Google Workspace.`, "calendar", "success");
    } catch (err: any) {
      console.error("Error syncing Google Calendar:", err);
      addAutomationLog(`Calendar sync error: ${err.message || err}`, "calendar", "success");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Synchronize with Firebase Auth state and auto-fetch calendar on mount/change
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleAuth(
          { name: user.displayName || "Mohammad Rashad", email: user.email },
          token
        );
        if (token) {
          fetchAndSyncCalendar(token);
        }
      },
      () => {
        setGoogleAuth(null, null);
      }
    );
    return () => unsubscribe();
  }, [setGoogleAuth]);

  // Focus Mode Countdown timer interval
  useEffect(() => {
    let interval: any = null;
    if (focusState?.isActive) {
      interval = setInterval(() => {
        useBloomOSStore.getState().tickFocusMode();
      }, 60000); // Trigger tick update every minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [focusState?.isActive]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleAuth(
          { name: result.user.displayName || "Mohammad Rashad", email: result.user.email },
          result.accessToken
        );
        fetchAndSyncCalendar(result.accessToken);
      }
    } catch (err) {
      console.error("Firebase Google Auth popup failed:", err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventTime.trim()) return;

    const title = newEventTitle.trim();
    const dateStr = newEventDate;
    const timeStr = newEventTime;
    const durationMins = parseInt(newEventDuration) || 60;

    if (googleToken) {
      addAutomationLog(`Scheduling "${title}" on your Google Calendar...`, "calendar", "running");
      try {
        const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
        const endDateTime = new Date(startDateTime.getTime() + durationMins * 60 * 1000);

        const eventPayload = {
          summary: title,
          description: "Scheduled via BloomOS Live Real-time AI Assistant Zoya",
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          }
        };

        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${googleToken}`
          },
          body: JSON.stringify(eventPayload)
        });

        if (!res.ok) {
          throw new Error(`Google Calendar insert failed with status ${res.status}`);
        }

        addAutomationLog(`Event scheduled successfully on Google Calendar! Syncing...`, "calendar", "success");
        await fetchAndSyncCalendar(googleToken);
        setNewEventTitle("");
        setNewEventTime("");
      } catch (err: any) {
        console.error("Google Calendar insertion error:", err);
        addAutomationLog(`Failed to create Google event: ${err.message || err}`, "calendar", "success");
      }
    } else {
      addEvent({
        title: title,
        date: dateStr,
        time: timeStr,
        duration: durationMins,
        source: "Local"
      });
      setNewEventTitle("");
      setNewEventTime("");
    }
  };

  const handleDeleteEvent = async (id: string, title: string, source: string) => {
    if (source === "Google") {
      const confirmed = window.confirm(
        `Are you sure you want to delete the calendar event "${title}" from your real Google Calendar account?`
      );
      if (!confirmed) return;

      if (!googleToken) return;
      const cleanGoogleId = id.replace("gcal-", "");
      addAutomationLog(`Deleting "${title}" from Google Calendar...`, "calendar", "running");
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${cleanGoogleId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${googleToken}`
          }
        });

        if (!res.ok) {
          throw new Error(`Google Calendar delete failed with status ${res.status}`);
        }

        addAutomationLog(`Successfully deleted "${title}" from Google Calendar.`, "calendar", "success");
        await fetchAndSyncCalendar(googleToken);
      } catch (err: any) {
        console.error("Google Calendar deletion error:", err);
        addAutomationLog(`Failed to delete Google event: ${err.message || err}`, "calendar", "success");
      }
    } else {
      deleteEvent(id);
    }
  };

  const handleCreateReminderLocally = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReminderTask.trim() && newReminderTime.trim()) {
      addReminder(newReminderTask.trim(), newReminderTime.trim());
      setNewReminderTask("");
      setNewReminderTime("");
    }
  };

  const getObservedValue = (keyName: string, fallback: string) => {
    const match = memories.find(
      (m) =>
        m.key.toLowerCase() === `relationship::${keyName.toLowerCase()}` ||
        m.key.toLowerCase().includes(keyName.toLowerCase())
    );
    return match ? match.value : fallback;
  };

  // PREDICTIVE BEHAVIOR ENGINE STATES & ACTIONS
  const [isScanning, setIsScanning] = useState(false);
  const [predictions, setPredictions] = useState([
    {
      id: "pred-gold",
      type: "Timing Behavior",
      title: "Gold Session Sync",
      phrase: "Gold session starting soon. Founder mode activated 😌",
      badge: "21:30 Daily",
      confidence: "98% Match",
      status: "Approaching Timeframe",
      glowColor: "border-orange-500/30 text-orange-400"
    },
    {
      id: "pred-charts",
      type: "Daily Habit",
      title: "Check Charts Routine",
      phrase: "You usually check charts around now. Ready to review Bitcoin and Gold trends?",
      badge: "Active Hour",
      confidence: "94% Match",
      status: "Trigger Technical Frame",
      glowColor: "border-blue-500/30 text-blue-400"
    },
    {
      id: "pred-backtest",
      type: "Action Pattern",
      title: "Backtesting Drill",
      phrase: "You forgot your backtesting again 😭. Don't sluff off your trading history backtest protocols!",
      badge: "Pending Alert",
      confidence: "87% Match",
      status: "Habit Deficit Warning",
      glowColor: "border-red-500/30 text-rose-400"
    }
  ]);

  const handleTriggerPrediction = (pred: typeof predictions[0]) => {
    const { setModelSubtitle, setSessionState } = useBloomOSStore.getState();
    setSessionState("speaking");
    setModelSubtitle(pred.phrase);
    
    // Auto-launch elements if charts are triggered
    if (pred.id === "pred-charts") {
      setActiveWidgetApp("TradingView");
    }
    
    setTimeout(() => {
      setSessionState("idle");
    }, 4500);
  };

  const handlePredictiveScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setPredictions(prev => prev.map(p => ({
        ...p,
        confidence: `${Math.floor(82 + Math.random() * 17)}% Match`
      })));
    }, 1500);
  };

  useEffect(() => {
    // Dynamic subtitle tracking helper (Throttled update frequency in Performance Mode to decrease rendering work)
    const interval = setInterval(() => {
      // Refresh speaking decibels to animate interface outlines
      setOutputDb(Math.round(audioLevels.outputAudioLevel * 100));
    }, isPerformanceMode ? 350 : 100);
    return () => clearInterval(interval);
  }, [isPerformanceMode]);

  // Sync detectedMood with Zoya's neural currentMood
  useEffect(() => {
    if (currentMood) {
      setDetectedMood(currentMood);
    }
  }, [currentMood]);

  const handleStartSession = async () => {
    if (sessionState === "idle" || sessionState === "booting" || sessionState === "error") {
      await startVoiceSession();
    } else {
      stopVoiceSession();
    }
  };

  const handleAddCustomMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (memoryKey.trim() && memoryVal.trim()) {
      addMemory(
        memoryKey.trim(),
        memoryVal.trim(),
        memoryCategory,
        memoryImportance,
        memoryEmotionalTag || undefined
      );
      setMemoryKey("");
      setMemoryVal("");
      setMemoryCategory("long-term");
      setMemoryImportance(5);
      setMemoryEmotionalTag("");
    }
  };

  const currentMoodInfo = moods.find(m => m.name === detectedMood) || moods[0];

  return (
    <div className="relative min-h-screen bg-[#020204] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 overflow-x-hidden cyber-grid hologram-scanline">
      
      {/* Interactive Neural Synapse Cosmic Canvas Backdrop */}
      <NeuralSynapseUniverse />
      
      {/* Absolute blurred backdrop circles mimicking the Design HTML */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header Bar aligned with Bold Typography theme (Holographic alien console style) */}
      <header className="relative w-full z-10 border-b border-orange-500/15 bg-[#020204]/48 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div 
            onClick={() => playCyberBeep(900, 0.05, "sine")}
            className="relative p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 rounded-xl cursor-pointer hover:border-orange-400 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-orange-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full animate-ping" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.3em] font-bold text-orange-400/80 font-mono uppercase mb-0.5">
              CONSCIOUS CORE // CELESTIAL-VII
            </span>
            <h1 className="text-3xl font-bold tracking-tight uppercase italic text-white font-display leading-none">
              Bloom<span className="text-orange-500">OS</span>
            </h1>
          </div>
        </div>

        {/* Floating details panel with high contrast design metrics */}
        <div className="flex items-center gap-6 text-right font-mono text-xs relative z-10">
          <div className="hidden md:flex flex-col">
            <span className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none mb-1">COGNITIVE SYNC</span>
            <span className="text-sm font-semibold text-orange-400">ZOYA 😈</span>
          </div>
          <div className="hidden sm:flex flex-col border-l border-white/5 pl-6">
            <span className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none mb-1">LATENCY NODE</span>
            <span className="text-sm text-emerald-400 font-bold">18MS // ACTV</span>
          </div>
          <div className="hidden sm:flex flex-col border-l border-white/5 pl-6">
            <span className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none mb-1">FREQUENCY</span>
            <span className="text-sm text-cyan-400">24KHZ SIGMA</span>
          </div>
          
          <button
            type="button"
            onClick={() => {
              playCyberBeep(650, 0.08, "sine");
              setIsTradingCenterOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-xl cursor-pointer transition-all text-xs font-semibold uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.2)] ml-2"
          >
            <TrendingUp className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Trading Desk</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              playCyberBeep(700, 0.06, "sine");
              togglePerformanceMode();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl cursor-pointer transition-all text-xs uppercase tracking-wider font-semibold ${
              isPerformanceMode
                ? "bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/60 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.25)]"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isPerformanceMode ? "animate-bounce text-orange-400" : "text-zinc-500"}`} />
            <span>{isPerformanceMode ? "⚡ PERF BOOST" : "NORMAL"}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"></div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-300">LIVE LINK</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">

        {/* 1. Left controls: Cyberpunk Terminal & Voices (Col-span 3) */}
        <section className="lg:col-span-3 lg:flex lg:flex-col gap-6">
          
          {/* Voice configuration */}
          <div className="relative overflow-hidden bg-slate-950/40 border border-orange-500/15 rounded-2xl p-4 backdrop-blur-lg shadow-2xl flex flex-col gap-4 cyber-glow">
            <TechBrackets />
            
            <div className="flex items-center gap-2 border-b border-orange-500/10 pb-2">
              <Brain className="w-4 h-4 text-orange-400 animate-pulse" />
              <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                Acoustic Speech Nodes
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              Zoya utilizes advanced 24kHz multi-intonation speech models. Swap active parameters instantly.
            </p>
            
            <div className="flex flex-col gap-2 relative z-10">
              {voices.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    playCyberBeep(700, 0.04, "sine");
                    setVoice(v.id);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-0.5 cursor-pointer ${
                    activeVoice === v.id
                      ? "bg-orange-500/15 border-orange-500/60 shadow-[0_0_10px_rgba(249,115,22,0.15)] text-white"
                      : "bg-[#020204]/30 border-white/5 hover:bg-white/[0.04] hover:border-orange-500/20 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-mono font-bold uppercase italic">{v.name}</span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      v.gender === "Female" ? "bg-orange-500/20 text-orange-400" : "bg-neutral-800/80 text-neutral-400"
                    }`}>
                      {v.gender}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono leading-snug">
                    {v.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Emotional Mood overrides */}
          <div className="relative bg-slate-950/40 border border-orange-500/15 rounded-2xl p-4 backdrop-blur-lg shadow-2xl flex flex-col gap-4 mt-6 lg:mt-0 cyber-glow">
            <TechBrackets />
            
            <div className="flex items-center gap-2 border-b border-orange-500/10 pb-2">
              <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
              <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                Zoya Neural Mood state
              </h2>
            </div>
            
            <div className="flex items-center gap-3 bg-[#020204]/50 border border-orange-500/15 p-3 rounded-xl">
              <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                {currentMoodInfo.emoji}
              </span>
              <div>
                <p className="text-xs font-mono font-bold text-white uppercase italic">
                  ZOYA::{detectedMood}
                </p>
                <p className="text-[9px] font-mono text-zinc-400">
                  Adaptive emotion modulation parameter
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1 relative z-10 pt-1">
              {moods.map((m) => (
                <button
                  key={m.name}
                  onClick={() => {
                    playCyberBeep(600, 0.05, "sine");
                    setDetectedMood(m.name);
                  }}
                  className={`p-2 rounded-lg text-center border font-mono text-[9px] transition-all duration-200 uppercase flex flex-col items-center gap-1 cursor-pointer ${
                    detectedMood === m.name
                      ? "bg-orange-500/20 border-orange-500/60 text-white font-bold shadow-[0_0_8px_rgba(249,115,22,0.15)]"
                      : "bg-[#020204]/20 border-white/5 hover:border-orange-500/25 hover:bg-slate-900/40 text-slate-400"
                  }`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Visualizer Central Orb Panel (Col-span 6) */}
        <section className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Main Visualizer Window */}
          <div className="relative flex-1 min-h-[460px] bg-slate-950/40 border border-orange-500/15 rounded-3xl p-6 backdrop-blur-lg shadow-3xl flex flex-col justify-between overflow-hidden cyber-glow">
            <TechBrackets />
            
            {/* Ambient telemetry lines in corners */}
            <div className="absolute top-4 left-4 font-mono text-[9px] tracking-widest text-orange-400/65">
              SYS::NEURAL_MATRIX:ONLINE//SIGMA_ACTV
            </div>
            <div className="absolute top-4 right-4 font-mono text-[9px] tracking-widest text-zinc-500">
              ORBIT_DEVIATION::0.003
            </div>
 
            {/* Active Focus Mode HUD Overlay */}
            {focusState?.isActive && (
              <div className="absolute top-12 left-4 right-4 z-10 bg-amber-500/15 border border-amber-500/35 p-2.5 rounded-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4 text-amber-400 animate-spin" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold font-mono text-white tracking-widest uppercase">
                      BUILD SESSION SPRINT ACTIVE
                    </p>
                    <p className="text-[9px] text-amber-300 font-mono">
                      Distractions muted • {focusState.minutesLeft} minutes remaining
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    playCyberBeep(500, 0.1, "sine");
                    setFocusMode(false, 0);
                  }}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-[9px] font-mono text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded transition-transform cursor-pointer"
                >
                  EXIT
                </button>
              </div>
            )}
            <div className="absolute bottom-4 left-4 font-mono text-[9px] text-orange-500/50">
              AMP_OUT:: {outputDb} dB
            </div>

            {/* Simulated Workspace Application Widget */}
            {activeWidgetApp && (
              <div className="absolute inset-0 bg-[#020204]/96 z-20 p-4 flex flex-col animate-fade-in border border-orange-500/20 rounded-3xl">
                <TechBrackets />
                <div className="flex items-center justify-between border-b border-orange-500/10 pb-2 mb-4">
                  <span className="text-xs font-mono uppercase text-orange-400 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-orange-300" /> Holographic Workspace App: {activeWidgetApp}
                  </span>
                  <button 
                    onClick={() => {
                      playCyberBeep(450, 0.05, "sine");
                      setActiveWidgetApp(null);
                    }} 
                    className="p-1 hover:bg-white/5 rounded font-mono text-xs text-slate-400 cursor-pointer"
                  >
                    ✕ CLOSE
                  </button>
                </div>
                <div className="flex-1 bg-black rounded-xl border border-white/5 overflow-hidden">
                  {activeWidgetApp === "TradingView" ? (
                    <iframe 
                      title="TradingView Chart"
                      src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC" 
                      className="w-full h-full border-none"
                    />
                  ) : activeWidgetApp === "Spotify" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6">
                      <Coffee className="w-12 h-12 text-emerald-400 animate-bounce mb-3" />
                      <p className="font-mono text-xs text-white">PLAYING COMPANION VIBE MIX</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">Lo-fi study loops by Zoya</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6">
                      <p className="font-mono text-xs text-cyan-300">{activeWidgetApp} Module Active on main screen.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Central Animated Orb with interstellar rings */}
            <div className="flex-1 flex items-center justify-center relative scale-105 my-8">
              {/* Spinning sci-fi orbit decorators */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute w-[290px] h-[290px] border border-dashed border-orange-500/10 rounded-full pointer-events-none"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute w-[360px] h-[360px] border border-dotted border-blue-500/5 rounded-full pointer-events-none"
              />
              <div className="absolute font-mono text-[7px] text-zinc-600 origin-center rotate-45 -translate-y-[185px] tracking-[0.3em] uppercase pointer-events-none">
                INTELLIGENCE_COGNITION_LINK_IX
              </div>
              <VisualizerOrb />
            </div>

            {/* Error Message Toast */}
            {errorMsg && (
              <div className="mb-4 bg-red-500/15 border border-red-500/35 p-3 rounded-xl flex items-center gap-3 relative z-10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <p className="text-xs font-mono text-red-200 leading-snug flex-1">
                  CORE_ERR:: {errorMsg}
                </p>
                <button 
                  onClick={() => {
                    playCyberBeep(700, 0.1, "sawtooth");
                    startVoiceSession();
                  }} 
                  className="text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded cursor-pointer"
                >
                  RETRY
                </button>
              </div>
            )}

            {/* Bold Typography Mockup Center Title */}
            <div className="my-4 text-center select-none font-display">
              <div className="text-[9px] uppercase tracking-[0.43em] text-[#888] mb-1.5 font-mono">
                COGNITIVE RESONANCE STATE :: 98.4%
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/30 leading-none">
                ZOYA CORE NEURAL MATRIX
              </div>
            </div>

            {/* Real-time Subtitles HUD */}
            <div className="relative min-h-[95px] flex flex-col items-center justify-center text-center p-4 bg-black/45 border border-orange-500/10 rounded-2xl backdrop-blur-md z-10 select-none">
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="w-1 h-3 bg-orange-500 rounded-sm animate-pulse" />
                <span className="text-[7px] font-mono text-zinc-500 tracking-widest uppercase">STREAM DETECTORS</span>
              </div>
              
              <AnimatePresence mode="wait">
                {userSubtitle && (
                  <motion.div
                    key="user"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col items-center gap-1.5 mt-2"
                  >
                    <span className="text-[9px] font-mono uppercase text-orange-400/90 tracking-widest font-bold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">USER INPUT SIGMA</span>
                    <p className="text-sm font-display text-orange-200 font-semibold leading-relaxed max-w-[450px]">
                      "{userSubtitle}"
                    </p>
                  </motion.div>
                )}

                {modelSubtitle && !userSubtitle && (
                  <motion.div
                    key="model"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col items-center gap-1.5 mt-2"
                  >
                    <span className="text-[9px] font-mono uppercase text-cyan-400 tracking-widest font-bold bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">ZOYA REACTION RES</span>
                    <p className="text-base text-white font-medium leading-relaxed max-w-[450px] tracking-tight">
                      "{modelSubtitle}"
                    </p>
                  </motion.div>
                )}

                {!userSubtitle && !modelSubtitle && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    className="text-slate-400 text-xs font-mono mt-2"
                  >
                    {sessionState === "listening" ? (
                      <span className="animate-pulse text-orange-400 font-bold tracking-widest uppercase text-[10px]">● LISTENING NODE ACTIVE • SAY SOMETHING</span>
                    ) : sessionState === "thinking" ? (
                      <span className="animate-pulse text-amber-500 tracking-widest uppercase text-[10px]">● SYNAPSING REPLIES • COMPILING REACTION</span>
                    ) : (
                      <span className="tracking-wide text-[11px] text-zinc-500 italic">"Standing by. Emit acoustic impulses to awaken the core matrix..."</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Center Bar Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 pt-4 border-t border-orange-500/10 relative z-10 w-full">
              
              {/* Giant Activation Button */}
              <button
                onClick={() => {
                  playCyberBeep(sessionState === "idle" ? 880 : 440, 0.08, "sine");
                  handleStartSession();
                }}
                className={`py-3.5 px-6 rounded-2xl flex-1 font-mono font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border shadow-lg cursor-pointer ${
                  sessionState === "idle" || sessionState === "listening" || sessionState === "speaking" || sessionState === "thinking"
                    ? "bg-orange-500/10 border-orange-500/40 text-orange-300 hover:bg-orange-500/20"
                    : "bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:brightness-110 text-white border-orange-500/45 hover:shadow-orange-500/25 hover:-translate-y-0.5"
                }`}
              >
                {sessionState === "idle" || sessionState === "listening" || sessionState === "speaking" || sessionState === "thinking" ? (
                  <>
                    <Square className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span>DEACTIVATE VOICE NODE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white animate-pulse" />
                    <span>ENGAGE NEURAL CORE VOX</span>
                  </>
                )}
              </button>

              {/* Mute Button */}
              <button
                onClick={() => {
                  playCyberBeep(isMuted ? 650 : 350, 0.04, "sine");
                  toggleMute();
                }}
                disabled={sessionState === "booting" || sessionState === "connecting" || sessionState === "error"}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  isMuted
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25"
                    : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-orange-500/30"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 bg-[#020204]/40 border border-orange-500/15 px-4 py-2.5 rounded-2xl w-full sm:w-auto">
                <button
                  onClick={() => {
                    playCyberBeep(volume > 0 ? 250 : 550, 0.05, "sine");
                    setVolume(volume > 0 ? 0 : 0.8);
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4 text-orange-400 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

            </div>

          </div>
        </section>

        {/* 3. Right Panel: Zoya Subsystems of Submissions (Col-span 3) */}
        <section className="lg:col-span-3 lg:flex lg:flex-col gap-6">
          
          {/* Subsystems Navigation Tabs */}
          <div className="relative bg-slate-950/40 border border-orange-500/15 rounded-2xl backdrop-blur-lg shadow-2xl flex-1 flex flex-col overflow-hidden min-h-[360px] cyber-glow">
            <TechBrackets />
            
            <div className="flex border-b border-orange-500/10 bg-[#020204]/40 flex-wrap relative z-10">
              <button
                onClick={() => {
                  playCyberBeep(780, 0.03, "sine");
                  setActiveTab("relationship");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "relationship"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Heart className="w-3 h-3 text-rose-500" /> Relation
              </button>
              <button
                onClick={() => {
                  playCyberBeep(810, 0.03, "sine");
                  setActiveTab("schedule");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "schedule"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Calendar className="w-3 h-3 text-emerald-500" /> Routines
              </button>
              <button
                onClick={() => {
                  playCyberBeep(840, 0.03, "sine");
                  setActiveTab("memories");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "memories"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Database className="w-3 h-3 text-amber-400" /> Memories
              </button>
              <button
                onClick={() => {
                  playCyberBeep(870, 0.03, "sine");
                  setActiveTab("tools");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "tools"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Cpu className="w-3 h-3 text-cyan-500 animate-pulse" /> Automate
              </button>
              <button
                onClick={() => {
                  playCyberBeep(900, 0.03, "sine");
                  setActiveTab("vision");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "vision"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3 text-purple-400 animate-pulse" /> Lens
              </button>
              <button
                onClick={() => {
                  playCyberBeep(930, 0.03, "sine");
                  setActiveTab("ambient");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "ambient"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Radio className="w-3 h-3 text-teal-400 animate-pulse" /> Always-On
              </button>
              <button
                onClick={() => {
                  playCyberBeep(960, 0.03, "sine");
                  setActiveTab("whatsapp");
                }}
                className={`flex-1 min-w-[70px] py-3 text-center text-[9px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "whatsapp"
                    ? "bg-orange-500/[0.08] text-orange-400 border-b-2 border-orange-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400 animate-pulse" /> WhatsApp
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
              
              {activeTab === "relationship" ? (
                <div className="flex flex-col gap-3 h-full overflow-y-auto max-h-[360px] scrollbar-thin scrollbar-thumb-white/10 pr-1 select-none">
                  
                  {/* ZOYA ACTIVE NEURAL EMOTIONAL STATE HUD */}
                  <div className="p-3 bg-gradient-to-b from-white/[0.02] to-black/30 rounded-xl border border-white/10 flex flex-col gap-2 shadow-xl shadow-black/20">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400">
                          Zoya Active Neural State Engine
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 animate-pulse bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Stable Sync
                      </span>
                    </div>

                    {/* Performance Optimizer Inline Indicator/Toggle */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-1 bg-white/[0.01] p-2 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <Zap className={`w-3.5 h-3.5 ${isPerformanceMode ? "text-orange-400 animate-pulse" : "text-zinc-500"}`} />
                        <span className="text-[10px] font-mono leading-none tracking-tight font-bold uppercase text-zinc-400">
                          {isPerformanceMode ? "FAST RESPONSE CORE ACTIVE" : "FULL RENDER GRAPHICS ACTIVE"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={togglePerformanceMode}
                        className={`text-[8.5px] font-mono font-bold leading-none uppercase transition-all px-2.5 py-1 rounded border ${
                          isPerformanceMode
                            ? "bg-orange-500/15 border-orange-500/45 text-orange-400"
                            : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
                        }`}
                      >
                        {isPerformanceMode ? "⚡ REVERT" : "⚙️ ACTIVATE BOOST"}
                      </button>
                    </div>

                    {/* Active Mood Banner Row */}
                    <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-mono text-zinc-500">RESOLVED MOOD</span>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] capitalize tracking-tight">
                        <span className="text-sm">
                          {currentMood === "playful" && "😈"}
                          {currentMood === "romantic" && "💖"}
                          {currentMood === "caring" && "🌸"}
                          {currentMood === "focused" && "👁️"}
                          {currentMood === "sleepy" && "🥱"}
                          {currentMood === "trading-mode" && "💰"}
                          {currentMood === "excited" && "🔥"}
                          {currentMood === "supportive" && "🤝"}
                        </span>
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                          currentMood === "playful" ? "from-purple-400 to-pink-400" :
                          currentMood === "romantic" ? "from-violet-400 to-pink-400" :
                          currentMood === "caring" ? "from-rose-400 to-red-400" :
                          currentMood === "focused" ? "from-cyan-400 to-blue-400" :
                          currentMood === "sleepy" ? "from-indigo-400 to-blue-500" :
                          currentMood === "trading-mode" ? "from-amber-400 to-yellow-500" :
                          currentMood === "excited" ? "from-orange-400 to-yellow-400" : "from-emerald-400 to-teal-400"
                        }`}>
                          {currentMood.replace("-", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Micro Bento Metrics Progress Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] mt-1">
                      {/* Intensity */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-1.5 flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-zinc-500">
                          <span>INTENSITY</span>
                          <span className="text-white font-medium">{emotionalIntensity}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${emotionalIntensity * 10}%` }} />
                        </div>
                      </div>
                      {/* Stress Sensed */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-1.5 flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-zinc-500">
                          <span>FOUNDER STRESS</span>
                          <span className={`font-medium ${founderStressLevel > 5 ? "text-rose-400 animate-pulse" : "text-white"}`}>{founderStressLevel}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${founderStressLevel > 5 ? "bg-rose-500" : "bg-orange-500"}`} style={{ width: `${founderStressLevel * 10}%` }} />
                        </div>
                      </div>
                      {/* Energy */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-1.5 flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-zinc-500">
                          <span>ENERGY</span>
                          <span className="text-white font-medium">{conversationalEnergy}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${conversationalEnergy * 10}%` }} />
                        </div>
                      </div>
                      {/* Affection Level */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-1.5 flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-zinc-500">
                          <span>AFFECTION SCORE</span>
                          <span className="text-white font-medium">{affectionLevel}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${affectionLevel * 10}%` }} />
                        </div>
                      </div>
                      {/* Focus Level */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-1.5 flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-zinc-500">
                          <span>FOCUS LEVEL</span>
                          <span className="text-white font-medium">{focusLevel}</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${focusLevel * 10}%` }} />
                        </div>
                      </div>
                      {/* Silence Duration */}
                      <div className="bg-white/[0.01] border border-white/5 rounded p-1.5 flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-zinc-500">
                          <span>SILENCE TIMER</span>
                          <span className="text-white font-medium">{silenceDuration}s</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, (silenceDuration / 120) * 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Catalyst Nudges */}
                    <div className="mt-2 flex flex-col gap-1 border-t border-white/5 pt-2">
                      <span className="text-[9px] font-mono text-zinc-500 tracking-wider">FOUNDER CATALYST STIMULI</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <button 
                          onClick={() => setNeuralMoodState({ currentMood: "playful", emotionalIntensity: 8, conversationalEnergy: 9, affectionLevel: 7 })}
                          className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 active:scale-95 transition-transform rounded flex items-center gap-1 text-[10px]"
                        >
                          😜 <span>Tease Zoya</span>
                        </button>
                        <button 
                          onClick={() => setNeuralMoodState({ currentMood: "romantic", emotionalIntensity: 9, conversationalEnergy: 6, affectionLevel: 10 })}
                          className="px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 active:scale-95 transition-transform rounded flex items-center gap-1 text-[10px]"
                        >
                          💖 <span>Sweet Talk</span>
                        </button>
                        <button 
                          onClick={() => setNeuralMoodState({ currentMood: "focused", emotionalIntensity: 6, conversationalEnergy: 7, focusLevel: 9, founderStressLevel: 2 })}
                          className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 active:scale-95 transition-transform rounded flex items-center gap-1 text-[10px]"
                        >
                          💻 <span>Code Project</span>
                        </button>
                        <button 
                          onClick={() => setNeuralMoodState({ currentMood: "trading-mode", emotionalIntensity: 9, conversationalEnergy: 9, focusLevel: 9 })}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 active:scale-95 transition-transform rounded flex items-center gap-1 text-[10px]"
                        >
                          💰 <span>Analyse Gold</span>
                        </button>
                        <button 
                          onClick={() => setNeuralMoodState({ currentMood: "caring", emotionalIntensity: 4, founderStressLevel: 1, affectionLevel: 9, conversationalEnergy: 5 })}
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-95 transition-transform rounded flex items-center gap-1 text-[10px]"
                        >
                          🧘 <span>De-stress</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-1 mt-2">
                    <span className="text-[10px] uppercase font-mono text-zinc-500">
                      Founder Profile Resonance
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1 animate-pulse">
                      <Heart className="w-2.5 h-2.5 fill-current text-rose-500" /> Active Engine
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-zinc-500 font-mono italic">
                    Zoya dynamically tracks these 9 coordinates over long-term voice sync sessions to map your energy signature.
                  </p>
                  
                  <div className="flex flex-col gap-2.5">
                    {relationshipMetrics.map((met) => {
                      const value = getObservedValue(met.key, met.fallback);
                      const isRealObserved = memories.some(
                        (m) => m.key.toLowerCase() === `relationship::${met.key.toLowerCase()}` ||
                               m.key.toLowerCase().includes(met.key.toLowerCase())
                      );
                      const Icon = met.icon;
                      
                      return (
                        <div 
                          key={met.key} 
                          className={`p-3 rounded-xl border backdrop-blur-sm transition-all duration-300 flex flex-col gap-1 ${
                            isRealObserved 
                              ? "bg-orange-500/[0.04] border-orange-500/30 shadow-lg shadow-orange-500/[0.02]" 
                              : "bg-white/[0.01] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-3.5 h-3.5 ${met.color}`} />
                              <span className="text-[10px] font-bold font-mono uppercase text-white tracking-tight">
                                {met.label}
                              </span>
                            </div>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase ${
                              isRealObserved ? "bg-orange-500/15 text-orange-400 animate-pulse font-bold" : "bg-neutral-800 text-neutral-500"
                            }`}>
                              {isRealObserved ? "● Live Verified" : "Calibrated"}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-300 font-mono italic leading-relaxed break-words pl-5">
                            "{value}"
                          </p>
                          
                          <span className="text-[9px] text-zinc-500 font-mono scale-95 origin-left pl-5">
                            {met.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeTab === "schedule" ? (
                <div className="flex flex-col gap-4 h-full">
                  {/* Google Calendar Link Indicator / Sign-In */}
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${googleToken ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-mono font-bold text-white uppercase tracking-tight leading-none mb-1">
                          {googleToken ? `Google Calendar Active` : "Local Sync Engine"}
                        </p>
                        <p className="text-[9px] text-slate-400 leading-none">
                          {googleUser ? `Authed: ${googleUser.name}` : "Workspace Unconnected"}
                        </p>
                      </div>
                    </div>
                    {!googleToken ? (
                      <button 
                        onClick={handleGoogleSignIn} 
                        className="text-[9px] font-mono font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded cursor-pointer"
                      >
                        CONNECT
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => fetchAndSyncCalendar(googleToken)}
                          disabled={isSyncingCalendar}
                          className={`text-[9px] font-mono font-bold hover:bg-cyan-500/10 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/20 px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${isSyncingCalendar ? "opacity-50 cursor-not-allowed animate-pulse" : ""}`}
                        >
                          {isSyncingCalendar ? "SYNCING..." : "SYNC NOW"}
                        </button>
                        <button 
                          onClick={async () => {
                            await googleLogout();
                            setGoogleAuth(null, null);
                          }} 
                          className="text-[9px] font-mono font-bold bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-white/10 px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          DISCONNECT
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Alarms & Reminders */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold">
                        Routines & Alarms
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {reminders.length} Active
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {reminders.length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-mono italic p-2 text-center border border-dashed border-white/5 rounded-xl">No active alarms. Ask Zoya.</p>
                      ) : (
                        reminders.map((rem) => (
                          <div key={rem.id} className="p-2 bg-white/[0.01] border border-white/5 rounded-lg flex items-center justify-between group">
                            <div className="flex items-center gap-2 overflow-hidden text-left">
                              <input 
                                type="checkbox" 
                                checked={rem.completed} 
                                onChange={() => toggleReminder(rem.id)}
                                className="w-3.5 h-3.5 rounded border-white/10 accent-orange-500 cursor-pointer"
                              />
                              <div className="truncate">
                                <span className={`text-[10.5px] font-sans block truncate ${rem.completed ? "line-through text-slate-600 font-light" : "text-white font-medium"}`}>{rem.task}</span>
                                <span className="text-[8.5px] font-mono text-amber-400">🕒 {rem.time}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteReminder(rem.id)}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleCreateReminderLocally} className="flex gap-1.5 pt-1">
                      <input 
                        type="text" 
                        placeholder="Add routine timer / alarm..." 
                        value={newReminderTask}
                        onChange={(e) => setNewReminderTask(e.target.value)}
                        className="bg-black/80 border border-white/5 rounded-lg p-1.5 text-[10px] text-white flex-1 focus:outline-none focus:border-orange-500/30 font-sans"
                        required
                      />
                      <input 
                        type="time" 
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="bg-black/80 border border-white/5 rounded-lg p-1.5 text-[10px] text-white w-18 focus:outline-none focus:border-orange-500/30 font-mono"
                        required
                      />
                      <button type="submit" className="p-1.5 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg transition-colors cursor-pointer shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>

                  {/* Calendar Events List */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold">
                        Scheduled Events Today
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {events.length} Active
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {events.length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-mono italic p-2 text-center border border-dashed border-white/5 rounded-xl">Empty schedule. Ask Zoya to lock an event.</p>
                      ) : (
                        events.map((evt) => (
                          <div key={evt.id} className="p-2.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl flex items-start justify-between group transition-colors">
                            <div className="flex items-start gap-2 min-w-0 text-left">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${evt.source === "Google" ? "bg-cyan-500 animate-pulse" : "bg-emerald-500"}`} />
                              <div className="min-w-0">
                                <span className="text-[11px] font-bold text-slate-200 block truncate leading-tight uppercase font-mono">{evt.title}</span>
                                <span className="text-[9px] text-slate-400 font-mono italic block mt-0.5">
                                  Today • {evt.time} ({evt.duration} mins) • <span className="text-[8.5px] uppercase tracking-wider text-orange-400 font-bold font-mono">{evt.source}</span>
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteEvent(evt.id, evt.title, evt.source)}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleCreateEvent} className="flex gap-1.5 pt-1">
                      <input 
                        type="text" 
                        placeholder="Schedule routine event..." 
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        className="bg-black/80 border border-white/5 rounded-lg p-1.5 text-[10px] text-white flex-1 focus:outline-none focus:border-orange-500/30"
                        required
                      />
                      <input 
                        type="time" 
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        className="bg-black/80 border border-white/5 rounded-lg p-1.5 text-[10px] text-white w-18 focus:outline-none focus:border-orange-500/30 font-mono"
                        required
                      />
                      <button type="submit" className="p-1.5 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg transition-colors cursor-pointer shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : activeTab === "memories" ? (
                <div className="flex-col flex gap-3 h-full overflow-y-auto max-h-[460px] scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  
                  {/* Search and Category Filter Section */}
                  <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 p-2.5 rounded-xl">
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-zinc-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                      <input 
                        type="text"
                        placeholder="Search Zoya's memory networks..."
                        value={memorySearchQuery}
                        onChange={(e) => setMemorySearchQuery(e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/30 font-mono"
                      />
                      {memorySearchQuery && (
                        <button 
                          onClick={() => setMemorySearchQuery("")}
                          className="absolute right-2 text-zinc-400 hover:text-white text-[10px] font-mono"
                        >
                          ESC
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(["all", "short-term", "long-term", "emotional", "timeline"] as const).map((tab) => {
                        const count = memories.filter(m => tab === "all" ? true : m.category === tab).length;
                        const label = tab === "all" ? "All Layers" : tab.replace("-", " ");
                        return (
                          <button
                            key={tab}
                            onClick={() => setMemoryFilterTab(tab)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-mono border transition-all cursor-pointer flex items-center gap-1 capitalize ${
                              memoryFilterTab === tab
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-sm shadow-orange-500/5"
                                : "bg-transparent text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-200"
                            }`}
                          >
                            <span>{label}</span>
                            <span className="opacity-60 text-[8px]">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of current memories */}
                  <div className="flex-1 flex flex-col gap-2 min-h-[160px] max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                    {memories.filter(m => {
                      const matchesSearch = memorySearchQuery
                        ? m.key.toLowerCase().includes(memorySearchQuery.toLowerCase()) || 
                          m.value.toLowerCase().includes(memorySearchQuery.toLowerCase())
                        : true;
                      const matchesCategory = memoryFilterTab === "all"
                        ? true
                        : m.category === memoryFilterTab;
                      return matchesSearch && matchesCategory;
                    }).length === 0 ? (
                      <div className="p-6 border border-dashed border-white/5 rounded-xl text-center text-zinc-600 text-[10px] font-mono flex flex-col items-center justify-center gap-1.5">
                        <Brain className="w-5 h-5 text-zinc-700 animate-pulse" />
                        <span>No memories found in selected filter.</span>
                      </div>
                    ) : (
                      memories
                        .filter(m => {
                          const matchesSearch = memorySearchQuery
                            ? m.key.toLowerCase().includes(memorySearchQuery.toLowerCase()) || 
                              m.value.toLowerCase().includes(memorySearchQuery.toLowerCase())
                            : true;
                          const matchesCategory = memoryFilterTab === "all"
                            ? true
                            : m.category === memoryFilterTab;
                          return matchesSearch && matchesCategory;
                        })
                        .map((m) => {
                          const category = m.category || "long-term";
                          const importance = m.importance || 5;
                          
                          // Style presets based on Zoya's memory layers
                          const categoryStyles = {
                            "short-term": {
                              badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                              glow: "border-blue-500/10 hover:border-blue-500/20"
                            },
                            "long-term": {
                              badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                              glow: "border-indigo-500/10 hover:border-indigo-500/20"
                            },
                            "emotional": {
                              badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                              glow: "border-rose-500/10 hover:border-rose-500/20"
                            },
                            "timeline": {
                              badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                              glow: "border-emerald-500/10 hover:border-emerald-500/20"
                            }
                          }[category];

                          const importanceLabel = 
                            importance >= 8 ? "⭐ Core" : 
                            importance >= 4 ? "⚡ Sync" : "⏳ Decay";

                          return (
                            <div 
                              key={m.id} 
                              className={`p-2.5 bg-white/[0.01] border ${categoryStyles.glow} rounded-xl flex items-start gap-2.5 group transition-all duration-300`}
                            >
                              <div className="shrink-0 mt-0.5">
                                {category === "short-term" && <Clock className="w-3.5 h-3.5 text-blue-400" />}
                                {category === "long-term" && <Brain className="w-3.5 h-3.5 text-indigo-400" />}
                                {category === "emotional" && <Heart className="w-3.5 h-3.5 text-rose-400" />}
                                {category === "timeline" && <Calendar className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-zinc-300 block truncate">{m.key}</span>
                                  
                                  {/* Category Badge */}
                                  <span className={`px-1 py-0.2 text-[7px] uppercase font-mono tracking-wider rounded border ${categoryStyles.badge}`}>
                                    {category}
                                  </span>

                                  {/* Importance Rating Visualizer */}
                                  <span className={`px-1 py-0.2 text-[7px] font-mono rounded border ${
                                    importance >= 8 ? "border-amber-500/20 bg-amber-500/5 text-amber-400" :
                                    importance >= 4 ? "border-purple-500/20 bg-purple-500/5 text-purple-400" :
                                    "border-zinc-500/20 bg-zinc-500/5 text-zinc-400"
                                  }`} title={`Importance metric score: ${importance}/10. ${importanceLabel} storage rules.`}>
                                    {importanceLabel} {importance}/10
                                  </span>

                                  {/* Emotional Tagging Visualizer */}
                                  {m.emotionalTag && (
                                    <span className="px-1 py-0.2 text-[7px] font-mono border border-orange-500/20 bg-orange-500/5 text-orange-400 rounded capitalize">
                                      🎭 {m.emotionalTag}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-200 leading-normal block break-words mt-1">{m.value}</span>
                                <span className="text-[8px] text-zinc-500 font-mono block mt-1">{new Date(m.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                              </div>

                              <button
                                onClick={() => deleteMemory(m.id)}
                                className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 shrink-0 self-center"
                                title="Forget Memory item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Add memory form section */}
                  <form onSubmit={handleAddCustomMemory} className="border-t border-white/5 pt-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[9px] font-mono uppercase text-[#e0a82e] tracking-wider flex items-center gap-1 font-bold">
                        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" /> Inject Custom Neural Marker
                      </h3>
                      {memoryImportance <= 3 && (
                        <span className="text-[7px] text-zinc-500 font-mono italic">
                          ℹ️ Transient scores are subject to decay forgetting Curves
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Memory key (e.g., Favorite Symbol)"
                        value={memoryKey}
                        onChange={(e) => setMemoryKey(e.target.value)}
                        className="bg-black/80 border border-white/5 rounded-lg p-1.5 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/30 font-mono"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Narrative detail to remember..."
                        value={memoryVal}
                        onChange={(e) => setMemoryVal(e.target.value)}
                        className="bg-black/80 border border-white/5 rounded-lg p-1.5 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/30 font-mono"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Category Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[7.5px] font-mono uppercase text-zinc-500">Layer Type</label>
                        <select
                          value={memoryCategory}
                          onChange={(e) => setMemoryCategory(e.target.value as any)}
                          className="bg-black border border-white/10 rounded-md p-1 text-[9px] text-zinc-350 focus:outline-none focus:border-orange-500/30 font-mono"
                        >
                          <option value="short-term">⚡ Short-Term</option>
                          <option value="long-term">🔮 Long-Term</option>
                          <option value="emotional">💖 Emotional</option>
                          <option value="timeline">📅 Timeline</option>
                        </select>
                      </div>

                      {/* Importance Score selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[7.5px] font-mono uppercase text-zinc-500">Importance Rating</label>
                        <select
                          value={memoryImportance}
                          onChange={(e) => setMemoryImportance(Number(e.target.value))}
                          className="bg-black border border-white/10 rounded-md p-1 text-[9px] text-zinc-350 focus:outline-none focus:border-orange-500/30 font-mono"
                        >
                          <option value={10}>10 (Universal Creator)</option>
                          <option value={9}>9 (High Habit Profile)</option>
                          <option value={8}>8 (Corporate Core)</option>
                          <option value={6}>6 (Personal Routine)</option>
                          <option value={5}>5 (Medium Standard)</option>
                          <option value={3}>3 (Transient / Decay)</option>
                          <option value={1}>1 (Low Transient)</option>
                        </select>
                      </div>

                      {/* Emotional context selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[7.5px] font-mono uppercase text-zinc-500">Emotional Tone</label>
                        <select
                          value={memoryEmotionalTag}
                          onChange={(e) => setMemoryEmotionalTag(e.target.value)}
                          className="bg-black border border-white/10 rounded-md p-1 text-[9px] text-zinc-350 focus:outline-none focus:border-orange-500/30 font-mono"
                        >
                          <option value="">None / Neutral</option>
                          <option value="confident">Confident</option>
                          <option value="stressed">Stressed</option>
                          <option value="burnout">Burnout Warning</option>
                          <option value="excited">Excited</option>
                          <option value="calm">Calm</option>
                          <option value="frustrated">Frustrated</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="mt-1.5 w-full p-2 bg-[#d97706]/10 hover:bg-[#d97706]/20 text-[#fbbf24] border border-[#d97706]/20 rounded-lg hover:border-orange-500/30 transition-all duration-300 font-mono text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                    >
                      Connect Memory Layer
                    </button>
                  </form>

                </div>
              ) : activeTab === "tools" ? (
                <div className="flex flex-col gap-4 h-full overflow-y-auto max-h-[460px] scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  
                  {/* WORKFLOW PRESETS */}
                  <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <h3 className="text-[10px] font-mono uppercase text-[#f59e0b] tracking-wider flex items-center gap-1.5 font-bold">
                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Smart Workflow Presets
                      </h3>
                      <span className="text-[8px] font-mono text-zinc-500 bg-zinc-500/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                        Active: <strong className="text-cyan-400">{activeWorkflowMode}</strong>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      {/* Trading Mode Card */}
                      <div 
                        onClick={() => triggerWorkflowMode("trading")}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between h-[80px] ${
                          activeWorkflowMode === "trading" 
                            ? "bg-orange-500/10 border-orange-500/40 shadow-md shadow-orange-500/5" 
                            : "bg-black/40 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">📊 TRADING MODE</span>
                            {activeWorkflowMode === "trading" && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />}
                          </div>
                          <p className="text-[8.5px] text-zinc-400 leading-tight mt-1">TradingView Gold charts, Forex calendar stream, Focus timer 60m.</p>
                        </div>
                        <span className="text-[7.5px] uppercase tracking-wider text-orange-500/80 font-semibold group-hover:text-orange-400 transition-colors">
                          {activeWorkflowMode === "trading" ? "ACTIVE NOW 🌐" : "ACTIVATE SHIELD ➔"}
                        </span>
                      </div>

                      {/* Content Mode Card */}
                      <div 
                        onClick={() => triggerWorkflowMode("content")}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between h-[80px] ${
                          activeWorkflowMode === "content" 
                            ? "bg-[#6366f1]/10 border-[#6366f1]/40 shadow-md shadow-indigo-500/5" 
                            : "bg-black/40 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">🎨 CONTENT STUDIO</span>
                            {activeWorkflowMode === "content" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                          </div>
                          <p className="text-[8.5px] text-zinc-400 leading-tight mt-1">Creative script writing guides, Spotify synth focus streams, 45m sprint timer.</p>
                        </div>
                        <span className="text-[7.5px] uppercase tracking-wider text-indigo-400 font-semibold group-hover:text-indigo-300 transition-colors">
                          {activeWorkflowMode === "content" ? "ACTIVE NOW 🌸" : "ACTIVATE STUDIO ➔"}
                        </span>
                      </div>

                      {/* Deep Work Mode */}
                      <div 
                        onClick={() => triggerWorkflowMode("deep_work")}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between h-[80px] ${
                          activeWorkflowMode === "deep_work" 
                            ? "bg-rose-500/10 border-rose-500/40 shadow-md shadow-rose-500/5" 
                            : "bg-black/40 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">🤫 DEEP WORK SHIELD</span>
                            {activeWorkflowMode === "deep_work" && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                          </div>
                          <p className="text-[8.5px] text-zinc-400 leading-tight mt-1">Total noise block, Zoya companion speaking muted, Pomodoro focus 25m.</p>
                        </div>
                        <span className="text-[7.5px] uppercase tracking-wider text-rose-400 font-semibold group-hover:text-rose-300 transition-colors">
                          {activeWorkflowMode === "deep_work" ? "LOCK SHIELDS Active 🔇" : "ENGAGE SHIELD ➔"}
                        </span>
                      </div>

                      {/* Reset Component (Idle) */}
                      <div 
                        onClick={() => triggerWorkflowMode("idle")}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between h-[80px] ${
                          activeWorkflowMode === "idle" 
                            ? "bg-zinc-500/10 border-zinc-500/40 shadow-md shadow-zinc-500/5" 
                            : "bg-black/40 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">😌 GENERAL OPERATING STATE</span>
                            {activeWorkflowMode === "idle" && <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />}
                          </div>
                          <p className="text-[8.5px] text-zinc-400 leading-tight mt-1">Standby micro listener companion, standard dashboard widgets, normal alerts.</p>
                        </div>
                        <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-semibold group-hover:text-zinc-200 transition-colors">
                          {activeWorkflowMode === "idle" ? "STANDBY RUNNING ●" : "RESTORE STANDBY ➔"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PROACTIVE SCENARIO EMULATION BOARD */}
                  <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                    <h3 className="text-[10px] font-mono uppercase text-[#10b981] tracking-wider flex items-center gap-1.5 font-bold border-b border-white/5 pb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Proactive Agent Emulation Core
                    </h3>
                    <p className="text-[8.5px] text-zinc-500 font-mono italic">
                      Feed real-time autonomous events into Zoya's monitoring loop to watch her trigger workflows of her own accord:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[9px]">
                      
                      {/* Event: London Open */}
                      <button 
                        onClick={() => {
                          addAutomationLog("Autonomously monitoring NY/London clocks - London Session Opening shortly.", "market", "running");
                          setTimeout(() => {
                            useBloomOSStore.getState().setModelSubtitle("London session is opening up in ten minutes, Mohammad! 😌 Should I prepare the TradingView charts and silence other tabs for you?");
                            addAutomationLog("Zoya triggered vocal suggestion: London hours workspace ready nudge.", "workflow", "success");
                          }, 1000);
                        }}
                        className="p-2 bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#34d399] border border-[#10b981]/20 rounded-xl transition-all cursor-pointer text-left flex flex-col justify-between h-[64px]"
                      >
                        <span className="font-bold">🌍 London Open Alert</span>
                        <span className="text-[7.5px] text-[#34d399]/70 leading-normal">Fires London session opening sequence.</span>
                      </button>

                      {/* Event: Gold Volatility Spike */}
                      <button 
                        onClick={() => {
                          addAutomationLog("Telemetry sensor tracked sudden Gold (XAUUSD) volume surge (+140 ticks/sec).", "market", "running");
                          setTimeout(() => {
                            setActiveWidgetApp("TradingView");
                            useBloomOSStore.getState().setModelSubtitle("Whoa, Mohammad! Gold volatility just spiked rapidly. I've automatically launched our TradingView console onto the main workspace screen so we don't miss any breakouts! 📈");
                            addAutomationLog("Zoya autonomously launched TradingView charts to handle market surge.", "desktop", "success");
                          }, 1000);
                        }}
                        className="p-2 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#fbbf24] border border-[#f59e0b]/20 rounded-xl transition-all cursor-pointer text-left flex flex-col justify-between h-[64px]"
                      >
                        <span className="font-bold">⚡ Gold Volatility Spike</span>
                        <span className="text-[7.5px] text-[#fbbf24]/70 leading-normal">Forces charts load to chase dynamic breakout.</span>
                      </button>

                      {/* Event: Macro Calendar NFP Prep */}
                      <button 
                        onClick={() => {
                          addAutomationLog("Matching calendar timelines: High-Impact Macro Schedule (NFP / CPI) in 15 minutes.", "calendar", "running");
                          setTimeout(() => {
                            useBloomOSStore.getState().setModelSubtitle("Hey Mohammad, there is a major macro news release coming up in fifteen minutes! Let's stay extremely alert and keep our risk sizes very defensive 🚨");
                            addAutomationLog("Macro CPI news alert warning broadcasted successfully.", "system", "success");
                          }, 1000);
                        }}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all cursor-pointer text-left flex flex-col justify-between h-[64px]"
                      >
                        <span className="font-bold">🚨 Macro NFP News Warning</span>
                        <span className="text-[7.5px] text-rose-400/70 leading-normal">Nudges founder to scale down risk models.</span>
                      </button>

                      {/* Event: Inactive Backtesting Nudge */}
                      <button 
                        onClick={() => {
                          addAutomationLog("Performing routine habit check: Checking daily backtesting drills compliance...", "routine", "running");
                          setTimeout(() => {
                            useBloomOSStore.getState().setModelSubtitle("Mohammad! I just checked our schedule and you haven't completed your daily Gold backtesting strategy drills today. You forgot them again, didn't you? 😭 Let's open our worksheets!");
                            setActiveWidgetApp("TradingView");
                            addAutomationLog("Discipline audit failed. Infraction matched. Nudging backtesting execution.", "routine", "success");
                          }, 1000);
                        }}
                        className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl transition-all cursor-pointer text-left flex flex-col justify-between h-[64px]"
                      >
                        <span className="font-bold">🥱 Inactive Backtest Nudge</span>
                        <span className="text-[7.5px] text-purple-400/70 leading-normal">Nag founder about neglected routines.</span>
                      </button>

                    </div>
                  </div>

                  {/* ACTIVE DESKTOP AUTOMATION CHASSIS */}
                  <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-2xl font-mono text-[10px]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="uppercase text-[9px] text-zinc-500 font-bold flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5 text-zinc-400" /> Simulated Desktop Tab Controller
                      </span>
                      <span className="text-[8px] text-[#34d399] tracking-wider bg-emerald-500/5 px-2 py-0.2 rounded border border-emerald-500/10">
                        ONLINE & SYNCED
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 leading-tight pt-1">
                      <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg p-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Tv className={`w-3.5 h-3.5 ${activeWidgetApp === "TradingView" ? "text-orange-400 animate-pulse" : "text-zinc-650"}`} />
                          <div className="min-w-0">
                            <span className="text-[9.5px] block truncate text-zinc-100">TradingView.com Gold Candles</span>
                            <span className="text-[7px] text-zinc-500 block truncate">Primary technical layout frame on workspace</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveWidgetApp(activeWidgetApp === "TradingView" ? null : "TradingView")}
                          className={`px-2 py-1 rounded text-[8px] border transition-all cursor-pointer ${
                            activeWidgetApp === "TradingView" 
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/30" 
                              : "bg-transparent text-zinc-500 border-white/5 hover:border-white/10"
                          }`}
                        >
                          {activeWidgetApp === "TradingView" ? "UNLOAD ✕" : "LAUNCH APP ⎙"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg p-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Radio className={`w-3.5 h-3.5 ${activeWidgetApp === "Spotify" ? "text-indigo-400 animate-pulse" : "text-zinc-650"}`} />
                          <div className="min-w-0">
                            <span className="text-[9.5px] block truncate text-zinc-100">Spotify Synthcast Player</span>
                            <span className="text-[7px] text-zinc-500 block truncate">Ambient background focus loops stream controller</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveWidgetApp(activeWidgetApp === "Spotify" ? null : "Spotify")}
                          className={`px-2 py-1 rounded text-[8px] border transition-all cursor-pointer ${
                            activeWidgetApp === "Spotify" 
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                              : "bg-transparent text-zinc-500 border-white/5 hover:border-white/10"
                          }`}
                        >
                          {activeWidgetApp === "Spotify" ? "UNLOAD ✕" : "LAUNCH APP ⎙"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AUTOMATION LOGS SECTION */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Autonomous Orchestration Logs
                      </span>
                      <button 
                        onClick={clearAutomationLogs} 
                        className="p-1 hover:bg-white/5 rounded text-[8px] font-mono text-zinc-500 hover:text-red-400 uppercase cursor-pointer"
                      >
                        PURGE RECORDS
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                      {automationLogs.length === 0 ? (
                        <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-xs font-mono">
                          No automation events recorded yet.
                        </div>
                      ) : (
                        automationLogs.map((log) => {
                          const categoryStyle = {
                            workflow: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                            routine: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                            desktop: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                            calendar: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            system: "bg-zinc-500/15 text-zinc-400 border-white/5",
                            market: "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }[log.category || "system"];

                          return (
                            <div 
                              key={log.id} 
                              className="p-2 bg-black/40 border border-white/5 rounded-xl font-mono text-[9px] flex items-start gap-2 justify-between"
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <span className={`px-1 py-0.2 uppercase text-[7px] tracking-wider rounded border font-semibold shrink-0 mt-0.5 ${categoryStyle}`}>
                                  {log.category || "system"}
                                </span>
                                <span className="text-zinc-200 leading-tight block break-words">{log.action}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-[7px] px-1 rounded uppercase font-bold border ${
                                  log.status === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" :
                                  log.status === "running" ? "border-orange-500/20 bg-orange-500/5 text-orange-400 animate-pulse" :
                                  "border-blue-500/20 bg-blue-500/5 text-blue-400"
                                }`}>
                                  {log.status === "running" ? "Exec" : "Done"}
                                </span>
                                <span className="text-[7.5px] text-zinc-600 block">{log.timestamp}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* MINI STANDARD RPC LOGS (Collapsed default tool telemetry) */}
                  <div className="border border-white/5 rounded-xl p-2 bg-black/60 font-mono text-[10px]">
                    <details className="cursor-pointer group">
                      <summary className="text-[8px] text-zinc-500 font-bold uppercase flex items-center justify-between outline-none select-none list-none">
                        <span>🔍 Show Internal RPC Telemetry ({toolLogs.length})</span>
                        <span className="group-open:rotate-180 transition-transform text-[10px]">&darr;</span>
                      </summary>
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5 max-h-[140px] overflow-y-auto">
                        {toolLogs.length === 0 ? (
                          <div className="text-[8px] text-zinc-650 italic text-center py-2">No raw JSON-RPC captures.</div>
                        ) : (
                          toolLogs.map((log) => (
                            <div key={log.id} className="p-1.5 bg-black border border-white/5 rounded flex flex-col gap-1 text-[8px] leading-tight">
                              <div className="flex items-center justify-between">
                                <span className="text-orange-400 font-bold uppercase">{log.name}</span>
                                <span className="text-zinc-500">{log.timestamp}</span>
                              </div>
                              <div className="text-zinc-400 truncate">Args: {JSON.stringify(log.args)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </details>
                  </div>

                </div>
              ) : activeTab === "whatsapp" ? (
                <div className="flex flex-col gap-4 h-full">
                  {/* Status Indicator Bar */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1.5">
                      <MessageSquare className="text-emerald-400 w-3.5 h-3.5 animate-pulse" /> WhatsApp Automation Core
                    </span>
                    <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      whatsappStatus === "authenticated"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : whatsappStatus === "connecting"
                        ? "bg-blue-500/10 text-blue-400 animate-pulse border border-blue-500/20"
                        : whatsappStatus === "qr"
                        ? "bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20"
                        : whatsappStatus === "error"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-zinc-850 text-zinc-550 border border-white/5"
                    }`}>
                      {whatsappStatus === "authenticated" ? "● Active Standby" : whatsappStatus === "connecting" ? "Initializing" : whatsappStatus === "qr" ? "Scan Required" : whatsappStatus === "error" ? "Daemon Error" : "Daemon Closed"}
                    </span>
                  </div>

                  {/* Draft Confirmation Notice */}
                  {whatsappDraft && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/25 rounded-xl flex flex-col gap-2 relative shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" /> Pending Command Confirmation
                        </span>
                        <button
                          type="button"
                          onClick={() => setWhatsAppDraft(null)}
                          className="text-[8px] font-mono text-zinc-500 hover:text-zinc-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 leading-normal bg-black/60 p-2.5 rounded-lg border border-white/[0.02]">
                        <span className="text-zinc-500 block text-[8.5px] uppercase">To Contact:</span>
                        <span className="text-white font-bold text-[11px] block">{whatsappDraft.recipient}</span>
                        <span className="text-zinc-500 block text-[8.5px] uppercase mt-2">Proposed Text Content:</span>
                        <span className="text-emerald-300 font-sans italic leading-relaxed">"{whatsappDraft.message}"</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await sendWhatsAppMessage(whatsappDraft.recipient, whatsappDraft.message);
                          }}
                          className="flex-1 py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 rounded-lg text-emerald-300 font-mono text-[9px] font-bold uppercase transition-all cursor-pointer"
                        >
                          Submit Real WhatsApp Dispatch
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main State Views */}
                  {whatsappStatus === "uninitialized" && (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-white/5 rounded-2xl bg-black/30 my-auto">
                      <MessageSquare className="w-10 h-10 text-zinc-700 mb-2" />
                      <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                        WhatsApp Daemon Standby
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-sans max-w-[220px] mx-auto mt-1 leading-normal mb-4">
                        Launches a background Playwright Chrome worker with session persistence to automate messaging.
                      </p>
                      <button
                        type="button"
                        onClick={initializeWhatsApp}
                        className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-mono text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl hover:-translate-y-0.5 cursor-pointer"
                      >
                        Boot WhatsApp Daemon
                      </button>
                    </div>
                  )}

                  {whatsappStatus === "connecting" && (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-white/5 rounded-2xl bg-black/50 my-auto">
                      <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                      <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                        Powering Robot Nodes
                      </h3>
                      <p className="text-[10px] text-emerald-400/80 font-mono mt-0.5 animate-pulse">
                        WAKING UP PLAYWRIGHT SERVICES
                      </p>
                      <p className="text-[8px] text-zinc-600 mt-2 font-mono">
                        Usually takes around 5-15 seconds. Hold on...
                      </p>
                    </div>
                  )}

                  {whatsappStatus === "qr" && (
                    <div className="flex flex-col gap-3 p-4 border border-white/10 rounded-2xl bg-black/60 items-center justify-center text-center">
                      <div className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        Scan QR Authentication
                      </div>
                      
                      {whatsappQR ? (
                        <div className="p-2.5 bg-white rounded-xl shadow-2xl flex items-center justify-center max-w-[170px]">
                          <img src={whatsappQR} referrerPolicy="no-referrer" alt="WhatsApp Login QR Code" className="w-full h-auto aspect-square mix-blend-multiply" />
                        </div>
                      ) : (
                        <div className="h-[150px] w-[150px] flex items-center justify-center bg-zinc-900 border border-white/5 rounded-xl">
                          <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                        </div>
                      )}

                      <div className="text-[9px] text-slate-400 leading-normal max-w-[200px]">
                        Open WhatsApp on your device, navigate to <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>, and scan this code.
                      </div>

                      <button
                        type="button"
                        onClick={syncWhatsAppState}
                        className="py-1 px-2.5 text-[8px] font-mono border border-white/10 hover:border-white/20 bg-white/5 rounded text-zinc-300 font-bold uppercase flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Refresh QR
                      </button>
                    </div>
                  )}

                  {whatsappStatus === "authenticated" && (
                    <div className="flex flex-col gap-3">
                      {/* Active Dashboard Stats */}
                      <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                        <div className="p-2.5 bg-emerald-500/[0.02] border border-emerald-500/15 rounded-xl">
                          <span className="text-zinc-600 block uppercase font-bold text-[7px] tracking-wider">Linkage Status:</span>
                          <span className="text-emerald-400 font-bold">ONLINE STANDBY</span>
                        </div>
                        <div className="p-2.5 bg-emerald-500/[0.02] border border-emerald-500/15 rounded-xl">
                          <span className="text-zinc-600 block uppercase font-bold text-[7px] tracking-wider">Sync Record:</span>
                          <span className="text-zinc-400 truncate block">{whatsappLastConnected || "Recent Connect"}</span>
                        </div>
                      </div>

                      {/* Manual Quick Messaging Center */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const fd = new FormData(form);
                          const user = fd.get("recipient") as string;
                          const content = fd.get("message") as string;
                          if (!user || !content) return;
                          
                          if (confirm(`Authorize manual dispatch of text via Playwright: \n\nTo: ${user}\nMessage: "${content}"`)) {
                            const resCompleted = await sendWhatsAppMessage(user, content);
                            if (resCompleted.success) {
                              form.reset();
                            } else {
                              alert(`Dispatch failed: ${resCompleted.error}`);
                            }
                          }
                        }}
                        className="p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-2.5"
                      >
                        <div className="text-[9px] font-mono font-bold uppercase text-zinc-500 flex items-center justify-between">
                          <span>Manual Messaging Deck</span>
                          <span className="text-[7.5px] uppercase font-bold text-emerald-500">Secure Direct Access</span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            name="recipient"
                            placeholder="Recipient Contact Name (E.g. Irfan)"
                            required
                            className="bg-black border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40"
                          />
                          <textarea
                            name="message"
                            placeholder="Message content text..."
                            required
                            rows={2}
                            className="bg-black border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg font-mono text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Execute Send Sequence
                        </button>
                      </form>

                      {/* Diagnostics Viewport View */}
                      <div className="flex flex-col gap-2 border border-white/5 bg-black/30 p-2.5 rounded-xl relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold flex items-center gap-1">
                            <Camera className="w-3 h-3 text-emerald-400" /> Active Viewport Diagnostics
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const r = await fetch("/api/whatsapp/screenshot");
                                if (r.ok) {
                                  const d = await r.json();
                                  setWhatsAppScreenshot(d.image);
                                  addAutomationLog?.("Updated diagnostic viewport capture from Chromium workspace", "system", "success");
                                }
                              } catch(err) {}
                            }}
                            className="text-[8px] font-mono border border-white/10 px-2 py-0.5 rounded hover:bg-white/5 text-zinc-400 tracking-wider uppercase font-bold cursor-pointer"
                          >
                            Capture Viewport
                          </button>
                        </div>
                        {whatsappScreenshot ? (
                          <div className="rounded-lg overflow-hidden border border-white/15 aspect-video w-full bg-black">
                            <img src={whatsappScreenshot} referrerPolicy="no-referrer" alt="Diagnostics Capture" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-white/5 rounded-lg text-center text-[8px] text-zinc-605 font-mono">
                            Press "Capture Viewport" to pull the active head-state snapshot from the container.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={disconnectWhatsApp}
                        className="w-full py-1.5 px-3 rounded-lg border border-red-500/20 bg-red-500/[0.04] text-red-400 font-mono text-[8.5px] uppercase font-bold tracking-wider hover:bg-red-500/10 transition-all text-center cursor-pointer"
                      >
                        Power Down WhatsApp Worker Core
                      </button>
                    </div>
                  )}

                  {/* Operational Log Stack */}
                  <div className="flex-1 flex flex-col gap-2 border-t border-white/5 pt-3.5 max-h-[170px] shrink-0">
                    <span className="text-[8.5px] uppercase font-mono text-zinc-500 font-bold tracking-wider">
                      Daemon Status Logs ({whatsappLogs?.length || 0})
                    </span>

                    <div className="flex-1 bg-black/60 border border-white/5 p-2 rounded-xl h-24 overflow-y-auto font-mono text-[8.5px] text-zinc-400 leading-normal flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-white/10 pr-1">
                      {!whatsappLogs || whatsappLogs.length === 0 ? (
                        <div className="text-[8px] text-zinc-700 italic text-center py-4">Logs stand-by. Initiate service to stream.</div>
                      ) : (
                        [...whatsappLogs].reverse().map((log, index) => {
                          const isSuccess = log.includes("✨") || log.includes("Success");
                          const hasWarning = log.includes("⚠️") || log.includes("CRITICAL");
                          return (
                            <div key={index} className={`truncate line-clamp-2 ${isSuccess ? "text-emerald-400" : hasWarning ? "text-red-400" : "text-zinc-400"}`}>
                              {log}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : activeTab === "vision" ? (
                <div className="flex flex-col gap-4 h-full">
                  
                  {/* Title and logging */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-purple-400" /> Zoya Lens: Optical Core
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      screenStream ? "bg-purple-500/10 text-purple-400 animate-pulse" : "bg-neutral-800 text-zinc-500"
                    }`}>
                      {screenStream ? "● FEED_ACTIVE" : "STANDBY"}
                    </span>
                  </div>

                  {/* Micro Live View Hologram PIP */}
                  <div className="relative border border-white/10 rounded-2xl bg-black overflow-hidden h-[130px] flex items-center justify-center group shadow-2xl shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
                    
                    {/* Cyber telemetry HUD overlay lines */}
                    <div className="absolute top-2 left-2.5 font-mono text-[8px] text-purple-400/80 z-10">
                      SYS_LENS::RECEPTOR_01
                    </div>
                    <div className="absolute top-2 right-2.5 font-mono text-[8px] text-zinc-500 z-10 flex items-center gap-1">
                      <span>CH_01</span>
                      {screenStream && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />}
                    </div>
                    {screenStream && (
                      <div className="absolute bottom-2 left-2.5 font-mono text-[8px] text-zinc-400/90 z-20">
                        STREAMING @ 1 FRAME / 5S
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2.5 font-mono text-[8px] text-zinc-500 z-20">
                      RES::640x360
                    </div>

                    {/* Futuristic Background Grid or Live Stream Video */}
                    {!screenStream ? (
                      <div className="flex flex-col items-center justify-center p-4 text-center z-10 select-none">
                        <Monitor className="w-7 h-7 text-zinc-600 mb-1.5 group-hover:scale-110 transition-transform duration-300" />
                        <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                          Sensors Standby
                        </p>
                        <p className="text-[8px] text-zinc-600 font-mono mt-0.5">
                          Tap 'Connect Workspace stream' to engage Zoya Lens
                        </p>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover opacity-85 scale-102 filter hue-rotate-15 saturate-110"
                        muted
                        playsInline
                        autoPlay
                      />
                    )}

                    {/* Offscreen hidden Canvas for snapshot capture */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Primary Trigger Buttons & Controls */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {!screenStream ? (
                      <button
                        type="button"
                        onClick={startScreenShare}
                        className="w-full py-2.5 px-4 rounded-xl font-mono text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/30 font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5 active:scale-98"
                      >
                        <Monitor className="w-4 h-4 text-white animate-pulse" />
                        <span>Connect Workspace Stream</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="p-2.5 bg-purple-500/[0.04] border border-purple-500/20 rounded-xl">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isVisionTracking}
                              onChange={(e) => setIsVisionTracking(e.target.checked)}
                              className="accent-purple-500 rounded cursor-pointer"
                            />
                            <div className="text-left">
                              <span className="text-[10px] font-mono font-bold text-slate-200 block uppercase">
                                Stream Frames to Live
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono block leading-none mt-0.5">
                                Feeds screen context to Zoya Live Voice every 5s
                              </span>
                            </div>
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={stopScreenShare}
                          className="w-full py-1.5 px-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono text-[9px] uppercase font-bold tracking-wider transition-all duration-200"
                        >
                          Disconnect Stream
                        </button>
                      </div>
                    )}
                  </div>

                  {/* High Quality Analysis Trigger Form */}
                  {screenStream && (
                    <div className="flex flex-col gap-2 border-t border-white/5 pt-3.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                          Run Screen analysis
                        </span>
                      </div>

                      <div className="flex gap-1.5 focus-within:ring-2 focus-within:ring-purple-500/30 rounded-xl transition-all">
                        <input
                          type="text"
                          placeholder="What do you think of this chart setup?"
                          value={visionPrompt}
                          onChange={(e) => setVisionPrompt(e.target.value)}
                          className="bg-black/80 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-600 flex-1 focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                          type="button"
                          disabled={isAnalyzingFrame}
                          onClick={handleAnalyzeSnapshot}
                          className="py-2 px-3 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/35 rounded-xl font-mono text-[10px] font-bold uppercase shrink-0 tracking-wider transition-all cursor-pointer flex items-center justify-center min-w-[70px] active:scale-95 text-center"
                        >
                          {isAnalyzingFrame ? "Scanning" : "Analyze"}
                        </button>
                      </div>
                      <p className="text-[8px] text-zinc-505 font-mono italic leading-normal">
                        Triggers deep price patterns or visual OCR with Gemini 3.5.
                      </p>
                    </div>
                  )}

                  {/* Previous Historical Analyses / Capture Logs */}
                  <div className="flex-1 flex flex-col gap-2.5 border-t border-white/5 pt-3.5 max-h-[170px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold tracking-wider">
                      Lens Capture History ({visionLogs.length})
                    </span>

                    {visionLogs.length === 0 ? (
                      <div className="p-4 border border-dashed border-white/5 rounded-xl text-center text-slate-500 text-xs font-mono">
                        No previous screen analyses.
                      </div>
                    ) : (
                      visionLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-2.5 hover:border-purple-500/20 transition-all duration-300">
                          <div className="flex items-center justify-between border-b border-white/[0.03] pb-1.5">
                            <span className="text-[9px] font-mono text-purple-400 font-bold uppercase flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Technical Scan
                            </span>
                            <span className="text-[8px] text-zinc-500 font-mono">
                              {log.time}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2.5">
                            <div className="col-span-1 rounded-lg overflow-hidden border border-white/10 aspect-video shrink-0 bg-black">
                              <img src={log.image} referrerPolicy="no-referrer" alt="Screen Capture" className="w-full h-full object-cover" />
                            </div>
                            <div className="col-span-3 text-[10px] text-zinc-500 font-mono line-clamp-2 leading-relaxed">
                              <strong>Prompt:</strong> "{log.prompt}"
                            </div>
                          </div>

                          <div className="p-2.5 bg-black/60 rounded-lg text-[10px] text-slate-300 leading-relaxed font-sans max-h-[120px] overflow-y-auto border border-white/[0.02] scrollbar-thin">
                            <span className="font-mono text-[9px] text-purple-400 font-bold block uppercase mb-1">
                              Report:
                            </span>
                            <div className="whitespace-pre-wrap leading-normal">
                              {log.analysis}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              ) : (
                <AmbientCompanionControls
                  detectedMood={detectedMood}
                  setDetectedMood={setDetectedMood}
                />
              )}

            </div>
          </div>

          {/* Quick HUD triggers for Launching embedded widgets inside Zoya's frame */}
          <div className="relative bg-slate-950/40 border border-orange-500/15 rounded-2xl p-4 backdrop-blur-lg shadow-2xl flex flex-col gap-3 cyber-glow">
            <TechBrackets />
            
            <div className="flex items-center gap-2 border-b border-orange-500/10 pb-1.5 relative z-10">
              <Tv className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <h2 className="text-xs font-mono font-bold text-slate-250 uppercase">
                Launch Workspace Frames
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <button 
                onClick={() => {
                  playCyberBeep(740, 0.05, "sine");
                  setActiveWidgetApp(activeWidgetApp === "TradingView" ? null : "TradingView");
                }}
                className={`py-2 px-3 rounded-xl border font-mono text-[10px] font-bold text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                  activeWidgetApp === "TradingView" ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]" : "bg-[#020204]/20 border-white/5 hover:border-orange-500/25 text-slate-400 hover:text-white"
                }`}
              >
                <span>TradingView</span>
                <span className="text-orange-500 text-xs text-glow">⚡</span>
              </button>
              <button 
                onClick={() => {
                  playCyberBeep(780, 0.05, "sine");
                  setActiveWidgetApp(activeWidgetApp === "Spotify" ? null : "Spotify");
                }}
                className={`py-2 px-3 rounded-xl border font-mono text-[10px] font-bold text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                  activeWidgetApp === "Spotify" ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]" : "bg-[#020204]/20 border-white/5 hover:border-orange-500/25 text-slate-400 hover:text-white"
                }`}
              >
                <span>Vibe Coffee Mix</span>
                <span className="text-amber-500 text-xs">♫</span>
              </button>
            </div>
          </div>

          {/* Predictive Behavior Engine Hud Card */}
          <div className="relative bg-slate-950/40 border border-orange-500/15 rounded-2xl p-4 backdrop-blur-lg shadow-2xl flex flex-col gap-3 cyber-glow">
            <TechBrackets />
            
            <div className="flex items-center justify-between border-b border-orange-500/10 pb-1.5 relative z-10">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <h2 className="text-xs font-mono font-bold text-slate-250 uppercase">
                  Predictive Behavior Engine
                </h2>
              </div>
              <button 
                onClick={() => {
                  playCyberBeep(880, 0.08, "sine");
                  handlePredictiveScan();
                }}
                disabled={isScanning}
                className="text-[9px] font-mono px-2.5 py-1 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 active:scale-95 transition-all cursor-pointer font-bold"
              >
                {isScanning ? "SCANNING..." : "SYNC SCAN"}
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed relative z-10">
              Analyzes timing behaviors, repeating cycles, and trade-room conversations. Tap suggestion to prompt Zoya.
            </p>

            <div className="flex flex-col gap-2 relative z-10">
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    playCyberBeep(650, 0.06, "sine");
                    handleTriggerPrediction(p);
                  }}
                  className="w-full text-left p-2.5 bg-[#020204]/25 hover:bg-slate-900/40 border border-white/5 hover:border-orange-500/30 rounded-xl transition-all duration-300 flex flex-col gap-0.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8.5px] font-mono uppercase text-zinc-500 tracking-wider">
                      {p.type}
                    </span>
                    <span className="text-[8.5px] font-mono text-emerald-400 uppercase font-bold">
                      {p.confidence}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-white uppercase italic tracking-tight font-display">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-orange-300 font-mono line-clamp-2 italic font-light leading-snug">
                    "{p.phrase}"
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8px] font-mono text-zinc-500">
                    <span>{p.status}</span>
                    <span className="px-1 py-0.2 bg-zinc-900 border border-white/[0.03] rounded">
                      {p.badge}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </section>

      </main>

      {/* Footer bar with details */}
      <footer className="w-full text-center border-t border-orange-500/10 py-5 bg-[#020204]/60 relative z-10 font-mono text-[9px] uppercase tracking-wider text-slate-500">
        BloomOS Cognition Core Node • Cosmic Grid Layer • Gemini 3.1 Live Pipeline Optimized.
      </footer>

      {/* Futuristic Fullscreen Trading Intelligence Center Overlay */}
      <AnimatePresence>
        {isTradingCenterOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-[#050608] overflow-hidden flex flex-col"
          >
            <TradingIntelligenceCenter onClose={() => setIsTradingCenterOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
