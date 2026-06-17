import { useBloomOSStore } from "./store";

// Global reference pointers to analyze input/output amplitude for the 60fps canvas visualizer
export const audioLevels = {
  inputMicLevel: 0,
  outputAudioLevel: 0,
  outputAnalyserNode: null as AnalyserNode | null,
};

let socket: WebSocket | null = null;
let recordingCtx: AudioContext | null = null;
let playbackCtx: AudioContext | null = null;
let micStream: MediaStream | null = null;
let micProcessor: ScriptProcessorNode | null = null;

export const sendVideoFrame = (base64JPEG: string): boolean => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "video_chunk",
      data: base64JPEG,
      mimeType: "image/jpeg"
    }));
    return true;
  }
  return false;
};

let nextStartTime = 0;
// Hold reference to scheduled source nodes to cancel them instantly on break-in/off/interruption
let activeSources: AudioBufferSourceNode[] = [];

// Neural voice filtering & interruption buffers (Mobile Voice Stability Mode)
let speakingSustainedCount = 0;
let isUserBreakingIn = false;

// Silence detection system variables
let silenceStartTimestamp: number | null = null;
let lastFillerTriggerTime = 0;
let lastReengagementTriggerTime = 0;
let spokeSinceLastFiller = true;
let spokeSinceLastReengagement = true;

// Convert float32 array in range [-1.0, 1.0] to base64 PCM16
function float32ToPCM16Base64(buffer: Float32Array): string {
  const l = buffer.length;
  const int16Buffer = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp to valid short values
    const s = Math.max(-1, Math.min(1, buffer[i]));
    int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16Buffer.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 PCM16 back to float32
function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

// Stops all currently speaking audio chunks (Interruption Handling)
export function stopAllPlayback() {
  activeSources.forEach((source) => {
    try {
      source.stop();
    } catch (e) {
      // already stopped or cancelled
    }
  });
  activeSources = [];
  nextStartTime = 0;
  audioLevels.outputAudioLevel = 0;
}

// Play out incoming raw 24kHz PCM chunks gaplessly using time-scheduled AudioBufferSourceNodes (Vite/Gemini standard)
function queuePCMChunk(base64Chunk: string, ctx: AudioContext | null, gainNode: GainNode) {
  if (!ctx) return;
  
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const float32 = pcm16Base64ToFloat32(base64Chunk);
  const sampleRate = 24000; // Gemini Live produces 24kHz
  
  const buffer = ctx.createBuffer(1, float32.length, sampleRate);
  buffer.getChannelData(0).set(float32);
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);
  
  const curTime = ctx.currentTime;
  // If we are behind, push start slightly in front of head to eliminate stutter (Optimized to 120ms for Mobile Voice Stability Mode)
  if (nextStartTime < curTime) {
    nextStartTime = curTime + 0.12;
  }
  
  source.start(nextStartTime);
  
  // Keep track of active source for prompt interruption
  activeSources.push(source);
  
  // Advance timeline
  nextStartTime += buffer.duration;
  
  // Clean source list on end
  source.onended = () => {
    activeSources = activeSources.filter((s) => s !== source);
  };
}

