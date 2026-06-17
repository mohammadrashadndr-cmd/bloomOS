export type SessionState =
  | "booting"
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "muted"
  | "reconnecting"
  | "error";

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  timestamp: string;
  category?: "short-term" | "long-term" | "emotional" | "timeline";
  importance?: number; // 1 to 10
  emotionalTag?: string; // Optional emotional marker (e.g., "confident", "stressed", "burnout")
}

export interface ToolLog {
  id: string;
  name: string;
  args: any;
  status: "running" | "completed" | "failed";
  timestamp: string;
  result?: any;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: "female" | "male";
  description: string;
}

export interface VisualState {
  state: SessionState;
  colorScheme: string; // Tailwind gradient info
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM 24-hr format or similar
  duration: number; // in minutes
  source: "Google" | "Outlook" | "Apple" | "Local";
  isReminder?: boolean;
}

export interface ReminderItem {
  id: string;
  task: string;
  time: string;
  completed: boolean;
  timestamp: string;
}

export interface FocusModeState {
  isActive: boolean;
  minutesLeft: number;
  totalMinutes: number;
}

export interface AutomationLog {
  id: string;
  action: string;
  timestamp: string;
  status: "success" | "triggered" | "running";
  category: "workflow" | "routine" | "desktop" | "calendar" | "system" | "market";
}
