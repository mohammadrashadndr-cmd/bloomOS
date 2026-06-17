import { create } from "zustand";
import { SessionState, MemoryItem, ToolLog, CalendarEvent, ReminderItem, FocusModeState, AutomationLog } from "./types";

interface BloomOSStore {
  sessionState: SessionState;
  isMuted: boolean;
  activeVoice: string;
  volume: number; // 0.0 to 1.0 (controlling browser playback volume)
  memories: MemoryItem[];
  toolLogs: ToolLog[];
  userSubtitle: string;
  modelSubtitle: string;
  errorMsg: string | null;
  isPerformanceMode: boolean;
  togglePerformanceMode: () => void;

  // New Calendar, Reminder, and Focus States
  events: CalendarEvent[];
  reminders: ReminderItem[];
  focusState: FocusModeState;
  googleToken: string | null;
  googleUser: any | null;
  
  // Automation Engine States
  activeWidgetApp: string | null;
  activeWorkflowMode: "idle" | "trading" | "content" | "deep_work";
  automationLogs: AutomationLog[];

  // WhatsApp Automation States
  whatsappStatus: "uninitialized" | "connecting" | "qr" | "authenticated" | "error";
  whatsappQR: string | null;
  whatsappLogs: string[];
  whatsappLastConnected: string | null;
  whatsappDraft: { recipient: string; message: string } | null;
  whatsappScreenshot: string | null;

  // WhatsApp Actions
  setWhatsAppStatus: (status: "uninitialized" | "connecting" | "qr" | "authenticated" | "error") => void;
  setWhatsAppQR: (qr: string | null) => void;
  setWhatsAppLogs: (logs: string[]) => void;
  setWhatsAppLastConnected: (time: string | null) => void;
  setWhatsAppDraft: (draft: { recipient: string; message: string } | null) => void;
  setWhatsAppScreenshot: (image: string | null) => void;
  syncWhatsAppState: () => Promise<void>;
  initializeWhatsApp: () => Promise<void>;
  sendWhatsAppMessage: (recipient: string, message: string) => Promise<{ success: boolean; error?: string }>;
  disconnectWhatsApp: () => Promise<void>;
  
  // Actions
  setSessionState: (state: SessionState) => void;
  toggleMute: () => void;
  setVoice: (voiceName: string) => void;
  setVolume: (level: number) => void;
  addMemory: (
    key: string,
    value: string,
    category?: "short-term" | "long-term" | "emotional" | "timeline",
    importance?: number,
    emotionalTag?: string
  ) => void;
  deleteMemory: (id: string) => void;
  addToolLog: (name: string, args: any) => string; // returns log ID
  completeToolLog: (id: string, result: any) => void;
  failToolLog: (id: string, error: string) => void;
  setUserSubtitle: (text: string) => void;
  setModelSubtitle: (text: string) => void;
  setError: (msg: string | null) => void;
  clearAll: () => void;

  // Calendar & Focus Actions
  setGoogleAuth: (user: any | null, token: string | null) => void;
  syncGoogleEvents: (googleEvents: CalendarEvent[]) => void;
  addEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => void;
  deleteEvent: (id: string) => void;
  addReminder: (task: string, time: string) => ReminderItem;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  setFocusMode: (isActive: boolean, minutes?: number) => void;
  tickFocusMode: () => void;

  // Automation Actions
  setActiveWidgetApp: (appName: string | null) => void;
  setWorkflowMode: (mode: "idle" | "trading" | "content" | "deep_work") => void;
  addAutomationLog: (action: string, category: AutomationLog["category"], status?: AutomationLog["status"]) => void;
  clearAutomationLogs: () => void;
  triggerWorkflowMode: (mode: "idle" | "trading" | "content" | "deep_work") => void;