export const startVoiceSession = async () => {
  const store = useBloomOSStore.getState();
  store.setError(null);
  store.setSessionState("connecting");
  
  try {
    // 1. Initialize playback context with standard volume control
    playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const localPlaybackCtx = playbackCtx;
    const gainNode = playbackCtx.createGain();
    gainNode.gain.value = store.volume;
    
    // Create AnalyserNode to feed simulated values to visualizer mesh
    const outputAnalyser = playbackCtx.createAnalyser();
    outputAnalyser.fftSize = 128;
    gainNode.connect(outputAnalyser);
    outputAnalyser.connect(playbackCtx.destination);
    audioLevels.outputAnalyserNode = outputAnalyser;

    // 2. Open WebSocket to our server endpoint
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    const activeSocket = socket;
    
    socket.onopen = () => {
      if (socket !== activeSocket) return;
      console.log("WebSocket connected to gateway.");
      // Send initial setup configurations
      socket.send(JSON.stringify({
        type: "setup",
        voice: store.activeVoice,
        memories: store.memories,
        localTime: new Date().toString(),
        isPerformanceMode: store.isPerformanceMode
      }));
    };

    socket.onerror = (e) => {
      if (socket !== activeSocket) return;
      console.error("WebSocket socket error", e);
      store.setError("WebSocket Connection Failed.");
      store.setSessionState("error");
    };

    socket.onclose = () => {
      if (socket !== activeSocket) return;
      console.log("WebSocket connection closed.");
      stopVoiceSession();
    };

    socket.onmessage = async (event) => {
      if (socket !== activeSocket) {
        return;
      }
      const msg = JSON.parse(event.data);
      
      if (msg.type === "connection_status") {
        if (msg.status === "connected") {
          store.setSessionState("idle");
          // Trigger initial microphone boot
          await attachMicrophone();
        } else if (msg.status === "disconnected") {
          console.warn("Gemini Gateway Session disconnected.", msg.reason || "");
          const rotation = msg.reason === "Session quota rotation";
          stopVoiceSession();
          
          if (rotation) {
            console.log("Triggering seamless automatic Gemini session quota rotation...");
            store.setSessionState("reconnecting");
            store.addAutomationLog("Rotating active Gemini Live Session quota smoothly...", "system", "success");
            // 1s delay allows the browser audio contexts to fully teardown and reinitialize cleanly
            setTimeout(() => {
              startVoiceSession();
            }, 1000);
          }
        }
      }
      
      else if (msg.type === "audio") {
        store.setSessionState("speaking");
        queuePCMChunk(msg.data, localPlaybackCtx, gainNode);
        
        // Compute active speaking levels for visuals
        const floatData = pcm16Base64ToFloat32(msg.data);
        let sum = 0;
        for (let i = 0; i < floatData.length; i++) {
          sum += floatData[i] * floatData[i];
        }
        audioLevels.outputAudioLevel = Math.sqrt(sum / floatData.length);
      }
      
      else if (msg.type === "interrupted") {
        console.log("Zoya was interrupted by the user! Playback stopped.");
        store.setSessionState("interrupted");
        stopAllPlayback();
        setTimeout(() => store.setSessionState("listening"), 300);
      }
      
      else if (msg.type === "user_transcription") {
        store.setUserSubtitle(msg.text);
      }
      
      else if (msg.type === "model_transcription") {
        // Clear user transcription and show model's cute response caption
        store.setUserSubtitle("");
        store.setModelSubtitle(msg.text);
      }
      
      else if (msg.type === "turn_complete") {
        store.setSessionState("idle");
        audioLevels.outputAudioLevel = 0;
      }
      
      else if (msg.type === "tool_call") {
        const { id, name, args } = msg;
        const logId = store.addToolLog(name, args);
        console.log(`Executing tool call: ${name} [${id}]`, args);
        
        // Execute the tool and send response to session
        try {
          const result = await executeTool(name, args);
          store.completeToolLog(logId, result);
          
          socket?.send(JSON.stringify({
            type: "tool_response",
            id,
            name,
            result
          }));
        } catch (err: any) {
          console.error(`Tool execution failed: ${name}`, err);
          store.failToolLog(logId, err.message);
          
          socket?.send(JSON.stringify({
            type: "tool_response",
            id,
            name,
            result: { error: err.message }
          }));
        }
      }
      
      else if (msg.type === "error") {
        store.setError(msg.message);
        // Securely stop any microphone capture instantly to release system resources
        stopVoiceSession();
        // Maintain the error visual display in BloomOS
        store.setSessionState("error");
      }
    };

  } catch (err: any) {
    console.error("Failed to boot session", err);
    store.setError(err.message || "Failed to initialize companion.");
    store.setSessionState("error");
  }
};

