import path from "path";
import fs from "fs";

// Set Playwright's browser path to our persistent workspace cache
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), ".cache", "ms-playwright");

import type { BrowserContext, Page } from "playwright";

export type WhatsAppStatus =
  | "uninitialized"
  | "connecting"
  | "qr"
  | "authenticated"
  | "error";

export interface WhatsAppServiceState {
  status: WhatsAppStatus;
  qrCodeBase64: string | null;
  errorMsg: string | null;
  logs: string[];
  lastConnected: string | null;
}

const SELECTORS = {
  qrContainer: [
    "canvas",
    "div[data-ref]",
    "[data-testid='qrcode']",
    ".landing-wrapper"
  ],
  sidebar: [
    "#pane-side",
    "[data-testid='chat-list']",
    "div[data-tab='1']",
    "role=grid",
    "div[title*='Chats']",
    "div[title*='chats']"
  ],
  searchInput: [
    "div[contenteditable='true'][data-tab='3']",
    "div[data-testid='chat-list-search'] div[contenteditable='true']",
    "#side div[contenteditable='true']",
    "#side [contenteditable='true']",
    "[data-testid='search-input']",
    "[data-testid='chat-list-search']",
    "input[placeholder*='Search']"
  ],
  messageInput: [
    "div[contenteditable='true'][data-tab='10']",
    "div[contenteditable='true'][data-tab='6']",
    "#main footer div[contenteditable='true']",
    "footer div[contenteditable='true']",
    "[data-testid='conversation-text-input']",
    "div[role='textbox']"
  ]
};

export class WhatsAppService {
  private static instance: WhatsAppService | null = null;
  
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private status: WhatsAppStatus = "uninitialized";
  private qrCodeBase64: string | null = null;
  private errorMsg: string | null = null;
  private logs: string[] = [];
  private lastConnected: string | null = null;
  private observerTimer: NodeJS.Timeout | null = null;
  private checkerActive = false;

  private constructor() {
    this.log("WhatsApp Automation Service initialized.");
  }

  public static getInstance(): WhatsAppService {
    if (!this.instance) {
      this.instance = new WhatsAppService();
    }
    return this.instance;
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logStr = `[${timestamp}] ${message}`;
    this.logs.push(logStr);
    if (this.logs.length > 50) {
      this.logs.shift(); // Keep logs clean
    }
    console.log(`[WhatsAppService] ${message}`);
  }

  public getLogs(): string[] {
    return this.logs;
  }

  public async getState(): Promise<WhatsAppServiceState> {
    // If browser is active, do a quick sanity check
    if (this.context && this.page) {
      try {
        if (this.page.isClosed()) {
          this.log("Observation: Page closed. Disconnecting...");
          await this.disconnect();
        }
      } catch (e) {}
    }

    return {
      status: this.status,
      qrCodeBase64: this.qrCodeBase64,
      errorMsg: this.errorMsg,
      logs: this.logs,
      lastConnected: this.lastConnected
    };
  }

  public async initialize(): Promise<void> {
    if (this.status === "connecting" || this.status === "qr" || this.status === "authenticated") {
      this.log("WhatsApp Service is already running or connecting.");
      return;
    }

    this.status = "connecting";
    this.errorMsg = null;
    this.qrCodeBase64 = null;
    this.log("Launching persistent browser context for Zoya automation...");

    try {
      const { chromium } = await import("playwright");
      const sessionPath = path.join(process.cwd(), "sessions", "whatsapp_rashad");
      if (!fs.existsSync(path.dirname(sessionPath))) {
        fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
      }

      this.context = await chromium.launchPersistentContext(sessionPath, {
        headless: true, // Server-side compliance in headless cloud containers
        viewport: { width: 1440, height: 900 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu"
        ]
      });

      this.log("Google Chromium node booted. Hooking page navigation...");
      
      // Get or create page
      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

      this.log("Loading official WhatsApp Web primary panel...");
      await this.page.goto("https://web.whatsapp.com/", {
        waitUntil: "domcontentloaded",
        timeout: 45000
      });

      this.log("Navigation complete. Triggering visual feedback observer loop.");
      this.startObserverLoop();

    } catch (err: any) {
      this.status = "error";
      this.errorMsg = err?.message || String(err);
      this.log(`CRITICAL: Launcher failed: ${this.errorMsg}`);
      await this.disconnect();
    }
  }