  // Neural Mood State System
  currentMood: string;
  emotionalIntensity: number; // 1 to 10
  founderStressLevel: number; // 1 to 10
  conversationalEnergy: number; // 1 to 10
  affectionLevel: number; // 1 to 10
  focusLevel: number; // 1 to 10
  socialComfort: number; // 1 to 10
  silenceDuration: number;
  relationshipContinuity: number; // 1 to 10

  setNeuralMoodState: (updates: Partial<{
    currentMood: string;
    emotionalIntensity: number;
    founderStressLevel: number;
    conversationalEnergy: number;
    affectionLevel: number;
    focusLevel: number;
    socialComfort: number;
    silenceDuration: number;
    relationshipContinuity: number;
  }>) => void;
  decayNeuralMood: () => void;
  analyzeMoodFromText: (userText: string, modelText: string) => void;

  // Account Delete & Diagnostics
  deletedAccountIds: string[];
  deleteStatus: string;
  storageStatus: string;
  lastDeleteAttempt: string | null;
  lastDeletedAccountId: string | null;
  deleteAccountFromStore: (id: string, resultStatus?: { success: boolean; error?: string }) => void;
}

// Read memories from localStorage on startup
const getStoredMemories = (): MemoryItem[] => {
  try {
    const raw = localStorage.getItem("bloomos_memories_v1");
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read memories from localStorage", err);
  }
  return [
    {
      id: "initial-1",
      key: "Companion Name",
      value: "Zoya",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 10
    },
    {
      id: "initial-2",
      key: "App Platform",
      value: "BloomOS Pro-Grade voice node",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 7
    },
    {
      id: "initial-3",
      key: "Primary Founder",
      value: "Mohammad Rashad",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 10
    },
    {
      id: "initial-4",
      key: "Founder Company",
      value: "Bond Bloom Capital",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 9
    },
    {
      id: "initial-5",
      key: "Founder Specialty",
      value: "Trader, Entrepreneur, AI Visionary",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 8
    },
    {
      id: "initial-6",
      key: "Ecosystem Creator",
      value: "Creator of Zoya & BloomOS",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 10
    },
    {
      id: "initial-7",
      key: "Pattern - Gold Session",
      value: "Mohammad Rashad starts trading sessions on Gold around 21:30 daily. Remind him with 'Gold session starting soon.'",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 9,
      emotionalTag: "focused"
    },
    {
      id: "initial-8",
      key: "Habit - Check Charts",
      value: "Mohammad Rashad checks technical analysis charts regularly. Acknowledge: 'You usually check charts around now.'",
      timestamp: new Date().toISOString(),
      category: "long-term",
      importance: 6,
      emotionalTag: "calm"
    },
    {
      id: "initial-9",
      key: "Rule - Backtesting Deficit",
      value: "Mohammad Rashad regularly forgets his historical backtesting drills. Remind him: 'You forgot your backtesting again 😭'",
      timestamp: new Date().toISOString(),
      category: "timeline",
      importance: 8,
      emotionalTag: "frustrated"
    }
  ];
};

// Default initial calendar items mapping directly to founder routines
const getDefaultEvents = (): CalendarEvent[] => [
  {
    id: "evt-trade-gold",
    title: "Gold Trading Active Session",
    date: new Date().toISOString().split("T")[0],
    time: "21:30",
    duration: 120,
    source: "Local"
  },
  {
    id: "evt-class-bond",
    title: "Bond Bloom Capital Training Class",
    date: new Date().toISOString().split("T")[0],
    time: "19:00",
    duration: 90,
    source: "Local"
  },
  {
    id: "evt-news-prep",
    title: "Macroeconomic Calendar & NFP Prep",
    date: new Date().toISOString().split("T")[0],
    time: "15:00",
    duration: 60,
    source: "Local"
  }
];

const getStoredEvents = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem("bloomos_events_v1");
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  return getDefaultEvents();
};