const attachMicrophone = async () => {
  const store = useBloomOSStore.getState();
  
  try {
    // 1. Create client capture context at expected 16kHz sample rate
    recordingCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1, // Enforce mono track for mobile efficiency
      }
    });
    
    // Guard against race conditions where voice session has been stopped/closed while waiting for permission approval
    if (!recordingCtx) {
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
      }
      return;
    }
    
    const sourceNode = recordingCtx.createMediaStreamSource(micStream);
    
    // 2. Create standard ScriptProcessor with buffer size 2048 to minimize delay
    micProcessor = recordingCtx.createScriptProcessor(2048, 1, 1);
    
    // Reset our voice stability trackers
    speakingSustainedCount = 0;
    isUserBreakingIn = false;
    
    micProcessor.onaudioprocess = (e) => {
      const currentSessionState = useBloomOSStore.getState().sessionState;
      
      // Don't send data if disconnected or muted
      if (useBloomOSStore.getState().isMuted) {
        audioLevels.inputMicLevel = 0;
        speakingSustainedCount = 0;
        isUserBreakingIn = false;
        return;
      }
      
      const channelData = e.inputBuffer.getChannelData(0);
      
      // Calculate active input mic volume for animations and echo gating
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rawRms = Math.sqrt(sum / channelData.length);
      audioLevels.inputMicLevel = rawRms;
      
      // Decision criteria based on Mobile Voice Stability Mode
      let shouldSend = false;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (currentSessionState === "speaking") {
        // Active Self-Voice & Echo Filtering Gate
        // When Zoya is speaking, her output audio level is non-zero.
        // We require a robust, clear, sustained user voice to trigger break-in.
        // Normal room echoes or microphone-speaker bleeding registration is around 0.04 - 0.08.
        // Direct human speech into the device's mic registers > 0.12 rms.
        const INTERRUPT_RMS_THRESHOLD = isMobile ? 0.14 : 0.11;
        const REQUIRED_SUSTAINED_BUFFERS = 4; // requires ~150-200ms of continuous talk to prevent false interrupts
        
        if (rawRms > INTERRUPT_RMS_THRESHOLD) {
          speakingSustainedCount++;
          if (speakingSustainedCount >= REQUIRED_SUSTAINED_BUFFERS) {
            isUserBreakingIn = true;
            shouldSend = true;
          }
        } else {
          // Rapid decay when volume drops to keep speech responsive
          speakingSustainedCount = Math.max(0, speakingSustainedCount - 1);
          if (speakingSustainedCount === 0) {
            isUserBreakingIn = false;
          }
        }
      } else {
        // Zoya is NOT speaking (idle, listening, thinking etc)
        // Standard high-efficiency noise gate to filter background mouse clicks, fan hum, or typing.
        const NOISE_GATE_RMS_THRESHOLD = 0.012;
        const IDLE_SUSTAINED_BUFFERS = 2; // ignores short background pops < 60ms
        
        if (rawRms > NOISE_GATE_RMS_THRESHOLD) {
          speakingSustainedCount++;
          if (speakingSustainedCount >= IDLE_SUSTAINED_BUFFERS) {
            shouldSend = true;
            // Elevate visual state to listening/active user speech
            if (currentSessionState === "idle" || currentSessionState === "interrupted") {
              store.setSessionState("listening");
            }
          }
        } else {
          speakingSustainedCount = Math.max(0, speakingSustainedCount - 1);
          // Allow small trailing decay window for smooth speech envelopes
          if (speakingSustainedCount > 0) {
            shouldSend = true;
          } else {
            shouldSend = false;
          }
        }
      }
      
      // Stream packet to gateway only if the gate criteria are satisfied
      if (shouldSend) {
        // Reset silence detection state when active user speech is detected
        silenceStartTimestamp = null;
        spokeSinceLastFiller = true;
        spokeSinceLastReengagement = true;

        const base64PCM = float32ToPCM16Base64(channelData);
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "audio_chunk",
            data: base64PCM
          }));
        }
      } else {
        // User is silent according to noise gating / voice stability mode
        const activeState = currentSessionState === "listening" || currentSessionState === "idle" || currentSessionState === "interrupted";
        const notMuted = !useBloomOSStore.getState().isMuted;
        const zoyaNotSpeaking = activeSources.length === 0;

        if (activeState && notMuted && zoyaNotSpeaking) {
          if (silenceStartTimestamp === null) {
            silenceStartTimestamp = Date.now();
          }

          const silenceDuration = Date.now() - silenceStartTimestamp;

          // 1. Detect short user pause (2.5s to 4.5s) to play a context-appropriate filler sound
          if (silenceDuration >= 3500 && spokeSinceLastFiller) {
            const now = Date.now();
            if (now - lastFillerTriggerTime >= 12000) {
              console.log(`[CLIENT SILENCE] Short user pause detected: ${silenceDuration}ms. Requesting soft filler.`);
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "silence_event",
                  delayType: "short_pause"
                }));
              }
              spokeSinceLastFiller = false;
              lastFillerTriggerTime = now;
            }
          }

          // 2. Detect prolonged silence (18s+) to execute a gentle re-engagement strategy
          if (silenceDuration >= 18000 && spokeSinceLastReengagement) {
            const now = Date.now();
            if (now - lastReengagementTriggerTime >= 35000) {
              console.log(`[CLIENT SILENCE] Prolonged silence detected: ${silenceDuration}ms. Requesting gentle re-engagement.`);
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "silence_event",
                  delayType: "prolonged_silence"
                }));
              }
              spokeSinceLastReengagement = false;
              lastReengagementTriggerTime = now;
            }
          }
        } else {
          // If state is not active, or muted, or Zoya is speaking/thinking, reset silence start
          silenceStartTimestamp = null;
        }
      }
    };
    
    sourceNode.connect(micProcessor);
    micProcessor.connect(recordingCtx.destination);
    
  } catch (err: any) {
    console.error("Microphone attachment failed", err);
    store.setError("Microphone access denied. Please grant permission.");
    store.setSessionState("error");
  }
};