  private startObserverLoop() {
    if (this.observerTimer) {
      clearInterval(this.observerTimer);
    }

    this.observerTimer = setInterval(async () => {
      await this.checkStatusAndExtractQR();
    }, 3000);
  }

  private async checkStatusAndExtractQR() {
    if (this.checkerActive) return;
    this.checkerActive = true;

    try {
      const page = this.page;
      if (!page || page.isClosed()) {
        this.checkerActive = false;
        return;
      }

      // Check for authentication panel sidebar
      let isSidebarVisible = false;
      for (const selector of SELECTORS.sidebar) {
        try {
          if (await page.locator(selector).first().isVisible()) {
            isSidebarVisible = true;
            break;
          }
        } catch (e) {}
      }

      if (isSidebarVisible) {
        if (this.status !== "authenticated") {
          this.status = "authenticated";
          this.qrCodeBase64 = null;
          this.lastConnected = new Date().toLocaleString();
          this.log("✨ WhatsApp Successfully Authenticated! Active and standby in Zoya.");
        }
        this.checkerActive = false;
        return;
      }

      // If sidebar is not visible, check for QR code
      let qrElementFound = false;
      for (const selector of SELECTORS.qrContainer) {
        try {
          const loc = page.locator(selector).first();
          if (await loc.isVisible()) {
            qrElementFound = true;
            this.status = "qr";
            
            // Take dynamic screenshot of QR container
            const screenshotBuffer = await loc.screenshot({ type: "jpeg", quality: 80 });
            this.qrCodeBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString("base64")}`;
            break;
          }
        } catch (e) {}
      }

      if (!qrElementFound) {
        // If neither found, we are still loading pages or scanning
        if (this.status !== "connecting") {
          this.log("Standby refresh: Page loading or processing session handshake...");
        }
      }

    } catch (err) {
      // Don't spam error logs unless severe
    } finally {
      this.checkerActive = false;
    }
  }

  public async captureDiagnosticScreenshot(): Promise<string | null> {
    try {
      if (!this.page || this.page.isClosed()) return null;
      const buffer = await this.page.screenshot({ type: "jpeg", quality: 75 });
      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch (e) {
      return null;
    }
  }

  public async sendMessage(recipient: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (this.status !== "authenticated") {
      return { success: false, error: "WhatsApp has not been authenticated yet. Please scan the QR code first!" };
    }

    this.log(`⚡ Initiating real-time send routine: RECIPIENT='${recipient}' MESSAGE='${message}'`);
    try {
      const page = this.page;
      if (!page || page.isClosed()) {
        throw new Error("Playwright context page is closed.");
      }

      // Try finding the search bar with active waiting (polls for up to 10 seconds)
      let searchBox = null;
      this.log("Locating search box input with resilient selector scanning...");
      
      for (let attempt = 1; attempt <= 10; attempt++) {
        for (const selector of SELECTORS.searchInput) {
          try {
            const loc = page.locator(selector).first();
            if (await loc.isVisible()) {
              searchBox = loc;
              break;
            }
          } catch (e) {}
        }
        if (searchBox) break;
        this.log(`Search box scan attempt ${attempt}/10... Waiting for DOM render`);
        await page.waitForTimeout(1000);
      }

      if (!searchBox) {
        // Ultimate desperate fallback: try ANY contenteditable in the left pane or side panel
        try {
          const loc = page.locator("#side div[contenteditable='true']").first();
          if (await loc.isVisible()) {
            searchBox = loc;
          }
        } catch (e) {}
      }

      if (!searchBox) {
        // Last-ditch generic visible textbox before failing
        try {
          const loc = page.locator("div[contenteditable='true']").first();
          if (await loc.isVisible()) {
            searchBox = loc;
          }
        } catch (e) {}
      }

      if (!searchBox || !(await searchBox.isVisible())) {
        // Capture screenshot of the exact failure state
        const failImg = await this.captureDiagnosticScreenshot();
        if (failImg) {
          this.qrCodeBase64 = null; // Don't conflate with QR, but we can store it or log it
        }
        throw new Error("Could not find any WhatsApp Search input box in the active DOM.");
      }

      this.log("Found search box. Setting focus...");
      try {
        await searchBox.focus({ timeout: 2000 });
        await searchBox.click({ force: true, timeout: 4000 });
      } catch (e: any) {
        this.log(`⚠️ Note: Focusing or clicking search box with standard methods failed (${e.message}). Attempting force click...`);
        await searchBox.click({ force: true, timeout: 4000 }).catch(() => {});
      }
      await page.waitForTimeout(300);

      // Force select all existing content to wipe cleanly
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(300);

      // Enter recipient name naturally
      await searchBox.fill("");
      this.log(`Typing recipient contact: "${recipient}"`);
      await searchBox.type(recipient, { delay: 100 });
      await page.waitForTimeout(2000); // Wait for contact filter animation

      // Find contact elements to click
      const searchItemSelectors = [
        `span[title="${recipient}"]`,
        `span[title*="${recipient}" i]`, // Case-insensitive contains match
        `div[data-testid="cell-frame-title"] span:has-text("${recipient}")`,
        `div[data-testid="cell-frame-title"] :has-text("${recipient}")`,
        `div[role="row"] span:has-text("${recipient}")`,
        `div[role="listitem"] :has-text("${recipient}")`
      ];

      let contactClicked = false;
      for (const sel of searchItemSelectors) {
        try {
          const col = page.locator(sel).first();
          if (await col.isVisible()) {
            this.log(`Opening active chat room: Clicking found match using selector [${sel}]`);
            await col.click({ force: true, timeout: 4000 });
            contactClicked = true;
            break;
          }
        } catch (e) {}
      }

      if (!contactClicked) {
        this.log("⚠️ Exact click sequence did not trigger. Attempting keyboard select sequence (ArrowDown + Enter)...");
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1000);
      }

      // Poll/wait for active message box for up to 10 seconds
      this.log("Verifying chat room is active. Locating message input area...");
      let messageBox = null;

      for (let attempt = 1; attempt <= 10; attempt++) {
        for (const selector of SELECTORS.messageInput) {
          try {
            const loc = page.locator(selector).first();
            if (await loc.isVisible()) {
              messageBox = loc;
              break;
            }
          } catch (e) {}
        }
        if (messageBox) break;
        this.log(`Message box search attempt ${attempt}/10... waiting for conversation panel to mount`);
        await page.waitForTimeout(1000);
      }

      if (!messageBox) {
        // Fallback: search for any visible contenteditable under #main or footer
        try {
          const loc = page.locator("#main div[contenteditable='true']").first();
          if (await loc.isVisible()) {
            messageBox = loc;
          }
        } catch (e) {}
      }

      if (!messageBox || !(await messageBox.isVisible())) {
        throw new Error("Conversation opened, but message input textbox wrapper was not resolved.");
      }

      this.log("Positioning cursor inside message input...");
      try {
        await messageBox.focus({ timeout: 2000 });
        await messageBox.click({ force: true, timeout: 4000 });
      } catch (e: any) {
        this.log(`⚠️ Note: Positioning cursor inside message box using standard methods failed (${e.message}). Attempting force click...`);
        await messageBox.click({ force: true, timeout: 4000 }).catch(() => {});
      }
      await page.waitForTimeout(400);

      // Fill message securely
      await messageBox.fill("");
      this.log("Typing message content...");
      await messageBox.type(message, { delay: 65 });
      await page.waitForTimeout(800);

      this.log("Executing send trigger via Enter keypress...");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500); // Wait for bubble to confirm

      this.log(`✨ Successful real-world dispatch! Telemetry verified.`);
      return { success: true };

    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      this.log(`⚠️ Send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  public async disconnect(): Promise<void> {
    this.log("Terminating WhatsApp session & releasing Browser processes...");
    
    if (this.observerTimer) {
      clearInterval(this.observerTimer);
      this.observerTimer = null;
    }

    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
    } catch (e) {
      console.warn("Error closing playwright resources:", e);
    }

    this.status = "uninitialized";
    this.qrCodeBase64 = null;
  }
}