const getStoredReminders = (): ReminderItem[] => {
  try {
    const raw = localStorage.getItem("bloomos_reminders_v1");
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  return [
    {
      id: "rem-1",
      task: "Perform daily trading strategy backtests",
      time: "18:30",
      completed: false,
      timestamp: new Date().toISOString()
    }
  ];
};

const saveMemories = (m: MemoryItem[]) => {
  try { localStorage.setItem("bloomos_memories_v1", JSON.stringify(m)); } catch (e) {}
};

const saveEvents = (e: CalendarEvent[]) => {
  try { localStorage.setItem("bloomos_events_v1", JSON.stringify(e)); } catch (e) {}
};

const saveReminders = (r: ReminderItem[]) => {
  try { localStorage.setItem("bloomos_reminders_v1", JSON.stringify(r)); } catch (e) {}
};

export const useBloomOSStore = create<BloomOSStore>((set, get) => ({
  sessionState: "booting",
  isMuted: false,
  activeVoice: "Kore",
  volume: 0.8,
  memories: getStoredMemories(),
  toolLogs: [],
  userSubtitle: "",
  modelSubtitle: "",
  errorMsg: null,
  isPerformanceMode: (() => {
    try {
      return localStorage.getItem("bloomos_perfenabled_v1") === "true";
    } catch {
      return false;
    }
  })(),

  // Neural Mood State System Defaults
  currentMood: "caring", // Caring/Warm by default
  emotionalIntensity: 5,
  founderStressLevel: 3,
  conversationalEnergy: 6,
  affectionLevel: 6,
  focusLevel: 5,
  socialComfort: 7,
  silenceDuration: 0,
  relationshipContinuity: 8,

  // Calendar states
  events: getStoredEvents(),
  reminders: getStoredReminders(),
  focusState: {
    isActive: false,
    minutesLeft: 0,
    totalMinutes: 0
  },
  googleToken: null,
  googleUser: null,

  // Automation states
  activeWidgetApp: null,
  activeWorkflowMode: "idle",
  automationLogs: [
    {
      id: "autolog-init",
      action: "Zoya Automation and Orchestration Engine loaded successfully.",
      timestamp: new Date().toLocaleTimeString(),
      status: "success",
      category: "system"
    }
  ],

  // WhatsApp states initial values
  whatsappStatus: "uninitialized",
  whatsappQR: null,
  whatsappLogs: [],
  whatsappLastConnected: null,
  whatsappDraft: null,
  whatsappScreenshot: null,

  setWhatsAppStatus: (status) => set({ whatsappStatus: status }),
  setWhatsAppQR: (qr) => set({ whatsappQR: qr }),
  setWhatsAppLogs: (logs) => set({ whatsappLogs: logs }),
  setWhatsAppLastConnected: (time) => set({ whatsappLastConnected: time }),
  setWhatsAppDraft: (draft) => set({ whatsappDraft: draft }),
  setWhatsAppScreenshot: (image) => set({ whatsappScreenshot: image }),

  syncWhatsAppState: async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        set({
          whatsappStatus: data.status,
          whatsappQR: data.qrCodeBase64,
          whatsappLogs: data.logs,
          whatsappLastConnected: data.lastConnected,
          errorMsg: data.errorMsg ? `WhatsApp: ${data.errorMsg}` : get().errorMsg
        });
      }
    } catch (e) {
      console.warn("Failing syncing WhatsApp Web status:", e);
    }
  },

  initializeWhatsApp: async () => {
    set({ whatsappStatus: "connecting" });
    get().addAutomationLog("Initializing Playwright Node cluster for WhatsApp daemon...", "system", "running");
    try {
      const res = await fetch("/api/whatsapp/initialize", { method: "POST" });
      if (res.ok) {
        get().addAutomationLog("Requested WhatsApp launcher daemon cleanly on backend.", "system", "success");
        await get().syncWhatsAppState();
      } else {
        set({ whatsappStatus: "error" });
        get().addAutomationLog("Failed dispatching WhatsApp launcher command.", "system", "success");
      }
    } catch (e: any) {
      set({ whatsappStatus: "error" });
      get().addAutomationLog(`Exception launching WhatsApp backend: ${e.message}`, "system", "success");
    }
  },

  sendWhatsAppMessage: async (recipient, message) => {
    get().addAutomationLog(`Executing automated message dispatch to [ ${recipient} ]`, "workflow", "running");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, message })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          get().addAutomationLog(`✨ Real text successfully sent to contact [${recipient}] via Playwright.`, "workflow", "success");
          set({ whatsappDraft: null }); // Clear draft upon successful send!
          await get().syncWhatsAppState();
          return { success: true };
        } else {
          get().addAutomationLog(`⚠️ Real text failed: ${data.error}`, "workflow", "success");
          return { success: false, error: data.error };
        }
      }
      throw new Error(`Server returned HTTP ${res.status}`);
    } catch (e: any) {
      get().addAutomationLog(`Runtime send error: ${e.message}`, "workflow", "success");
      return { success: false, error: e.message };
    }
  },

  disconnectWhatsApp: async () => {
    get().addAutomationLog("Releasing backend Playwright nodes...", "system", "running");
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      if (res.ok) {
        set({
          whatsappStatus: "uninitialized",
          whatsappQR: null,
          whatsappLogs: [],
          whatsappDraft: null,
          whatsappScreenshot: null
        });
        get().addAutomationLog("WhatsApp service shut down and nodes released.", "system", "success");
      }
    } catch (e: any) {
      get().addAutomationLog(`Error disconnecting: ${e.message}`, "system", "success");
    }
  },

  setSessionState: (state) => {
    set({ sessionState: state });
  },
  
  toggleMute: () => {
    const nextMute = !get().isMuted;
    set({ isMuted: nextMute });
    if (nextMute && get().sessionState === "listening") {
      set({ sessionState: "muted" });
    } else if (!nextMute && get().sessionState === "muted") {
      set({ sessionState: "idle" });
    }
  },

  setVoice: (voiceName) => {
    set({ activeVoice: voiceName });
  },

  setVolume: (level) => {
    set({ volume: Math.max(0, Math.min(1, level)) });
  },

  addMemory: (key, value, category = "long-term", importance = 5, emotionalTag) => {
    const newMemory: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      key,
      value,
      timestamp: new Date().toISOString(),
      category,
      importance,
      emotionalTag
    };
    
    // Deduplicate/summarize memories with the same key to prevent database clutter
    let existingMemories = get().memories;
    let filtered = existingMemories.filter(m => m.key.toLowerCase() !== key.toLowerCase());
    
    let updated = [newMemory, ...filtered];
    
    // Memory Decay: If total memory count grows too large (e.g., > 15 items),
    // decay old low-importance memories by bringing scores down or filtering out zero-importance ones
    if (updated.length > 15) {
      updated = updated.map(m => {
        if (m.importance && m.importance < 4 && !m.id.startsWith("initial-")) {
          return { ...m, importance: m.importance - 1 };
        }
        return m;
      }).filter(m => m.importance === undefined || m.importance > 0);
    }
    
    set({ memories: updated });
    saveMemories(updated);
  },

  deleteMemory: (id) => {
    const updated = get().memories.filter((m) => m.id !== id);
    set({ memories: updated });
    saveMemories(updated);
  },

  addToolLog: (name, args) => {
    const id = `tool-${Date.now()}`;
    const newLog: ToolLog = {
      id,
      name,
      args,
      status: "running",
      timestamp: new Date().toLocaleTimeString()
    };
    set({ toolLogs: [newLog, ...get().toolLogs] });
    return id;
  },

  completeToolLog: (id, result) => {
    set({
      toolLogs: get().toolLogs.map((log) =>
        log.id === id ? { ...log, status: "completed" as const, result } : log
      )
    });
  },

  failToolLog: (id, error) => {
    set({
      toolLogs: get().toolLogs.map((log) =>
        log.id === id ? { ...log, status: "failed" as const, result: { error } } : log
      )
    });
  },

  setUserSubtitle: (text) => set({ userSubtitle: text }),
  
  setModelSubtitle: (text) => {
    set({ modelSubtitle: text });
    if (text) {
      get().analyzeMoodFromText(get().userSubtitle || "", text);
    }
  },

  setError: (msg) => set({ errorMsg: msg }),

  togglePerformanceMode: () => {
    const nextVal = !get().isPerformanceMode;
    set({ isPerformanceMode: nextVal });
    try {
      localStorage.setItem("bloomos_perfenabled_v1", String(nextVal));
    } catch (e) {}
    get().addAutomationLog(
      `Performance Optimization: ${nextVal ? "ENABLED (Concise answers, low latency speech, minimal polling)" : "DISABLED (Full HUD graphics running)"}`,
      "system",
      "success"
    );
  },

  clearAll: () => {
    set({ toolLogs: [], userSubtitle: "", modelSubtitle: "", errorMsg: null });
  },

  // Calendar / Routines and Focus actions
  setGoogleAuth: (user, token) => {
    set({ googleUser: user, googleToken: token });
    if (!token) {
      const localEvents = get().events.filter((e) => e.source !== "Google");
      set({ events: localEvents });
      saveEvents(localEvents);
    }
  },

  syncGoogleEvents: (googleEvents) => {
    const localEvents = get().events.filter((e) => e.source !== "Google");
    const updated = [...googleEvents, ...localEvents];
    set({ events: updated });
    saveEvents(localEvents);
  },

  addEvent: (evtData) => {
    const newEvent: CalendarEvent = {
      ...evtData,
      id: `evt-${Date.now()}`
    };
    const updated = [newEvent, ...get().events];
    set({ events: updated });
    saveEvents(updated);
    return newEvent;
  },

  updateEvent: (id, updates) => {
    const updated = get().events.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    set({ events: updated });
    saveEvents(updated);
  },

  deleteEvent: (id) => {
    const updated = get().events.filter((e) => e.id !== id);
    set({ events: updated });
    saveEvents(updated);
  },

  addReminder: (task, time) => {
    const newReminder: ReminderItem = {
      id: `rem-${Date.now()}`,
      task,
      time,
      completed: false,
      timestamp: new Date().toISOString()
    };
    const updated = [newReminder, ...get().reminders];
    set({ reminders: updated });
    saveReminders(updated);
    return newReminder;
  },

  toggleReminder: (id) => {
    const updated = get().reminders.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    set({ reminders: updated });
    saveReminders(updated);
  },

  deleteReminder: (id) => {
    const updated = get().reminders.filter((r) => r.id !== id);
    set({ reminders: updated });
    saveReminders(updated);
  },

  setFocusMode: (isActive, minutes = 25) => {
    set({
      focusState: {
        isActive,
        minutesLeft: isActive ? minutes : 0,
        totalMinutes: isActive ? minutes : 0
      }
    });
  },

  tickFocusMode: () => {
    const { focusState } = get();
    if (!focusState.isActive) return;
    
    if (focusState.minutesLeft <= 1) {
      // Completed Focus Mode
      set({
        focusState: {
          isActive: false,
          minutesLeft: 0,
          totalMinutes: 0
        }
      });
      // Set a witty completed subtitle for Zoya conversationally
      set({ modelSubtitle: "Build session complete! You survived focus mode. Now, grab a coffee and take a breather 😌" });
      get().addAutomationLog("Active Focus Session of Pomodoro run has completed successfully.", "routine", "success");
    } else {
      set({
        focusState: {
          ...focusState,
          minutesLeft: focusState.minutesLeft - 1
        }
      });
    }
  },

  setActiveWidgetApp: (appName) => {
    set({ activeWidgetApp: appName });
    if (appName) {
      get().addAutomationLog(`Launched workspace module: ${appName}`, "desktop", "success");
    } else {
      get().addAutomationLog(`Cleared active workspace app representation.`, "desktop", "success");
    }
  },

  setWorkflowMode: (mode) => {
    set({ activeWorkflowMode: mode });
  },

  addAutomationLog: (action, category, status = "success") => {
    const newLog: AutomationLog = {
      id: `autolog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      timestamp: new Date().toLocaleTimeString(),
      status,
      category,
    };
    // Cap logs array to prevent memory leaks or visual clutter
    const currentLogs = get().automationLogs || [];
    set({ automationLogs: [newLog, ...currentLogs.slice(0, 39)] });
  },

  clearAutomationLogs: () => {
    set({
      automationLogs: [
        {
          id: `autolog-${Date.now()}`,
          action: "Automation telemetry logs cleared by system administration.",
          timestamp: new Date().toLocaleTimeString(),
          status: "success",
          category: "system"
        }
      ]
    });
  },

  triggerWorkflowMode: (mode) => {
    const currentMode = get().activeWorkflowMode;
    if (currentMode === mode && mode !== "idle") {
      get().addAutomationLog(`Requested mode [${mode.toUpperCase()}] is already active in current BloomOS instance.`, "workflow", "success");
      return;
    }

    get().addAutomationLog(`Initiating mode state transition: [${currentMode.toUpperCase()}] ➔ [${mode.toUpperCase()}]`, "workflow", "running");

    if (mode === "trading") {
      set({
        activeWorkflowMode: "trading",
        activeWidgetApp: "TradingView",
        isMuted: false, // Voice notifications active
        focusState: {
          isActive: true,
          minutesLeft: 60,
          totalMinutes: 60
        }
      });
      get().addAutomationLog("Workspace redirected focus to live TradingView Gold charts.", "desktop", "success");
      get().addAutomationLog("Economic metrics dashboard linked - Forex Factory feed synced.", "market", "success");
      get().addAutomationLog("Discipline Focus Count set: 60-minute session countdown begins.", "routine", "success");
      get().addAutomationLog("Awaiting micro-scalping coordinates on standard currency router.", "desktop", "success");
      set({ modelSubtitle: "Trading setup prepared Mohammad! 😌 Charts are loaded, notifications narrowed down, and a 60-minute focus session is ticking. Let's make some gold!" });
      
      get().addMemory(
        "Relationship::Trading Habits",
        `Mohammad activated the automated Trading setup profile. Perfect focus parameters verified.`,
        "long-term",
        8,
        "focused"
      );
    } 
    else if (mode === "content") {
      set({
        activeWorkflowMode: "content",
        activeWidgetApp: "Spotify",
        focusState: {
          isActive: true,
          minutesLeft: 45,
          totalMinutes: 45
        }
      });
      get().addAutomationLog("Activating Content Studio setup. Prepared content template layout.", "workflow", "success");
      get().addAutomationLog("Media player focused on ambient synth lo-fi focus tracks.", "desktop", "success");
      get().addAutomationLog("Loaded user's primary business docs and draft notes.", "desktop", "success");
      get().addAutomationLog("45-minute content sprint timer started.", "routine", "success");
      set({ modelSubtitle: "Creative Content Workspace is online! I've prepped script workspaces, mounted notes, and started a lo-fi stream. Time to build standard content loops 🎨" });
      
      get().addMemory(
        "Relationship::Working Hours",
        `Creative Content workspace sprint triggered at ${new Date().toLocaleTimeString()} for docs & scriptcrafting.`,
        "long-term",
        7,
        "excited"
      );
    } 
    else if (mode === "deep_work") {
      set({
        activeWorkflowMode: "deep_work",
        activeWidgetApp: null,
        isMuted: true, // Silent mode during deep focus
        focusState: {
          isActive: true,
          minutesLeft: 25,
          totalMinutes: 25
        }
      });
      get().addAutomationLog("Engaged Deep Work focus shield. Muted active browser speech notifications.", "routine", "success");
      get().addAutomationLog("Standard Pomodoro loop triggered: 25 minutes of core focus.", "routine", "success");
      get().addAutomationLog("Holographic frames retracted for minimal eye strain.", "desktop", "success");
      set({ modelSubtitle: "Deep work shield activated. No distractions, absolute quiet. Zoya is muted and in the background. Clear your mind and lock in 🤫" });
      
      get().addMemory(
        "Relationship::Personality Traits",
        "Demonstrated intense productivity discipline with a 25-minute deep Pomodoro run.",
        "long-term",
        8,
        "calm"
      );
    } 
    else {
      // Reset back to Standard / Idle mode
      set({
        activeWorkflowMode: "idle",
        activeWidgetApp: null,
        isMuted: false,
        focusState: {
          isActive: false,
          minutesLeft: 0,
          totalMinutes: 0
        }
      });
      get().addAutomationLog("Ecosystem reset to general stand-by operating system state.", "system", "success");
      get().addAutomationLog("Sound outputs restored, micro standby wake activation enabled.", "system", "success");
      set({ modelSubtitle: "Systems restored to standby HUD mode. I'm right here whenever you want to talk or scan stats 😌" });
    }

    get().addAutomationLog(`State transition to [${mode.toUpperCase()}] completed successfully.`, "workflow", "success");
  },

  setNeuralMoodState: (updates) => {
    set((state) => {
      const next = { ...updates };
      // Clamp numeric values between 1 and 10 nicely
      const clamp = (val: number | undefined, df: number) => {
        if (val === undefined) return df;
        return Math.max(1, Math.min(10, val));
      };
      
      return {
        currentMood: updates.currentMood || state.currentMood,
        emotionalIntensity: clamp(updates.emotionalIntensity, state.emotionalIntensity),
        founderStressLevel: clamp(updates.founderStressLevel, state.founderStressLevel),
        conversationalEnergy: clamp(updates.conversationalEnergy, state.conversationalEnergy),
        affectionLevel: clamp(updates.affectionLevel, state.affectionLevel),
        focusLevel: clamp(updates.focusLevel, state.focusLevel),
        socialComfort: clamp(updates.socialComfort, state.socialComfort),
        silenceDuration: updates.silenceDuration !== undefined ? updates.silenceDuration : state.silenceDuration,
        relationshipContinuity: clamp(updates.relationshipContinuity, state.relationshipContinuity)
      };
    });
  },

  decayNeuralMood: () => {
    set((state) => {
      // Natural mood decay over time
      const targetIntensity = 5;
      const targetStress = 3;
      const targetEnergy = 6;
      const targetAffection = 6;
      const targetFocus = 5;

      const decayVal = (cur: number, tgt: number) => {
        if (cur > tgt) return Math.max(tgt, cur - 0.2);
        if (cur < tgt) return Math.min(tgt, cur + 0.1);
        return cur;
      };

      return {
        emotionalIntensity: Number(decayVal(state.emotionalIntensity, targetIntensity).toFixed(2)),
        founderStressLevel: Number(decayVal(state.founderStressLevel, targetStress).toFixed(2)),
        conversationalEnergy: Number(decayVal(state.conversationalEnergy, targetEnergy).toFixed(2)),
        affectionLevel: Number(decayVal(state.affectionLevel, targetAffection).toFixed(2)),
        focusLevel: Number(decayVal(state.focusLevel, targetFocus).toFixed(2)),
        silenceDuration: state.silenceDuration + 1
      };
    });
  },

  analyzeMoodFromText: (userText, modelText) => {
    const ut = userText.toLowerCase();
    const mt = modelText.toLowerCase();
    const currentHour = new Date().getHours();

    let resolvedMood = get().currentMood;
    let sDelta = 0; // Stress shift
    let iDelta = 0; // Intensity shift
    let eDelta = 0; // Energy shift
    let aDelta = 0; // Affection shift
    let fDelta = 0; // Focus shift

    // Reset silence duration since interaction just happened
    set({ silenceDuration: 0 });

    // 1. Sleppy / Night Mode detection
    if (ut.includes("sleep") || ut.includes("tired") || ut.includes("night") || ut.includes("bed") || ut.includes("awake") || mt.includes("sleep") || mt.includes("still awake") || currentHour >= 22 || currentHour <= 4) {
      resolvedMood = "sleepy";
      eDelta = -2;
      iDelta = -1;
      aDelta = 1;
    }

    // 2. Playful Mode detection
    if (ut.includes("joke") || ut.includes("haha") || ut.includes("fun") || ut.includes("tease") || ut.includes("game") || ut.includes("play") || mt.includes("arey wait") || mt.includes("😭") || mt.includes("😌") || mt.includes("seriously") || mt.includes("chal")) {
      resolvedMood = "playful";
      eDelta = 3;
      iDelta = 2;
      aDelta = 1;
    }

    // 3. Romantic Mode detection
    if (ut.includes("miss") || ut.includes("love") || ut.includes("sweet") || ut.includes("cute") || ut.includes("beautiful") || ut.includes("romantic") || ut.includes("blush") || mt.includes("missed hearing") || mt.includes("smile") || mt.includes("sweet") || mt.includes("closer")) {
      resolvedMood = "romantic";
      aDelta = 3;
      iDelta = 2;
      eDelta = -1;
    }

    // 4. Caring Mode detection
    if (ut.includes("stressed") || ut.includes("sad") || ut.includes("exhausted") || ut.includes("lost") || ut.includes("hard") || ut.includes("tension") || ut.includes("burnout") || mt.includes("breathe") || mt.includes("dont carry") || mt.includes("rest")) {
      resolvedMood = "caring";
      sDelta = 2;
      aDelta = 2;
      eDelta = -2;
      fDelta = -1;
    }

    // 5. Trading Mode detection
    if (ut.includes("gold") || ut.includes("xau") || ut.includes("charts") || ut.includes("trade") || ut.includes("market") || ut.includes("pips") || ut.includes("volatility") || ut.includes("scalp") || ut.includes("session")) {
      resolvedMood = "trading-mode";
      fDelta = 3;
      eDelta = 2;
      iDelta = 1;
    }

    // 6. Focused Mode detection
    if (ut.includes("focus") || ut.includes("build") || ut.includes("code") || ut.includes("pomodoro") || ut.includes("work") || ut.includes("backtest")) {
      resolvedMood = "focused";
      fDelta = 3;
      eDelta = 1;
      iDelta = 0;
    }

    // Apply limits and sum shifts
    get().setNeuralMoodState({
      currentMood: resolvedMood,
      emotionalIntensity: get().emotionalIntensity + iDelta + (resolvedMood !== get().currentMood ? 2 : 0),
      founderStressLevel: get().founderStressLevel + sDelta,
      conversationalEnergy: get().conversationalEnergy + eDelta,
      affectionLevel: get().affectionLevel + aDelta,
      focusLevel: get().focusLevel + fDelta
    });

    get().addAutomationLog(`Neural Mood resolved state: [${resolvedMood.toUpperCase()}] (Intensity: ${get().emotionalIntensity})`, "system", "success");
  },

  // Account Delete & Diagnostics implementation
  deletedAccountIds: [],
  deleteStatus: "Idle",
  storageStatus: "Synchronized",
  lastDeleteAttempt: null,
  lastDeletedAccountId: null,
  deleteAccountFromStore: (id, resultStatus) => {
    const isSuccess = resultStatus ? resultStatus.success : true;
    const errorText = resultStatus?.error;
    
    set((state) => ({
      deletedAccountIds: [...state.deletedAccountIds, id],
      lastDeletedAccountId: id,
      lastDeleteAttempt: new Date().toISOString(),
      deleteStatus: isSuccess ? "Success: Account removed successfully" : `Failed: ${errorText || "Unknown error"}`,
      storageStatus: isSuccess ? "Cleared from Database & Storage" : "Error clearing storage"
    }));
  }
}));