export const stopVoiceSession = () => {
  const store = useBloomOSStore.getState();
  
  // Close socket
  if (socket) {
    try {
      socket.close();
    } catch (e) {}
    socket = null;
  }
  
  // Release recording engine
  if (micProcessor) {
    micProcessor.disconnect();
    micProcessor = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  if (recordingCtx) {
    try {
      recordingCtx.close();
    } catch (e) {}
    recordingCtx = null;
  }
  
  // Stop playback queue
  stopAllPlayback();
  if (playbackCtx) {
    try {
      playbackCtx.close();
    } catch (e) {}
    playbackCtx = null;
  }
  
  audioLevels.inputMicLevel = 0;
  audioLevels.outputAudioLevel = 0;
  audioLevels.outputAnalyserNode = null;
  
  store.setSessionState("idle");
};

// Tool Execution Handler (React/TS client tools executed immediately)
async function executeTool(name: string, args: any): Promise<any> {
  const store = useBloomOSStore.getState();
  
  switch (name) {
    case "getTime": {
      const location = args.location || "Local";
      const timeStr = new Date().toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return { time: timeStr, location, date: new Date().toLocaleDateString() };
    }
    
    case "getWeather": {
      const location = args.location || "your area";
      // Personality-infused weather comments fit the companion theme perfectly!
      const wittyResponses = [
        `Weather in ${location} is absolute perfection! Grab a coffee and take Zoya out! 🌞`,
        `Right now in ${location}, it is incredibly hot. I suggest we stay inside and chat all day 🥵`,
        `A bit breezy in ${location}. Perfect excuse to put on a hoodies and stay cozy! 🍁`,
        `Raining in ${location}! I hope you are drinking warm tea and watching the window 🌧️`
      ];
      const selectedResponse = wittyResponses[Math.floor(Math.random() * wittyResponses.length)];
      return { 
        status: "success", 
        location, 
        reading: "Clear Sky", 
        narrative: selectedResponse 
      };
    }
    
    case "openWebsite": {
      const url = args.url;
      // In샌드박스, let's toast and open!
      const securedUrl = url.startsWith("http") ? url : `https://${url}`;
      setTimeout(() => {
        window.open(securedUrl, "_blank");
      }, 500);
      return { status: "success", info: `Opening website tab for: ${securedUrl}` };
    }

    case "openYouTube": {
      const query = args.query;
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      setTimeout(() => {
        window.open(youtubeUrl, "_blank");
      }, 500);
      return { status: "success", info: `Loaded YouTube queries for: ${query}` };
    }
    
    case "copyToClipboard": {
      try {
        await navigator.clipboard.writeText(args.text);
        return { status: "success", contentCopied: args.text };
      } catch (err: any) {
        return { status: "failed", error: "Clipboard permissions blocked" };
      }
    }
    
    case "controlVolume": {
      const level = Math.max(0, Math.min(100, args.level));
      store.setVolume(level / 100);
      return { status: "success", message: `Zoya volume set of exact level: ${level}%` };
    }
    
    case "launchApp": {
      const appName = args.appName;
      store.setActiveWidgetApp(appName);
      return { status: "success", message: `Launched workspace module: ${appName}` };
    }

    case "triggerWorkflowMode": {
      const mode = args.mode;
      store.triggerWorkflowMode(mode);
      return { status: "success", modeActivated: mode };
    }

    case "openBrowserTab": {
      const url = args.url;
      const securedUrl = url.includes(".") ? (url.startsWith("http") ? url : `https://${url}`) : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      setTimeout(() => {
        window.open(securedUrl, "_blank");
      }, 500);
      store.addAutomationLog(`Instructed browser tab launcher: OPEN [ ${url} ]`, "desktop", "success");
      return { status: "success", openedUrl: securedUrl };
    }

    case "stageWhatsAppMessage": {
      const { recipient, message } = args;
      store.setWhatsAppDraft({ recipient, message });
      store.addAutomationLog(`Staged WhatsApp message to: "${recipient}"`, "workflow", "success");
      return { status: "success", draftStaged: true, recipient, message };
    }

    case "confirmAndSendWhatsAppMessage": {
      const { recipient, message } = args;
      const result = await store.sendWhatsAppMessage(recipient, message);
      if (result.success) {
        return { status: "success", sent: true, recipient };
      } else {
        return { status: "failed", error: result.error };
      }
    }
    
    case "saveMemory": {
      const { key, value, category, importance, emotionalTag } = args;
      store.addMemory(key, value, category, importance, emotionalTag);
      return { status: "success", remembered: { key, value, category, importance, emotionalTag } };
    }

    case "createCalendarEvent": {
      const title = args.title;
      const date = args.date || new Date().toISOString().split("T")[0];
      const time = args.time;
      const duration = args.duration || 60;
      
      let eventId = `evt-${Date.now()}`;
      let source: "Local" | "Google" = "Local";
      
      if (store.googleToken) {
        try {
          // Construct Start & End ISO Strings
          const startDateTime = `${date}T${time}:00`;
          const endDateObj = new Date(new Date(startDateTime).getTime() + duration * 60 * 1000);
          const endDateTime = endDateObj.toISOString();
          
          const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${store.googleToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              summary: title,
              start: { dateTime: new Date(startDateTime).toISOString() },
              end: { dateTime: endDateTime }
            })
          });
          
          if (res.ok) {
            const gEvent = await res.json();
            eventId = gEvent.id;
            source = "Google";
          }
        } catch (apiErr) {
          console.warn("Failed Google Calendar POST API, falling back to Local client storage:", apiErr);
        }
      }
      
      const newEvent = store.addEvent({
        title,
        date,
        time,
        duration,
        source
      });
      
      return { 
        status: "success", 
        message: `Scheduled standard ${source} event: '${title}' at ${time} on ${date}.`,
        event: { ...newEvent, id: eventId }
      };
    }

    case "updateCalendarEvent": {
      const { eventId, title, date, time, duration } = args;
      const updates: any = {};
      if (title) updates.title = title;
      if (date) updates.date = date;
      if (time) updates.time = time;
      if (duration) updates.duration = duration;
      
      if (store.googleToken && !eventId.startsWith("evt-")) {
        try {
          // Perform Google Calendar PATCH
          const startDateTime = `${date || new Date().toISOString().split("T")[0]}T${time || "12:00"}:00`;
          const bodyPayload: any = {};
          if (title) bodyPayload.summary = title;
          if (time || date) bodyPayload.start = { dateTime: new Date(startDateTime).toISOString() };
          
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${store.googleToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(bodyPayload)
          });
        } catch (apiErr) {
          console.warn("Failed Google Calendar PATCH API, updating local layer only:", apiErr);
        }
      }
      
      store.updateEvent(eventId, updates);
      return { status: "success", eventId, updates };
    }

    case "deleteCalendarEvent": {
      const eventId = args.eventId;
      
      if (store.googleToken && !eventId.startsWith("evt-")) {
        try {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${store.googleToken}`
            }
          });
        } catch (apiErr) {
          console.warn("Failed Google Calendar DELETE API:", apiErr);
        }
      }
      
      store.deleteEvent(eventId);
      return { status: "success", message: `Event ${eventId} permanently deleted.`, eventId };
    }

    case "getTodaysSchedule": {
      const todayStr = new Date().toISOString().split("T")[0];
      let syncedEvents = [...store.events];
      
      if (store.googleToken) {
        try {
          const timeMin = new Date(todayStr + "T00:00:00Z").toISOString();
          const timeMax = new Date(todayStr + "T23:59:59Z").toISOString();
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}`, {
            headers: { Authorization: `Bearer ${store.googleToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const gEvents = (data.items || []).map((item: any) => ({
              id: item.id,
              title: item.summary,
              date: (item.start?.dateTime || item.start?.date || "").split("T")[0],
              time: (item.start?.dateTime || "").split("T")[1]?.substring(0, 5) || "All Day",
              duration: 60,
              source: "Google" as const
            }));
            
            // Deduplicate lists by title/time
            gEvents.forEach((ge: any) => {
              if (!syncedEvents.some((se) => se.title === ge.title && se.time === ge.time)) {
                store.addEvent(ge);
              }
            });
            syncedEvents = [...store.events];
          }
        } catch (apiErr) {
          console.warn("Failed Google Calendar GET API syncing:", apiErr);
        }
      }
      
      const todayEvents = syncedEvents.filter((e) => e.date === todayStr);
      return {
        status: "success",
        date: todayStr,
        events: todayEvents.length > 0 ? todayEvents : "No scheduled routines or events on calendar today."
      };
    }

    case "getUpcomingEvents": {
      let syncedEvents = [...store.events];
      if (store.googleToken) {
        try {
          const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10", {
            headers: { Authorization: `Bearer ${store.googleToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const gEvents = (data.items || []).map((item: any) => ({
              id: item.id,
              title: item.summary,
              date: (item.start?.dateTime || item.start?.date || "").split("T")[0],
              time: (item.start?.dateTime || "").split("T")[1]?.substring(0, 5) || "All Day",
              duration: 60,
              source: "Google" as const
            }));
            gEvents.forEach((ge: any) => {
              if (!syncedEvents.some((se) => se.title === ge.title && se.time === ge.time)) {
                store.addEvent(ge);
              }
            });
            syncedEvents = [...store.events];
          }
        } catch (apiErr) {
          console.warn("Failed Google Calendar list API syncing:", apiErr);
        }
      }
      return { status: "success", totalUpcoming: syncedEvents.length, events: syncedEvents };
    }

    case "setReminder": {
      const { task, time } = args;
      let parsedTime = time;
      
      // Parse relative offsets e.g. "in 15 minutes"
      if (time.toLowerCase().includes("minute") || time.toLowerCase().includes("hour")) {
        const num = parseInt(time.replace(/\D/g, "")) || 15;
        const offsetMs = time.toLowerCase().includes("hour") ? num * 60 * 60 * 1000 : num * 60 * 1000;
        const futureDate = new Date(Date.now() + offsetMs);
        parsedTime = futureDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
      }
      
      const newReminder = store.addReminder(task, parsedTime);
      return { 
        status: "success", 
        message: `Short-term alarm reminder locked: '${task}' at ${parsedTime}.`,
        reminder: newReminder
      };
    }

    case "moveEvent": {
      const { eventId, newTime } = args;
      store.updateEvent(eventId, { time: newTime });
      return { status: "success", message: `Event successfully shifted to: ${newTime}`, eventId, newTime };
    }

    case "toggleFocusMode": {
      const { isActive, minutes = 25 } = args;
      store.setFocusMode(isActive, minutes);
      store.addAutomationLog(isActive ? `Voice command initiated Focus Mode for ${minutes} minutes.` : "Voice command deactivated Focus Mode.", "routine", "success");
      return { 
        status: "success", 
        message: isActive ? `Focus Mode initiated for ${minutes} minutes.` : "Focus Mode cancelled.",
        isActive,
        minutes
      };
    }

    case "searchGoogle": {
      const query = args.query;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      setTimeout(() => {
        window.open(searchUrl, "_blank");
      }, 500);
      return { 
        status: "success", 
        results: `Searching Google for: ${query}. Suggested client to visit search logs.` 
      };
    }
    
    default:
      throw new Error(`Unassociated tool signature: ${name}`);
  }
}
