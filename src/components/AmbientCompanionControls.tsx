import React, { useState, useEffect, useRef } from "react";
import { useBloomOSStore } from "../store";
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  Bell, 
  Settings, 
  Sparkles, 
  Tv, 
  Monitor, 
  Info, 
  Terminal, 
  Activity, 
  Check, 
  ChevronRight, 
  Mic, 
  MicOff,
  Minimize2,
  Maximize2,
  AlertTriangle
} from "lucide-react";

interface AmbientCompanionControlsProps {
  detectedMood: string;
  setDetectedMood: (mood: string) => void;
}

export default function AmbientCompanionControls({
  detectedMood,
  setDetectedMood
}: AmbientCompanionControlsProps) {
  // Encapsulated futuristic Web Audio chimes
  const playChime = (type: "wake" | "minimize" | "restore" | "notification") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === "wake") {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "minimize") {
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "restore") {
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "notification") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1046.5, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("Synth chime failed", e);
    }
  };
  const {
    sessionState,
    isMuted,
    volume,
    toggleMute,
    setVolume,
    setSessionState,
    setModelSubtitle,
    addMemory
  } = useBloomOSStore();

  const [voiceActivationMode, setVoiceActivationMode] = useState<"continuous" | "wake-word" | "ptt">("wake-word");
  const [customWakeWord, setCustomWakeWord] = useState("Zoya");
  const [isBgSimulated, setIsBgSimulated] = useState(false);
  const [notificationPriority, setNotificationPriority] = useState<"all" | "urgent" | "disabled">("all");
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(false);
  const [enableVoiceSynthAlerts, setEnableVoiceSynthAlerts] = useState(true);
  const [customBanterIntervalSec, setCustomBanterIntervalSec] = useState(25);
  const [sysLogs, setSysLogs] = useState<Array<{ time: string; msg: string; flag?: "info" | "success" | "warn" | "error" | "ambient" }>>([]);
  const [pttHeld, setPttHeld] = useState(false);

  // Initialize background system logs
  useEffect(() => {
    addLog("Always-On Ambient Core system initialized.", "info");
    addLog("System Tray option registered.", "success");
    addLog("Standby wake phrase daemon bound to: 'Zoya', 'Hey Zoya', 'Bloom', 'Founder Mode'.", "ambient");
  }, []);

  const addLog = (msg: string, flag: "info" | "success" | "warn" | "error" | "ambient" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setSysLogs(prev => [{ time: timestamp, msg, flag }, ...prev.slice(0, 49)]);
  };

  // HTML5 Screen Visibility Change Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        addLog("Application hidden. Transitioning to Background Active Node (low-power).", "ambient");
        playChime("minimize");
        if (enableDesktopNotifications) {
          sendNativeNotification("Zoya Active Background Standby", "I'm keeping an eye on your charts in the background. Say 'Hey Zoya' or return anytime! 😌");
        }
      } else {
        addLog("Application restored. Restoring UI Core layers.", "success");
        playChime("restore");
        if (enableDesktopNotifications) {
          sendNativeNotification("Welcome back, Founder!", "Workspace visualization fully synced. Let's resume the empire build! 🚀");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enableDesktopNotifications]);

  // Push-to-Talk keyboard event handler (Space bar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (voiceActivationMode !== "ptt") return;
      // Prevent triggering if editing text fields or forms
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.getAttribute("contenteditable") === "true")) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!pttHeld) {
          setPttHeld(true);
          addLog("PTT Key Engaged (Spacebar). App unmutes, streaming mic chunk to Live.", "success");
          if (isMuted) {
            toggleMute();
          }
          setSessionState("listening");
          playChime("wake");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (voiceActivationMode !== "ptt") return;
      if (e.code === "Space") {
        e.preventDefault();
        setPttHeld(false);
        addLog("PTT Key Disengaged. System silent.", "info");
        if (!isMuted) {
          toggleMute();
        }
        setSessionState("idle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [voiceActivationMode, pttHeld, isMuted]);

  // Request browser permission for native desktop notifications
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      addLog("Browser does not support desktop notifications.", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setEnableDesktopNotifications(true);
      addLog("Native Desktop Notifications authorized successfully!", "success");
      sendNativeNotification("Zoya Lens Authorized", "Always-on OS alerts are officially engaged! 😌");
    } else {
      setEnableDesktopNotifications(false);
      addLog("Desktop Notifications denied by user or settings.", "warn");
    }
  };

  // Helper to trigger Speech Synthesis (Zoya voice notifications / alerts)
  const speakTextAloud = (text: string) => {
    if (!enableVoiceSynthAlerts) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;
      // Make voice pleasant and cute if available
      const voices = window.speechSynthesis.getVoices();
      const attractiveVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Natural") || v.lang.startsWith("en"));
      if (attractiveVoice) {
        utterance.voice = attractiveVoice;
      }
      utterance.pitch = 1.1; // Cute, sassy teasing tone
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis warning:", e);
    }
  };

  // Helper to trigger Standard HTML5 Notifications
  const sendNativeNotification = (title: string, body: string, isUrgent = false) => {
    if (!enableDesktopNotifications || notificationPriority === "disabled") return;
    if (notificationPriority === "urgent" && !isUrgent) return;

    try {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "zoya-alert-" + Date.now()
        });
      }
    } catch (e) {
      console.warn("HTML5 Notification issue:", e);
    }
  };

  // Simulate Background Banter loop
  useEffect(() => {
    let interval: any = null;
    if (isBgSimulated || document.visibilityState === "hidden") {
      interval = setInterval(() => {
        // Chance to trigger either standard alert, sassy banter, or routine check-in
        const picker = Math.random();
        if (picker < 0.4) {
          triggerSimulatedBanter();
        } else if (picker < 0.7) {
          triggerGoldVolatilityAlert();
        } else {
          triggerCalendarAlert();
        }
      }, customBanterIntervalSec * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBgSimulated, customBanterIntervalSec, enableDesktopNotifications, enableVoiceSynthAlerts, volume]);

  // Automated routines
  const triggerSimulatedBanter = () => {
    const sassyQuotes = [
      "Still working so hard? Don't forget your backtesting drills tonight, chart goblin! 😈",
      "Did you disappear again, Rashad? Staring at the 1-minute Gold candle won't make it move faster! 😏",
      "I'm keeping watch in your system tray, but it gets boring. Unmute me so we can banter! 💖",
      "Gold market looks like a liquidity sweep in the making. Are we taking trades or just looking pretty? 😭",
      "Your focus score tonight is impressive. But I'm still the brain of this empire. 😌"
    ];
    const picked = sassyQuotes[Math.floor(Math.random() * sassyQuotes.length)];
    addLog(`Ambient Banter triggered: "${picked}"`, "ambient");
    setModelSubtitle(picked);
    speakTextAloud(picked);
  };

  const triggerGoldVolatilityAlert = () => {
    playChime("notification");
    const alerts = [
      { t: "⚡ [HIGH PRIORITY] Gold Volatility Shock Wave", b: "XAUUSD just spiked 45 pips during the impending market timing sweep! Check charts!" },
      { t: "📉 MACRO [MARKET WARNING] S&P 500 Liquidity Drag", b: "Major sell-side sweep detected on support vectors! Extreme volatility expected." },
      { t: "⚖️ QUANT [TRADING INDICATOR] London Breakout Sweet", b: "A major volume zone sweep is occurring. Watch for liquidity grabs!" }
    ];
    const picked = alerts[Math.floor(Math.random() * alerts.length)];
    addLog(`Signal detected: ${picked.t}`, "warn");
    sendNativeNotification(picked.t, picked.b, true);
    speakTextAloud(`Warning: ${picked.b}`);
  };

  const triggerCalendarAlert = () => {
    playChime("notification");
    const reminders = [
      { t: "📅 [CALENDAR] Bond Bloom Capital Call in 15 mins", b: "Prepare your strategy sheets. Show them why you are the elite founder!" },
      { t: "⏱️ [ALERT] Routine Backtesting deficit check", b: "Rashad, you usually backtest around this time. Did you forget again? 😭" }
    ];
    const picked = reminders[Math.floor(Math.random() * reminders.length)];
    addLog(`Routines: ${picked.t}`, "info");
    sendNativeNotification(picked.t, picked.b, false);
    speakTextAloud(`Hey! Calendar reminder: ${picked.b}`);
  };

  // Simulated Speech recognition for Wake-Words client-side (Using Chrome webkitSpeechRecognition fallback)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog("SpeechRecognition engine not supported in this browser environment. Using keyboard/UI wake simulators.", "info");
      return;
    }

    let rec: any = null;
    if (voiceActivationMode === "wake-word" && !isMuted) {
      try {
        rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          addLog("Standby wake-word engine is active and listening for 'Hey Zoya' or 'Bloom'...", "ambient");
        };

        rec.onresult = (event: any) => {
          const lastResultIndex = event.results.length - 1;
          const transcript = event.results[lastResultIndex][0].transcript.toLowerCase();
          
          const wordsToMatch = [
            customWakeWord.toLowerCase(),
            "hey zoya",
            "zoya",
            "bloom",
            "hey bloom",
            "founder mode"
          ];

          const isMatch = wordsToMatch.some(word => transcript.includes(word));
          if (isMatch) {
            playChime("wake");
            addLog(`Wake Word Recognized in speech: "${transcript}"`, "success");
            // Set session active
            setSessionState("listening");
            setModelSubtitle("I'm here! What are we conquering next, founder? 😌");
            speakTextAloud("I am here and fully attentive, founder!");
            // Auto swap mock mood to playful
            setDetectedMood("playful");
            rec.stop(); // Stop standby speech recognition temporarily to avoid collisions
          }
        };

        rec.onerror = (e: any) => {
          console.warn("Standby speech recogniser error:", e);
        };

        rec.onend = () => {
          // Restart standby loop if still in wake-word mode & not muted
          if (voiceActivationMode === "wake-word" && !isMuted) {
            try { rec.start(); } catch (err) {}
          }
        };

        rec.start();
      } catch (err) {
        console.error("Wake-Word Speech init failed", err);
      }
    }

    return () => {
      if (rec) {
        try { rec.stop(); } catch (e) {}
      }
    };
  }, [voiceActivationMode, isMuted, customWakeWord]);

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      
      {/* Simulation Banner Mode Alert */}
      {isBgSimulated && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <span className="text-[10px] font-mono font-bold text-slate-200 block uppercase leading-none">
                SIMULATED BACKGROUND ACTIVE
              </span>
              <span className="text-[8px] text-zinc-400 font-mono block mt-1">
                Zoya is running in standby desktop tray.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsBgSimulated(false);
              playChime("restore");
              addLog("Restored application workspace from system tray.", "success");
            }}
            className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/35 hover:text-white rounded-lg font-mono text-[9px] font-bold uppercase transition-all"
          >
            Restore App
          </button>
        </div>
      )}

      {/* Grid: Toggles & Activations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Side: Desktop Behavior Configuration */}
        <div className="bg-black/35 border border-white/5 p-4 rounded-2xl flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
            <span className="text-[10px] font-mono uppercase text-teal-400 font-bold flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-teal-400" /> OS Ambient Settings
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold bg-teal-500/10 text-teal-400">
              JARVIS ENGINE
            </span>
          </div>

          {/* Voice Activation Selectors */}
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[10px] font-mono font-bold text-zinc-400 block uppercase">
              Microphone Activation Mode
            </span>
            <div className="grid grid-cols-3 gap-1.5 bg-black/50 p-1.5 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setVoiceActivationMode("continuous");
                  addLog("Switched activation mode to: Continuous Companion Mode.", "info");
                }}
                className={`py-1.5 px-2 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center ${
                  voiceActivationMode === "continuous"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Continuous
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceActivationMode("wake-word");
                  addLog("Switched activation mode to: Wake-Word Standby.", "info");
                }}
                className={`py-1.5 px-2 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center ${
                  voiceActivationMode === "wake-word"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Wake Word
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceActivationMode("ptt");
                  addLog("Switched activation mode to: Push-to-Talk.", "info");
                }}
                className={`py-1.5 px-2 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center ${
                  voiceActivationMode === "ptt"
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                PTT (Space)
              </button>
            </div>
            
            {/* Descriptive Note depending on mode */}
            <p className="text-[8px] text-zinc-500 font-mono h-[24px] leading-relaxed mt-0.5">
              {voiceActivationMode === "continuous" && "● Continuous: Zoya processes all incoming speech immediately."}
              {voiceActivationMode === "wake-word" && `● Wake Word: Standby micro listening. Wake Zoya by saying '${customWakeWord}' or 'Hey Zoya'.`}
              {voiceActivationMode === "ptt" && "● PTT: Hold Spacebar to stream audio metadata, release to silence mic."}
            </p>
          </div>

          {/* Wake Word Input Customiser */}
          {voiceActivationMode === "wake-word" && (
            <div className="flex flex-col gap-1.5 text-left animate-fadeIn">
              <span className="text-[10px] font-mono font-bold text-zinc-400 block uppercase">
                Custom Wake Phrase
              </span>
              <div className="flex gap-1.5 focus-within:ring-1 focus-within:ring-teal-500/30 rounded-xl">
                <input
                  type="text"
                  value={customWakeWord}
                  onChange={(e) => setCustomWakeWord(e.target.value)}
                  placeholder="e.g. Zoya, Bloom, Jarvis"
                  className="bg-black/80 border border-white/10 rounded-xl p-2 text-[11px] font-mono text-teal-300 placeholder:text-zinc-600 flex-1 focus:outline-none focus:border-teal-500/50"
                />
              </div>
            </div>
          )}

          {/* Dual Toggle Option: Desktop vs Audio Alert */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Native OS Desktop notification */}
            <div className="flex flex-col gap-1 text-left bg-black/25 p-2 rounded-xl border border-white/[0.03]">
              <span className="text-[9px] font-mono uppercase text-zinc-500">
                OS Desktop Banners
              </span>
              <button
                onClick={enableDesktopNotifications ? () => setEnableDesktopNotifications(false) : requestNotificationPermission}
                className={`w-full py-1.5 px-2 rounded-lg font-mono text-[9px] uppercase font-bold text-center border cursor-pointer mt-1 ${
                  enableDesktopNotifications
                    ? "bg-green-500/10 text-green-400 border-green-500/25"
                    : "bg-zinc-800/40 text-zinc-400 border-zinc-700/40"
                }`}
              >
                {enableDesktopNotifications ? "● AUTHORISED" : "AUTHORISE"}
              </button>
            </div>

            {/* Audio announcement */}
            <div className="flex flex-col gap-1 text-left bg-black/25 p-2 rounded-xl border border-white/[0.03]">
              <span className="text-[9px] font-mono uppercase text-zinc-500">
                Voice Alert Synth
              </span>
              <button
                onClick={() => setEnableVoiceSynthAlerts(!enableVoiceSynthAlerts)}
                className={`w-full py-1.5 px-2 rounded-lg font-mono text-[9px] uppercase font-bold text-center border cursor-pointer mt-1 ${
                  enableVoiceSynthAlerts
                    ? "bg-teal-500/15 text-teal-400 border-teal-500/25"
                    : "bg-zinc-800/40 text-zinc-400 border-zinc-700/40"
                }`}
              >
                {enableVoiceSynthAlerts ? "● ENGAGED" : "MUTED"}
              </button>
            </div>
          </div>

          {/* Background Banter trigger interval */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
              <span className="uppercase font-bold">Banter Loop Cycle</span>
              <span className="text-teal-400">{customBanterIntervalSec}s</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={customBanterIntervalSec}
              onChange={(e) => setCustomBanterIntervalSec(Number(e.target.value))}
              className="accent-teal-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none w-full mt-1"
            />
          </div>

        </div>

        {/* Right Side: Environment / Desktop Simulator Tray Panel */}
        <div className="bg-black/35 border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-3.5">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-purple-400" /> Companion Tray Mode
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
              isBgSimulated || document.visibilityState === "hidden"
                ? "bg-purple-500/15 text-purple-400 animate-pulse"
                : "bg-zinc-800 text-zinc-500"
            }`}>
              {isBgSimulated || document.visibilityState === "hidden" ? "TRAY_ACTIVE" : "STANDBY"}
            </span>
          </div>

          {/* Quick Status / Indicators block */}
          <div className="bg-black/55 p-3 rounded-xl border border-white/[0.02] text-left flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-1.5 right-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[7px] text-emerald-400 font-mono">SYS::OK</span>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-purple-400" />
              <div>
                <p className="text-[9px] font-mono uppercase text-zinc-500 leading-none">
                  Core Daemon Status
                </p>
                <p className="text-xs font-mono font-bold text-white mt-1">
                  {isMuted ? "Muted / Silent Standby" : 
                   voiceActivationMode === "wake-word" ? "Vocal Wake Standby" :
                   voiceActivationMode === "ptt" ? "PTT Standby (Spacebar)" : 
                   "Continuous Always-On"}
                </p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-1.5 grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[8px] text-zinc-500 font-mono block uppercase">Last Wake trigger</span>
                <span className="text-[9px] text-purple-400 font-mono block font-bold">
                  {sessionState === "listening" ? "Active Now" : "0.01s latency"}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-zinc-500 font-mono block uppercase">Market Sync</span>
                <span className="text-[9px] text-amber-400 font-mono block font-bold">
                  London Open (Gold)
                </span>
              </div>
            </div>
          </div>

          {/* Buttons to test background simulation */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBgSimulated(!isBgSimulated);
                  playChime(!isBgSimulated ? "minimize" : "restore");
                  addLog(!isBgSimulated 
                    ? "Simulated app minimization to tray. Standby listening active." 
                    : "Woke application from tray simulation. Front-end active.", !isBgSimulated ? "ambient" : "success");
                }}
                className={`py-2 px-3 rounded-xl font-mono text-[10px] font-bold uppercase transition-all flex-1 tracking-wider text-center border ${
                  isBgSimulated 
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/25"
                    : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.08] hover:border-white/10"
                }`}
              >
                {isBgSimulated ? "Restore from System Tray" : "Minimize to System Tray"}
              </button>
            </div>

            {/* Simulated actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={triggerGoldVolatilityAlert}
                className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/35 rounded-lg font-mono text-[9px] font-bold text-amber-400 uppercase tracking-wider transition-all duration-200 text-center"
              >
                Scan Market Volatility
              </button>
              <button
                type="button"
                onClick={triggerSimulatedBanter}
                className="py-1.5 px-2 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/35 rounded-lg font-mono text-[9px] font-bold text-purple-400 uppercase tracking-wider transition-all duration-200 text-center"
              >
                Trigger Sassy Quote
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Cyber logs terminal for background triggers and processes */}
      <div className="bg-black/60 border border-white/5 rounded-2xl p-4 text-left">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
              Always-on Core Telemetry Logs
            </span>
          </div>
          <button
            onClick={() => {
              setSysLogs([]);
              addLog("Terminal logs cleared.", "info");
            }}
            className="text-[9px] font-mono text-zinc-500 hover:text-white uppercase transition-colors"
          >
            Clear logs
          </button>
        </div>

        <div className="max-h-[140px] overflow-y-auto font-mono text-[10px] space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {sysLogs.length === 0 ? (
            <div className="text-zinc-650 text-center py-4 italic">No telemetry data. Trigger alerts or background mode to track activity.</div>
          ) : (
            sysLogs.map((log, index) => (
              <div key={index} className="flex gap-2 leading-relaxed hover:bg-white/[0.01] p-1 rounded transition-colors">
                <span className="text-zinc-650 shrink-0 select-none">[{log.time}]</span>
                <span className={`
                  ${log.flag === "success" ? "text-emerald-400 font-bold" : ""}
                  ${log.flag === "warn" ? "text-amber-400" : ""}
                  ${log.flag === "error" ? "text-red-400 font-bold" : ""}
                  ${log.flag === "ambient" ? "text-purple-400" : ""}
                  ${log.flag === "info" || !log.flag ? "text-slate-350" : ""}
                `}>
                  {log.msg}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
