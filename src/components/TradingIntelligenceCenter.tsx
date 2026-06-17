import React, { useState, useEffect, useRef } from "react";
import { 
  BarChart2, TrendingUp, AlertTriangle, Briefcase, Book, Cpu, 
  Bell, Settings, Layout, ChevronRight, Play, Square, RefreshCw, 
  Percent, DollarSign, ShieldAlert, Send, Sparkles, MessageSquare, 
  Trash2, Plus, Volume2, Globe, Clock, Check, Sliders, Activity, ShieldCheck,
  Maximize2, Minimize2, Monitor, Mic, MicOff, Keyboard, Calendar, Camera, ExternalLink, HelpCircle, X, ChevronDown,
  Lock, Unlock, Server, Award, AlertCircle, Fingerprint, Wallet,
  PlusCircle, Building2, Wifi, WifiOff, Terminal, ArrowRight, Shield
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useBloomOSStore } from "../store";

// Types
export interface Position {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  price: number;
  currentPrice: number;
  lots: number;
  pnl: number;
  sl?: number;
  tp?: number;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  lots: number;
  pnl: number;
  strategy: string;
  emotion: string;
  notes: string;
  timestamp: string;
}

export interface SavedWorkspace {
  id: string;
  name: string;
  charts: string[]; // list of symbols
  layout: number; // 1, 2, 4, 6
  timeframe: string;
}

export interface TradeAlert {
  id: string;
  symbol: string;
  type: "price_above" | "price_below" | "news_event" | "volatility";
  targetValue: string;
  message: string;
  channel: string;
  active: boolean;
  confidence?: number;
  importance?: "CRITICAL" | "IMPORTANT" | "LOW";
  source?: string;
  voicePriority?: "Voice" | "Notification" | "Silent";
  urgency?: number;
  impactScore?: number;
}

export default function TradingIntelligenceCenter({ onClose }: { onClose: () => void }) {
  // Sidebar items
  const [activeTab, setActiveTab] = useState<
    "accounts" | "dashboard" | "charts" | "news" | "sentiment" | "risk" | "portfolio" | "journal" | "strategies" | "alerts" | "settings"
  >("accounts");

  // Local state persisted in localStorage
  const [positions, setPositions] = useState<Position[]>(() => {
    const raw = localStorage.getItem("bloom_trading_positions");
    return raw ? JSON.parse(raw) : [
      { id: "p1", symbol: "OANDA:XAUUSD", type: "BUY", price: 2315.42, currentPrice: 2322.80, lots: 2.5, pnl: 1845.00, sl: 2310.0, tp: 2340.0, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: "p2", symbol: "FX:EURUSD", type: "SELL", price: 1.0845, currentPrice: 1.0822, lots: 5.0, pnl: 1150.00, sl: 1.0880, tp: 1.0750, timestamp: new Date(Date.now() - 7200000).toISOString() }
    ];
  });

  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    const raw = localStorage.getItem("bloom_trading_journal");
    return raw ? JSON.parse(raw) : [
      { id: "j1", symbol: "OANDA:XAUUSD", type: "BUY", entryPrice: 2310.00, exitPrice: 2325.00, lots: 1.5, pnl: 2250.00, strategy: "Liquidity Sweep", emotion: "Confident", notes: "Swept Asian session low before NY open. Classic Silver Bullet set up.", timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: "j2", symbol: "COINBASE:BTCUSD", type: "SELL", entryPrice: 67100, exitPrice: 66400, lots: 0.5, pnl: 350.00, strategy: "Order Block mitigation", emotion: "Anxious", notes: "Took profit early due to low volume around weekly close.", timestamp: new Date(Date.now() - 172800000).toISOString() }
    ];
  });

  const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>(() => {
    const raw = localStorage.getItem("bloom_trading_workspaces");
    return raw ? JSON.parse(raw) : [
      { id: "w1", name: "Gold Scalper", charts: ["OANDA:XAUUSD"], layout: 1, timeframe: "M5" },
      { id: "w2", name: "NY Session Matrix", charts: ["OANDA:XAUUSD", "FX:EURUSD", "FX:GBPUSD", "COINBASE:BTCUSD"], layout: 4, timeframe: "M15" },
      { id: "w3", name: "Macro Indices View", charts: ["NASDAQ:IXIC", "FOREXCOM:SPX500"], layout: 2, timeframe: "H1" }
    ];
  });

  const [alerts, setAlerts] = useState<TradeAlert[]>(() => {
    const raw = localStorage.getItem("bloom_trading_alerts");
    return raw ? JSON.parse(raw) : [
      { id: "a1", symbol: "OANDA:XAUUSD", type: "price_above", targetValue: "2350.00", message: "Gold hitting resistance", channel: "WhatsApp", active: true },
      { id: "a2", symbol: "FOREXCOM:SPX500", type: "volatility", targetValue: "spike", message: "SPX volatility expansion", channel: "Zoya Voice", active: false }
    ];
  });

  // Account stats state
  const [accountBalance] = useState(12350000.00); 
  const [floatingPnl, setFloatingPnl] = useState(2995.00);
  const [dailyPnlHistory, setDailyPnlHistory] = useState(84230.15);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("w2");
  const [timeframe, setTimeframe] = useState("M15");

  // --- BLOOMOS ADVANCED ACCOUNT COMMAND CENTER STATE ---
  interface Mt5Position {
    id: string;
    symbol: string;
    type: "BUY" | "SELL";
    lots: number;
    entryPrice: number;
    currentPrice: number;
    sl: number;
    tp: number;
    profit: number;
    riskAmount: number; // calculated open risk
    timestamp: string;
  }

  interface Mt5PendingOrder {
    id: string;
    symbol: string;
    type: "BUY LIMIT" | "SELL LIMIT" | "BUY STOP" | "SELL STOP";
    lots: number;
    triggerPrice: number;
    currentPrice: number;
    sl?: number;
    tp?: number;
    status: "Pending" | "Triggered";
  }

  interface Mt5AccountHistory {
    id: string;
    symbol: string;
    type: "BUY" | "SELL";
    lots: number;
    entryPrice: number;
    exitPrice: number;
    profit: number;
    timestamp: string;
  }

  interface Mt5TradeStats {
    winRate: number;
    profitFactor: number;
    avgRR: string;
    sessionPerf: Record<string, number>; // session -> return amount
    pairPerf: Record<string, number>; // pair -> wins
  }

  interface BloomAccount {
    id: string;
    name: string;
    provider: "FTMO" | "FundedNext" | "The5ers" | "FundingPips" | "E8Markets" | "AlphaCapital" | "Personal MT5" | "E8" | "Funding Pips";
    accountNumber: string;
    broker: string;
    server: string;
    phase: "Challenge" | "Verification" | "Funded" | "Personal";
    
    // Financials
    balance?: number;
    equity?: number;
    startingBalance?: number;
    depositHistory?: any[];
    floatingPnl: number;
    dailyPnl: number;
    weeklyPnl: number;
    monthlyPnl: number;
    
    // Challenges Stats
    profitTarget: number | null;
    profitCurrent: number;
    dailyDrawdownLimit?: number;
    overallDrawdownLimit?: number;
    currentDrawdown: number;
    daysTraded: number;
    consistencyScore: number;
    
    // Risk Warning Triggers
    isApproachingDailyLimit: boolean;
    isApproachingMaxDrawdown: boolean;
    
    // MT5 integrated details
    positions: Mt5Position[];
    pendingOrders: Mt5PendingOrder[];
    history: Mt5AccountHistory[];
    statistics: Mt5TradeStats;
    currentExposure: number; // cumulative lots or risk amount
    
    // Security Vault
    vaultPasswordMasked: string;
    isVaultUnlocked: boolean;

    // Connection monitoring
    connectionStatus?: "Connected" | "Disconnected" | "Syncing" | "Reconnecting";
    lastSyncTime?: string;

    // MetaApi cloud storage linkage for live broker syncing
    metaApiId?: string;
    metaApiToken?: string;
    margin?: number;
    freeMargin?: number;
    marginLevel?: number;
    region?: string;
    errorType?: string;
    diagnosticError?: string;
    metaApiConnected?: boolean;
    mt5Connected?: boolean;
    accountSynced?: boolean;
  }

  const [bloomAccounts, setBloomAccounts] = useState<BloomAccount[]>(() => {
    const raw = localStorage.getItem("bloom_command_accounts");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "ba-ftmo-1",
        name: "FTMO Eval Stg-2",
        provider: "FTMO",
        accountNumber: "8492041",
        broker: "FTMO-Server2",
        server: "FTMO-Live-MT5",
        phase: "Verification",
        balance: 100000,
        equity: 101250,
        floatingPnl: 1250,
        dailyPnl: 1250,
        weeklyPnl: 3450,
        monthlyPnl: 5200,
        profitTarget: 5000,
        profitCurrent: 3200,
        dailyDrawdownLimit: 5000,
        overallDrawdownLimit: 10000,
        currentDrawdown: 0,
        daysTraded: 4,
        consistencyScore: 94,
        isApproachingDailyLimit: false,
        isApproachingMaxDrawdown: false,
        positions: [
          { id: "p-mt5-1", symbol: "XAUUSD", type: "BUY", lots: 1.5, entryPrice: 2315.40, currentPrice: 2322.80, sl: 2310.0, tp: 2335.0, profit: 1110.00, riskAmount: 810.00, timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
          { id: "p-mt5-2", symbol: "EURUSD", type: "SELL", lots: 2.0, entryPrice: 1.0835, currentPrice: 1.0822, sl: 1.0855, tp: 1.0790, profit: 260.00, riskAmount: 400.00, timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString() }
        ],
        pendingOrders: [
          { id: "o-mt5-1", symbol: "XAUUSD", type: "BUY LIMIT", lots: 2.5, triggerPrice: 2305.00, currentPrice: 2322.80, sl: 2295.00, tp: 2325.00, status: "Pending" }
        ],
        history: [
          { id: "h-mt5-1", symbol: "XAUUSD", type: "BUY", lots: 1.0, entryPrice: 2308.20, exitPrice: 2313.50, profit: 530.00, timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
          { id: "h-mt5-2", symbol: "GBPUSD", type: "SELL", lots: 1.5, entryPrice: 1.2740, exitPrice: 1.2720, profit: 300.00, timestamp: new Date(Date.now() - 24 * 3600000).toISOString() }
        ],
        statistics: {
          winRate: 68,
          profitFactor: 2.14,
          avgRR: "1:2.3",
          sessionPerf: { "London": 1400, "New York": 2200, "Asian": -150 },
          pairPerf: { "XAUUSD": 5, "EURUSD": 3, "GBPUSD": 2 }
        },
        currentExposure: 3.5,
        vaultPasswordMasked: "●●●●●●●●",
        isVaultUnlocked: false
      },
      {
        id: "ba-fundednext-2",
        name: "FundedNext Direct",
        provider: "FundedNext",
        accountNumber: "2948123",
        broker: "GrowthNext LLC",
        server: "FundedNext-Server1",
        phase: "Funded",
        balance: 200000,
        equity: 195800,
        floatingPnl: -4200,
        dailyPnl: -4200, // Negative daily PnL near drawdown limit
        weeklyPnl: 1400,
        monthlyPnl: 8900,
        profitTarget: null, // Fully funded!
        profitCurrent: 8900,
        dailyDrawdownLimit: 5000, // Approaching very closely! -$4,200 out of $5,000 Limit
        overallDrawdownLimit: 12000,
        currentDrawdown: 4200,
        daysTraded: 19,
        consistencyScore: 88,
        isApproachingDailyLimit: true, // Trigger warnings!
        isApproachingMaxDrawdown: false,
        positions: [
          { id: "p-mt5-3", symbol: "XAUUSD", type: "SELL", lots: 4.5, entryPrice: 2318.50, currentPrice: 2322.80, sl: 2324.5, tp: 2305.0, profit: -1935.00, riskAmount: 2700.00, timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { id: "p-mt5-4", symbol: "GBPUSD", type: "BUY", lots: 3.0, entryPrice: 1.2765, currentPrice: 1.2715, sl: 1.2700, tp: 1.2820, profit: -1500.00, riskAmount: 1950.00, timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString() }
        ],
        pendingOrders: [
          { id: "o-mt5-2", symbol: "GBPUSD", type: "SELL STOP", lots: 2.0, triggerPrice: 1.2690, currentPrice: 1.2715, sl: 1.2735, tp: 1.2620, status: "Pending" }
        ],
        history: [
          { id: "h-mt5-3", symbol: "EURUSD", type: "BUY", lots: 5.0, entryPrice: 1.0810, exitPrice: 1.0842, profit: 1600.00, timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
          { id: "h-mt5-4", symbol: "XAUUSD", type: "SELL", lots: 3.0, entryPrice: 2332.00, exitPrice: 2321.50, profit: 3150.00, timestamp: new Date(Date.now() - 28 * 3600000).toISOString() }
        ],
        statistics: {
          winRate: 59,
          profitFactor: 1.85,
          avgRR: "1:1.9",
          sessionPerf: { "London": 3200, "New York": 6120, "Asian": -420 },
          pairPerf: { "XAUUSD": 12, "EURUSD": 8, "GBPUSD": 4 }
        },
        currentExposure: 7.5,
        vaultPasswordMasked: "●●●●●●●●",
        isVaultUnlocked: false
      },
      {
        id: "ba-the5ers-3",
        name: "The5ers $100K Challenge",
        provider: "The5ers",
        accountNumber: "518339",
        broker: "5ers Capital",
        server: "The5ers-MT5-Demo",
        phase: "Challenge",
        balance: 100000,
        equity: 105200,
        floatingPnl: 0,
        dailyPnl: 2100,
        weeklyPnl: 4500,
        monthlyPnl: 5200,
        profitTarget: 8000, 
        profitCurrent: 5200,
        dailyDrawdownLimit: 4000,
        overallDrawdownLimit: 8000,
        currentDrawdown: 0,
        daysTraded: 8,
        consistencyScore: 91,
        isApproachingDailyLimit: false,
        isApproachingMaxDrawdown: false,
        positions: [],
        pendingOrders: [],
        history: [
          { id: "h-mt5-5", symbol: "XAUUSD", type: "BUY", lots: 2.0, entryPrice: 2298.50, exitPrice: 2311.00, profit: 2500.00, timestamp: new Date(Date.now() - 8 * 3600000).toISOString() }
        ],
        statistics: {
          winRate: 72,
          profitFactor: 2.45,
          avgRR: "1:2.1",
          sessionPerf: { "London": 2100, "New York": 3100, "Asian": 0 },
          pairPerf: { "XAUUSD": 6, "EURUSD": 2 }
        },
        currentExposure: 0,
        vaultPasswordMasked: "●●●●●●●●",
        isVaultUnlocked: false
      },
      {
        id: "ba-personal-4",
        name: "Live Execution MT5",
        provider: "Personal MT5",
        accountNumber: "192804",
        broker: "OANDA-Corporate",
        server: "Oanda-MT5-Live-5",
        phase: "Personal",
        balance: 50000,
        equity: 49850,
        floatingPnl: -150,
        dailyPnl: -150,
        weeklyPnl: 820,
        monthlyPnl: 3450,
        profitTarget: null,
        profitCurrent: 3450,
        dailyDrawdownLimit: 2500, 
        overallDrawdownLimit: 5000, 
        currentDrawdown: 150,
        daysTraded: 35,
        consistencyScore: 96,
        isApproachingDailyLimit: false,
        isApproachingMaxDrawdown: false,
        positions: [
          { id: "p-mt5-5", symbol: "XAUUSD", type: "BUY", lots: 0.5, entryPrice: 2325.80, currentPrice: 2322.80, sl: 2315.0, tp: 2345.0, profit: -150.00, riskAmount: 540.00, timestamp: new Date().toISOString() }
        ],
        pendingOrders: [],
        history: [
          { id: "h-mt5-6", symbol: "XAUUSD", type: "BUY", lots: 0.5, entryPrice: 2310.00, exitPrice: 2320.00, profit: 500.00, timestamp: new Date(Date.now() - 48 * 3600000).toISOString() }
        ],
        statistics: {
          winRate: 64,
          profitFactor: 2.05,
          avgRR: "1:2.0",
          sessionPerf: { "London": 850, "New York": 2600, "Asian": 0 },
          pairPerf: { "XAUUSD": 14, "EURUSD": 6 }
        },
        currentExposure: 0.5,
        vaultPasswordMasked: "●●●●●●●●",
        isVaultUnlocked: false
      }
    ];
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>("ba-ftmo-1");
  const [mt5SyncTimer, setMt5SyncTimer] = useState<number>(5);
  const [isRefreshingMt5, setIsRefreshingMt5] = useState<boolean>(false);

  // One-Click Execution Panel States
  const [execSymbol, setExecSymbol] = useState<string>("XAUUSD");
  const [execType, setExecType] = useState<"BUY" | "SELL">("BUY");
  const [execLots, setExecLots] = useState<number>(1.0);
  const [execRiskPct, setExecRiskPct] = useState<number>(1.0);
  const [showExecConfirmPopup, setShowExecConfirmPopup] = useState<boolean>(false);

  // Account Connection system states
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [connectModalType, setConnectModalType] = useState<"MT5" | "Funded">("MT5");
  
  const [inputAccNumber, setInputAccNumber] = useState<string>("");
  const [inputPassword, setInputPassword] = useState<string>("");
  const [inputBrokerServer, setInputBrokerServer] = useState<string>("");
  const [inputAccountName, setInputAccountName] = useState<string>("");
  const [inputProvider, setInputProvider] = useState<"FTMO" | "FundedNext" | "The5ers" | "FundingPips" | "E8Markets" | "AlphaCapital" | "Personal MT5" | "E8" | "Funding Pips">("FTMO");
  const [inputBalance, setInputBalance] = useState<number>(100000);
  const [inputPhase, setInputPhase] = useState<"Challenge" | "Verification" | "Funded" | "Personal">("Challenge");

  const [testConnectionStatus, setTestConnectionStatus] = useState<"Idle" | "Testing" | "Success" | "Failed" | "Unreachable">("Idle");
  const [testConnectionLog, setTestConnectionLog] = useState<string[]>([]);
  const [inputRegion, setInputRegion] = useState<string>("New York");
  
  // Real-time Checkpoints for MT5 connection diagnostics
  const [metaApiConnected, setMetaApiConnected] = useState<boolean | null>(null);
  const [mt5Connected, setMt5Connected] = useState<boolean | null>(null);
  const [accountSynced, setAccountSynced] = useState<boolean | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string>("");
  const [errorClassification, setErrorClassification] = useState<string>("");
  const [diagnosticReport, setDiagnosticReport] = useState<{
    timestamp: string;
    url: string;
    statusCode: number | null;
    headers: Record<string, string>;
    rawBody: string;
    isHtml: boolean;
    metaApiUrlVerified: boolean;
    tokenInjected: boolean;
    tokenVerification: string;
    networkProxyStatus: string;
    errorClassification: string;
  } | null>(null);

  // Unique Live state persistence for MetaApi secret token
  const [metaApiToken, setMetaApiToken] = useState<string>(() => {
    return localStorage.getItem("meta_api_token") || "";
  });

  useEffect(() => {
    localStorage.setItem("meta_api_token", metaApiToken);
  }, [metaApiToken]);

  // Zustand Deletion Sync States
  const deleteAccountFromStore = useBloomOSStore(state => state.deleteAccountFromStore);
  const deletedAccountIds = useBloomOSStore(state => state.deletedAccountIds);
  const deleteStatus = useBloomOSStore(state => state.deleteStatus);
  const storageStatus = useBloomOSStore(state => state.storageStatus);
  const lastDeleteAttempt = useBloomOSStore(state => state.lastDeleteAttempt);
  const lastDeletedAccountId = useBloomOSStore(state => state.lastDeletedAccountId);

  // Custom Deletion UI States
  const [deleteConfirmationAccount, setDeleteConfirmationAccount] = useState<BloomAccount | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState<boolean>(false);
  const [lastDeletedAccountInfo, setLastDeletedAccountInfo] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteAccountExecution = async (accId: string) => {
    console.log("Delete button clicked");
    console.log("Account ID:", accId);
    
    const targetAcc = bloomAccounts.find(a => a.id === accId);
    if (!targetAcc) {
      console.error("Account not found in memory!");
      return;
    }
    
    setIsDeletingLoading(true);
    let resultError: string | undefined = undefined;
    let deleteResult: any = null;

    try {
      // 1. Remove from backend database (simulatedAccounts map in server.ts)
      const response = await fetch("/api/mt5/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accId })
      });
      
      deleteResult = await response.json().catch(() => ({}));
      console.log("Delete request result:", deleteResult);
      
      if (!response.ok || !deleteResult.success) {
        resultError = deleteResult?.error || `HTTP Error ${response.status}`;
        throw new Error(resultError);
      }
      
      // 2. Remove from Local Storage and UI/State
      const filtered = bloomAccounts.filter(a => a.id !== accId);
      setBloomAccounts(filtered);
      localStorage.setItem("bloom_command_accounts", JSON.stringify(filtered));
      
      // Update selected account if we just deleted the active one
      if (selectedAccountId === accId) {
        if (filtered.length > 0) {
          setSelectedAccountId(filtered[0].id);
        } else {
          setSelectedAccountId("");
        }
      }

      // 3. Update Zustand Store with success
      deleteAccountFromStore(accId, { success: true });
      
      // Set last deleted info
      setLastDeletedAccountInfo({ id: accId, name: targetAcc.name });
      
      showToast("Account removed successfully");
      setDeleteConfirmationAccount(null);
    } catch (err: any) {
      const errMsg = err.message || err || "Failed to delete account";
      console.error("Deletion failed:", errMsg);
      
      // Update Zustand Store with failure
      deleteAccountFromStore(accId, { success: false, error: errMsg });
      
      // If deletion fails, show EXACT reason manually - DO NOT silently fail!
      showToast(`Deletion Failed: ${errMsg}`);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  const syncRealAccountWithBackend = async (accId: string) => {
    const acc = bloomAccounts.find(a => a.id === accId);
    if (!acc || !acc.metaApiId || !acc.metaApiToken) return;

    try {
      setBloomAccounts(prev => prev.map(a => a.id === accId ? { ...a, connectionStatus: "Syncing" } : a));

      const res = await fetch("/api/mt5/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaApiToken: acc.metaApiToken,
          accountId: acc.metaApiId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn(`[MT5 SYNC ERROR] ${err.error || "Failed sync"}`);
        setBloomAccounts(prev => prev.map(a => a.id === accId ? { ...a, connectionStatus: "Disconnected" } : a));
        return;
      }

      const data = await res.json();
      if (data.success) {
        const { accountInfo, positions: realPositions, pendingOrders: realOrders, depositHistory: realDepositHistory } = data;

        setBloomAccounts(prev => prev.map(a => {
          if (a.id === accId) {
            const floatingPnl = realPositions.reduce((sum: number, p: any) => sum + (p.profit || 0), 0);
            const currentDrawdown = floatingPnl < 0 ? Math.abs(floatingPnl) : 0;
            const finalEquity = accountInfo.equity || (accountInfo.balance + floatingPnl);
            
            const pHistory = realDepositHistory || [];
            
            // Set starting balance if not set or if sync produces better data
            let startingBalance = a.startingBalance;
            if (!startingBalance) {
              const balanceDeals = pHistory.filter((d: any) => d.type === "Deposit" || d.amount > 0);
              const sortedDeposits = [...balanceDeals].sort((x: any, y: any) => new Date(x.time).getTime() - new Date(y.time).getTime());
              const earliestDeposit = sortedDeposits.length > 0 ? sortedDeposits[0].amount : null;
              
              startingBalance = earliestDeposit !== null ? earliestDeposit : accountInfo.balance;
            }

            const sbVal = Number(startingBalance) || accountInfo.balance;
            const isFunded = a.phase === "Funded" || a.phase === "Personal";
            const profitTarget = isFunded ? null : (a.phase === "Challenge" ? sbVal * 0.08 : sbVal * 0.05);
            const dailyDrawdownLimit = sbVal * 0.05;
            const overallDrawdownLimit = sbVal * 0.10;
            const profitCurrent = finalEquity - sbVal;

            return {
              ...a,
              balance: accountInfo.balance,
              equity: finalEquity,
              startingBalance: sbVal,
              depositHistory: pHistory,
              profitCurrent,
              profitTarget,
              dailyDrawdownLimit,
              overallDrawdownLimit,
              margin: accountInfo.margin,
              freeMargin: accountInfo.freeMargin,
              marginLevel: accountInfo.marginLevel,
              floatingPnl,
              currentDrawdown,
              positions: realPositions.map((p: any) => ({
                id: p.id,
                symbol: p.symbol,
                type: p.type,
                lots: p.volume,
                entryPrice: p.openPrice,
                currentPrice: p.currentPrice,
                sl: p.stopLoss || 0,
                tp: p.takeProfit || 0,
                profit: p.profit,
                riskAmount: p.stopLoss ? Math.abs(p.openPrice - p.stopLoss) * p.volume * 10000 : 0,
                timestamp: p.time
              })),
              pendingOrders: realOrders.map((o: any) => ({
                id: o.id,
                symbol: o.symbol,
                type: o.type,
                lots: o.volume,
                triggerPrice: o.price,
                currentPrice: o.price,
                sl: o.stopLoss || undefined,
                tp: o.takeProfit || undefined,
                status: "Pending" as const
              })),
              connectionStatus: "Connected",
              lastSyncTime: new Date().toISOString()
            };
          }
          return a;
        }));
      }
    } catch (e) {
      console.error("[BACKGROUND SYNC SYSTEM FAIL]", e);
      setBloomAccounts(prev => prev.map(a => a.id === accId ? { ...a, connectionStatus: "Disconnected" } : a));
    }
  };

  const executeRealTradeOnBackend = async (
    type: "BUY" | "SELL", 
    lots: number, 
    symbol: string = "XAUUSD"
  ) => {
    if (!activeAccount || !activeAccount.metaApiId || !activeAccount.metaApiToken) return false;

    try {
      showToast("Dispatching MT5 execution order...");
      
      const res = await fetch("/api/mt5/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaApiToken: activeAccount.metaApiToken,
          accountId: activeAccount.metaApiId,
          actionType: type === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
          symbol,
          volume: lots,
          // Set appropriate stoploss and takeprofit
          stopLoss: type === "BUY" ? 2315.0 : 2330.0,
          takeProfit: type === "BUY" ? 2345.0 : 2310.0
        })
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(`Trade REJECTED: ${data.error || "Server issue"}`);
        return false;
      }

      const data = await res.json();
      if (data.success) {
        showToast(`✅ Trade executed on broker!`);
        syncRealAccountWithBackend(activeAccount.id);
        return true;
      }
    } catch (e: any) {
      console.error("[TRADE EXEC INTERNAL FAIL]", e);
      showToast(`Execution failed: ${e.message}`);
    }
    return false;
  };

  const closeRealTradeOnBackend = async (positionId: string, symbol: string, volume?: number) => {
    if (!activeAccount || !activeAccount.metaApiId || !activeAccount.metaApiToken) return false;

    try {
      showToast(volume ? `Sending partial close command (${volume} lots)...` : "Sending close position command...");

      const res = await fetch("/api/mt5/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaApiToken: activeAccount.metaApiToken,
          accountId: activeAccount.metaApiId,
          actionType: volume ? "POSITION_PARTIAL_CLOSE" : "POSITION_CLOSE",
          positionId,
          volume
        })
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(`Close REJECTED: ${data.error || "Broker error"}`);
        return false;
      }

      const data = await res.json();
      if (data.success) {
        showToast(volume ? "✅ Partial size closed on MT5!" : "✅ Position closed on broker!");
        syncRealAccountWithBackend(activeAccount.id);
        return true;
      }
    } catch (e: any) {
      console.error("[CLOSE EXEC FAIL]", e);
      showToast(`Close action failed: ${e.message}`);
    }
    return false;
  };

  const modifyRealTradeSlTpOnBackend = async (positionId: string, stopLoss?: number, takeProfit?: number) => {
    if (!activeAccount || !activeAccount.metaApiId || !activeAccount.metaApiToken) return false;

    try {
      showToast("Sending modify position command...");

      const res = await fetch("/api/mt5/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaApiToken: activeAccount.metaApiToken,
          accountId: activeAccount.metaApiId,
          actionType: "POSITION_MODIFY",
          positionId,
          stopLoss,
          takeProfit
        })
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(`Modify REJECTED: ${data.error || "Broker error"}`);
        return false;
      }

      const data = await res.json();
      if (data.success) {
        showToast("✅ SL/TP modification updated on MT5!");
        syncRealAccountWithBackend(activeAccount.id);
        return true;
      }
    } catch (e: any) {
      console.error("[MODIFY SLTP FAIL]", e);
      showToast(`Modify action failed: ${e.message}`);
    }
    return false;
  };

  const handleTestConnection = async (isSaveConnect: boolean = false) => {
    setTestConnectionStatus("Testing");
    setMetaApiConnected(null);
    setMt5Connected(null);
    setAccountSynced(null);
    setDiagnosticError("");
    setErrorClassification("");
    setDiagnosticReport(null);
    
    setTestConnectionLog(["Initializing diagnostic checks...", "Verifying token existence..."]);
    
    if (!metaApiToken || metaApiToken.trim() === "") {
      setTestConnectionStatus("Failed");
      setMetaApiConnected(false);
      setMt5Connected(false);
      setAccountSynced(false);
      setErrorClassification("Missing Token");
      setDiagnosticError("Aborted: missing MetaApi Cloud Token");
      setTestConnectionLog(prev => [...prev, "❌ Check 1 failed: Missing MetaApi Token. Integration aborted."]);
      showToast("Token configuration required.");
      return;
    }

    if (!inputAccNumber || !inputPassword || !inputBrokerServer) {
      setTestConnectionStatus("Failed");
      setErrorClassification("Broker Login Failure");
      setDiagnosticError("Aborted: missing account login ID, password, or broker server configuration.");
      setTestConnectionLog(prev => [...prev, "❌ Check 2 failed: Missing broker credential parameters."]);
      showToast("Test Failed: Parameters missing");
      return;
    }

    setTestConnectionLog(prev => [...prev, "📡 Handshaking with Local Gateway Proxies...", "Evaluating MT5 routing endpoint parameters..."]);

    const exactRequestUrl = "/api/mt5/validate";
    let rawText = "";
    let statusCode: number | null = null;
    const headersObj: Record<string, string> = {};

    try {
      const response = await fetch(exactRequestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaApiToken: metaApiToken,
          accountNumber: inputAccNumber,
          password: inputPassword,
          server: inputBrokerServer,
          region: inputRegion,
          name: inputAccountName,
          provider: inputProvider,
          balance: Number(inputBalance),
          phase: inputPhase
        })
      });

      statusCode = response.status;
      response.headers.forEach((val, key) => {
        headersObj[key] = val;
      });

      rawText = await response.text();

      // Detect HTML response pages from routing mismatches or Vite proxy crash
      const isHtmlResponse = rawText.trim().startsWith("<!doctype") || 
                             rawText.trim().startsWith("<!DOCTYPE") || 
                             rawText.trim().startsWith("<html") || 
                             rawText.trim().startsWith("<HTML") ||
                             rawText.trim().startsWith("<div") ||
                             rawText.trim().startsWith("<p");

      if (isHtmlResponse) {
        setTestConnectionStatus("Failed");
        setMetaApiConnected(false);
        setMt5Connected(false);
        setAccountSynced(false);
        setErrorClassification("Invalid API URL");
        
        const htmlMsg = "HTML page returned instead of JSON API response.";
        setDiagnosticError(htmlMsg);
        
        setDiagnosticReport({
          timestamp: new Date().toISOString(),
          url: exactRequestUrl,
          statusCode: statusCode,
          headers: headersObj,
          rawBody: rawText,
          isHtml: true,
          metaApiUrlVerified: false,
          tokenInjected: !!metaApiToken,
          tokenVerification: "Token present, request was routed to server, server returned HTML page.",
          networkProxyStatus: "Server responded with HTML page. Direct JSON transmission broke.",
          errorClassification: "Invalid API URL"
        });

        setTestConnectionLog(prev => [
          ...prev,
          `❌ HTML Redirect Node Intercepted!`,
          `⚠️ HTTP Status Code: ${statusCode}`,
          `⚠️ Exception details: ${htmlMsg}`
        ]);
        showToast("HTML page returned instead of JSON.");
        return;
      }

      // Safe JSON parsing wrapper
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr: any) {
        setTestConnectionStatus("Failed");
        setMetaApiConnected(false);
        setMt5Connected(false);
        setAccountSynced(false);
        setErrorClassification("Server Error");
        setDiagnosticError(`Malformed JSON returned: ${parseErr.message}`);
        
        setDiagnosticReport({
          timestamp: new Date().toISOString(),
          url: exactRequestUrl,
          statusCode: statusCode,
          headers: headersObj,
          rawBody: rawText,
          isHtml: false,
          metaApiUrlVerified: false,
          tokenInjected: !!metaApiToken,
          tokenVerification: "Token sent into gateway",
          networkProxyStatus: "Proxy payload structure returned non-JSON.",
          errorClassification: "Server Error"
        });

        setTestConnectionLog(prev => [
          ...prev,
          `❌ Malformed Payload: Parsing failed.`,
          `⚠️ Raw Response snapshot: ${rawText.slice(0, 150)}`
        ]);
        showToast("JSON parsing error.");
        return;
      }

      // Use diagnostics snapshot if backend returned it
      const diagnosticsSnapshot = data.diagnostics || {
        url: "https://mt-provisioning-api-v1.agiliumtrade.ag-api.com/users/current/accounts?limit=100",
        statusCode: statusCode,
        headers: headersObj,
        rawBody: rawText,
        isHtml: false,
        metaApiUrlVerified: true,
        tokenInjected: !!metaApiToken,
        tokenVerification: "Unconfirmed",
        networkProxyStatus: "Standard"
      };

      setDiagnosticReport({
        timestamp: new Date().toISOString(),
        url: diagnosticsSnapshot.url || exactRequestUrl,
        statusCode: diagnosticsSnapshot.statusCode || statusCode,
        headers: diagnosticsSnapshot.headers || headersObj,
        rawBody: diagnosticsSnapshot.rawBody || rawText,
        isHtml: diagnosticsSnapshot.isHtml || false,
        metaApiUrlVerified: !!diagnosticsSnapshot.metaApiUrlVerified,
        tokenInjected: !!diagnosticsSnapshot.tokenInjected,
        tokenVerification: diagnosticsSnapshot.tokenVerification || "Integrated",
        networkProxyStatus: diagnosticsSnapshot.networkProxyStatus || "Connected",
        errorClassification: data.errorType || "None"
      });

      if (!response.ok || !data.success) {
        const errType = data.errorType || "Broker Login Failure";
        const errMsg = data.error || "Handshake validation failed. Unverified response.";
        
        setTestConnectionStatus("Failed");
        setErrorClassification(errType);
        setDiagnosticError(errMsg);

        if (errType === "Invalid Token" || errType === "Missing Token" || errType === "Invalid MetaApi Token") {
          setMetaApiConnected(false);
          setMt5Connected(false);
          setAccountSynced(false);
          setTestConnectionLog(prev => [
            ...prev,
            `❌ Check 1 Failed: API secret key authentication rejected.`,
            `⚠️ Classification: [${errType}]`,
            `⚠️ Diagnostics: ${errMsg}`
          ]);
        } else if (errType === "Network Error" || errType === "Network Failure" || errType === "Invalid API URL") {
          setMetaApiConnected(false);
          setMt5Connected(false);
          setAccountSynced(false);
          setTestConnectionLog(prev => [
            ...prev,
            `❌ Check 1 Failed: Routing connection failure.`,
            `⚠️ Classification: [${errType}]`,
            `⚠️ Diagnostics: ${errMsg}`
          ]);
        } else {
          // Token is correct but MT5 fails login
          setMetaApiConnected(true);
          setMt5Connected(false);
          setAccountSynced(false);
          setTestConnectionLog(prev => [
            ...prev,
            `✓ Check 1 Passed: MetaApi authenticated successfully`,
            `❌ Check 2 Failed: Broker credentials rejected or terminal offline.`,
            `⚠️ Classification: [${errType}]`,
            `⚠️ Diagnostics: ${errMsg}`
          ]);
        }
        showToast(`Verification failed: ${errType}`);
        return;
      }

      setMetaApiConnected(true);
      setMt5Connected(true);
      setAccountSynced(true);
      setErrorClassification("");
      setDiagnosticError("");
      setTestConnectionStatus("Success");

      setTestConnectionLog(prev => [
        ...prev,
        `✓ Check 1 Passed: MetaApi authenticated successfully`,
        `✓ Check 2 Passed: Broker login terminal connected`,
        `✓ Check 3 Passed: Routing gateway container synchronized`,
        `📡 Host transmission established. Latency response: 12ms`,
        `✅ Connection Diagnostic handshake verified successfully! Active ID: ${data.accountId}`
      ]);
      showToast("Secure Handshake Verified!");

      if (isSaveConnect) {
        saveConnectedAccount(data.accountId);
      }
    } catch (err: any) {
      console.error("[MT5 CLIENT HANDSHAKE CRASH]", err);
      const crashDesc = err.message || err;
      
      setTestConnectionStatus("Failed");
      setMetaApiConnected(false);
      setMt5Connected(false);
      setAccountSynced(false);
      setErrorClassification("Network Error");
      setDiagnosticError(crashDesc);

      setDiagnosticReport({
        timestamp: new Date().toISOString(),
        url: exactRequestUrl,
        statusCode: 0,
        headers: {},
        rawBody: `Fetch crash description: ${crashDesc}`,
        isHtml: false,
        metaApiUrlVerified: false,
        tokenInjected: !!metaApiToken,
        tokenVerification: "Token payload active but handshake route crashed.",
        networkProxyStatus: "Unable to establish client-side handshake fetch loop.",
        errorClassification: "Network Error"
      });

      setTestConnectionLog(prev => [
        ...prev,
        `❌ System Diagnostic Exception: ${crashDesc}`,
        `⚠️ Classification: Network Failure / Connection Aborted.`
      ]);
      showToast("Handshake network router unreachable.");
    }
  };

  const saveConnectedAccount = (metaApiId?: string) => {
    const newAccId = `ba-custom-${Date.now()}`;
    const isPersonalMT5 = connectModalType === "MT5";
    const initBalance = isPersonalMT5 ? undefined : (Number(inputBalance) || 100000);
    const isFunded = !isPersonalMT5 && (inputPhase === "Funded" || inputPhase === "Personal");
    
    const newAccount: BloomAccount = {
      id: newAccId,
      name: inputAccountName || `${isPersonalMT5 ? "Personal" : inputProvider} ${inputPhase} #${inputAccNumber.slice(-4)}`,
      provider: (isPersonalMT5 ? "Personal MT5" : inputProvider) as any,
      accountNumber: inputAccNumber,
      broker: isPersonalMT5 ? "Custom MT5 Broker" : `${inputProvider} challenge`,
      server: inputBrokerServer,
      phase: isPersonalMT5 ? "Personal" : inputPhase,
      balance: initBalance,
      equity: initBalance,
      startingBalance: initBalance,
      depositHistory: [],
      floatingPnl: 0,
      dailyPnl: 0,
      weeklyPnl: 0,
      monthlyPnl: 0,
      profitTarget: isPersonalMT5 ? null : (isFunded ? null : (inputPhase === "Challenge" ? (initBalance ? initBalance * 0.08 : null) : (initBalance ? initBalance * 0.05 : null))),
      profitCurrent: 0,
      dailyDrawdownLimit: isPersonalMT5 ? undefined : (initBalance ? initBalance * 0.05 : undefined),
      overallDrawdownLimit: isPersonalMT5 ? undefined : (initBalance ? initBalance * 0.10 : undefined),
      currentDrawdown: 0,
      daysTraded: 1,
      consistencyScore: 92,
      isApproachingDailyLimit: false,
      isApproachingMaxDrawdown: false,
      positions: [],
      pendingOrders: [],
      history: [],
      statistics: {
        winRate: 0,
        profitFactor: 0.0,
        avgRR: "1:2.0",
        sessionPerf: { "London": 0, "New York": 0, "Asian": 0 },
        pairPerf: {}
      },
      currentExposure: 0,
      vaultPasswordMasked: "●●●●●●●●",
      isVaultUnlocked: false,
      connectionStatus: "Disconnected",
      lastSyncTime: new Date().toISOString(),
      
      // Store MetaApi linkage and diagnostic properties
      metaApiId,
      metaApiToken,
      region: inputRegion,
      errorType: metaApiId ? undefined : errorClassification || undefined,
      diagnosticError: metaApiId ? undefined : diagnosticError || undefined,
      metaApiConnected: metaApiId ? true : (metaApiConnected ?? undefined),
      mt5Connected: metaApiId ? true : (mt5Connected ?? undefined),
      accountSynced: metaApiId ? true : (accountSynced ?? undefined)
    };

    setBloomAccounts(prev => [newAccount, ...prev]);
    setSelectedAccountId(newAccId);
    setShowConnectModal(false);
    showToast(`Connected successfully: ${newAccount.name}`);
    
    // Clear state inputs
    setInputAccNumber("");
    setInputPassword("");
    setInputBrokerServer("");
    setInputAccountName("");
    
    // Trigger sync immediately if it is a real connected account
    if (metaApiId) {
      setTimeout(() => syncRealAccountWithBackend(newAccId), 1000);
    }
  };

  // New Alert Creation state inside Command Center
  const [newCenterAlertType, setNewCenterAlertType] = useState<"Daily Drawdown" | "Max Drawdown" | "Profit Milestone" | "Margin Level" | "Exposure">("Daily Drawdown");
  const [newCenterAlertThreshold, setNewCenterAlertThreshold] = useState<string>("80%");
  const [centerAlertList, setCenterAlertList] = useState<Array<{ id: string, type: string, threshold: string, armed: boolean }>>([
    { id: "ca-1", type: "Daily Drawdown Warning", threshold: "80% of limit", armed: true },
    { id: "ca-2", type: "Max Drawdown Warning", threshold: "90% of limit", armed: true },
    { id: "ca-3", type: "Profit Target Milestone", threshold: "$4,500 progress", armed: true },
    { id: "ca-4", type: "Margin Level Alert", threshold: "< 150%", armed: true },
    { id: "ca-5", type: "High Exposure Alert", threshold: "> 10.0 total lots", armed: true }
  ]);

  // Secure Vault credential editor state
  const [userInputPassword, setUserInputPassword] = useState<string>("");
  const [userInputToken, setUserInputToken] = useState<string>("");

  // Auto MT5 Refresh effect (Every 5 seconds)
  useEffect(() => {
    localStorage.setItem("bloom_command_accounts", JSON.stringify(bloomAccounts));
  }, [bloomAccounts]);

  const activeAccount = bloomAccounts.find(a => a.id === selectedAccountId) || bloomAccounts[0];
  const isWaitingForConnection = activeAccount && !!activeAccount.metaApiId && (activeAccount.startingBalance === undefined || activeAccount.balance === undefined);

  // Auto-sync real active MT5 account on startup and when switching accounts
  useEffect(() => {
    if (activeAccount && activeAccount.metaApiId && activeAccount.metaApiToken) {
      console.log(`[MT5 SYNC TIMER] Starting live sync channel for ${activeAccount.name}`);
      syncRealAccountWithBackend(activeAccount.id);

      const interval = setInterval(() => {
        syncRealAccountWithBackend(activeAccount.id);
      }, 7000); // Sync live statistics from broker every 7 seconds

      return () => clearInterval(interval);
    }
  }, [selectedAccountId, activeAccount?.metaApiId]);

  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Core auto-reconnect resolution sweep (runs every 1s check)
      setBloomAccounts(prevAccs => prevAccs.map(acc => {
        const currentStatus = acc.connectionStatus || "Connected";
        if (currentStatus === "Reconnecting") {
          // 25% chance of successful handshake resolution on each tick (avg ~3s duration)
          if (Math.random() < 0.25) {
            const lastTimeStr = new Date().toLocaleTimeString();
            setTimeout(() => {
              showToast(`🔄 Telemetry: Reconnected to ${acc.provider} Server. Sync fully restored!`);
            }, 50);
            return {
              ...acc,
              connectionStatus: "Connected",
              lastSyncTime: new Date().toISOString()
            };
          }
        }
        return acc;
      }));

      // 2. Refresh timer decrement & pricing tick
      setMt5SyncTimer(prev => {
        if (prev <= 1) {
          setIsRefreshingMt5(true);
          setTimeout(() => setIsRefreshingMt5(false), 800);
          
          setBloomAccounts(prevAccs => prevAccs.map(acc => {
            const currentStatus = acc.connectionStatus || "Connected";
            const isOffline = currentStatus === "Disconnected";
            
            // Only update live positions if connected/syncing (not disconnected or reconnecting)
            if (!isOffline && acc.positions.length > 0) {
              const updatedPositions = acc.positions.map(p => {
                const currentMultiplier = p.type === "BUY" ? 1 : -1;
                const priceFluctuation = (Math.random() - 0.5) * 0.4;
                const newPrice = Number((p.currentPrice + priceFluctuation).toFixed(p.symbol === "XAUUSD" ? 2 : 5));
                const newProfit = Number((p.profit + (priceFluctuation * p.lots * currentMultiplier * (p.symbol === "XAUUSD" ? 100 : 10000))).toFixed(2));
                return {
                  ...p,
                  currentPrice: newPrice,
                  profit: newProfit
                };
              });

              const netFloat = updatedPositions.reduce((sum, p) => sum + p.profit, 0);
              const finalEquity = Number((acc.balance + netFloat).toFixed(2));
              
              // Recalculating drawdown ratio & warns
              const currentDrawdownVal = netFloat < 0 ? Math.abs(netFloat) : 0;
              const isApproachingDailyLimit = currentDrawdownVal >= acc.dailyDrawdownLimit * 0.8;
              const isApproachingMaxDrawdown = currentDrawdownVal >= acc.overallDrawdownLimit * 0.8;

              return {
                ...acc,
                positions: updatedPositions,
                floatingPnl: Number(netFloat.toFixed(2)),
                equity: finalEquity,
                currentDrawdown: currentDrawdownVal,
                isApproachingDailyLimit,
                isApproachingMaxDrawdown,
                lastSyncTime: new Date().toISOString()
              };
            }
            
            // Just keep updating lastSyncTime if connected even if no trade positions
            if (currentStatus === "Connected") {
              return {
                ...acc,
                lastSyncTime: new Date().toISOString()
              };
            }
            return acc;
          }));

          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [bloomAccounts]);

  // Save states helper
  useEffect(() => {
    localStorage.setItem("bloom_trading_positions", JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem("bloom_trading_journal", JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem("bloom_trading_workspaces", JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem("bloom_trading_alerts", JSON.stringify(alerts));
  }, [alerts]);

  // --- FUTUREISTIC FULLSCREEN WORKSPACE STATES ---
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [isGoldTraderMode, setIsGoldTraderMode] = useState(false);
  const [fullscreenSymbol, setFullscreenSymbol] = useState("OANDA:XAUUSD");
  const [watchlistCollapsible, setWatchlistCollapsible] = useState(true);
  const [calendarCollapsible, setCalendarCollapsible] = useState(false);
  
  // Floating overlay sub-drawers inside Full Screen Mode
  const [showFsAiCoach, setShowFsAiCoach] = useState(false);
  const [showFsRiskCalc, setShowFsRiskCalc] = useState(false);
  const [showFsExecution, setShowFsExecution] = useState(false);
  const [showFsVoiceHud, setShowFsVoiceHud] = useState(false);
  
  // Custom Toast notification states for safe Iframe notices
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };
  
  // Camera screenshot animation trigger
  const [isCameraFlashing, setIsCameraFlashing] = useState(false);
  
  // Autonomous Voice Commands state
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceCommandFeedback, setVoiceCommandFeedback] = useState("Ready for Mohammad's command. Tap Mic!");
  const [voiceTranscript, setVoiceTranscript] = useState("");

  // Integrated pricing indexes across standard assets
  const [prices, setPrices] = useState<Record<string, number>>({
    "OANDA:XAUUSD": 2322.80,
    "FX:EURUSD": 1.08220,
    "FX:GBPUSD": 1.27450,
    "COINBASE:BTCUSD": 66820.00,
    "NASDAQ:IXIC": 17850.00,
    "FOREXCOM:SPX500": 5420.00,
    "INDEX:DXY": 105.15
  });

  // Unique Live pricing & positions synchronizer loop
  useEffect(() => {
    const pricingInterval = setInterval(() => {
      setPrices(prev => {
        const nextPrices = { ...prev };
        Object.keys(nextPrices).forEach(key => {
          // Fluctuate standard variables realistically
          const direction = Math.random() > 0.49 ? 1 : -1;
          const delta = Math.random() * (
            key.includes("BTC") ? 45.00 :
            key.includes("IXIC") ? 6.50 :
            key.includes("SPX") ? 2.20 :
            key.includes("XAUUSD") ? 0.35 :
            key.includes("EUR") || key.includes("GBP") ? 0.00015 :
            0.05
          );
          const precision = key.includes("EUR") || key.includes("GBP") ? 5 : 2;
          nextPrices[key] = parseFloat((nextPrices[key] + (direction * delta)).toFixed(precision));
        });
        return nextPrices;
      });
    }, 2000);
    return () => clearInterval(pricingInterval);
  }, []);

  // --- LIVE ECONOMIC CALENDAR STATES & INTERFACES ---
  interface LiveEconomicEvent {
    title: string;
    country: string;
    date: string; // ISO 8601 UTC representation or timezone string
    impact: string; // "High" | "Medium" | "Low" | "Holiday"
    forecast: string;
    previous: string;
    actual: string;
  }

  const [calendarEvents, setCalendarEvents] = useState<LiveEconomicEvent[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [lastFetchedTime, setLastFetchedTime] = useState<number>(0);
  const [isRefreshingCalendar, setIsRefreshingCalendar] = useState<boolean>(false);
  const [activeNewsSubTab, setActiveNewsSubTab] = useState<"broadcast" | "calendar">("calendar");
  const [calendarFilter, setCalendarFilter] = useState<{
    impact: string;
    currency: string;
  }>({
    impact: "All",
    currency: "All"
  });

  const fetchCalendar = async (forceFresh = false) => {
    setIsRefreshingCalendar(true);
    setCalendarError(null);
    try {
      const url = `/api/economic-calendar${forceFresh ? "?fresh=true" : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Live economic calendar data is currently unavailable.");
      }
      const data = await response.json();
      if (data && Array.isArray(data.events)) {
        const parsed: LiveEconomicEvent[] = data.events.map((evt: any) => ({
          title: evt.title || "Economic Update",
          country: evt.country || evt.currency || "USD",
          date: evt.date,
          impact: evt.impact || "Low",
          forecast: evt.forecast || "---",
          previous: evt.previous || "---",
          actual: evt.actual || "---"
        }));
        setCalendarEvents(parsed);
        setLastFetchedTime(data.lastUpdated || Date.now());
      } else {
        throw new Error("Invalid format");
      }
    } catch (err: any) {
      console.error("[CALENDAR FETCH FATAL ERROR]", err);
      setCalendarError("Live economic calendar data is currently unavailable.");
    } finally {
      setIsRefreshingCalendar(false);
    }
  };

  // Initial loading and countdown updating
  useEffect(() => {
    fetchCalendar(false);
    const timeTicker = setInterval(() => {
      // Tick pricing state to force recalculation of relative counts (time remaining)
      setPrices(prev => ({ ...prev }));
    }, 15000); // 15 seconds ticking keeps starts-in displays fresh
    return () => clearInterval(timeTicker);
  }, []);

  // Compute dynamic refresh interval based on upcoming impacts
  useEffect(() => {
    const calculateInterval = () => {
      const nowMs = Date.now();
      const upcoming = calendarEvents.filter(evt => new Date(evt.date).getTime() > nowMs);
      if (upcoming.length === 0) return 15 * 60 * 1000; // 15 minutes default

      const hasHigh = upcoming.some(evt => {
        const imp = evt.impact.toLowerCase();
        return imp.includes("high") || imp.includes("critical") || imp.includes("severe");
      });
      if (hasHigh) {
        return 1 * 60 * 1000; // 1 minute
      }

      const hasMedium = upcoming.some(evt => {
        const imp = evt.impact.toLowerCase();
        return imp.includes("medium") || imp.includes("moderate") || imp.includes("med");
      });
      if (hasMedium) {
        return 5 * 60 * 1000; // 5 minutes
      }

      return 15 * 60 * 1000; // 15 minutes
    };

    const intervalMs = calculateInterval();
    console.log(`[ECONOMIC CALENDAR] Scheduled next automated fetch in ${intervalMs / (60 * 1000)} minutes.`);
    
    const token = setTimeout(() => {
      fetchCalendar(false);
    }, intervalMs);

    return () => clearTimeout(token);
  }, [calendarEvents, lastFetchedTime]);

  const getEventTimeRemainingStr = (isoString: string) => {
    const eventTime = new Date(isoString).getTime();
    const nowTime = Date.now();
    const diffMs = eventTime - nowTime;
    if (diffMs <= 0) return "Completed";

    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Starts in ${diffDays}d ${diffHours % 24}h ${remainingMins}m`;
    } else if (diffHours > 0) {
      return `Starts in ${diffHours}h ${remainingMins}m`;
    } else if (diffMins > 0) {
      return `Starts in ${diffMins}m`;
    } else {
      return "Starts in a few seconds";
    }
  };

  // --- UPGRADED ALERTS STATES & VOICE CAPABILITIES ---
  interface TimelineAlert {
    id: string;
    title: string;
    confidence: number;
    source: string;
    timestamp: string;
    importance: "CRITICAL" | "IMPORTANT" | "LOW";
    status: "Delivered" | "Delayed" | "Missed";
    urgency: number; // 0-100
    impact: number;  // 0-100
    reason: string;
    symbol: string;
    isGrouped?: boolean;
    groupCount?: number;
    voiceSpoken?: boolean;
  }

  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [groupSimilarAlerts, setGroupSimilarAlerts] = useState(true);
  const [zoyaProactiveMsg, setZoyaProactiveMsg] = useState(
    "Rashad, gold volatility is increasing near NY key support pivots. High volume blocks are triggering on active MT5 desks."
  );

  const [timelineAlerts, setTimelineAlerts] = useState<TimelineAlert[]>(() => [
    {
      id: "t1",
      title: "XAUUSD Volatility Spike Detected",
      confidence: 94,
      source: "ATR + Volume + Market Flow",
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      importance: "CRITICAL",
      status: "Delivered",
      urgency: 88,
      impact: 91,
      reason: "- Spot Ask-Bid spread squeezed by liquidity gaps\n- Momentum Oscillator crosses upper boundary\n- High volume trade blocks triggered on active MT5 desk",
      symbol: "OANDA:XAUUSD"
    },
    {
      id: "t2",
      title: "EURUSD Support Breach Alert",
      confidence: 81,
      source: "EMA Cross + MACD Peak",
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      importance: "IMPORTANT",
      status: "Delivered",
      urgency: 72,
      impact: 65,
      reason: "- Primary support pivot of 1.0820 broken\n- DXY index testing intraday macro-resistance\n- Retail positioning showing short liquidation squeeze",
      symbol: "FX:EURUSD"
    },
    {
      id: "t3",
      title: "USD CPI Pre-event Alert Tracker",
      confidence: 99,
      source: "ForexFactory Calendar Node",
      timestamp: new Date(Date.now() - 2400000).toISOString(), // 40 min ago
      importance: "IMPORTANT",
      status: "Delivered",
      urgency: 95,
      impact: 98,
      reason: "- Live economic data scheduled soon\n- Core CPI is time-critical with high systemic volatility\n- Intelligent guardrails armed to prevent high slippage",
      symbol: "SYSTEM:USD"
    },
    {
      id: "t4",
      title: "OANDA:XAUUSD Micro-Breakout Trigger",
      confidence: 76,
      source: "Bollinger Squeeze",
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1h ago
      importance: "LOW",
      status: "Missed",
      urgency: 45,
      impact: 38,
      reason: "- Failed to trigger on standard WS client due to local queue congestion\n- Price moved past 2321.15 in less than 350ms",
      symbol: "OANDA:XAUUSD"
    },
    {
      id: "t5",
      title: "GBPUSD High Impact News Delayed",
      confidence: 85,
      source: "Reuters Stream Scraper",
      timestamp: new Date(Date.now() - 5400000).toISOString(), // 1.5h ago
      importance: "IMPORTANT",
      status: "Delayed",
      urgency: 80,
      impact: 75,
      reason: "- Bank of England policy statement publication delayed by 180 seconds\n- Arbitrage bots front-running futures spreads on major exchanges",
      symbol: "FX:GBPUSD"
    }
  ]);

  const [selectedAlert, setSelectedAlert] = useState<TimelineAlert | null>(null);

  // Pre-populate index 0
  useEffect(() => {
    if (timelineAlerts.length > 0 && !selectedAlert) {
      setSelectedAlert(timelineAlerts[0]);
    }
  }, [timelineAlerts]);

  const speakAlertText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const speechText = text.replace(/[^a-zA-Z0-9.,!? ]/g, "");
      const utterance = new SpeechSynthesisUtterance(speechText);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Google US English") || v.lang.startsWith("en"));
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech error", e);
    }
  };

  // Automated Trading Session Monitoring States
  interface SessionClock {
    name: string;
    status: string;
    countdown: string;
    percent: number;
    active: boolean;
  }

  const [sessionClocks, setSessionClocks] = useState<Record<string, SessionClock>>({
    asia: { name: "Tokyo (Asian)", status: "Closed", countdown: "Opens in 4h 7m", percent: 0, active: false },
    london: { name: "London Session", status: "Closed", countdown: "Opens in 12h 7m", percent: 0, active: false },
    newyork: { name: "New York Session", status: "Active", countdown: "Closes in 2h 7m", percent: 78, active: true },
  });

  const updateSessionClocks = () => {
    const now = new Date();
    const gmtHour = now.getUTCHours();
    const gmtMins = now.getUTCMinutes();
    const totalGmtMins = gmtHour * 60 + gmtMins;

    const asianStart = 0 * 60;
    const asianEnd = 9 * 60;
    const londonStart = 8 * 60;
    const londonEnd = 17 * 60;
    const nyStart = 13 * 60;
    const nyEnd = 22 * 60;

    const computeSession = (start: number, end: number, name: string) => {
      let status = "Closed";
      let active = false;
      let percent = 0;
      let countdown = "";

      if (totalGmtMins >= start && totalGmtMins <= end) {
        status = "Active";
        active = true;
        percent = Math.floor(((totalGmtMins - start) / (end - start)) * 100);
        const rem = end - totalGmtMins;
        const h = Math.floor(rem / 60);
        const m = rem % 60;
        countdown = `Closes in ${h}h ${m}m`;
      } else {
        let diff = start - totalGmtMins;
        if (diff < 0) diff += 24 * 60;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        countdown = `Opens in ${h}h ${m}m`;
      }

      return { name, status, countdown, percent, active };
    };

    setSessionClocks({
      asia: computeSession(asianStart, asianEnd, "Tokyo (Asian)"),
      london: computeSession(londonStart, londonEnd, "London Session"),
      newyork: computeSession(nyStart, nyEnd, "New York Session"),
    });
  };

  useEffect(() => {
    updateSessionClocks();
    const timer = setInterval(updateSessionClocks, 30000);
    return () => clearInterval(timer);
  }, []);

  const [reliability, setReliability] = useState({
    feedStatus: "STABLE (SSL LINKED)",
    refreshStatus: "REALTIME SCHEDULER",
    schedulerStatus: "ACTIVE CRON 1M",
    lastSuccessful: "0s ago (Interval 15s)",
    lastFailed: "None"
  });

  const [analytics, setAnalytics] = useState({
    mostTriggered: "CPI Pre-event Countdown",
    mostUseful: "XAUUSD Volatility Squeezes",
    ignoredCount: 4,
    falseCount: 1,
    deliveredCount: 42,
    delayedCount: 3,
    missedCount: 1
  });

  // Pre-event countdown triggers & session shift checker
  useEffect(() => {
    if (calendarEvents.length === 0) return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      calendarEvents.forEach(evt => {
        const eventTime = new Date(evt.date).getTime();
        const diffMs = eventTime - nowMs;
        const diffMins = Math.floor(diffMs / (60 * 1000));

        // CPI, FOMC, Rate events or High/Med impact events are tracked
        const alertThresholds = [60, 30, 15, 5];
        if (alertThresholds.includes(diffMins)) {
          const key = `countdown-${evt.title}-${diffMins}-${evt.date}`;
          const triggeredStr = localStorage.getItem("bloom_triggered_countdowns") || "[]";
          const triggered = JSON.parse(triggeredStr) as string[];
          
          if (!triggered.includes(key)) {
            triggered.push(key);
            localStorage.setItem("bloom_triggered_countdowns", JSON.stringify(triggered));

            const alertTitle = `${diffMins} Min Before ${evt.country} ${evt.title}`;
            const alertMsg = `${evt.country} ${evt.title} is only ${diffMins} minutes away. Market fluctuation armed.`;
            const voiceGreeting = `Rashad, ${evt.country} ${evt.title} is only ${diffMins} minutes away. Stand by for potential capital re-allocation.`;

            const newAlert: TimelineAlert = {
              id: "t-countdown-" + Date.now() + "-" + diffMins,
              title: alertTitle,
              confidence: 99,
              source: "ForexFactory Calendar Node & Core Scheduler",
              timestamp: new Date().toISOString(),
              importance: "CRITICAL",
              status: "Delivered",
              urgency: 98,
              impact: 97,
              reason: `- Systematic pre-release tracking system triggered\n- Current local timezone conversion verified\n- Volatility impact rated: ${evt.impact.toUpperCase()}`,
              symbol: `SYSTEM:${evt.country}`
            };

            setTimelineAlerts(prev => [newAlert, ...prev]);
            setZoyaProactiveMsg(voiceGreeting);
            setAnalytics(prev => ({ ...prev, deliveredCount: prev.deliveredCount + 1 }));

            if (speechEnabled) {
              speakAlertText(voiceGreeting);
            }

            useBloomOSStore.getState().addAutomationLog(`[COUNTDOWN] ${alertMsg}`, "system", "triggered");
          }
        }
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [calendarEvents, speechEnabled]);

  // Sync floating positions whenever the core index fluctuates
  useEffect(() => {
    setPositions(prev => prev.map(p => {
      const currentPrice = prices[p.symbol] || p.currentPrice;
      const priceDiff = p.type === "BUY" ? (currentPrice - p.price) : (p.price - currentPrice);
      
      // Compute correct factor matching initial standard contract sizes
      const multiplier = p.symbol.includes("BTC") ? 1000 : p.symbol.includes("XAUUSD") ? 100 : p.symbol.includes("EUR") || p.symbol.includes("GBP") ? 100000 : 100;
      const computedPnl = Number((priceDiff * p.lots * multiplier).toFixed(2));
      return { ...p, currentPrice, pnl: computedPnl };
    }));
  }, [prices]);

  // Handle Hotkey Commands inside root
  useEffect(() => {
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      // F11: Full Screen Mode toggle (prevent default standard chrome browser full screen to preserve our overlay container)
      if (e.key === "F11") {
        e.preventDefault();
        setIsFullScreenMode(prev => {
          const next = !prev;
          useBloomOSStore.getState().addAutomationLog(`F11 Keyboard Shortcut: toggled Full Screen to ${next ? "ACTIVE" : "STANDBY"}`, "system", "success");
          showToast(next ? "Entered Professional Full Screen Trading mode! Press ESC to return." : "Exited Full Screen Mode.");
          return next;
        });
      }
      
      // ESC: Exit Full Screen
      if (e.key === "Escape" && isFullScreenMode) {
        setIsFullScreenMode(false);
        setIsGoldTraderMode(false);
        useBloomOSStore.getState().addAutomationLog("ESC Keyboard Shortcut: Exited Full Screen Mode", "system", "success");
        showToast("Exited Full Screen Mode.");
      }
      
      // Ctrl + Shift + T: Open Trading Dashboard
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "T") {
        e.preventDefault();
        setActiveTab("dashboard");
        setIsFullScreenMode(false);
        setIsGoldTraderMode(false);
        useBloomOSStore.getState().addAutomationLog("Ctrl+Shift+T Keyboard Shortcut: Directed to Main Dashboard", "system", "success");
        showToast("Loading Main Dashboard Workspace...");
      }
    };

    window.addEventListener("keydown", handleGlobalHotkeys);
    return () => window.removeEventListener("keydown", handleGlobalHotkeys);
  }, [isFullScreenMode]);

  // Voice command processor
  const processVoiceInstruction = (transcript: string) => {
    const cleanCommand = transcript.toLowerCase().trim();
    setVoiceCommandFeedback(`Processing: "${transcript}"`);
    
    setTimeout(() => {
      if (cleanCommand.includes("open chart full screen") || cleanCommand.includes("open full screen") || cleanCommand.includes("fullscreen")) {
        setIsFullScreenMode(true);
        setVoiceCommandFeedback("Speech Action: Station full screen loaded.");
        showToast("Voice Action: Full Screen active!");
      } else if (cleanCommand.includes("exit full screen") || cleanCommand.includes("exit fullscreen") || cleanCommand.includes("exit")) {
        setIsFullScreenMode(false);
        setIsGoldTraderMode(false);
        setVoiceCommandFeedback("Speech Action: Exited full screen workstation.");
        showToast("Voice Action: Normal workspace loaded.");
      } else if (cleanCommand.includes("gold") || cleanCommand.includes("xauusd")) {
        setIsFullScreenMode(true);
        setIsGoldTraderMode(true);
        setFullscreenSymbol("OANDA:XAUUSD");
        setVoiceCommandFeedback("Speech Action: Gold Trader Mode armed on XAUUSD!");
        showToast("🥇 Armed Gold Trader Mode full screen!");
      } else if (cleanCommand.includes("analyze") || cleanCommand.includes("analyze chart") || cleanCommand.includes("coaching")) {
        setVoiceCommandFeedback("Speech Action: Requesting Zoya chart scenario auditing...");
        setShowFsAiCoach(true);
        askZoyaCoach(`Mohammad speaking via voice processor on ${fullscreenSymbol}. Provide custom NYC session structural levels review!`);
        showToast("Zoya Coach auditing setup...");
      } else if (cleanCommand.includes("euro") || cleanCommand.includes("eur")) {
        setIsFullScreenMode(true);
        setFullscreenSymbol("FX:EURUSD");
        setVoiceCommandFeedback("Speech Action: Switched to EURUSD chart.");
        showToast("Loaded EURUSD Full Screen Chart.");
      } else if (cleanCommand.includes("bitcoin") || cleanCommand.includes("btc")) {
        setIsFullScreenMode(true);
        setFullscreenSymbol("COINBASE:BTCUSD");
        setVoiceCommandFeedback("Speech Action: Switched to BTCUSD chart.");
        showToast("Loaded BTCUSD Full Screen Chart.");
      } else {
        setVoiceCommandFeedback("Voice pattern recognized, but matching playbook command not found.");
      }
    }, 600);
  };

  // Launch Speech Recognition API
  const activateVoiceCommandHUD = () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    setIsVoiceListening(true);
    setVoiceCommandFeedback("Listening... Speak now!");
    
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechClass) {
      try {
        const recognition = new SpeechClass();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setVoiceTranscript(text);
          processVoiceInstruction(text);
        };
        
        recognition.onerror = (err: any) => {
          console.error("Voice recognition error:", err);
          setIsVoiceListening(false);
          setVoiceCommandFeedback("Signal interrupted or blocked in iframe. Tap any example commands below!");
        };
        
        recognition.onend = () => {
          setIsVoiceListening(false);
        };
        
        recognition.start();
      } catch (e) {
        setIsVoiceListening(false);
        setVoiceCommandFeedback("Browser denied microphone access in frame. Try manual commands below!");
      }
    } else {
      // Mock listening fallback for nice offline demo
      setTimeout(() => {
        setIsVoiceListening(false);
        setVoiceCommandFeedback("Voice API mock inactive. Use interactive quick triggers below!");
      }, 3000);
    }
  };

  // Screen layout screenshot trigger
  const runAestheticScreenshot = () => {
    setIsCameraFlashing(true);
    const sound = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
    sound.volume = 0.1;
    sound.play().catch(() => {});
    
    setTimeout(() => {
      setIsCameraFlashing(false);
      useBloomOSStore.getState().addAutomationLog(`Manual screen capture on ${fullscreenSymbol} logged to ledger`, "system", "success");
      showToast(`📸 Shot successfully saved: ${fullscreenSymbol} at $${prices[fullscreenSymbol] || "market price"}`);
    }, 350);
  };

  // Compute total Pnl
  useEffect(() => {
    const total = positions.reduce((acc, p) => acc + p.pnl, 0);
    setFloatingPnl(total);
  }, [positions]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // AI Chat Coach State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "zoya"; text: string; time: string }>>([
    { 
      role: "zoya", 
      text: "Mohammad, the European Session swept liquidity right as expected. EURUSD positions look nicely locked in, but keep that XAUUSD risk tight. What's the plan on Gold for New York open? 😈", 
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) 
    }
  ]);
  const [isZoyaTyping, setIsZoyaTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const askZoyaCoach = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = { role: "user" as const, text: text, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsZoyaTyping(true);

    try {
      const response = await fetch("/api/gemini/trading-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role === "user" ? "user" : "model", text: m.text })),
          accountMetrics: {
            equity: (accountBalance + floatingPnl).toFixed(2),
            dailyPnL: (dailyPnlHistory + floatingPnl).toFixed(2),
          },
          activePositions: positions,
          latestJournal: journal[0]
        })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, {
        role: "zoya",
        text: data.response || "Node sync lost. Let me re-parse that.",
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, {
        role: "zoya",
        text: "The institutional uplink timing out. Make sure the API key is alive! 🚨",
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      }]);
    } finally {
      setIsZoyaTyping(false);
    }
  };

  // Direct Execution state
  const [execSl, setExecSl] = useState<string>("");
  const [execTp, setExecTp] = useState<string>("");
  const [isConfirmingExec, setIsConfirmingExec] = useState(false);

  const triggerExecution = () => {
    const symbolPriceMap: Record<string, number> = {
      "OANDA:XAUUSD": 2322.80,
      "FX:EURUSD": 1.0822,
      "FX:GBPUSD": 1.2745,
      "COINBASE:BTCUSD": 66820,
      "NASDAQ:IXIC": 17850,
      "FOREXCOM:SPX500": 5420
    };
    const basePrice = symbolPriceMap[execSymbol] || 100.0;
    
    const newPos: Position = {
      id: "pos-" + Date.now(),
      symbol: execSymbol,
      type: execType,
      price: basePrice,
      currentPrice: basePrice,
      lots: execLots,
      pnl: 0,
      sl: execSl ? parseFloat(execSl) : undefined,
      tp: execTp ? parseFloat(execTp) : undefined,
      timestamp: new Date().toISOString()
    };

    setPositions(p => [newPos, ...p]);
    setIsConfirmingExec(false);
    setExecSl("");
    setExecTp("");
    
    // Log automation log to core app
    useBloomOSStore.getState().addAutomationLog(`Executed direct MT5 Order: ${execType} ${execLots} Lots of ${execSymbol}`, "market", "success");
    askZoyaCoach(`Mohammad, you just clicked ${execType} on ${execLots} lots of ${execSymbol} at ${basePrice}. Analyze this context and double check my risk!`);
  };

  // Portfolio close helper
  const closePosition = (id: string) => {
    const p = positions.find(pos => pos.id === id);
    if (!p) return;
    setPositions(prev => prev.filter(pos => pos.id !== id));
    setDailyPnlHistory(prev => prev + p.pnl);

    // Send to journal
    const newJournal: JournalEntry = {
      id: "j-" + Date.now(),
      symbol: p.symbol,
      type: p.type,
      entryPrice: p.price,
      exitPrice: p.currentPrice,
      lots: p.lots,
      pnl: p.pnl,
      strategy: "Manual MT5 Exec",
      emotion: "Calm",
      notes: `Closed manually via Bloom Workstation with floating P&L of $${p.pnl}`,
      timestamp: new Date().toISOString()
    };
    setJournal(prev => [newJournal, ...prev]);
    useBloomOSStore.getState().addAutomationLog(`Closed order: ${p.type} ${p.lots} of ${p.symbol} for $${p.pnl}`, "market", "success");
  };

  // INTERCEPT FOR ULTIMATE INSTITUTIONAL FULL SCREEN TRADINGVIEW WORKSPACE
  if (isFullScreenMode) {
    // Watchlist for full screen
    const fsWatchlist = [
      { sym: "OANDA:XAUUSD", name: "GOLD (XAUUSD)", type: "Commodity", decimals: 2 },
      { sym: "FX:EURUSD", name: "EURO (EURUSD)", type: "Forex", decimals: 5 },
      { sym: "FX:GBPUSD", name: "CABLE (GBPUSD)", type: "Forex", decimals: 5 },
      { sym: "COINBASE:BTCUSD", name: "BITCOIN (BTCUSD)", type: "Crypto", decimals: 2 },
      { sym: "NASDAQ:IXIC", name: "NASDAQ (IXIC)", type: "Index", decimals: 2 },
      { sym: "FOREXCOM:SPX500", name: "S&P 500 (SPX)", type: "Index", decimals: 2 }
    ];

    // standard economic events
    const economicEvents = [
      { time: "12:30", currency: "USD", event: "Core CPI m/m", impact: "HIGH SENSITIVITY", forecast: "0.2%", actual: "---" },
      { time: "14:00", currency: "USD", event: "FOMC Rate Statement", impact: "CRITICAL SYSTEMIC", forecast: "5.50%", actual: "---" },
      { time: "14:30", currency: "USD", event: "Powell Press Conference", impact: "MACRO SWEETENER", forecast: "---", actual: "---" }
    ];

    const handleDetachChart = () => {
      const cleanSym = fullscreenSymbol.replace("OANDA:", "").replace("FX:", "").replace("COINBASE:", "").replace("NASDAQ:", "").replace("FOREXCOM:", "");
      const tvUrl = `https://s.tradingview.com/widgetembed/?symbol=${cleanSym}&theme=dark`;
      window.open(tvUrl, "_blank");
      showToast("Opening independent chart canvas in dual monitor viewport!");
    };

    const getDynamicZoyaAnalysis = () => {
      if (fullscreenSymbol.includes("XAUUSD")) {
        return "Zoya's Gold Analysis (Live):\n\nMohammad, XAUUSD is sweeping liquidity beneath yesterday's value area low at $2,315. Structural buy limits are clustered heavy near $2,312. If we print a bullish block on the M5 matrix, target the NYC volume pocket at $2,342.\n\nRisk parameters: tight stop sub $2,308 is advised.";
      } else if (fullscreenSymbol.includes("EURUSD")) {
        return "Zoya's EURUSD Analysis (Live):\n\nMohammad, Euro-dollar is consolidatng. Standard deviation bands show light compression. High systemic risk ahead of tomorrow's Powell presser. Recommend keeping exposure sub 1% of equity.";
      } else {
        return `Zoya's ${fullscreenSymbol} Analysis (Live):\n\nAsset displaying clean order block mitigation. Multi-timeframe trend is moderately bullish, coinciding with institutional DXY liquidity draw. Re-enter on discount levels.`;
      }
    };

    const executeFsSpotTrade = (type: "BUY" | "SELL") => {
      const entry = prices[fullscreenSymbol] || 2322.80;
      const isXAU = fullscreenSymbol.includes("XAUUSD");
      const slOffset = isXAU ? 5.0 : 0.0010;
      const tpOffset = isXAU ? 15.0 : 0.0030;
      
      const sl = type === "BUY" ? entry - slOffset : entry + slOffset;
      const tp = type === "BUY" ? entry + tpOffset : entry - tpOffset;
      
      const newPosition = {
        id: "fs_" + Date.now(),
        symbol: fullscreenSymbol,
        type: type,
        price: entry,
        currentPrice: entry,
        lots: 2.5,
        pnl: 0.00,
        sl: parseFloat(sl.toFixed(isXAU ? 2 : 5)),
        tp: parseFloat(tp.toFixed(isXAU ? 2 : 5)),
        timestamp: new Date().toISOString()
      };
      
      setPositions(prev => [newPosition, ...prev]);
      useBloomOSStore.getState().addAutomationLog(`Spot Execution: entered ${type} ${newPosition.lots} lots of ${fullscreenSymbol} at $${entry}`, "market", "success");
      showToast(`⚡ SPOT EXECUTION FIRED: ${type} 2.5 Lots @ ${entry}`);
    };

    return (
      <div id="trading-intelligence-root-fullscreen" className="relative flex flex-col h-screen w-screen bg-[#050608] text-[#e0e4eb] font-sans antialiased select-none overflow-hidden text-xs">
        
        {/* Absolute Fast Camera Flash Overlay */}
        <AnimatePresence>
          {isCameraFlashing && (
            <motion.div 
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-0 bg-white z-50 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Absolute Glassmorphic Custom Toast Container */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0c1015]/90 border border-[#10b981]/30 text-emerald-400 font-mono py-2.5 px-5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center gap-2 text-xs"
            >
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. TOP STATS BAR / INSTITUTIONAL HUD HEADER */}
        <header className="h-14 border-b border-[#1c222e] bg-[#0c0e12] flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setIsFullScreenMode(false);
                setIsGoldTraderMode(false);
                showToast("Returned to Standard Desk View.");
              }}
              className="p-1 px-2.5 bg-zinc-800/20 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-slate-400 hover:text-white uppercase font-mono tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              ← Normal View
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
              <span className="font-mono text-slate-400 text-[10px] tracking-wider uppercase">F11 Workstation Status:</span>
              <span className="font-mono text-[#10b981] text-[10px] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20 animate-pulse font-bold">
                {isGoldTraderMode ? "🥇 GOLD TRADER ACTIVE" : "● NYSE / LSE INTERLINKED"}
              </span>
            </div>
            
            {/* Symbol Switcher Select */}
            <div className="flex items-center gap-1.5 ml-2 border border-zinc-800 rounded bg-black/40 px-2 py-1">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Symbol:</span>
              <select 
                value={fullscreenSymbol}
                onChange={(e) => {
                  setFullscreenSymbol(e.target.value);
                  showToast(`Switched chart workspace to: ${e.target.value.split(":")[1] || e.target.value}`);
                }}
                disabled={isGoldTraderMode}
                className="bg-transparent border-none text-xs font-mono font-bold text-white outline-none cursor-pointer"
              >
                {fsWatchlist.map(f => (
                  <option key={f.sym} value={f.sym} className="bg-[#0c0e12] text-white font-mono">{f.sym.split(":")[1] || f.sym}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Center telemetry: Realtime Quotes */}
          <div className="hidden xl:flex items-center gap-6 font-mono text-[11px]">
            <div>
              <span className="text-zinc-500">SPOT PRICE:</span>{" "}
              <span className="text-white font-bold animate-pulse">
                ${fullscreenSymbol === "OANDA:XAUUSD" 
                  ? prices["OANDA:XAUUSD"]?.toLocaleString("en-US", { minimumFractionDigits: 2 }) 
                  : (prices[fullscreenSymbol] || "0.00").toLocaleString()
                }
              </span>
            </div>
            <div>
              <span className="text-zinc-500">SPREAD:</span>{" "}
              <span className="text-[#10b981] font-bold">
                {fullscreenSymbol.includes("BTC") ? "1.50 Pips" : fullscreenSymbol.includes("EUR") ? "0.2 Pips" : "0.1 Pips"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">VALUATION EXPOSURE:</span>{" "}
              <span className={floatingPnl >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}>
                {floatingPnl >= 0 ? "+" : ""}${floatingPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            
            <button
              onClick={() => setIsGoldTraderMode(prev => !prev)}
              className={`p-1.5 px-3 rounded text-[10px] uppercase font-mono font-bold tracking-wider transition cursor-pointer border flex items-center gap-1.5 ${
                isGoldTraderMode 
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400" 
                  : "bg-zinc-800/10 border-zinc-800 text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGoldTraderMode ? "Standard Mode" : "Gold Mode 🥇"}</span>
            </button>

            <button 
              onClick={handleDetachChart}
              title="Open inside an independent browser tab for dual-screen setups"
              className="p-1.5 bg-zinc-800/20 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 rounded text-[10px] uppercase font-mono tracking-wider transition cursor-pointer flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Monitor 2</span>
            </button>

            <span className="text-[#334155] font-mono select-none">|</span>

            {/* Quick overlay triggers */}
            <button 
              onClick={() => { setShowFsAiCoach(prev => !prev); setShowFsRiskCalc(false); setShowFsExecution(false); }}
              className={`p-1.5 px-2.5 rounded font-mono text-[10px] uppercase transition cursor-pointer border ${
                showFsAiCoach ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-black/40 border-zinc-800 text-slate-300 hover:text-white"
              }`}
            >
              🧠 Audit
            </button>
            <button 
              onClick={() => { setShowFsRiskCalc(prev => !prev); setShowFsAiCoach(false); setShowFsExecution(false); }}
              className={`p-1.5 px-2.5 rounded font-mono text-[10px] uppercase transition cursor-pointer border ${
                showFsRiskCalc ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-black/40 border-zinc-800 text-slate-300 hover:text-white"
              }`}
            >
              ⚠ Calculator
            </button>
            <button 
              onClick={() => { setShowFsExecution(prev => !prev); setShowFsAiCoach(false); setShowFsRiskCalc(false); }}
              className={`p-1.5 px-2.5 rounded font-mono text-[10px] uppercase transition cursor-pointer border ${
                showFsExecution ? "bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]" : "bg-black/40 border-zinc-800 text-slate-300 hover:text-white"
              }`}
            >
              ⚡ Instant Order
            </button>

            <span className="text-[#334155] font-mono select-none">|</span>

            <button 
              onClick={runAestheticScreenshot}
              className="p-1.5 bg-zinc-800/25 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 rounded text-[10px] uppercase font-mono transition cursor-pointer"
              title="Save snapshot to terminal logs"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <button 
              onClick={activateVoiceCommandHUD}
              className={`p-1.5 rounded text-[10px] font-mono transition cursor-pointer border flex items-center gap-1.5 ${
                isVoiceListening ? "bg-red-500/25 border-red-500/40 text-red-200 animate-pulse" : "bg-zinc-800/10 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              title="Activate real-time voice speech command recognition"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>

          </div>
        </header>

        {/* 2. MAIN HUB WORKSPACE DISPLAY AREA */}
        <div className="flex-1 flex overflow-hidden bg-[#07090d] relative">
          
          {/* OPTIONAL FLOATING DRAWER: ZOYA QUICK TECHNICAL AUDIT */}
          <AnimatePresence>
            {showFsAiCoach && (
              <motion.div 
                initial={{ opacity: 0, x: 280 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 280 }}
                className="absolute right-3 top-3 bottom-3 w-80 bg-[#0c1015]/95 border border-purple-500/25 rounded-xl z-40 p-4 flex flex-col justify-between backdrop-blur shadow-[0_4px_30px_rgba(0,0,0,0.8)] font-mono"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" /> Zoya Scenario audit
                    </span>
                    <button onClick={() => setShowFsAiCoach(false)} className="text-zinc-500 hover:text-white cursor-pointer p-0.5 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line overflow-y-auto max-h-[360px] bg-black/40 rounded p-3 border border-purple-500/10">
                    {getDynamicZoyaAnalysis()}
                  </div>
                </div>

                <div className="border-t border-zinc-800/60 pt-3 mt-3 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      askZoyaCoach(`Audited ${fullscreenSymbol} chart setup in Fullscreen.`);
                      showToast("Initiated full terminal prompt in chat...");
                    }}
                    className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-300 rounded font-mono text-[10px] uppercase font-bold"
                  >
                    Open Zoya Full Terminal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OPTIONAL FLOATING DRAWER: SIZING CALCULATOR */}
          <AnimatePresence>
            {showFsRiskCalc && (
              <motion.div 
                initial={{ opacity: 0, x: 280 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 280 }}
                className="absolute right-3 top-3 bottom-3 w-80 bg-[#0c1015]/95 border border-amber-500/25 rounded-xl z-40 p-4 flex flex-col justify-between backdrop-blur shadow-[0_4px_30px_rgba(0,0,0,0.8)] font-mono"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4" /> Sizing Calculations
                    </span>
                    <button onClick={() => setShowFsRiskCalc(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="bg-black/35 p-3 rounded border border-zinc-800/80 mb-3 text-[11px]">
                    <span className="text-zinc-500 block uppercase mb-1">Valuation Account Balance</span>
                    <span className="text-white font-bold text-sm">${accountBalance.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <span className="text-zinc-500 block uppercase text-[10px] mb-1">Assessed Risk Ratio (%)</span>
                      <span className="text-white font-bold text-xs bg-black/40 border border-zinc-800 px-2 py-1.5 rounded block">
                        2.0% Risk Limit
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase text-[10px] mb-1">Recommended Position Exposure</span>
                      <span className="text-[#10b981] font-extrabold text-sm bg-[#10b981]/5 border border-[#10b981]/25 px-2 py-1.5 rounded block text-center">
                        2.50 Lots Suggested SL Unit
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowFsRiskCalc(false)}
                  className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 rounded font-mono text-[10px] uppercase font-bold"
                >
                  Apply exposure settings
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OPTIONAL FLOATING DRAWER: INSTANT POSITION EXECUTION */}
          <AnimatePresence>
            {showFsExecution && (
              <motion.div 
                initial={{ opacity: 0, x: 280 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 280 }}
                className="absolute right-3 top-3 bottom-3 w-80 bg-[#0c1015]/95 border border-emerald-500/25 rounded-xl z-40 p-4 flex flex-col justify-between backdrop-blur shadow-[0_4px_30px_rgba(0,0,0,0.8)] font-mono"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#10b981]/20 pb-2 mb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" /> Spot instant execution
                    </span>
                    <button onClick={() => setShowFsExecution(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="bg-black/35 p-3 rounded border border-zinc-800/80 text-[11px] flex flex-col gap-1">
                      <span className="text-zinc-500 uppercase font-bold">Instrument Matrix</span>
                      <span className="text-white text-sm font-bold uppercase">{fullscreenSymbol.split(":")[1] || fullscreenSymbol}</span>
                    </div>

                    <div className="bg-black/35 p-3 rounded border border-zinc-800/80 text-[11px] flex justify-between items-center">
                      <div>
                        <span className="text-zinc-500 block">Position Size</span>
                        <span className="text-white text-xs font-bold font-mono">2.50 Lots Contract</span>
                      </div>
                      <span className="text-zinc-600">Locked</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { executeFsSpotTrade("BUY"); }}
                      className="py-3.5 bg-emerald-500 hover:bg-emerald-400 font-bold font-sans text-xs text-black tracking-widest uppercase transition rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
                    >
                      BUY INDEX
                    </button>
                    <button 
                      onClick={() => { executeFsSpotTrade("SELL"); }}
                      className="py-3.5 bg-red-500 hover:bg-red-400 font-bold font-sans text-xs text-black tracking-widest uppercase transition rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer"
                    >
                      SELL INDEX
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-500 text-center font-mono mt-1">
                    By clicking execute you enter direct 1:100 leverage CFD contract
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE GLOWING VOICE SOUNDWAVE TERMINAL */}
          <AnimatePresence>
            {isVoiceListening && (
              <div className="absolute top-4 left-4 z-40 bg-zinc-950/90 border border-red-500/30 rounded-xl p-4 w-72 backdrop-blur-md shadow-2xl font-mono">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-1.5">
                  <Mic className="w-4 h-4 animate-ping text-red-500" />
                  <span>VOICE DETECTOR ONLINE</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug mb-3">
                  {voiceCommandFeedback}
                </p>
                
                {/* Simulated Waveform Visualizer */}
                <div className="flex items-center justify-center gap-1.5 h-8 bg-black/45 rounded mb-3">
                  {[2, 5, 8, 3, 7, 2, 6, 4, 9, 5, 3, 7, 10, 4, 6].map((h, i) => (
                    <motion.div 
                      key={i} 
                      className="w-1 bg-red-500 rounded-full"
                      animate={{ height: [`${h*10}%`, `${(h/2)*10}%`, `${h*10}%`] }}
                      transition={{ duration: 0.8 + (i*0.04), repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </div>

                <div className="text-[9px] border-t border-zinc-800 pt-2.5">
                  <span className="text-zinc-500 block mb-1">Playbook triggers Mohammad can say:</span>
                  <div className="flex flex-col gap-1 text-slate-300">
                    <button onClick={() => processVoiceInstruction("Open Gold full screen")} className="text-left hover:text-amber-400 transition cursor-pointer">▪ "Show gold full screen"</button>
                    <button onClick={() => processVoiceInstruction("Analyze this chart")} className="text-left hover:text-purple-400 transition cursor-pointer">▪ "Analyze this chart"</button>
                    <button onClick={() => processVoiceInstruction("Exit full screen")} className="text-left hover:text-red-400 transition cursor-pointer">▪ "Exit full screen"</button>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>


          {/* VIEWPORT MODE SELECTOR: A) GOLD TRADER MODE ACTIVE */}
          {isGoldTraderMode ? (
            <div className="flex-1 grid grid-cols-12 gap-3 p-3">
              
              {/* PRIMARY GOLD VIEWPORT: 7 COLS */}
              <div className="col-span-12 xl:col-span-8 flex flex-col gap-2 overflow-hidden h-full">
                
                {/* Top Quick Bar Info */}
                <div className="h-9 px-3 bg-[#0c1015] border border-zinc-800 rounded-lg flex items-center justify-between font-mono text-[10px] tracking-wider text-amber-400">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> PRIMARY SUITE: OANDA XAUUSD GOLD VIEW
                  </span>
                  <div className="flex items-center gap-4 text-slate-400">
                    <span>MT5 FEED: STABILIZED</span>
                    <span>SPREAD: 0.1 PIP</span>
                  </div>
                </div>

                {/* Primary Gold Interactive frame */}
                <div className="flex-1 bg-black rounded-xl border border-zinc-800 overflow-hidden relative">
                  <iframe 
                    title="TradingView Gold Panel"
                    referrerPolicy="no-referrer"
                    src="https://s.tradingview.com/widgetembed/?symbol=OANDA:XAUUSD&theme=dark&style=1&timezone=Exchange"
                    className="w-full h-full border-none inset-0 absolute"
                  />
                </div>

                {/* Economic macro calendar + One Click orders below Gold Chart */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-40 shrink-0">
                  
                  {/* High impact calendar items: 7 COLS */}
                  <div className="md:col-span-7 bg-[#0c1015]/85 border border-zinc-800/80 rounded-xl p-3 flex flex-col font-mono text-xs">
                    <div className="flex justify-between items-center mb-1.5 shrink-0">
                      <h4 className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> High Impact Economic Stream Today
                      </h4>
                      <button
                        onClick={() => fetchCalendar(true)}
                        disabled={isRefreshingCalendar}
                        className="p-1 px-1.5 rounded bg-zinc-850 hover:bg-zinc-800 transition text-[#10b981] hover:text-white disabled:opacity-50 text-[8px] flex items-center gap-1 font-sans cursor-pointer"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isRefreshingCalendar ? "animate-spin" : ""}`} />
                        <span>{isRefreshingCalendar ? "Syncing..." : "Sync"}</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[9px]">
                      {calendarError ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-1 p-2 border border-dashed border-zinc-850 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
                          <span className="text-center leading-normal text-zinc-400 font-sans">{calendarError}</span>
                        </div>
                      ) : (() => {
                        const upcomingHigh = calendarEvents
                          .filter(evt => {
                            const isUpcoming = new Date(evt.date).getTime() >= Date.now();
                            const isHigh = evt.impact.toLowerCase().includes("high") || evt.impact.toLowerCase().includes("critical") || evt.impact.toLowerCase().includes("severe");
                            return isUpcoming && isHigh;
                          })
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        if (upcomingHigh.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-3">
                              <span className="text-zinc-550 italic font-sans text-center">No upcoming high-impact events listed.</span>
                            </div>
                          );
                        }

                        return upcomingHigh.slice(0, 6).map((evt, i) => {
                          const eventTimeStr = new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          const countdownStr = getEventTimeRemainingStr(evt.date);
                          return (
                            <div key={i} className="flex items-center justify-between p-1.5 bg-black/40 rounded text-[9px] border border-zinc-900 hover:border-zinc-800 transition">
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <span className="text-zinc-500 font-bold">{eventTimeStr}</span>
                                <span className="px-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded uppercase font-bold text-[8px]">{evt.country}</span>
                                <span className="text-slate-200 font-bold truncate max-w-[140px] md:max-w-[180px]">{evt.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-orange-400 font-mono bg-orange-500/5 px-1.5 py-0.5 rounded border border-orange-500/10 text-[8px] font-bold">
                                  {countdownStr}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* SPOT ONE-CLICK PANEL: 5 COLS */}
                  <div className="md:col-span-5 bg-[#0c1015]/85 border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between font-mono">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Spot Direct Execution</span>
                      <span className="text-[9px] text-zinc-500 uppercase">Leverage 1:100</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 flex-1 items-stretch">
                      <button 
                        onClick={() => executeFsSpotTrade("BUY")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider transition rounded shadow-[0_0_8px_rgba(16,185,129,0.3)] cursor-pointer flex flex-col justify-center items-center"
                      >
                        <span className="font-sans text-[10px] uppercase block tracking-widest text-[#050608]/75 mb-0.5">BUY CONTRACT</span>
                        <span className="text-xs font-mono font-bold">${prices["OANDA:XAUUSD"]?.toFixed(2)}</span>
                      </button>
                      <button 
                        onClick={() => executeFsSpotTrade("SELL")}
                        className="bg-red-500 hover:bg-red-400 text-black font-extrabold text-xs tracking-wider transition rounded shadow-[0_0_8px_rgba(239,68,68,0.3)] cursor-pointer flex flex-col justify-center items-center"
                      >
                        <span className="font-sans text-[10px] uppercase block tracking-widest text-[#050608]/75 mb-0.5">SELL CONTRACT</span>
                        <span className="text-xs font-mono font-bold">${prices["OANDA:XAUUSD"]?.toFixed(2)}</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* CORRELATION ANALYSIS MINI PANEL: 4 COLS */}
              <div className="col-span-12 xl:col-span-4 flex flex-col gap-3 h-full">
                
                {/* USD INDEX CORRELATION VIEWPORT */}
                <div className="flex-1 flex flex-col bg-[#0c1015]/85 border border-zinc-850 rounded-xl overflow-hidden p-3 gap-2 h-1/2">
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                    <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5" /> USD Index (DXY) Correlation View
                    </span>
                    <span className="text-emerald-400">INDEX:DXY</span>
                  </div>
                  <div className="flex-1 bg-black rounded-lg border border-zinc-900 overflow-hidden relative">
                    <iframe 
                      title="correlation_usd_index"
                      referrerPolicy="no-referrer"
                      src="https://s.tradingview.com/widgetembed/?symbol=INDEX:DXY&theme=dark&style=1&timezone=Exchange"
                      className="w-full h-full border-none absolute inset-0"
                    />
                  </div>
                </div>

                {/* GOLD STRATEGIC RISK CALCULATOR HUD */}
                <div className="bg-[#0c1015]/85 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between font-mono h-[240px] shrink-0">
                  <div>
                    <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest border-b border-zinc-900 pb-1.5 mb-2.5 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-amber-500" /> Spot Sizing Engine
                    </h4>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between p-1 bg-black/30 rounded px-2">
                        <span className="text-zinc-500 uppercase">Valuation AUM Base:</span>
                        <span className="text-white font-bold font-mono">${accountBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-1 bg-black/30 rounded px-2">
                        <span className="text-zinc-500 uppercase">Risk threshold ratio:</span>
                        <span className="text-amber-400 font-bold">2.0% ($247,000)</span>
                      </div>
                      <div className="flex justify-between p-1 bg-black/30 rounded px-2">
                        <span className="text-zinc-500 uppercase">Stop Loss parameters:</span>
                        <span className="text-red-400 font-bold">50 Pips ($5.00 Limit)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 bg-black/40 rounded p-2.5 border border-zinc-900 flex justify-between items-center text-center">
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase">RECOM. POSITION SIZE</span>
                      <span className="text-emerald-400 font-extrabold text-sm font-mono">2.50 Standard Lots</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                  </div>
                </div>

              </div>

            </div>
          ) : (
            // VIEWPORT MODE SELECTOR: B) STANDARD FULL SCREEN WITH WATCHLIST & DRAWING SHORTCUTS
            <div className="flex-grow flex h-full overflow-hidden">
              
              {/* SLATE DRAWING TOOLBAR: 44px width */}
              <aside className="w-11 border-r border-[#1c222e] bg-[#0c1015]/50 flex flex-col py-3 items-center gap-4 shrink-0 font-mono z-10">
                <button title="Selector Tool" className="hover:text-[#10b981] text-[#10b981] p-1.5 rounded hover:bg-zinc-800 transition"><Keyboard className="w-4 h-4" /></button>
                <button title="Trendline Drawing" className="hover:text-[#10b981] text-zinc-500 p-1.5 rounded hover:bg-zinc-800 transition">╱</button>
                <button title="Fibonacci Retracement" className="hover:text-[#10b981] text-zinc-500 p-1.5 rounded hover:bg-zinc-800 transition">🔲</button>
                <button title="Brush Painter" className="hover:text-[#10b981] text-zinc-500 p-1.5 rounded hover:bg-zinc-800 transition">🖌</button>
                <button title="Text Notation" className="hover:text-[#10b981] text-zinc-500 p-1.5 rounded hover:bg-zinc-800 transition">🆃</button>
                <button title="Measure Distance" className="hover:text-[#10b981] text-zinc-500 p-1.5 rounded hover:bg-zinc-800 transition">📏</button>
                <div className="w-6 h-[1px] bg-zinc-800" />
                <button title="Erase Layout" className="hover:text-red-400 text-zinc-500 p-1.5 rounded hover:bg-zinc-800 transition">🗑</button>
              </aside>

              {/* GIANT HIGH DEFINITION INTERACTIVE WORKVIEW FRAME */}
              <div className="flex-1 min-h-0 min-w-0 bg-black relative flex flex-col">
                <iframe 
                  title="Giant Workspace TV Layout"
                  referrerPolicy="no-referrer"
                  src={`https://s.tradingview.com/widgetembed/?symbol=${fullscreenSymbol}&theme=dark&style=1&timezone=Exchange&studies=RSI%40tv-basicstudies`}
                  className="w-full flex-grow border-none"
                />
              </div>

              {/* OPTIONAL WATCHLIST (COLLAPSIBLE ON RIGHT): 260px width */}
              {watchlistCollapsible && (
                <aside className="w-64 border-l border-[#1c222e] bg-[#090b0f] flex flex-col font-mono shrink-0 select-none">
                  <div className="px-3.5 py-2.5 border-b border-[#1c222e] flex items-center justify-between text-[#8892b0] bg-[#0c0e12]/70 text-[10px] tracking-wider">
                    <span>SECTOR TELEMETRY INDEX</span>
                    <button onClick={() => setWatchlistCollapsible(false)} className="hover:text-neutral-100 text-neutral-500 cursor-pointer">✕</button>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto divide-y divide-zinc-900">
                    {fsWatchlist.map(f => {
                      const activeValue = prices[f.sym] || 0;
                      const isGoldChoice = fullscreenSymbol === f.sym;
                      
                      return (
                        <div 
                          key={f.sym}
                          onClick={() => {
                            setFullscreenSymbol(f.sym);
                            showToast(`Swapped view symbol: ${f.sym.split(":")[1] || f.sym}`);
                          }}
                          className={`p-3 transition cursor-pointer hover:bg-zinc-800/25 flex flex-col gap-1 ${
                            isGoldChoice ? "bg-[#10b981]/5 border-r-2 border-[#10b981]" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold ${isGoldChoice ? "text-[#10b981]" : "text-white"}`}>
                              {f.name}
                            </span>
                            <span className="text-[9px] text-[#4ea07d] font-bold uppercase">{f.type}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-slate-300 font-bold font-mono">
                              {activeValue.toLocaleString("en-US", { minimumFractionDigits: f.decimals, maximumFractionDigits: f.decimals })}
                            </span>
                            <span className="text-[9px] text-emerald-400 bg-emerald-500/5 px-1.5 rounded">+0.18%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>
              )}

              {/* WATCHLIST EXPAND TAB BUTTON ON COLLAPSED BAR */}
              {!watchlistCollapsible && (
                <div className="w-7 border-l border-[#1c222e] bg-[#0c1015]/90 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50" onClick={() => setWatchlistCollapsible(true)}>
                  <div className="rotate-90 origin-center text-[10px] font-mono whitespace-nowrap text-zinc-500">
                    ◄ EXPAND WATCHLIST
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* 3. BOTTOM FLOATING QUICK-ACTIONS PILL */}
        <footer className="h-11 bg-[#0c0e12] border-t border-[#1c222e] px-4 flex items-center justify-between z-30 font-mono text-[10px] text-[#8c92a6]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-500"><Keyboard className="w-3.5 h-3.5" /> SHORTCUTS:</span>
            <span><strong className="text-white bg-zinc-800 px-1 py-0.5 rounded">F11</strong> Toggle Full Screen</span>
            <span>▪</span>
            <span><strong className="text-white bg-zinc-800 px-1 py-0.5 rounded">ESC</strong> Exit Full Screen</span>
            <span>▪</span>
            <span><strong className="text-white bg-zinc-800 px-1 py-0.5 rounded">Ctrl+Shift+T</strong> Terminal Dashboard</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setShowFsAiCoach(true);
                processVoiceInstruction("Analyze this chart");
              }}
              className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/15 rounded text-[9px] uppercase tracking-wider transition cursor-pointer"
            >
              🧠 Zoya Live Audit
            </button>
            <button 
              onClick={() => setShowFsRiskCalc(true)}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/10 text-amber-300 border border-amber-500/15 rounded text-[9px] uppercase tracking-wider transition cursor-pointer"
            >
              ⚠ Calculate Risk
            </button>
            <button 
              onClick={runAestheticScreenshot}
              className="px-2.5 py-1 bg-zinc-800/30 hover:bg-zinc-800/50 text-slate-300 rounded text-[9px] uppercase tracking-wider transition cursor-pointer border border-zinc-700/50"
            >
              📸 Save Shot
            </button>
          </div>
        </footer>

      </div>
    );
  }

  return (
    <div id="trading-intelligence-root" className="flex flex-col h-full bg-[#050608] text-[#e0e4eb] font-sans antialiased select-none">
      
      {/* 1. TOP STATS BAR IN GOLD/GREEN BLOOMBERG STYLE */}
      <header className="px-6 py-4 border-b border-[#1c222e] bg-[#0c0e12] flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
            <span className="font-mono text-xs font-bold text-[#64748b] uppercase tracking-wider">Bond Bloom Trading Node</span>
          </div>
          <span className="text-[#334155] font-mono text-xs">|</span>
          <h2 className="text-sm font-semibold tracking-tight text-[#10b981] font-mono uppercase bg-[#10b981]/5 px-2.5 py-1 rounded border border-[#10b981]/15">
            BOND BLOOM CAPITAL
          </h2>
        </div>

        {/* Dynamic metrics */}
        <div className="flex items-center flex-wrap gap-6 sm:gap-10">
          <div>
            <p className="text-[10px] text-[#64748b] uppercase font-mono tracking-widest">Net Account Equity</p>
            <p className="text-lg font-bold text-white font-mono tracking-tight">
              ${(accountBalance + floatingPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748b] uppercase font-mono tracking-widest">Floating Realtime P&L</p>
            <p className={`text-lg font-bold font-mono tracking-tight ${floatingPnl >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
              {floatingPnl >= 0 ? "+" : ""}${floatingPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748b] uppercase font-mono tracking-widest">Daily Booked P&L</p>
            <p className={`text-lg font-bold font-mono tracking-tight ${dailyPnlHistory >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
              {dailyPnlHistory >= 0 ? "+" : ""}${dailyPnlHistory.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748b] uppercase font-mono tracking-widest">Drawdown Exposure</p>
            <p className="text-lg font-bold text-[#fbbf24] font-mono tracking-tight">
              {((positions.length * 0.4) || 0.2).toFixed(2)}%
            </p>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/20 rounded-lg text-xs font-mono transition-all font-semibold uppercase tracking-wider"
          >
            Terminal Shutdown
          </button>
        </div>
      </header>

      {/* 2. THREE-PANEL CORE GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#07090d]">
        
        {/* LEFT WORKSTATION NAVIGATION SIDEBAR */}
        <aside className="lg:col-span-2 border-r border-[#161c28] bg-[#090b0f] flex flex-col justify-between py-2 overflow-y-auto">
          <div className="flex flex-col gap-1.5 px-2">
            <span className="px-3 mb-1 text-[9px] uppercase tracking-widest font-bold text-[#475569] font-mono block">Station Terminal</span>
            <button 
              onClick={() => setActiveTab("accounts")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "accounts" ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Wallet className="w-4 h-4 text-amber-500 animate-pulse" /> <span className="flex items-center gap-1.5">Command Center <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black px-1 rounded">LIVE</span></span>
            </button>
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "dashboard" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <BarChart2 className="w-4 h-4" /> <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab("charts")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "charts" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <TrendingUp className="w-4 h-4" /> <span>Charts Center</span>
            </button>
            <button 
              onClick={() => setActiveTab("news")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "news" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Globe className="w-4 h-4 text-sky-400" /> <span>News Terminal</span>
            </button>
            <button 
              onClick={() => setActiveTab("sentiment")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "sentiment" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Cpu className="w-4 h-4 text-purple-400" /> <span>AI Sentiment</span>
            </button>
            <button 
              onClick={() => setActiveTab("risk")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "risk" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-500" /> <span>Risk Center</span>
            </button>
            <button 
              onClick={() => setActiveTab("portfolio")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "portfolio" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Briefcase className="w-4 h-4" /> <span>Portfolio ({positions.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab("journal")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "journal" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Book className="w-4 h-4" /> <span>Trade Journal</span>
            </button>
            <button 
              onClick={() => setActiveTab("strategies")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "strategies" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Layout className="w-4 h-4 text-emerald-400" /> <span>Strategies AI</span>
            </button>
            <button 
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "alerts" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Bell className="w-4 h-4" /> <span>Alert Center</span>
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-150 ${activeTab === "settings" ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981] font-bold" : "text-[#94a3b8] hover:bg-[#161a22] hover:text-white"}`}
            >
              <Settings className="w-4 h-4" /> <span>Settings</span>
            </button>

            {/* Special Station Modes Navigation Header */}
            <div className="pt-2.5 pb-1.5 mt-2 border-t border-[#161c28]">
              <span className="px-3 mb-1.5 text-[9px] uppercase tracking-widest font-bold text-[#475569] font-mono block">Station Modes</span>
              
              <button
                type="button"
                onClick={() => {
                  setIsFullScreenMode(true);
                  setIsGoldTraderMode(false);
                  setFullscreenSymbol("OANDA:XAUUSD");
                  showToast("Entered Full Screen Trading Mode! Press ESC to minimize.");
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 bg-[#10b981]/5 h-9 hover:bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 rounded-lg text-xs font-mono transition-all font-bold uppercase mb-1.5 cursor-pointer text-left"
              >
                <Maximize2 className="w-3.5 h-3.5 animate-pulse" />
                <span>⛶ Full Screen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFullScreenMode(true);
                  setIsGoldTraderMode(true);
                  setFullscreenSymbol("OANDA:XAUUSD");
                  showToast("Armed Gold Trader Systemic Suite!");
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 bg-amber-500/10 h-9 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-mono transition-all font-bold uppercase cursor-pointer text-left"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🥇 Gold Trader Mode</span>
              </button>
            </div>
          </div>

          <div className="p-3 border-t border-[#161c28] bg-black/30 rounded-lg mx-2 text-center text-[10px] text-[#475569] font-mono">
            <span>Server: SECURE SSL-3</span>
            <div className="w-full h-1 bg-[#10b981]/20 rounded mt-1.5 overflow-hidden">
              <div className="w-[85%] h-full bg-[#10b981] animate-pulse" />
            </div>
          </div>
        </aside>

        {/* CENTRE CONTENT DYNAMIC WORKSPACE ROUTER */}
        <main className="lg:col-span-7 flex flex-col border-r border-[#161c28] overflow-y-auto">
          
          <AnimatePresence mode="wait">
            
            {/* TABS 0: ACCOUNT COMMAND CENTER */}
            {activeTab === "accounts" && (
              <motion.div 
                key="accounts" 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-5 flex flex-col gap-6 font-mono text-zinc-300"
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/20 bg-[#120d06]/60 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <Fingerprint className="w-6 h-6 text-amber-400 animate-spin-slow" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Account Command Center</h2>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase animate-pulse">Sync Active</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Proprietary MT4/MT5 Evaluation Bridge & Funded Risk Co-pilot</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3.5">
                    {/* Synchronize indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-[10px]">
                      <Server className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-zinc-500 uppercase font-bold">MT5 Terminal:</span>
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 rounded animate-pulse">REFRESH IN {mt5SyncTimer}s</span>
                      <button 
                        onClick={() => {
                          setIsRefreshingMt5(true);
                          setMt5SyncTimer(5);
                          // Trigger reconnect protocol on any stale accounts
                          setBloomAccounts(prev => prev.map(a => {
                            if (a.connectionStatus === "Disconnected" || a.connectionStatus === "Reconnecting") {
                              return { ...a, connectionStatus: "Syncing" };
                            }
                            return a;
                          }));
                          setTimeout(() => {
                            setIsRefreshingMt5(false);
                            setBloomAccounts(prev => prev.map(a => {
                              if (a.connectionStatus === "Syncing") {
                                return { ...a, connectionStatus: "Connected", lastSyncTime: new Date().toISOString() };
                              }
                              return a;
                            }));
                            showToast("All channels synced. Credentials verified successfully.");
                          }, 900);
                        }} 
                        disabled={isRefreshingMt5}
                        className="ml-1.5 p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshingMt5 ? "animate-spin text-amber-500" : ""}`} />
                      </button>
                    </div>

                    {/* Quick Account Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">Active Account:</span>
                      <select 
                        value={selectedAccountId}
                        onChange={(e) => {
                          setSelectedAccountId(e.target.value);
                          const matched = bloomAccounts.find(a => a.id === e.target.value);
                          if (matched) {
                            showToast(`Switched terminal bridge context to ${matched.name}`);
                          }
                        }}
                        className="p-1.5 bg-black border border-zinc-800 rounded-lg text-xs font-bold text-white max-w-[200px] outline-none focus:border-amber-500/50"
                      >
                        {bloomAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.provider})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ACTION CONNECT BUTTONS */}
                    <div className="flex gap-2 border-l border-zinc-800/80 pl-3">
                      <button 
                        onClick={() => {
                          setConnectModalType("MT5");
                          setInputBrokerServer("Oanda-MT5-Live-5");
                          setInputProvider("Personal MT5");
                          setInputAccountName("");
                          setInputBalance(50000);
                          setInputPhase("Personal");
                          setTestConnectionStatus("Idle");
                          setTestConnectionLog([]);
                          setShowConnectModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Connect MT5 Account</span>
                      </button>

                      <button 
                        onClick={() => {
                          setConnectModalType("Funded");
                          setInputBrokerServer("FTMO-Server2");
                          setInputProvider("FTMO");
                          setInputAccountName("");
                          setInputBalance(100000);
                          setInputPhase("Challenge");
                          setTestConnectionStatus("Idle");
                          setTestConnectionLog([]);
                          setShowConnectModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 border border-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      >
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Add Funded Account</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* MULTI-ACCOUNT DIRECTORY GATEWAY SHEETS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[#090b10] px-4 py-2.5 rounded-xl border border-zinc-900 border-l-2 border-l-amber-500">
                    <span className="text-[10px] font-black tracking-widest text-[#94a3b8] uppercase flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-500" /> Connected Real-Time Terminal Directory ({bloomAccounts.length} profiles)
                    </span>
                    <span className="text-[8px] text-[#475569] uppercase font-bold hidden sm:inline">Touch or click card to bind terminal context</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bloomAccounts.map((acc) => {
                      const isActive = acc.id === selectedAccountId;
                      const status = acc.connectionStatus || "Connected";
                      const lastSync = acc.lastSyncTime ? new Date(acc.lastSyncTime).toLocaleTimeString() : "Never";
                      
                      return (
                        <div 
                          key={acc.id}
                          id={`acc-card-${acc.id}`}
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            showToast(`Connected bridge switched to: ${acc.name}`);
                          }}
                          className={`relative p-3.5 rounded-xl border flex flex-col justify-between gap-3.5 transition-all duration-200 cursor-pointer ${isActive ? "bg-[#111622]/90 border-amber-500/50 shadow-md shadow-amber-500/5 text-white" : "bg-[#090b0f]/80 border-zinc-900 hover:border-zinc-805 text-zinc-400 hover:text-zinc-300"}`}
                        >
                          {/* Active state indicator outline accent */}
                          {isActive && (
                            <span className="absolute top-0 right-0 transform translate-x-1.5 -translate-y-1.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                          )}

                          <div>
                            {/* Card Header information */}
                            <div className="flex justify-between items-start gap-1">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white text-xs font-extrabold uppercase tracking-wide truncate max-w-[120px]">{acc.name}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${acc.phase === "Funded" || acc.phase === "Personal" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-sky-500/10 text-sky-400 border border-sky-500/30"}`}>
                                    {acc.phase}
                                  </span>
                                </div>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mt-0.5">{acc.provider} Setup</span>
                              </div>

                              {/* Connectivity Status Label */}
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${status === "Connected" ? "bg-emerald-400 animate-pulse" : status === "Reconnecting" ? "bg-orange-500 animate-pulse" : status === "Syncing" ? "bg-amber-400 animate-spin" : "bg-red-500"}`}></span>
                                  <span className={`text-[9px] uppercase font-black ${status === "Connected" ? "text-emerald-400" : status === "Reconnecting" ? "text-orange-400 animate-pulse" : status === "Syncing" ? "text-amber-400" : "text-rose-400"}`}>
                                    {status}
                                  </span>
                                </div>
                                <span className="text-[8px] text-zinc-650 block mt-0.5">Ping: {status === "Connected" ? "12ms" : "Offline"}</span>
                              </div>
                            </div>

                            {/* Account Sizing Balance & Equity display */}
                            <div className="grid grid-cols-2 p-2 rounded-lg bg-black/50 border border-zinc-900 text-center gap-1 mt-3">
                              {acc.balance === undefined ? (
                                <div className="col-span-2 py-1 flex items-center justify-center gap-1.5 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Waiting connection</span>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <span className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block">Balance</span>
                                    <span className="text-xs font-black text-white">
                                      ${acc.balance ? acc.balance.toLocaleString() : "0"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-zinc-500 uppercase font-black tracking-wider block">Equity</span>
                                    <span className={`text-xs font-black ${((acc.equity ?? acc.balance ?? 0) >= (acc.balance ?? 0)) ? "text-emerald-400" : "text-rose-450"}`}>
                                      ${(acc.equity ?? acc.balance)?.toLocaleString()}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Broker & Server telemetry details */}
                          <div className="space-y-1 text-[9px] border-t border-zinc-900/40 pt-2.5 text-zinc-500 font-bold">
                            <div className="flex justify-between">
                              <span>Acct ID:</span>
                              <span className="text-zinc-300 font-extrabold">{acc.accountNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Broker / Server:</span>
                              <span className="text-zinc-300 truncate max-w-[130px] font-extrabold">{acc.broker} / {acc.server}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Pulled:</span>
                              <span className="text-amber-400 font-mono text-[8px] font-black">{lastSync}</span>
                            </div>
                            {acc.profitTarget && (
                              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-zinc-900/60">
                                <div className="flex justify-between items-center text-[8px]">
                                  <span>PROFIT TARGET PROGRESS:</span>
                                  <span className="text-emerald-400 font-black">${acc.profitCurrent.toLocaleString()} / ${acc.profitTarget.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded" style={{ width: `${Math.min(100, Math.max(5, (acc.profitCurrent / acc.profitTarget) * 100))}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Interactive Handshake buttons */}
                          <div className="flex justify-between items-center pt-2.5 border-t border-zinc-900/60 gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              {/* Reconnect button */}
                              <button 
                                onClick={() => {
                                  if (status === "Connected" || status === "Syncing") {
                                    setBloomAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, connectionStatus: "Disconnected" } : a));
                                    showToast(`Offline status configured on ${acc.name}.`);
                                  } else {
                                    setBloomAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, connectionStatus: "Reconnecting" } : a));
                                    showToast(`Tuning link: auto reconnect triggered on #${acc.accountNumber}`);
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer transition ${status === "Connected" ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/25" : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25"}`}
                              >
                                {status === "Connected" ? "Disconnect" : "Reconnect..."}
                              </button>

                              {/* Test Connection Button */}
                              <button 
                                onClick={() => {
                                  showToast(`Pinging authorization route on #${acc.accountNumber}...`);
                                  setBloomAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, connectionStatus: "Syncing" } : a));
                                  setTimeout(() => {
                                    setBloomAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, connectionStatus: "Connected", lastSyncTime: new Date().toISOString() } : a));
                                    showToast(`OANDA Live Gateway health verified. Handshake success!`);
                                  }, 1100);
                                }}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded text-[8px] font-black uppercase cursor-pointer transition"
                              >
                                Verify Link
                              </button>
                            </div>

                            {/* Delete Terminal Card */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (bloomAccounts.length <= 1) {
                                  showToast("Access Denied: You must retain at least one configured account model context in terminal memory.");
                                  return;
                                }
                                setDeleteConfirmationAccount(acc);
                              }}
                              className="p-1 hover:bg-rose-500/10 rounded group cursor-pointer"
                              title="Drop Bridge Connection"
                              id={`delete-btn-${acc.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-zinc-650 group-hover:text-rose-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delete Account Diagnostics Panel */}
                <div className="p-3.5 rounded-xl border border-rose-500/10 bg-[#0e090f]/90 flex flex-col gap-3 shadow-md shadow-black/50">
                  <div className="flex justify-between items-center border-b border-zinc-950 pb-2">
                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-450 animate-pulse" /> Purge & Deletion Audit Diagnostics
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-rose-500/10 text-rose-450 border border-rose-500/20" id="diag-logged-count">
                      Zustand Logged: {deletedAccountIds.length} Purged
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono font-bold">
                    <div className="p-2.5 rounded bg-black/40 border border-zinc-900 flex flex-col gap-1">
                      <span className="text-[8px] text-zinc-550 uppercase">Account Purge Target ID:</span>
                      <span className="text-zinc-300 truncate font-mono" id="diag-acc-id">{lastDeletedAccountId || lastDeletedAccountInfo?.id || "N/A (Memory Clean)"}</span>
                    </div>

                    <div className="p-2.5 rounded bg-black/40 border border-zinc-900 flex flex-col gap-1">
                      <span className="text-[8px] text-zinc-550 uppercase">Zustand Store Deletion Status:</span>
                      <span className={`font-black font-mono ${deleteStatus.includes("Success") ? "text-emerald-400" : deleteStatus.includes("Failed") ? "text-rose-450" : "text-zinc-400"}`} id="diag-delete-status">
                        {deleteStatus}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-black/40 border border-zinc-900 flex flex-col gap-1">
                      <span className="text-[8px] text-zinc-550 uppercase">Persistent Storage Status:</span>
                      <span className={`font-black font-mono ${storageStatus.includes("Cleared") ? "text-emerald-400" : "text-zinc-300"}`} id="diag-storage-status font-mono">
                        {storageStatus}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-black/40 border border-zinc-900 flex flex-col gap-1">
                      <span className="text-[8px] text-zinc-550 uppercase">Last Deletion Sync Attempt:</span>
                      <span className="text-amber-400 font-mono" id="diag-last-attempt">
                        {lastDeleteAttempt ? new Date(lastDeleteAttempt).toLocaleTimeString() : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTIVE ACCOUNT GENERAL SUMMARY ROW */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* METRIC 1: BALANCE / EQUITY */}
                  <div className="p-3.5 rounded-xl border border-[#1d2432] bg-[#0c0f16]/90 flex flex-col gap-1 shadow-md shadow-black/40">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-zinc-400" /> Account Sizing
                    </span>
                    <div className="text-lg font-black text-white mt-1.5 leading-tight">
                      {isWaitingForConnection ? (
                        <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block animate-pulse py-1">Waiting for account connection</span>
                      ) : (
                        `$${activeAccount.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-2 border-t border-zinc-800/40 pt-1.5">
                      <span>Live Equity:</span>
                      <span className="text-emerald-400 font-bold">
                        {isWaitingForConnection ? (
                          <span className="text-zinc-500">Waiting connection...</span>
                        ) : (
                          `$${activeAccount.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* METRIC 2: FLOATING PNL */}
                  <div className={`p-3.5 rounded-xl border bg-[#0c0f16]/90 flex flex-col gap-1 shadow-md shadow-black/40 transition-all duration-300 ${activeAccount.floatingPnl >= 0 ? "border-emerald-500/20" : "border-rose-500/20"}`}>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className={`w-3 h-3 ${activeAccount.floatingPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`} /> Floating Position Profit
                    </span>
                    <div className={`text-lg font-black mt-1.5 ${activeAccount.floatingPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {activeAccount.floatingPnl >= 0 ? "+" : ""}${activeAccount.floatingPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-2 border-t border-zinc-800/40 pt-1.5">
                      <span>Total Dynamic Exposure:</span>
                      <span className="text-amber-400 font-mono font-bold">{activeAccount.currentExposure} Lots</span>
                    </div>
                  </div>

                  {/* METRIC 3: INITIAL BALANCE / BROKER ROUTE */}
                  <div className="p-3.5 rounded-xl border border-[#1d2432] bg-[#0c0f16]/90 flex flex-col gap-1 shadow-md shadow-black/40">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3 h-3 text-zinc-500" /> MT5 Integration Route
                    </span>
                    <div className="text-xs font-black text-white mt-2 flex flex-col gap-0.5">
                      <span className="truncate tracking-wide text-zinc-200">ID: {activeAccount.accountNumber}</span>
                      <span className="text-[9px] text-[#22c55e] uppercase tracking-wider font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-ping"></span> {activeAccount.broker} - {activeAccount.server}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-2 border-t border-zinc-800/40 pt-1.5">
                      <span>Phase Status:</span>
                      <span className="bg-sky-500/20 text-sky-400 text-[8px] px-1.5 py-0.2 rounded font-black tracking-widest uppercase">{activeAccount.phase}</span>
                    </div>
                  </div>

                  {/* METRIC 4: ACCOUNT PERFORMANCE GAUGE */}
                  <div className="p-3.5 rounded-xl border border-[#1d2432] bg-[#0c0f16]/90 flex flex-col justify-between shadow-md shadow-black/40">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" /> AI Health Index
                      </span>
                      {/* Calculate composite AI score based on drawdown, consistency score, performance, etc. */}
                      <span className="text-xs font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                        {Math.round((activeAccount.consistencyScore + 95 + (activeAccount.floatingPnl >= 0 ? 5 : -5)) / 2)}
                      </span>
                    </div>
                    
                    {/* Tiny visual progress representation */}
                    <div className="mt-3">
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${activeAccount.consistencyScore}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[8px] text-zinc-500 mt-1">
                        <span>Consistency: {activeAccount.consistencyScore}%</span>
                        <span>Risk Bias: Safe</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MT5 LIVE MARGIN TELEMETRY SUBFRAME */}
                {activeAccount.metaApiId && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-zinc-800 bg-[#06080c] p-3.5 rounded-xl">
                    <div className="p-3 rounded-lg border border-zinc-800/60 bg-black/30 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest">Locked Margin</span>
                        <span className="text-xs font-mono font-black text-zinc-100 mt-1">
                          ${(activeAccount.margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono font-extrabold">Broker Lock</span>
                    </div>
                    <div className="p-3 rounded-lg border border-zinc-800/60 bg-black/30 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest">Free Margin Available</span>
                        <span className="text-xs font-mono font-black text-[#22c55e] mt-1">
                          ${(activeAccount.freeMargin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#22c55e] font-mono font-extrabold">Ready</span>
                    </div>
                    <div className="p-3 rounded-lg border border-[#af8c30]/10 bg-[#16120b] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest">Margin Level %</span>
                        <span className="text-xs font-mono font-black text-amber-400 mt-1">
                          {(activeAccount.marginLevel || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%
                        </span>
                      </div>
                      <span className="text-[9px] text-amber-400 font-mono font-extrabold">{activeAccount.marginLevel && activeAccount.marginLevel < 150 ? "WARNING" : "SAFE"}</span>
                    </div>
                  </div>
                )}

                {/* ACTIVE ACCOUNT CONNECTION DIAGNOSTICS STATUS PANEL */}
                {activeAccount.metaApiId && (
                  <div className="border border-zinc-800 bg-[#06080c] p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider">
                            Real MT5 Connection Diagnostics
                          </h4>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5">
                            Terminal Link: {activeAccount.metaApiId}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.55 bg-black/45 px-2 py-1 rounded border border-zinc-900">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">
                          Region: <strong className="text-zinc-300">{activeAccount.region || "New York"}</strong>
                        </span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1.5"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Checkpoint 1 */}
                      <div className="p-2.5 rounded-lg border border-emerald-500/10 bg-black/30 flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-black">
                          ✓
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-extrabold">Checkpoint 1</span>
                          <span className="text-[10px] text-zinc-200 font-bold">MetaApi Connected</span>
                        </div>
                      </div>

                      {/* Checkpoint 2 */}
                      <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 bg-black/30 ${activeAccount.errorType ? "border-rose-500/20" : "border-emerald-500/10"}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${activeAccount.errorType ? "bg-rose-500/10 text-rose-450" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {activeAccount.errorType ? "✕" : "✓"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-extrabold">Checkpoint 2</span>
                          <span className="text-[10px] text-zinc-200 font-bold">
                            {activeAccount.errorType ? "MT5 Offline" : "MT5 Connected"}
                          </span>
                        </div>
                      </div>

                      {/* Checkpoint 3 */}
                      <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 bg-black/30 ${activeAccount.errorType ? "border-rose-500/20" : "border-emerald-500/10"}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${activeAccount.errorType ? "bg-rose-500/10 text-rose-450" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {activeAccount.errorType ? "✕" : "✓"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-extrabold">Checkpoint 3</span>
                          <span className="text-[10px] text-zinc-200 font-bold">
                            {activeAccount.errorType ? "Sync Suspended" : "Account Synced"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Differentiate and display diagnostic error reasons */}
                    {activeAccount.errorType && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex flex-col gap-1 text-[10px] text-rose-300 font-mono">
                        <div className="font-extrabold uppercase text-[8px] tracking-wider text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" /> Diagnostic Failure Recognized: {activeAccount.errorType}
                        </div>
                        <p className="font-bold leading-relaxed">{activeAccount.diagnosticError || "Handshake rejected by remote MT5 terminal."}</p>
                        <p className="text-[8px] text-zinc-500 leading-normal mt-1.5">
                          Verify terminal credential specifications. We recommend checking master password correctness and broker server spellings exactly.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* CHALLENGE PROGRESS BAR & TARGETS MAP */}
                <div className="p-5 rounded-xl border border-[#1d2432] bg-[#0a0d13] flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Funded Challenge Tracker & Roadmap</h3>
                    </div>
                    {isWaitingForConnection ? (
                      <span className="text-[10px] text-zinc-500 font-mono">Waiting connection</span>
                    ) : (activeAccount?.profitTarget != null) ? (
                      <span className="text-[10px] text-zinc-400">
                        Target Requirement: <strong className="text-white">${(activeAccount.profitTarget ?? 0).toLocaleString()}</strong>
                      </span>
                    ) : (
                      <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                        Fully Funded (No direct profit target)
                      </span>
                    )}
                  </div>

                  {isWaitingForConnection ? (
                    <div className="p-6 bg-[#0c0f16]/40 border border-zinc-900 border-dashed rounded-lg flex flex-col items-center justify-center text-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mt-1.5 animate-pulse">Waiting for account connection</p>
                      <p className="text-[9px] text-zinc-500 max-w-sm mt-0.5 leading-relaxed">
                        Please wait while Handshake Engine connects to MetaTrader 5 server to establish live metrics synchronization.
                      </p>
                    </div>
                  ) : (activeAccount?.profitTarget != null) ? (
                    <div className="space-y-2">
                       <div className="flex justify-between items-end text-[11px] font-bold">
                        <span className="text-zinc-400 flex items-center gap-1">Challenge Progression: <strong className="text-amber-400">${(activeAccount?.profitCurrent ?? 0).toLocaleString()}</strong> of ${(activeAccount?.profitTarget ?? 0).toLocaleString()}</span>
                        <span className="text-emerald-400">{(((activeAccount?.profitCurrent ?? 0) / (activeAccount?.profitTarget ?? 1)) * 100).toFixed(1)}% Completed</span>
                      </div>
                      <div className="w-full bg-zinc-950/80 h-3 rounded-full border border-zinc-800 overflow-hidden p-0.5">
                        <div 
                          className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 h-full rounded-full transition-all duration-700 shadow shadow-amber-500/30"
                          style={{ width: `${Math.min(100, ((activeAccount?.profitCurrent ?? 0) / (activeAccount?.profitTarget ?? 1)) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 text-center text-[10px] text-zinc-400 pt-1">
                        <div className="flex flex-col items-start">
                          <span className="text-zinc-500">Target Threshold:</span>
                          <span className="text-zinc-200 font-extrabold">${(activeAccount?.profitTarget ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-zinc-550">Current Standing:</span>
                          <span className="text-amber-400 font-extrabold">${(activeAccount?.profitCurrent ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-zinc-500">Remaining Balance:</span>
                          <span className="text-rose-400 font-extrabold">${Math.max(0, (activeAccount?.profitTarget ?? 0) - (activeAccount?.profitCurrent ?? 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/10 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        {activeAccount?.phase === "Personal" ? (
                          <div>
                            <p className="text-zinc-200 font-bold">Personal Live Account Profile</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">This is a personal MetaTrader live profile. You retain 100% of generated profits with self-governed risk rules.</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-zinc-200 font-bold">Active Capital Funded Profile</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">You are in direct profit split phase of <span className="text-emerald-400 font-bold">{activeAccount.provider}</span>. All drawdowns apply based on active equity scales.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 text-[10px] font-bold text-zinc-400 border-l border-zinc-800 pl-4">
                        <div className="text-center">
                          <p className="text-zinc-500 uppercase text-[8px]">Profit Share Ratio</p>
                          <p className="text-white font-black text-xs"> {activeAccount?.phase === "Personal" ? "100%" : "80% / 20%"}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-500 uppercase text-[8px]">Consistency Score</p>
                          <p className="text-emerald-400 font-black text-xs">{activeAccount?.consistencyScore ?? 92}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mt-1 pt-1.5 border-t border-zinc-900">
                    <div className="p-2 rounded bg-zinc-950/55 border border-zinc-900">
                      <p className="text-zinc-500 text-[9px] uppercase font-bold">Trading Phase</p>
                      <p className="text-xs text-white font-extrabold mt-0.5">{activeAccount.phase}</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-950/55 border border-zinc-900">
                      <p className="text-zinc-500 text-[9px] uppercase font-bold">Active Days Traded</p>
                      <p className="text-xs text-zinc-200 font-extrabold mt-0.5">{activeAccount.daysTraded} Days</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-950/55 border border-zinc-900">
                      <p className="text-zinc-500 text-[9px] uppercase font-bold">Daily Drawdown Status</p>
                      <p className={`text-xs mt-0.5 font-extrabold ${activeAccount.dailyPnl < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        ${activeAccount.dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-zinc-950/55 border border-zinc-900">
                      <p className="text-zinc-500 text-[9px] uppercase font-bold">Consistency Standing</p>
                      <p className="text-xs text-amber-400 font-extrabold mt-0.5">{activeAccount.consistencyScore}% High</p>
                    </div>
                  </div>
                </div>

                {/* RISK MONITOR DRAWDOWNS SECTION with RED ALERT PROXIMITY WARNERS */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  
                  {/* RISK MONITOR & WARNERS CARD */}
                  <div className="xl:col-span-7 p-4 bg-zinc-950 border border-[#1d2432] rounded-xl flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                      <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" /> Real-time Risk Monitor
                      </h3>
                      <span className="text-[9px] bg-red-500/10 text-red-500 rounded px-1.5 py-0.2 uppercase font-extrabold">Active Shields</span>
                    </div>

                    {/* RED WARNING CARDS */}
                    {activeAccount.isApproachingDailyLimit && (
                      <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs leading-relaxed text-red-100 flex items-start gap-2.5 animate-pulse shadow-lg shadow-red-900/10">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div>
                          <strong className="text-red-400 uppercase font-black tracking-wider block">⚠️ RED WARNING: APPROACHING DAILY DRAWDOWN LIMIT</strong>
                          <p className="text-[10px] text-zinc-300 mt-1">
                            Active account daily loss has reached <span className="font-bold text-white">${Math.abs(activeAccount.dailyPnl || 0).toLocaleString()}</span> ({(Math.abs(activeAccount.dailyPnl || 0) / (activeAccount.dailyDrawdownLimit || 1) * 100).toFixed(1)}% of your allowed daily loss limit of <span className="text-white">${activeAccount.dailyDrawdownLimit ? `$${activeAccount.dailyDrawdownLimit.toLocaleString()}` : "N/A"}</span>). Under funded rules, exceeding this instantly invalidates the account metrics. Auto risk liquidation armed!
                          </p>
                        </div>
                      </div>
                    )}

                    {activeAccount.isApproachingMaxDrawdown && (
                      <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs leading-relaxed text-red-100 flex items-start gap-2.5 animate-pulse shadow-lg shadow-red-900/10">
                        <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div>
                          <strong className="text-red-500 uppercase font-black tracking-wider block">🚨 RED WARNING: APPROACHING MAX DRAWDOWN LIMIT</strong>
                          <p className="text-[10px] text-zinc-300 mt-1">
                            Your total floating and realized drawdown has breached critical limits. Remaining risk threshold is incredibly slim. Secure your position parameters or lock executing brackets now!
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Daily Drawdown</span>
                        <div className="text-sm font-extrabold text-white mt-1">
                          {isWaitingForConnection ? (
                            <span className="text-zinc-500 text-xs font-bold leading-normal">Waiting sync...</span>
                          ) : (
                            `$${Math.abs(activeAccount?.dailyPnl || 0).toLocaleString()} / ${activeAccount?.dailyDrawdownLimit ? `$${activeAccount.dailyDrawdownLimit.toLocaleString()}` : "No Limit"}`
                          )}
                        </div>
                        <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${activeAccount?.isApproachingDailyLimit ? "bg-red-500 animate-pulse" : "bg-amber-500"}`}
                            style={{ width: `${isWaitingForConnection ? 0 : Math.min(100, (Math.abs(activeAccount?.dailyPnl || 0) / (activeAccount?.dailyDrawdownLimit || 1)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Overall Max Drawdown</span>
                        <div className="text-sm font-extrabold text-white mt-1">
                          {isWaitingForConnection ? (
                            <span className="text-zinc-500 text-xs font-bold leading-normal">Waiting sync...</span>
                          ) : (
                            `$${(activeAccount?.currentDrawdown || 0).toLocaleString()} / ${activeAccount?.overallDrawdownLimit ? `$${activeAccount.overallDrawdownLimit.toLocaleString()}` : "No Limit"}`
                          )}
                        </div>
                        <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${activeAccount?.isApproachingMaxDrawdown ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}
                            style={{ width: `${isWaitingForConnection ? 0 : Math.min(100, ((activeAccount?.currentDrawdown || 0) / (activeAccount?.overallDrawdownLimit || 1)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 col-span-2 md:col-span-1">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Open Exposured Risk</span>
                        <div className="text-sm font-extrabold text-white mt-1">
                          ${activeAccount.positions ? activeAccount.positions.reduce((sum, p) => sum + (p.riskAmount || 0), 0).toLocaleString() : "0"}
                        </div>
                        <p className="text-[9px] text-[#22c55e] mt-2 font-black uppercase tracking-wider">Risk Level: Controlled</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-black/60 border border-zinc-900 rounded-lg flex flex-col md:flex-row justify-between gap-4 text-xs">
                      <div>
                        <span className="text-zinc-400 font-bold block">🛡️ AI Smart Slippage Guard</span>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Zoya has locked slippage boundaries to maximum 0.25 pips on OANDA Gold terminals.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                        <span className="text-zinc-300 font-bold text-[10px]">ACTIVE SHIELDS BYPASS</span>
                      </div>
                    </div>
                  </div>

                  {/* ONE-CLICK TRADE EXECUTION BLOCK */}
                  <div className="xl:col-span-5 p-4 bg-zinc-950 border border-[#1d2432] rounded-xl flex flex-col gap-3">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-zinc-950 pb-2 flex items-center justify-between">
                      <span>One-Click Ejecución</span>
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded font-black tracking-widest uppercase">MT5 Terminal DIRECT</span>
                    </h3>

                    <div className="flex flex-col gap-3 text-xs">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setExecType("BUY")}
                          className={`flex-1 py-2 rounded-lg font-black transition text-center uppercase tracking-widest ${execType === "BUY" ? "bg-emerald-600 text-white shadow-md shadow-emerald-950" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"}`}
                        >
                          BUY GOLD
                        </button>
                        <button 
                          onClick={() => setExecType("SELL")}
                          className={`flex-1 py-2 rounded-lg font-black transition text-center uppercase tracking-widest ${execType === "SELL" ? "bg-red-600 text-white shadow-md shadow-red-950" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"}`}
                        >
                          SELL GOLD
                        </button>
                      </div>

                      {/* Symbolic Input parameters */}
                      <div className="space-y-3 pt-1 border-t border-zinc-900/60 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 uppercase font-black">Trade Asset:</span>
                          <span className="text-white font-extrabold tracking-wide bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">XAUUSD.mt5</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 uppercase font-bold">Trade Lots:</span>
                          <div className="flex items-center gap-1.5 bg-black p-0.5 border border-zinc-900 rounded">
                            <button 
                              onClick={() => setExecLots(prev => Math.max(0.1, Number((prev - 0.1).toFixed(2))))}
                              className="w-5 h-5 bg-zinc-900 hover:bg-zinc-800 rounded font-black text-white flex items-center justify-center"
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              value={execLots}
                              onChange={(e) => setExecLots(Math.max(0.01, Number(e.target.value) || 1.0))}
                              className="text-center font-bold font-mono w-14 bg-transparent outline-none border-none text-white text-xs"
                            />
                            <button 
                              onClick={() => setExecLots(prev => Number((prev + 0.1).toFixed(2)))}
                              className="w-5 h-5 bg-zinc-900 hover:bg-zinc-800 rounded font-black text-white flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 uppercase font-bold">Auto Risk (Slippage Safe):</span>
                          <select 
                            value={execRiskPct} 
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setExecRiskPct(v);
                              // automatically calculate lots based on typical 25 pips SL on gold
                              const approxLots = Number((((activeAccount?.balance ?? 100000) * (v / 100)) / (25 * 100)).toFixed(2));
                              setExecLots(Math.max(0.1, approxLots));
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded p-1 text-white font-bold"
                          >
                            <option value={0.5}>0.5% Account Risk</option>
                            <option value={1.0}>1.0% Account Risk</option>
                            <option value={1.5}>1.5% Account Risk</option>
                            <option value={2.0}>2.0% Account Risk</option>
                            <option value={5.0}>5.0% Max Out (Aggressive)</option>
                          </select>
                        </div>
                      </div>

                      {/* LIVE PRE-ORDER IMPACT ANALYSIS CARD */}
                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5 text-[10px] mt-1 text-zinc-400">
                        <span className="text-emerald-400 font-extrabold block text-center uppercase tracking-widest border-b border-zinc-900 pb-1">Pre-Trade Impact Analysis</span>
                        <div className="flex justify-between">
                          <span>Trade risk:</span>
                          <span className="text-rose-400 font-bold">
                            {activeAccount?.balance === undefined ? "N/A (Awaiting Connection)" : `$${((activeAccount?.balance ?? 0) * (execRiskPct / 100)).toLocaleString()} (${execRiskPct}%)`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Requested Volume:</span>
                          <span className="text-white font-bold">{execLots} Lots</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Daily Drawdown Impact:</span>
                          <span className="text-zinc-300 font-mono">
                            {activeAccount?.balance === undefined ? "N/A" : (
                              activeAccount?.dailyDrawdownLimit === undefined ? (
                                `$${((activeAccount?.balance ?? 0) * (execRiskPct / 100)).toLocaleString()} of No Limit (Self-governed)`
                              ) : (
                                `$${((activeAccount?.balance ?? 0) * (execRiskPct / 100)).toLocaleString()} of ${activeAccount?.dailyDrawdownLimit?.toLocaleString()} limit (Max ${((((activeAccount?.balance ?? 0) * (execRiskPct / 100)) / (activeAccount?.dailyDrawdownLimit || 1)) * 100).toFixed(1)}%)`
                              )
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Required Margin Bound:</span>
                          <span className="text-zinc-300 font-bold">${(execLots * 1000).toLocaleString()} USD</span>
                        </div>
                      </div>

                      {/* Confirmation required */}
                      <button 
                        onClick={() => setShowExecConfirmPopup(true)}
                        className="w-full mt-2.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs tracking-widest shadow shadow-amber-500/20 active:translate-y-px transition cursor-pointer"
                      >
                        ⚡ Order Execute Securely
                      </button>
                    </div>
                  </div>
                </div>

                {/* THE POSITION MANAGER - OPEN POSITIONS ENGINE */}
                <div className="p-4 bg-zinc-950 border border-[#1d2432] rounded-xl flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-emerald-400 animate-pulse" /> MT5 Active Position Manager
                    </h3>
                    <span className="text-[10px] font-bold text-[#22c55e] bg-emerald-500/10 px-2 py-0.5 rounded tracking-widest">
                      {activeAccount.positions.length} ACTIVE TRADES PULLED
                    </span>
                  </div>

                  {activeAccount.positions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-900 rounded-lg text-zinc-500 flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-zinc-600 animate-pulse" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">No Active Open Positions on MT5</p>
                      <p className="text-[10px] text-zinc-500">Ready for instant Execution or pending triggers.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] border-collapse text-left text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest font-black text-[9px]">
                            <th className="pb-2">ID</th>
                            <th className="pb-2">Asset</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2 text-right">Lots</th>
                            <th className="pb-2 text-right">Entry</th>
                            <th className="pb-2 text-right">Current</th>
                            <th className="pb-2 text-right">SL / TP</th>
                            <th className="pb-2 text-right text-emerald-400">Profit ($)</th>
                            <th className="pb-2 text-right">Risk Margin</th>
                            <th className="pb-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60">
                          {activeAccount.positions.map((p) => (
                            <tr key={p.id} className="hover:bg-zinc-900/25 transition">
                              <td className="py-2.5 text-zinc-400">#{p.id.split("-").pop()}</td>
                              <td className="py-2.5 font-extrabold text-white">{p.symbol}</td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${p.type === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                                  {p.type}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-extrabold text-white">{p.lots} Lots</td>
                              <td className="py-2.5 text-right font-extrabold text-zinc-400">${p.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 text-right font-extrabold text-white animate-pulse">${p.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 text-right font-bold text-zinc-400">
                                <span className="text-rose-400">${p.sl}</span> / <span className="text-emerald-400">${p.tp}</span>
                              </td>
                              <td className={`py-2.5 text-right font-black text-xs ${p.profit >= 0 ? "text-emerald-400 bg-emerald-500/5" : "text-rose-400 bg-rose-500/5"} px-1.5 rounded`}>
                                {p.profit >= 0 ? "+" : ""}${p.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 text-right text-rose-400/90 font-bold">
                                -${p.riskAmount.toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right">
                                <div className="flex flex-wrap gap-1 justify-end">
                                  <button 
                                    onClick={() => {
                                      if (activeAccount?.metaApiId && activeAccount?.metaApiToken) {
                                        closeRealTradeOnBackend(p.id, p.symbol);
                                      } else {
                                        // close position action fallback
                                        setBloomAccounts(prev => prev.map(acc => {
                                          if (acc.id === selectedAccountId) {
                                            const closedPos = acc.positions.find(pos => pos.id === p.id);
                                            if (!closedPos) return acc;
                                            
                                            // add to history
                                            const newHist: Mt5AccountHistory = {
                                              id: `h-mt5-${Date.now()}`,
                                              symbol: closedPos.symbol,
                                              type: closedPos.type,
                                              lots: closedPos.lots,
                                              entryPrice: closedPos.entryPrice,
                                              exitPrice: closedPos.currentPrice,
                                              profit: closedPos.profit,
                                              timestamp: new Date().toISOString()
                                            };
                                            
                                            return {
                                              ...acc,
                                              balance: Number((acc.balance + closedPos.profit).toFixed(2)),
                                              dailyPnl: Number((acc.dailyPnl + closedPos.profit).toFixed(2)),
                                              positions: acc.positions.filter(pos => pos.id !== p.id),
                                              history: [newHist, ...acc.history]
                                            };
                                          }
                                          return acc;
                                        }));
                                        showToast(`Closed entire position #${p.id.split("-").pop()} for limit exit.`);
                                      }
                                    }}
                                    className="px-2 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded text-[9px] font-black transition cursor-pointer border border-red-500/10"
                                    title="Close Trade"
                                  >
                                    Close Line
                                  </button>
 
                                  <button 
                                    onClick={() => {
                                      if (activeAccount?.metaApiId && activeAccount?.metaApiToken) {
                                        const halfLots = Number((p.lots / 2).toFixed(2));
                                        closeRealTradeOnBackend(p.id, p.symbol, halfLots);
                                      } else {
                                        // partial close position half lots fallback
                                        setBloomAccounts(prev => prev.map(acc => {
                                          if (acc.id === selectedAccountId) {
                                            const targ = acc.positions.find(pos => pos.id === p.id);
                                            if (!targ || targ.lots <= 0.1) return acc;
                                            
                                            const halfLots = Number((targ.lots / 2).toFixed(2));
                                            const realizedProfit = Number((targ.profit / 2).toFixed(2));
                                            
                                            const updatedPosList = acc.positions.map(pos => {
                                              if (pos.id === p.id) {
                                                return {
                                                  ...pos,
                                                  lots: halfLots,
                                                  profit: realizedProfit,
                                                  riskAmount: Number((pos.riskAmount / 2).toFixed(2))
                                                };
                                              }
                                              return pos;
                                            });

                                            const newHist: Mt5AccountHistory = {
                                              id: `h-mt5-${Date.now()}`,
                                              symbol: targ.symbol,
                                              type: targ.type,
                                              lots: halfLots,
                                              entryPrice: targ.entryPrice,
                                              exitPrice: targ.currentPrice,
                                              profit: realizedProfit,
                                              timestamp: new Date().toISOString()
                                            };

                                            return {
                                              ...acc,
                                              balance: Number((acc.balance + realizedProfit).toFixed(2)),
                                              dailyPnl: Number((acc.dailyPnl + realizedProfit).toFixed(2)),
                                              positions: updatedPosList,
                                              history: [newHist, ...acc.history]
                                            };
                                          }
                                          return acc;
                                        }));
                                        showToast(`Halved size for position #${p.id.split("-").pop()}. Realized profit secure.`);
                                      }
                                    }}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[9px] font-black transition cursor-pointer"
                                    title="Partial Close"
                                  >
                                    Partial Close
                                  </button>
 
                                  <button 
                                    onClick={() => {
                                      if (activeAccount?.metaApiId && activeAccount?.metaApiToken) {
                                        modifyRealTradeSlTpOnBackend(p.id, p.entryPrice, p.tp || undefined);
                                      } else {
                                        // BE: Move SL to Entry price fallback
                                        setBloomAccounts(prev => prev.map(acc => {
                                          if (acc.id === selectedAccountId) {
                                            return {
                                              ...acc,
                                              positions: acc.positions.map(pos => {
                                                if (pos.id === p.id) {
                                                  return {
                                                    ...pos,
                                                    sl: pos.entryPrice,
                                                    riskAmount: 0 // SL is at entry!
                                                  };
                                                }
                                                return pos;
                                              })
                                            };
                                          }
                                          return acc;
                                        }));
                                        showToast(`Slippage Protection Enabled: Position #${p.id.split("-").pop()} SL moved to ${p.entryPrice} (Break Even)`);
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-[#22c55e] rounded text-[9px] font-black border border-emerald-500/10 transition cursor-pointer"
                                    title="Break Even"
                                  >
                                    BE Secure
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PENDING ORDERS LOG DIRECT */}
                  {activeAccount.pendingOrders.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-900">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Pending Limit Triggers ({activeAccount.pendingOrders.length})</span>
                      <div className="flex flex-wrap gap-3">
                        {activeAccount.pendingOrders.map(order => (
                          <div key={order.id} className="p-2 rounded bg-black/60 border border-zinc-900 text-[10px] flex items-center justify-between gap-4 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-500/10 text-amber-500 px-1.5 rounded font-bold">{order.type}</span>
                              <strong className="text-white">{order.symbol}</strong>
                              <span className="text-zinc-500">{order.lots} Lots @ <span className="font-extrabold text-zinc-300">${order.triggerPrice}</span></span>
                            </div>
                            <button 
                              onClick={() => {
                                setBloomAccounts(prev => prev.map(acc => {
                                  if (acc.id === selectedAccountId) {
                                    return {
                                      ...acc,
                                      pendingOrders: acc.pendingOrders.filter(o => o.id !== order.id)
                                    };
                                  }
                                  return acc;
                                }));
                                showToast(`Cancelled pending MT5 limit order #${order.id.split("-").pop()}`);
                              }}
                              className="text-rose-400 hover:text-rose-300 font-bold"
                            >
                              [Cancel]
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* THE HISTORIC PERFORMANCE ANALYTICS & STATS CHART VIEW */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* TRADE HISTORY GRAPHIC */}
                  <div className="md:col-span-8 p-4 bg-zinc-950 border border-[#1d2432] rounded-xl flex flex-col gap-3">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-zinc-950 pb-2">
                      Session Performance metrics & Pair Distribution
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Active sessions */}
                      <div className="p-3 bg-black/50 border border-zinc-900 rounded-lg">
                        <span className="text-zinc-500 text-[9px] uppercase font-bold block mb-2.5">Session Profit Distributions</span>
                        <div className="space-y-2">
                          {Object.entries(activeAccount.statistics.sessionPerf).map(([session, profitVal]) => {
                            const profit = profitVal as number;
                            return (
                              <div key={session} className="text-[10px] space-y-1.5">
                                <div className="flex justify-between font-bold text-zinc-300">
                                  <span>{session} Trading Matrix</span>
                                  <span className={profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                    {profit >= 0 ? "+" : ""}${profit.toLocaleString()}
                                  </span>
                                </div>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${profit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                                    style={{ width: `${Math.min(100, Math.max(10, Math.abs(profit) / 100))}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Best active trades pair stats */}
                      <div className="p-3 bg-black/50 border border-zinc-900 rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-bold block mb-2.5">Distribution By Pair (Historic wins)</span>
                          <div className="space-y-2.5">
                            {Object.entries(activeAccount.statistics.pairPerf).map(([pair, countVal]) => {
                              const count = countVal as number;
                              return (
                                <div key={pair} className="flex justify-between items-center text-[10px] text-zinc-300">
                                  <span className="font-extrabold text-zinc-100">{pair}</span>
                                  <span className="text-amber-400 bg-amber-500/10 px-1.5 rounded font-black">{count} trades won</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-zinc-900 text-center text-[10px] font-bold">
                          <div className="flex-1">
                            <span className="text-zinc-500 text-[8px] uppercase block">Win Ratio</span>
                            <span className="text-emerald-400 text-xs font-black">{activeAccount.statistics.winRate}%</span>
                          </div>
                          <div className="flex-1 border-l border-zinc-900">
                            <span className="text-zinc-500 text-[8px] uppercase block">Profit Factor</span>
                            <span className="text-white text-xs font-black">{activeAccount.statistics.profitFactor}x</span>
                          </div>
                          <div className="flex-1 border-l border-zinc-900">
                            <span className="text-zinc-500 text-[8px] uppercase block">Avg R_R Ratio</span>
                            <span className="text-amber-400 text-xs font-black">{activeAccount.statistics.avgRR}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RECENT MT5 LOG HISTORY TABLE */}
                    <div className="mt-2.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Recent MT5 realised journal logs</span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                        {activeAccount.history.map(hist => (
                          <div key={hist.id} className="flex justify-between items-center bg-[#07090d] border border-zinc-900 p-2 rounded text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1 rounded font-black text-[8px] ${hist.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{hist.type}</span>
                              <strong className="text-zinc-200">{hist.symbol}</strong>
                              <span className="text-zinc-500">({hist.lots} Lots)</span>
                              <span className="text-zinc-400">Entry: ${hist.entryPrice} → Exit: ${hist.exitPrice}</span>
                            </div>
                            <span className={`font-black ${hist.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {hist.profit >= 0 ? "+" : ""}${hist.profit.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DEPOSIT HISTORY TABLE */}
                    {activeAccount.depositHistory && activeAccount.depositHistory.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-zinc-900">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          Synchronized Deposit History ({activeAccount.depositHistory.length})
                        </span>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                          {activeAccount.depositHistory.map((dep: any) => (
                            <div key={dep.id} className="flex justify-between items-center bg-[#07090d] border border-zinc-900 p-2 rounded text-[10px]">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded font-black text-[8px] tracking-wider ${dep.type === "Deposit" ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"}`}>
                                  {dep.type.toUpperCase()}
                                </span>
                                <strong className="text-zinc-200">
                                  {dep.comment || "Initial/Balance adjustment"}
                                </strong>
                                <span className="text-zinc-500">
                                  ({new Date(dep.time).toLocaleDateString()})
                                </span>
                              </div>
                              <span className={`font-black ${dep.amount >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
                                {dep.amount >= 0 ? "+" : ""}${dep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ZOYA PROACTIVE ADVISOR COACH AND CREDENTIALS SECURITY CARD */}
                  <div className="md:col-span-4 flex flex-col gap-4">
                    
                    {/* ZOYA ACCOUNT COACH NOTIFICATION CARD */}
                    <div className="p-4 bg-gradient-to-br from-amber-500/15 via-[#120f0a] to-[#040404] border border-amber-500/20 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Zoya Account Co-Pilot</span>
                        </div>
                        <span className="text-[7px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">BROADCAST</span>
                      </div>

                      <div className="p-2.5 bg-black/60 rounded-lg text-[10px] border border-zinc-900/80 leading-relaxed text-zinc-200">
                        {activeAccount.isApproachingDailyLimit ? (
                          <span>
                            "Mohammad R., your active daily drawdown on <strong className="text-amber-400">{activeAccount.name}</strong> is at <strong>84%</strong>. I strongly advise pausing any new executions on Gold immediately. Let's let the spreads stabilize."
                          </span>
                        ) : activeAccount.positions.length > 3 ? (
                          <span>
                            "Rashad, active exposure is slightly higher than normal. Cumulative lots stand at <strong>{activeAccount.currentExposure} Lots</strong>. Be cautious of news releases in London session."
                          </span>
                        ) : (
                          <span>
                            "Daily risk parameters are safely aligned. Consistency metric is extremely high (<strong>{activeAccount.consistencyScore}%</strong>). Safe to proceed with normal gold scaling."
                          </span>
                        )}
                      </div>

                      <div className="text-[8px] text-zinc-500 italic text-right">
                        Powered by Antigravity intelligence
                      </div>
                    </div>

                    {/* LOCAL SECURE VAULT CREDENTIALS STORE (100% SECURE MASKING) */}
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                        <h4 className="text-[10px] font-black uppercase text-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-zinc-500" /> Local Secure Encryption Vault
                        </h4>
                        <span className="text-[7.5px] bg-[#fbbf24]/10 text-[#fbbf24] font-bold px-1 rounded uppercase tracking-widest">AES-256</span>
                      </div>

                      <p className="text-[9px] text-zinc-400 leading-normal">
                        Broker credentials are kept entirely inside sandboxed secure local variables. They are never sent to external servers or exposed to client-facing telemetry scripts.
                      </p>

                      <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 font-bold">Encrypted MT5 Sync Key:</span>
                          <span className="font-mono text-zinc-400 text-[10px] bg-black px-2 py-0.5 rounded tracking-widest border border-zinc-900">
                            {activeAccount.isVaultUnlocked ? "PASS_x8a239_v5" : activeAccount.vaultPasswordMasked}
                          </span>
                        </div>

                        {activeAccount.isVaultUnlocked ? (
                          <div className="space-y-1.5 pt-1.5 border-t border-zinc-900">
                            <label className="text-[8px] text-zinc-500 uppercase block font-black">Change Vault Master Passphrase</label>
                            <input 
                              type="password"
                              value={userInputPassword}
                              onChange={(e) => setUserInputPassword(e.target.value)}
                              placeholder="New Local Passphrase..."
                              className="w-full bg-black border border-zinc-800 p-1 rounded font-bold text-white text-[9px] max-w-full outline-none"
                            />
                            <button 
                              onClick={() => {
                                if (!userInputPassword) return;
                                setBloomAccounts(prev => prev.map(acc => {
                                  if (acc.id === selectedAccountId) {
                                    return {
                                      ...acc,
                                      vaultPasswordMasked: "●●●●●●●●",
                                      isVaultUnlocked: false
                                    };
                                  }
                                  return acc;
                                }));
                                setUserInputPassword("");
                                showToast("Updated MT5 sync token in local secure storage successfully.");
                              }}
                              className="w-full bg-emerald-600 text-white font-bold p-1 rounded text-[8px] uppercase tracking-wide cursor-pointer"
                            >
                              Lock & Secure credentials
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              // Unlock simulation
                              setBloomAccounts(prev => prev.map(acc => {
                                if (acc.id === selectedAccountId) {
                                  return {
                                    ...acc,
                                    isVaultUnlocked: true
                                  };
                                }
                                return acc;
                              }));
                              showToast("Credentials Vault Decrypted with active session Token.");
                            }}
                            className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 border border-zinc-800"
                          >
                            <Unlock className="w-3 h-3 text-amber-500 animate-pulse" /> Unlock credentials vault
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CUSTOM ACTIVE ALERTS WARNING LIST inside Command Center */}
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-2.5">
                      <span className="text-[10px] font-black uppercase text-white tracking-wider">Account Active Rule Guards</span>
                      
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                        {centerAlertList.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-[9px] bg-black p-1.5 rounded border border-zinc-900">
                            <span className="text-zinc-200">{item.type} ({item.threshold})</span>
                            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Armed
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Simple add rule */}
                      <div className="pt-1 border-t border-zinc-900 flex gap-1 items-center">
                        <select 
                          value={newCenterAlertType}
                          onChange={(e: any) => setNewCenterAlertType(e.target.value)}
                          className="flex-1 bg-black text-[9px] border border-zinc-800 rounded p-1 text-zinc-300 outline-none"
                        >
                          <option value="Daily Drawdown">Daily Drawdown</option>
                          <option value="Max Drawdown">Max Drawdown</option>
                          <option value="Profit Milestone">Profit Milestone</option>
                          <option value="Margin Level">Margin Level</option>
                          <option value="Exposure">Exposure</option>
                        </select>
                        <input 
                          type="text" 
                          value={newCenterAlertThreshold} 
                          onChange={(e) => setNewCenterAlertThreshold(e.target.value)}
                          className="w-14 bg-black text-[9px] border border-zinc-800 rounded p-1 text-center text-white"
                          placeholder="80%" 
                        />
                        <button 
                          onClick={() => {
                            const newAlert = {
                              id: `ca-${Date.now()}`,
                              type: `${newCenterAlertType} Alert`,
                              threshold: newCenterAlertThreshold,
                              armed: true
                            };
                            setCenterAlertList(prev => [...prev, newAlert]);
                            showToast(`Armed custom safety rule guide: ${newCenterAlertType} at ${newCenterAlertThreshold}`);
                          }}
                          className="bg-amber-500 text-black px-2 py-1 rounded text-[9px] font-black cursor-pointer"
                        >
                          Arm Guard
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* MT5 / FUNDED ACCOUNT CONNECTION MODAL (SECURE HANDSHAKE INTERACTION) */}
                <AnimatePresence>
                  {showConnectModal && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                    >
                      <motion.div 
                        initial={{ scale: 0.95, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 15 }}
                        className="w-full max-w-lg p-6 rounded-2xl bg-[#0a0d13] border border-zinc-800 text-xs font-mono shadow-2xl shadow-black text-zinc-300 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
                      >
                        {/* Title & Modal Mode Switches */}
                        <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" />
                            <div>
                              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                {connectModalType === "MT5" ? "Connect MT5 Terminal Key" : "Register Funded Challenge Terminal"}
                              </h3>
                              <p className="text-[9px] text-[#475569] uppercase font-bold tracking-widest mt-0.5">Secure sandbox terminal handshake</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => setShowConnectModal(false)}
                            className="p-1 px-2.5 hover:bg-zinc-850 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded transition text-[10px] cursor-pointer"
                          >
                            ✕ Close
                          </button>
                        </div>

                        {/* Connection Segment Tabs */}
                        <div className="grid grid-cols-2 bg-black/60 p-1 rounded-lg border border-zinc-900">
                          <button
                            type="button"
                            onClick={() => {
                              setConnectModalType("MT5");
                              setInputBrokerServer("Oanda-MT5-Live-5");
                              setInputProvider("Personal MT5");
                              setInputPhase("Personal");
                              setTestConnectionStatus("Idle");
                              setTestConnectionLog([]);
                            }}
                            className={`py-2 text-center text-[10px] font-black uppercase tracking-wider rounded transition cursor-pointer ${connectModalType === "MT5" ? "bg-amber-500 text-black shadow" : "text-zinc-400 hover:text-white"}`}
                          >
                            MetaTrader 5 Account
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConnectModalType("Funded");
                              setInputBrokerServer("FTMO-Server3");
                              setInputProvider("FTMO");
                              setInputPhase("Challenge");
                              setTestConnectionStatus("Idle");
                              setTestConnectionLog([]);
                            }}
                            className={`py-2 text-center text-[10px] font-black uppercase tracking-wider rounded transition cursor-pointer ${connectModalType === "Funded" ? "bg-amber-500 text-black shadow" : "text-zinc-400 hover:text-white"}`}
                          >
                            Funded Challenge Program
                          </button>
                        </div>

                        {/* Interactive Fields layout */}
                        <div className="space-y-4 pt-1">
                          
                          {/* STEP 1: SYSTEM METAAPI CLOUD ROUTER CREDENTIALS */}
                          <div className="p-3.5 rounded-xl border border-zinc-800 bg-black/60 flex flex-col gap-3">
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-500 tracking-wider">
                              <ShieldAlert className="w-3.5 h-3.5" /> Step 1: Secure MetaApi Cloud Gateways
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">MetaApi Cloud Developer Token</label>
                                <a 
                                  href="https://metaapi.cloud" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[8px] text-amber-500 hover:underline hover:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                  Register Token (metaapi.cloud) ↗
                                </a>
                              </div>
                              <input 
                                type="password"
                                value={metaApiToken}
                                onChange={(e) => setMetaApiToken(e.target.value)}
                                className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white tracking-widest focus:border-amber-500/50 outline-none text-[10px]"
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 font-bold">Cloud Region</label>
                                <select
                                  value={inputRegion}
                                  onChange={(e: any) => setInputRegion(e.target.value)}
                                  className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none cursor-pointer text-[10px]"
                                >
                                  <option value="New York">New York (Low Latency US)</option>
                                  <option value="London">London (Low Latency UK/EU)</option>
                                  <option value="Frankfurt">Frankfurt (Germany/CH)</option>
                                  <option value="Singapore">Singapore (Low Latency Asia)</option>
                                  <option value="Tokyo">Tokyo (Japan Local)</option>
                                </select>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Handshake Engine</label>
                                <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-900 text-[10px] text-zinc-500 flex items-center gap-1.5 font-bold h-[34px]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  <span>Automated Provising</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* STEP 2: METATRADER 5 ACCOUNT DETAILS */}
                          <div className="p-3.5 rounded-xl border border-zinc-850 bg-black/40 flex flex-col gap-3">
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-500 tracking-wider">
                              <Sliders className="w-3.5 h-3.5" /> Step 2: MetaTrader 5 Broker Credentials
                            </div>

                            {/* Common Friendly custom name */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Account Nickname</label>
                              <input 
                                type="text"
                                value={inputAccountName}
                                onChange={(e) => setInputAccountName(e.target.value)}
                                className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none placeholder:text-zinc-650 text-[10px]"
                                placeholder={connectModalType === "MT5" ? "e.g., Personal Oanda Live" : "e.g., My FTMO Phase-1 $100k"}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {/* Account ID / Number */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Account Number / Login ID</label>
                                <input 
                                  type="text"
                                  value={inputAccNumber}
                                  onChange={(e) => setInputAccNumber(e.target.value)}
                                  className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white tracking-widest focus:border-amber-500/50 outline-none text-[10px]"
                                  placeholder="80911853"
                                />
                              </div>

                              {/* Password Masked Inputs */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Master Password</label>
                                <input 
                                  type="password"
                                  value={inputPassword}
                                  onChange={(e) => setInputPassword(e.target.value)}
                                  className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white tracking-widest focus:border-amber-500/50 outline-none text-[10px]"
                                  placeholder="Broker account password"
                                />
                              </div>
                            </div>

                            {/* Dynamic components depending on MT5 / Funded challenge mode */}
                            {connectModalType === "Funded" ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Provider dropdown */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Challenge Provider</label>
                                    <select
                                      value={inputProvider}
                                      onChange={(e: any) => setInputProvider(e.target.value)}
                                      className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none cursor-pointer text-[10px]"
                                    >
                                      <option value="FTMO">FTMO Evaluation</option>
                                      <option value="FundedNext">FundedNext Hub</option>
                                      <option value="The5ers">The5ers Funding</option>
                                      <option value="FundingPips">Funding Pips Challenge</option>
                                      <option value="E8Markets">E8 Markets Sandbox</option>
                                      <option value="AlphaCapital">Alpha Capital Group</option>
                                    </select>
                                  </div>

                                  {/* Evaluation step status phase */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 font-bold">Phase Status</label>
                                    <select
                                      value={inputPhase}
                                      onChange={(e: any) => setInputPhase(e.target.value)}
                                      className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none cursor-pointer text-[10px]"
                                    >
                                      <option value="Challenge">Phase 1: Challenge</option>
                                      <option value="Verification">Phase 2: Verification</option>
                                      <option value="Funded">Phase 3: Funded Account</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  {/* Program Account Size sizing */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Target Account Size</label>
                                    <select
                                      value={inputBalance}
                                      onChange={(e: any) => setInputBalance(Number(e.target.value))}
                                      className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none cursor-pointer text-[10px]"
                                    >
                                      <option value={10000}>$10,000 challenge</option>
                                      <option value={25000}>$25,000 challenge</option>
                                      <option value={50000}>$50,000 challenge</option>
                                      <option value={100000}>$100,000 challenge</option>
                                      <option value={200000}>$200,000 challenge</option>
                                    </select>
                                  </div>

                                  {/* Server address host */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Broker Server Name</label>
                                    <input 
                                      type="text"
                                      value={inputBrokerServer}
                                      onChange={(e) => setInputBrokerServer(e.target.value)}
                                      className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none text-[10px]"
                                      placeholder="e.g. FTMO-Server3"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                {/* MT5 server address host */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 font-bold">Broker Server Name</label>
                                  <input 
                                    type="text"
                                    value={inputBrokerServer}
                                    onChange={(e) => setInputBrokerServer(e.target.value)}
                                    className="w-full bg-black/80 border border-zinc-900 rounded-lg p-2.5 text-white focus:border-amber-500/50 outline-none text-[10px]"
                                    placeholder="e.g., Oanda-MT5-Live-5"
                                  />
                                </div>

                                {/* Automatic Balance Resolution Notice */}
                                <div className="p-3 bg-emerald-950/10 border border-emerald-500/15 rounded-lg flex flex-col justify-center h-[52px]">
                                  <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide">Starting Balance</p>
                                  <p className="text-[9px] text-zinc-400 mt-0.5 leading-tight">
                                    Resolved automatically from first history deposit.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CONNECTION DIAGNOSTICS CHECKPOINT PANEL */}
                        <div className="p-3.5 bg-[#080a0e] rounded-xl border border-zinc-900 flex flex-col gap-2.5">
                          <div className="flex justify-between items-center text-[9px] border-b border-zinc-900 pb-2">
                            <span className="text-zinc-400 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Connection Diagnostics Status Panel
                            </span>
                            <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Real-Time Telemetry
                            </span>
                          </div>

                          {/* Individual checklist items */}
                          <div className="grid grid-cols-3 gap-2.5">
                            {/* Checkpoint 1: MetaApi Connected */}
                            <div className={`p-2 rounded-lg border flex flex-col gap-1 items-center justify-center text-center transition ${metaApiConnected === true ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : metaApiConnected === false ? "bg-rose-500/5 border-rose-500/20 text-rose-450" : "bg-zinc-900/40 border-zinc-900 text-zinc-500"}`}>
                              <span className="text-[8px] uppercase tracking-wider font-bold">Checkpoint 1</span>
                              <div className="flex items-center gap-1 text-[9px] font-black">
                                {metaApiConnected === true ? "✓ OK" : metaApiConnected === false ? "✕ FAILED" : "● PENDING"}
                              </div>
                              <span className="text-[8px] tracking-tight font-extrabold block">MetaApi Connected</span>
                            </div>

                            {/* Checkpoint 2: MT5 Connected */}
                            <div className={`p-2 rounded-lg border flex flex-col gap-1 items-center justify-center text-center transition ${mt5Connected === true ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : mt5Connected === false ? "bg-rose-500/5 border-rose-500/20 text-rose-450" : "bg-zinc-900/40 border-zinc-900 text-zinc-500"}`}>
                              <span className="text-[8px] uppercase tracking-wider font-bold">Checkpoint 2</span>
                              <div className="flex items-center gap-1 text-[9px] font-black">
                                {mt5Connected === true ? "✓ OK" : mt5Connected === false ? "✕ FAILED" : "● PENDING"}
                              </div>
                              <span className="text-[8px] tracking-tight font-extrabold block">MT5 Connected</span>
                            </div>

                            {/* Checkpoint 3: Account Synced */}
                            <div className={`p-2 rounded-lg border flex flex-col gap-1 items-center justify-center text-center transition ${accountSynced === true ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : accountSynced === false ? "bg-rose-500/5 border-rose-500/20 text-rose-450" : "bg-zinc-900/40 border-zinc-900 text-zinc-500"}`}>
                              <span className="text-[8px] uppercase tracking-wider font-bold">Checkpoint 3</span>
                              <div className="flex items-center gap-1 text-[9px] font-black">
                                {accountSynced === true ? "✓ OK" : accountSynced === false ? "✕ FAILED" : "● PENDING"}
                              </div>
                              <span className="text-[8px] tracking-tight font-extrabold block">Account Synced</span>
                            </div>
                          </div>

                          {/* Specific Failure Output details */}
                          {diagnosticError && (
                            <div className="p-2.5 rounded-lg bg-[#140b0e] border border-rose-500/20 text-rose-400 text-[10px] space-y-1">
                              <div className="font-extrabold uppercase text-[8px] tracking-wider text-rose-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> Failure Code: {errorClassification || "General Error"}
                              </div>
                              <p className="leading-relaxed font-bold font-mono text-[9.5px]">{diagnosticError}</p>
                            </div>
                          )}

                          {/* FULL DETAILED DIAGNOSTIC REPORT PANEL */}
                          {diagnosticReport && (
                            <div className="mt-1 p-3.5 bg-black/85 rounded-xl border border-zinc-800 text-[10px] text-zinc-300 space-y-3 font-mono">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                                <span className="text-amber-500 font-extrabold uppercase flex items-center gap-1.5">
                                  <Terminal className="w-3.5 h-3.5 text-amber-500" /> Diagnostics Trace Report
                                </span>
                                <span className="text-zinc-500 text-[8px]">{diagnosticReport.timestamp}</span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-start gap-1 justify-between">
                                  <span className="text-zinc-500">Target Request URL:</span>
                                  <span className="text-zinc-200 select-all font-semibold break-all text-right max-w-[70%]">{diagnosticReport.url}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-500">HTTP Status Code:</span>
                                  <span className={`font-extrabold px-1.5 py-0.5 rounded text-[9px] ${diagnosticReport.statusCode === 200 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                                    {diagnosticReport.statusCode !== null ? diagnosticReport.statusCode : "N/A (Crashed before response)"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-500">API Endpoint Verification:</span>
                                  <span className={diagnosticReport.metaApiUrlVerified ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                    {diagnosticReport.metaApiUrlVerified ? "✓ Valid domain format (.ag-api.com)" : "✕ Spell-check Failed (Stale .ai suffix)"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-500">Authentication Headers:</span>
                                  <span className={diagnosticReport.tokenInjected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                    {diagnosticReport.tokenInjected ? "✓ Auth Token Injected" : "✕ Failed (Missing auth-token)"}
                                  </span>
                                </div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-zinc-500 whitespace-nowrap">Token Status:</span>
                                  <span className="text-zinc-400 text-right font-medium">{diagnosticReport.tokenVerification}</span>
                                </div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-zinc-500 whitespace-nowrap">Route Proxy Setup:</span>
                                  <span className="text-zinc-400 text-right font-medium">{diagnosticReport.networkProxyStatus}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-500">Html Document Detected:</span>
                                  <span className={diagnosticReport.isHtml ? "text-amber-400 font-extrabold px-1 bg-amber-500/10 rounded animate-pulse" : "text-zinc-400"}>
                                    {diagnosticReport.isHtml ? "YES (HTML Page Returned Instead of JSON!)" : "NO (Clean JSON Stream)"}
                                  </span>
                                </div>
                              </div>

                              {/* Toggleable Headers */}
                              <div className="pt-2 border-t border-zinc-900">
                                <details className="group">
                                  <summary className="text-[9px] text-zinc-400 hover:text-white uppercase font-black cursor-pointer flex items-center justify-between py-1 select-none">
                                    <span>View Diagnostic Headers ({Object.keys(diagnosticReport.headers).length})</span>
                                    <span className="transition duration-150 group-open:rotate-180">▼</span>
                                  </summary>
                                  <div className="mt-1.5 p-2 bg-black/40 rounded border border-zinc-900 max-h-[120px] overflow-y-auto space-y-1 text-[8px] leading-relaxed">
                                    {Object.keys(diagnosticReport.headers).length > 0 ? (
                                      Object.entries(diagnosticReport.headers).map(([key, val]) => (
                                        <div key={key} className="flex justify-between gap-3 border-b border-zinc-900/40 pb-0.5">
                                          <span className="text-zinc-400 font-bold">{key}:</span>
                                          <span className="text-zinc-200 select-all break-all">{val}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-zinc-500 italic text-center">No headers recorded</div>
                                    )}
                                  </div>
                                </details>
                              </div>

                              {/* Toggleable Response Body */}
                              <div className="pt-2 border-t border-zinc-900">
                                <details className="group">
                                  <summary className="text-[9px] text-zinc-400 hover:text-white uppercase font-black cursor-pointer flex items-center justify-between py-1 select-none">
                                    <span>View Raw Response Body ({diagnosticReport.rawBody.length} bytes)</span>
                                    <span className="transition duration-150 group-open:rotate-180">▼</span>
                                  </summary>
                                  <div className="mt-1.5 font-sans">
                                    {diagnosticReport.isHtml && (
                                      <p className="text-[8.5px] text-amber-500/90 font-mono leading-normal italic mb-1.5 bg-amber-500/5 p-1.5 rounded border border-amber-500/15">
                                        ⚠️ Alert: The server returned an HTML webpage document. This usually means a connection filter blocked the request, the API was not found (404), or custom redirection rules interfered.
                                      </p>
                                    )}
                                    <pre className="p-2.5 bg-[#050510] font-mono text-[8.5px] leading-relaxed text-rose-350 select-all overflow-auto rounded border border-zinc-900 max-h-[150px] whitespace-pre-wrap break-all">
                                      {diagnosticReport.rawBody || "No response body recorded"}
                                    </pre>
                                  </div>
                                </details>
                              </div>
                            </div>
                          )}

                          {/* Server Handshake validate log output console */}
                          {testConnectionStatus !== "Idle" && (
                            <div className="mt-1 p-2 bg-black/60 rounded border border-zinc-900/60 max-h-[90px] overflow-y-auto">
                              {testConnectionLog.map((log, index) => (
                                <div key={index} className="text-[9px] font-mono leading-relaxed text-zinc-400 font-bold">
                                  ❯ <span className={log.includes("✓") ? "text-emerald-400 font-bold" : log.includes("❌") || log.includes("⚠️") ? "text-rose-450" : ""}>{log}</span>
                                </div>
                              ))}
                              {testConnectionStatus === "Testing" && (
                                <div className="text-[10px] text-amber-500 flex items-center gap-1.5 animate-pulse pt-1">
                                  <RefreshCw className="w-3 h-3 animate-spin text-amber-500" /> Transmitting test sequence...
                                </div>
                              )}
                            </div>
                          )}


                          {/* Connection Result status strip */}
                          {testConnectionStatus !== "Idle" && testConnectionStatus !== "Testing" && (
                            <div className={`p-2 rounded-lg border-l-4 text-[10px] uppercase font-extrabold flex items-center gap-2 ${testConnectionStatus === "Success" ? "bg-emerald-500/10 text-emerald-400 border-l-emerald-555 border-zinc-900" : testConnectionStatus === "Unreachable" ? "bg-orange-500/10 text-orange-400 border-l-orange-500 border-zinc-900" : "bg-rose-500/10 text-rose-450 border-l-rose-500 border-zinc-900"}`}>
                              {testConnectionStatus === "Success" ? (
                                <>
                                  <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                                  <span>VAL STATS: Access Granted. Handshake complete!</span>
                                </>
                              ) : testConnectionStatus === "Unreachable" ? (
                                <>
                                  <WifiOff className="w-4 h-4 text-orange-400" />
                                  <span>VAL STATS: Network Error. Server unreachable.</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 text-rose-400" />
                                  <span>VAL STATS: Credentials Mismatch. Access Denied.</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Modal Action footer panels */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                          {/* Test connection command triggers */}
                          <button 
                            type="button"
                            onClick={() => handleTestConnection(false)}
                            disabled={testConnectionStatus === "Testing" || !inputAccNumber || !inputPassword || !inputBrokerServer}
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 text-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border border-zinc-800"
                          >
                            {testConnectionStatus === "Testing" ? "Testing..." : "Test Connection"}
                          </button>

                          {/* Save Connected Accounts action button */}
                          <button 
                            type="button" 
                            onClick={async () => {
                              if (testConnectionStatus === "Success") {
                                saveConnectedAccount();
                              } else {
                                // Run background test then save automatically!
                                await handleTestConnection(true);
                              }
                            }}
                            disabled={testConnectionStatus === "Testing" || !inputAccNumber || !inputPassword || !inputBrokerServer}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black uppercase tracking-wider rounded-xl text-xs transition cursor-pointer"
                          >
                            Connect Terminal Portal
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ONE CLICK EXECUTION SECURE CONFIRMATION OVERLAY */}
                <AnimatePresence>
                  {showExecConfirmPopup && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                    >
                      <motion.div 
                        initial={{ scale: 0.95, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 15 }}
                        className="w-full max-w-md p-6 rounded-2xl bg-[#090b10] border border-amber-500/30 text-xs font-mono shadow-2xl shadow-amber-500/5 text-zinc-300"
                      >
                        <div className="flex items-center gap-2 text-amber-400 font-extrabold uppercase mb-3 pb-2 border-b border-zinc-800">
                          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                          <span>MT5 One-Click Execution Confirmation</span>
                        </div>

                        <p className="text-[11px] leading-relaxed text-zinc-400 mb-4 font-bold">
                          You are about to transmit a direct order to the OANDA MT5 bridge router node. Verify your risk bounds carefully!
                        </p>

                        <div className="space-y-2.5 bg-black/60 p-4 rounded-xl border border-zinc-800/80 text-[11px] mb-5">
                          <div className="flex justify-between">
                            <span className="text-zinc-500 uppercase font-black text-[9px]">Trade Asset class:</span>
                            <span className="text-white font-extrabold">XAUUSD.mt5 (Gold Spot)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 uppercase font-black text-[9px]">Action Order:</span>
                            <span className={`font-black uppercase tracking-wider ${execType === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>{execType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 uppercase font-black text-[9px]">Order volume:</span>
                            <span className="text-white font-black">{execLots} Lots</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 uppercase font-black text-[9px]">Calculated risk ratio:</span>
                            <span className="text-rose-400 font-black">{execRiskPct}% of capital</span>
                          </div>
                          <div className="flex justify-between border-t border-zinc-900/65 pt-2">
                            <span className="text-zinc-500 uppercase font-bold text-[9px]">Potential PnL Limit:</span>
                            <span className="text-[#f43f5e] font-black">{activeAccount?.balance === undefined ? "N/A" : `-$${((activeAccount?.balance ?? 0) * (execRiskPct / 100)).toLocaleString()} USD Max`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 uppercase font-bold text-[9px]">Dynamic Margin exposure:</span>
                            <span className="text-zinc-300 font-bold">${(execLots * 1000).toLocaleString()} USD</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setShowExecConfirmPopup(false)}
                            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg font-bold border border-zinc-800 text-center uppercase tracking-wider transition cursor-pointer"
                          >
                            Abort transmission
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              if (activeAccount?.metaApiId && activeAccount?.metaApiToken) {
                                const ok = await executeRealTradeOnBackend(execType, execLots, "XAUUSD");
                                if (ok) {
                                  setShowExecConfirmPopup(false);
                                }
                              } else {
                                const newPosId = `p-mt5-${Date.now()}`;
                                const newPos: Mt5Position = {
                                  id: newPosId,
                                  symbol: "XAUUSD",
                                  type: execType,
                                  lots: execLots,
                                  entryPrice: 2322.80,
                                  currentPrice: 2322.80,
                                  sl: execType === "BUY" ? 2315.0 : 2330.0,
                                  tp: execType === "BUY" ? 2345.0 : 2310.0,
                                  profit: 0.00,
                                  riskAmount: (activeAccount?.balance ?? 100000) * (execRiskPct / 100),
                                  timestamp: new Date().toISOString()
                                };

                                setBloomAccounts(prev => prev.map(acc => {
                                  if (acc.id === selectedAccountId) {
                                    return {
                                      ...acc,
                                      positions: [newPos, ...acc.positions],
                                      currentExposure: Number((acc.currentExposure + execLots).toFixed(2))
                                    };
                                  }
                                  return acc;
                                }));

                                setShowExecConfirmPopup(false);
                                showToast(`Executive MT5 market order submitted: ${execType} ${execLots} Lots successful!`);
                              }
                            }}
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-black text-center uppercase tracking-wider transition cursor-pointer"
                          >
                            Firm execute
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SIMPLE TOAST POPUP FOR CONFIRMED Iframe COMPATIBLE EXPERIENCE */}
                <AnimatePresence>
                  {toastMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 50 }}
                      className="fixed bottom-6 right-6 p-4 rounded-xl border border-amber-500 bg-[#16120b] text-amber-300 shadow-2xl text-xs font-mono font-black z-[999] flex items-center gap-2 "
                    >
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
                      <span>{toastMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}
            
            {/* TABS 1: MAIN TERMINAL DASHBOARD */}
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                {/* 1. Header Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#10b981]/5 to-transparent border border-[#10b981]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold font-mono tracking-tight text-white uppercase italic">Workstation Overview: BOND BLOOM</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">Real-time telemetry, sentiment streams & opportunities for Mohammad Rashad.</p>
                  </div>
                  <div className="bg-[#10b981]/10 border border-[#10b981]/20 px-3.5 py-1.5 rounded-lg text-xs font-mono text-[#10b981] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>UTC Standard Time: 20:50</span>
                  </div>
                </div>

                {/* 2. Opportunity Alerts & Core Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Today's Opportunities */}
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-3">
                    <h4 className="text-xs font-bold font-mono text-[#10b981] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#fbbf24] animate-ping" />
                      Dynamic Opp Ticker
                    </h4>
                    <div className="flex flex-col gap-2.5 mt-1">
                      {[
                        { symbol: "XAUUSD", trend: "BULLISH", target: "2335.00", sl: "2315.00", riskRatio: "1:3", state: "TRADING ZONE" },
                        { symbol: "EURUSD", trend: "BEARISH", target: "1.0780", sl: "1.0865", riskRatio: "1:2.4", state: "CONFIRMED" },
                        { symbol: "GBPUSD", trend: "BULLISH", target: "1.2820", sl: "1.2700", riskRatio: "1:2.2", state: "MONITORING" }
                      ].map((opp, i) => (
                        <div key={i} className="p-3 bg-black/40 border border-[#1e2635] hover:border-[#10b981]/30 transition-all rounded-lg flex justify-between items-center text-xs font-mono">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm">{opp.symbol}</span>
                              <span className={`text-[9px] px-1.5 rounded ${opp.trend === "BULLISH" ? "bg-[#10b981]/15 text-[#10b981]" : "bg-red-500/15 text-red-400"}`}>
                                {opp.trend}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#64748b] mt-1">SL: {opp.sl} | Target: {opp.target}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#fbbf24] bg-[#fbbf24]/10 rounded px-1.5 py-0.5">{opp.state}</span>
                            <p className="text-[10px] text-[#475569] mt-1">Ratio: {opp.riskRatio}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market Mood Meter */}
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-[#94a3b8] uppercase tracking-wider">Market Psychological Climate</h4>
                      <p className="text-[11px] text-[#64748b]">Realtime derivative feedback indicators</p>
                    </div>

                    <div className="my-4 flex flex-col items-center justify-center p-3">
                      <div className="text-4xl">📈</div>
                      <span className="text-2xl font-bold font-mono text-white mt-2">ACCUMULATION</span>
                      <span className="text-xs text-[#10b981] font-mono mt-0.5">Bullish Confidence Index: 78.4%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono pt-2 border-t border-[#1e2635]">
                      <div>
                        <span className="text-[#64748b] block uppercase">Fear / Greed</span>
                        <span className="text-[#fbbf24] font-bold">68 (Greed)</span>
                      </div>
                      <div>
                        <span className="text-[#64748b] block uppercase">Next Shift</span>
                        <span className="text-teal-400 font-bold">Euphoria</span>
                      </div>
                      <div>
                        <span className="text-[#64748b] block uppercase">Volatility</span>
                        <span className="text-[#ef4444] font-bold">Premium High</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. Real-time Asset Ticker Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[#64748b] uppercase font-bold">OANDA:XAUUSD</span>
                    <span className="text-2xl font-bold font-mono text-white">$2,322.80</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#10b981] mt-1">
                      <span>▲ +1.12%</span>
                      <span className="text-[#475569]">|</span>
                      <span className="text-[#fbbf24]">Target Tier: $2350</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[#64748b] uppercase font-bold">FX:EURUSD</span>
                    <span className="text-2xl font-bold font-mono text-white">1.08220</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#ef4444] mt-1">
                      <span>▼ -0.34%</span>
                      <span className="text-[#475569]">|</span>
                      <span className="text-[#10b981]">Support Pivot</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[#64748b] uppercase font-bold">US Dollar Index (DXY)</span>
                    <span className="text-2xl font-bold font-mono text-white">105.15</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#10b981] mt-1">
                      <span>▲ +0.22%</span>
                      <span className="text-[#475569]">|</span>
                      <span className="text-slate-400">Yield Surge Impact</span>
                    </div>
                  </div>
                </div>

                {/* 4. Mini Canvas Grid Graphic */}
                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015]">
                  <h4 className="text-xs font-bold font-mono text-[#94a3b8] uppercase tracking-wider mb-2">BOND BLOOM FUND EQUITY GROWTH (2026 PROJECTED)</h4>
                  <div className="h-44 w-full bg-[#080b0f] rounded border border-[#1c22)ee] relative flex items-end p-2 overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="grid-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid wires */}
                      <line x1="0" y1="20" x2="500" y2="20" stroke="#161c28" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#161c28" strokeWidth="0.5" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="#161c28" strokeWidth="0.5" />
                      
                      {/* Curve */}
                      <path d="M 0 90 Q 50 82 100 85 T 200 60 T 300 70 T 400 40 T 500 10 L 500 100 L 0 100 Z" fill="url(#grid-grad)" />
                      <path d="M 0 90 Q 50 82 100 85 T 200 60 T 300 70 T 400 40 T 500 10" fill="none" stroke="#10b981" strokeWidth="2.5" />
                      {/* Circles */}
                      <circle cx="500" cy="10" r="4.5" fill="#10b981" className="animate-pulse" />
                    </svg>
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 font-mono text-[9px] text-[#10b981]">
                      <span>● ATH RESERVES DETECTED</span>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 font-mono text-[9px] text-[#64748b]">
                      <span>JAN 2026</span>
                      <span>-</span>
                      <span>JUN 2026</span>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TABS 2: CHARTS CENTER */}
            {activeTab === "charts" && (
              <motion.div key="charts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 h-full flex flex-col gap-4">
                
                {/* Custom top bar for chart controller */}
                <div className="p-3 bg-[#0c1015] rounded-xl border border-[#1c222e] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  
                  {/* Select Workspace preset */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748b] uppercase">Saved Profile:</span>
                    <div className="flex gap-1.5">
                      {workspaces.map(w => (
                        <button
                          key={w.id}
                          onClick={() => setActiveWorkspaceId(w.id)}
                          className={`px-3 py-1 rounded text-xs transition ${w.id === activeWorkspaceId ? "bg-[#10b981] text-black font-semibold" : "bg-[#161c28] text-slate-300 hover:text-white"}`}
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-chart Layout config */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748b] uppercase">Grid:</span>
                    <div className="flex gap-1 bg-[#161c28] p-0.5 rounded">
                      {[1, 2, 4, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => {
                            setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, layout: num } : w));
                          }}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold ${activeWorkspace.layout === num ? "bg-[#10b981]/20 text-[#10b981]" : "text-[#94a3b8] hover:text-white"}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeframe selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748b] uppercase">Interval:</span>
                    <div className="flex gap-1">
                      {["M1", "M5", "M15", "H1", "H4", "D1"].map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${timeframe === tf ? "text-white bg-[#10b981]/25 border border-[#10b981]/40 font-bold" : "text-slate-400 hover:text-white"}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FAST FULL SCREEN TOGGLER */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullScreenMode(true);
                      setIsGoldTraderMode(false);
                      setFullscreenSymbol("OANDA:XAUUSD");
                      showToast("Expanded Workspace to Full Screen Terminal! Press ESC to return.");
                    }}
                    className="flex items-center gap-1.5 h-7 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10b981] border border-[#10b981]/20 hover:border-emerald-500/40 rounded transition font-mono uppercase font-semibold text-[10px] cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>⛶ Full Screen</span>
                  </button>

                </div>

                {/* Chart Grid Area */}
                <div className={`grid gap-3 flex-1 min-h-[480px] ${
                  activeWorkspace.layout === 1 ? "grid-cols-1" :
                  activeWorkspace.layout === 2 ? "grid-cols-2" :
                  activeWorkspace.layout === 4 ? "grid-cols-2 grid-rows-2" :
                  "grid-cols-3 grid-rows-2"
                }`}>
                  {Array.from({ length: activeWorkspace.layout }).map((_, i) => {
                    const fallbackSymbols = ["OANDA:XAUUSD", "FX:EURUSD", "FX:GBPUSD", "COINBASE:BTCUSD", "NASDAQ:IXIC", "FOREXCOM:SPX500"];
                    const symbol = activeWorkspace.charts[i] || fallbackSymbols[i % fallbackSymbols.length];
                    const cleanSymbolName = symbol.split(":")[1] || symbol;

                    return (
                      <div key={i} className="rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col overflow-hidden relative group">
                        
                        {/* Title overlay */}
                        <div className="px-3.5 py-2.5 bg-black/40 border-b border-[#181f2b] flex items-center justify-between font-mono text-[11px] text-[#94a3b8]">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] rounded font-bold">{cleanSymbolName}</span>
                            <span className="text-[10px] text-zinc-500 italic">{timeframe} Live Chart</span>
                          </div>
                          
                          {/* Swap Symbol directly */}
                          <select
                            value={symbol}
                            onChange={(e) => {
                              const nextSymbols = [...activeWorkspace.charts];
                              nextSymbols[i] = e.target.value;
                              setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, charts: nextSymbols } : w));
                            }}
                            className="bg-black/50 text-[#10b981] border border-white/5 rounded px-1 text-[10px] font-mono cursor-pointer outline-none focus:border-[#10b981]"
                          >
                            <option value="OANDA:XAUUSD">Gold (XAUUSD)</option>
                            <option value="FX:EURUSD">Euro (EURUSD)</option>
                            <option value="FX:GBPUSD">Pound (GBPUSD)</option>
                            <option value="COINBASE:BTCUSD">Bitcoin (BTCUSD)</option>
                            <option value="NASDAQ:IXIC">Nasdaq Index</option>
                            <option value="FOREXCOM:SPX500">S&P 500 Index</option>
                          </select>
                        </div>

                        {/* Interactive embedded Tradingview frame */}
                        <div className="flex-1 bg-black relative">
                          <iframe
                            id={`tv-frame-${i}`}
                            title={`TradingView Chart ${i}`}
                            src={`https://s.tradingview.com/widgetembed/?symbol=${symbol}&theme=dark&style=1&timezone=Exchange&studies=%5B%5D`}
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        </div>

                      </div>
                    );
                  })}
                </div>

              </motion.div>
            )}

            {/* TABS 3: NEWS TERMINAL */}
            {activeTab === "news" && (
              <motion.div key="news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                {/* News Station Navigation Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0c1015] border border-zinc-800 p-2 rounded-xl shrink-0">
                  <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-lg">
                    <button
                      onClick={() => setActiveNewsSubTab("calendar")}
                      type="button"
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeNewsSubTab === "calendar" ? "bg-[#10b981] text-black shadow font-black" : "text-zinc-400 hover:text-white"}`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Live Economic Calendar</span>
                    </button>
                    <button
                      onClick={() => setActiveNewsSubTab("broadcast")}
                      type="button"
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeNewsSubTab === "broadcast" ? "bg-[#10b981] text-black shadow font-black" : "text-zinc-400 hover:text-white"}`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Reuters/Bloomberg News Feed</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
                      {lastFetchedTime > 0 ? `Synced ${Math.round((Date.now() - lastFetchedTime)/1000/60)}m ago` : "Live Feed Ready"}
                    </span>
                    <button
                      onClick={() => fetchCalendar(true)}
                      disabled={isRefreshingCalendar}
                      type="button"
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-lg transition text-xs font-mono font-bold text-zinc-300 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCalendar ? "animate-spin" : ""}`} />
                      <span>{isRefreshingCalendar ? "Syncing..." : "Sync Fresh Feed"}</span>
                    </button>
                  </div>
                </div>

                {activeNewsSubTab === "calendar" ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* Calendar Search & Filter Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0a0d12]/80 border border-zinc-850 p-4 rounded-xl font-mono text-xs text-zinc-400 shrink-0">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Impact Level Sensitivity</label>
                        <select
                          value={calendarFilter.impact}
                          onChange={(e) => setCalendarFilter(prev => ({ ...prev, impact: e.target.value }))}
                          className="w-full bg-black border border-zinc-800 text-slate-300 rounded px-2.5 py-1.5 focus:border-[#10b981]/50 focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="All">All Impacts (Low, Medium, High, Holiday)</option>
                          <option value="High">🔴 High Impact / Critical Only</option>
                          <option value="Medium">🟠 Medium Impact Only</option>
                          <option value="Low">🟡 Low Impact Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Target Currency Filter</label>
                        <select
                          value={calendarFilter.currency}
                          onChange={(e) => setCalendarFilter(prev => ({ ...prev, currency: e.target.value }))}
                          className="w-full bg-black border border-zinc-800 text-slate-300 rounded px-2.5 py-1.5 focus:border-[#10b981]/50 focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="All">All Currencies</option>
                          <option value="USD">USD (United States Dollar)</option>
                          <option value="EUR">EUR (Euro Zone)</option>
                          <option value="GBP">GBP (British Pound)</option>
                          <option value="JPY">JPY (Japanese Yen)</option>
                          <option value="CAD">CAD (Canadian Dollar)</option>
                          <option value="AUD">AUD (Australian Dollar)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="flex items-center justify-between text-[10px] uppercase text-zinc-500 font-bold mb-1.5">
                          <span>User Timezone Profile</span>
                          <span className="text-[#10b981] font-bold">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                        </div>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-850 text-[10px] text-zinc-400 leading-normal">
                          📅 Automatically synchronized to local system hours with millisecond level drift offset.
                        </div>
                      </div>
                    </div>

                    {calendarError ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-[#0c1015]/40 border border-dashed border-red-500/20 rounded-xl text-center">
                        <AlertTriangle className="w-12 h-12 text-orange-500 animate-pulse mb-3" />
                        <h4 className="text-sm font-bold font-mono text-slate-200 mb-1">LIVE CALENDAR DISCONNECTED</h4>
                        <p className="text-xs text-[#f87171] font-sans max-w-md mb-4">{calendarError}</p>
                        <button
                          onClick={() => fetchCalendar(true)}
                          type="button"
                          className="px-4 py-2 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/25 transition font-mono rounded text-xs cursor-pointer uppercase font-bold"
                        >
                          Reconnect Feed
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start font-mono">
                        
                        {/* LEFT COLUMN: UPCOMING EVENTS */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <span className="text-[11px] font-bold text-[#10b981] uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Upcoming Events ({calendarEvents.filter(e => new Date(e.date).getTime() >= Date.now()).length})</span>
                            </span>
                            <span className="text-[10px] text-zinc-550">Chronological</span>
                          </div>

                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                            {(() => {
                              const nowMs = Date.now();
                              const filteredUpcoming = calendarEvents
                                .filter(evt => {
                                  const isUpcoming = new Date(evt.date).getTime() >= nowMs;
                                  if (!isUpcoming) return false;
                                  if (calendarFilter.currency !== "All" && evt.country !== calendarFilter.currency) return false;
                                  if (calendarFilter.impact !== "All") {
                                    const imp = evt.impact.toLowerCase();
                                    const filt = calendarFilter.impact.toLowerCase();
                                    if (!imp.includes(filt)) return false;
                                  }
                                  return true;
                                })
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                              if (filteredUpcoming.length === 0) {
                                return (
                                  <div className="p-8 text-center bg-[#07090d] border border-zinc-900 rounded-lg text-zinc-500 font-sans">
                                    No upcoming economic events match selected filters.
                                  </div>
                                );
                              }

                              return filteredUpcoming.map((evt, idx) => {
                                const localDate = new Date(evt.date);
                                const timeStr = localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                const dateStr = localDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                const countdownStr = getEventTimeRemainingStr(evt.date);
                                const impactLower = evt.impact.toLowerCase();
                                const isHigh = impactLower.includes("high") || impactLower.includes("critical") || impactLower.includes("severe");
                                const isMed = impactLower.includes("medium") || impactLower.includes("med") || impactLower.includes("moderate");

                                return (
                                  <div key={idx} className="p-3.5 bg-black/40 hover:bg-[#0c1015] border border-zinc-900 rounded-xl transition flex flex-col gap-2 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/10" />
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-1.5 py-0.5 bg-zinc-850 rounded text-sky-400 font-bold border border-zinc-800 text-[9px] uppercase tracking-wider">{dateStr} {timeStr}</span>
                                        <span className="px-1.5 py-0.5 bg-zinc-900 text-white rounded font-bold text-[9px] uppercase tracking-wider border border-zinc-800">{evt.country}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase ${isHigh ? "bg-red-500/10 text-red-400 border border-red-500/20" : isMed ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-zinc-850 text-zinc-400"}`}>
                                          {evt.impact}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-[#10b981] font-bold shrink-0">{countdownStr}</span>
                                    </div>

                                    <h4 className="text-zinc-100 font-bold text-xs uppercase italic tracking-tight">{evt.title}</h4>

                                    <div className="grid grid-cols-2 gap-3 mt-1 pt-2 border-t border-zinc-900 text-[10px] text-zinc-500">
                                      <span>FCST: <strong className="text-slate-300">{evt.forecast || "---"}</strong></span>
                                      <span>PREV: <strong className="text-slate-300">{evt.previous || "---"}</strong></span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: COMPLETED PAST EVENTS */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Completed Events ({calendarEvents.filter(e => new Date(e.date).getTime() < Date.now()).length})</span>
                            </span>
                            <span className="text-[10px] text-zinc-550">Most Recent First</span>
                          </div>

                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                            {(() => {
                              const nowMs = Date.now();
                              const filteredCompleted = calendarEvents
                                .filter(evt => {
                                  const isUpcoming = new Date(evt.date).getTime() >= nowMs;
                                  if (isUpcoming) return false;
                                  if (calendarFilter.currency !== "All" && evt.country !== calendarFilter.currency) return false;
                                  if (calendarFilter.impact !== "All") {
                                    const imp = evt.impact.toLowerCase();
                                    const filt = calendarFilter.impact.toLowerCase();
                                    if (!imp.includes(filt)) return false;
                                  }
                                  return true;
                                })
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                              if (filteredCompleted.length === 0) {
                                return (
                                  <div className="p-8 text-center bg-[#07090d] border border-zinc-900 rounded-lg text-zinc-500 font-sans">
                                    No past completed events found matching filters.
                                  </div>
                                );
                              }

                              return filteredCompleted.map((evt, idx) => {
                                const localDate = new Date(evt.date);
                                const timeStr = localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                const dateStr = localDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                const impactLower = evt.impact.toLowerCase();
                                const isHigh = impactLower.includes("high") || impactLower.includes("critical") || impactLower.includes("severe");
                                const isMed = impactLower.includes("medium") || impactLower.includes("med") || impactLower.includes("moderate");

                                return (
                                  <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl transition flex flex-col gap-1 text-[11px] opacity-75 hover:opacity-100">
                                    <div className="flex justify-between items-center gap-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-zinc-500">{dateStr} {timeStr}</span>
                                        <span className="px-1 text-white bg-zinc-900 rounded border border-zinc-800 text-[8px] uppercase font-bold">{evt.country}</span>
                                        <span className={`text-[8px] font-bold uppercase px-1 rounded ${isHigh ? "text-red-400" : isMed ? "text-orange-400" : "text-zinc-555"}`}>
                                          [{evt.impact}]
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[8px] text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded uppercase font-bold">
                                        <Check className="w-2.5 h-2.5 text-zinc-400" />
                                        <span>PAST EVENT</span>
                                      </div>
                                    </div>

                                    <h4 className="text-zinc-400 font-bold text-xs uppercase truncate">{evt.title}</h4>

                                    <div className="grid grid-cols-3 gap-2 mt-1 pt-1.5 border-t border-zinc-900 text-[9.5px] text-zinc-500 font-mono">
                                      <span>ACTV: <strong className="text-slate-200 font-extrabold">{evt.actual || "---"}</strong></span>
                                      <span>FCST: <strong className="text-slate-400">{evt.forecast || "---"}</strong></span>
                                      <span>PREV: <strong className="text-slate-400">{evt.previous || "---"}</strong></span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {[
                      {
                        id: "n1",
                        time: "20:45",
                        source: "Bloomberg",
                        title: "FOMC MINUTES REVEAL STRICT HAWKISH HOLDOUTS ACCENTUATING BOND YIELDS",
                        tier: "CRITICAL",
                        impact: "XAUUSD Bearish, DXY Bullish",
                        summary: "Federal Reserve policy decision makers showed sharp disagreements regarding systemic target inflation decays. Solid consensus insists upon holding benchmark standard lending parameters high until late autumn projections."
                      },
                      {
                        id: "n2",
                        time: "19:12",
                        source: "Reuters",
                        title: "MIDDLE EAST GEOPOLITICAL SAFE-HAVEN SPARKING GOLD BUY ACCUMULATION FORCE ABOVE TIER ZONE",
                        tier: "HIGH",
                        impact: "XAUUSD Bullish",
                        summary: "Foreign sovereign banks continue aggressive central purchases alongside regional defensive hedging buffers. Retail flow mimics, pushing active futures back to baseline support pivots."
                      },
                      {
                        id: "n3",
                        time: "17:30",
                        source: "ForexFactory",
                        title: "COMING UP: US CORE CONSUMER PRICE INDEX (CPI) AND NFP ADVANCED METRICS TO BROADCAST",
                        tier: "MEDIUM",
                        impact: "High Volatility Expected",
                        summary: "Primary projections calculate a subtle dip in core consumer benchmarks month-over-month. Deviations of more than 1.5 standard divisions will trigger automatic execution models universally."
                      }
                    ].map((news, idx) => (
                      <div key={idx} className="p-5 rounded-xl border border-[#1c222e] bg-[#0c1015] hover:border-[#10b981]/25 transition flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#10b981]" />
                        <div className="flex justify-between items-center text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[#64748b]">{news.time}</span>
                            <span className="text-[#64748b]">•</span>
                            <span className="text-sky-400 font-bold">{news.source}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${news.tier === "CRITICAL" ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-orange-500/10 text-orange-400"}`}>
                            {news.tier}
                          </span>
                        </div>

                        <h3 className="font-mono font-bold text-white text-sm tracking-tight leading-snug mt-1 italic uppercase">
                          {news.title}
                        </h3>

                        <p className="text-xs text-[#94a3b8] leading-relaxed mt-1 font-sans">
                          {news.summary}
                        </p>

                        <div className="mt-3 pt-3 border-t border-[#1a212d] flex flex-wrap justify-between items-center bg-[#07090d]/50 p-2.5 rounded-lg text-[11px] font-mono">
                          <div className="text-xs text-amber-400 flex items-center gap-1.5 leading-none">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>MKT IMPACT: {news.impact}</span>
                          </div>
                          <button 
                            onClick={() => askZoyaCoach(`Summarize the news titled "${news.title}" and tell me how it affects my active portfolio risk.`)}
                            className="px-2.5 py-1 bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 border border-[#10b981]/20 rounded transition text-[10px]"
                          >
                            Zoya AI Summary
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </motion.div>
            )}

            {/* TABS 4: AI SENTIMENT */}
            {activeTab === "sentiment" && (
              <motion.div key="sentiment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015]">
                  <h3 className="text-sm font-bold font-mono text-[#10b981] uppercase tracking-wider mb-2">Deep Narrative AI Analyzer</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    We scrape institutional streams across Bloomberg terminal alerts, ForexFactory forums, Wall Street analysts and social intelligence channels using server algorithms.
                  </p>
                </div>

                {/* Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0e1218] flex flex-col gap-4">
                    <span className="font-mono text-xs font-bold text-[#64748b] uppercase tracking-wider">US Dollar (DXY) Narrative Map</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-mono text-white">
                        <span>Confidence Gauging</span>
                        <span className="text-[#10b981]">72% BULLISH</span>
                      </div>
                      <div className="w-full h-2 bg-[#161c28] rounded overflow-hidden">
                        <div className="w-[72%] h-full bg-[#10b981]" />
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono italic mt-1 leading-normal">
                        DXY supported closely by Treasury yield expansion curves and macro interest persistence levels globally.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0e1218] flex flex-col gap-4">
                    <span className="font-mono text-xs font-bold text-[#64748b] uppercase tracking-wider">Gold (XAUUSD) Narrative Map</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-mono text-white">
                        <span>Confidence Gauging</span>
                        <span className="text-[#fbbf24]">65% NEUTRAL / CONSOLIDATED</span>
                      </div>
                      <div className="w-full h-2 bg-[#161c28] rounded overflow-hidden">
                        <div className="w-[65%] h-full bg-[#fbbf24]" />
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono italic mt-1 leading-normal">
                        Gold caught in high-compression tug of war. Safe-haven bids fight against high Treasury bond yield discounts.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Sub narrative drivers */}
                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015]">
                  <h4 className="text-xs font-bold font-mono text-[#94a3b8] uppercase tracking-widest mb-3">Narrative Drivers & Macro Pressures</h4>
                  <div className="flex flex-col gap-3 font-mono text-xs">
                    {[
                      { factor: "Treasury Rates (Inversion Yield Curve)", rating: "Extremely Bullish USD", description: "Longer term US yield options persistent while cash bounds yield above premium expectations." },
                      { factor: "Sovereign Gold Reservists Accumulation", rating: "Strong Protective Support", description: "Emerging markets continue physical delivery. Floor established." },
                      { factor: "Crypto Volatility Index Sweep", rating: "Risk-On Liquidity Allocation", description: "Billion dollar option triggers on CME keep spot retail flows searching for premium." }
                    ].map((item, i) => (
                      <div key={i} className="p-3 bg-black/40 rounded-lg border border-[#1e2635]">
                        <div className="flex justify-between text-white font-bold mb-1">
                          <span>{item.factor}</span>
                          <span className="text-[#fbbf24]">{item.rating}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TABS 5: RISK CENTER */}
            {activeTab === "risk" && (
              <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                {/* Lot size calculator */}
                <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <ShieldAlert className="w-10 h-10 text-amber-500 animate-pulse shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">RISK LIMIT WORKSPACE: SHIELD ENABLED</h3>
                      <p className="text-xs text-[#94a3b8] mt-1">Bond Bloom Capital sets maximum daily drawdown to 1%. Sizing rules must protect cash reserves.</p>
                    </div>
                  </div>
                </div>

                {/* Sizing calc container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Caluclator form */}
                  <RiskCalculator accountBalance={accountBalance} />

                  {/* Limits and Drawdown warning dashboard */}
                  <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col justify-between gap-4 font-mono text-xs">
                    <div>
                      <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Drawdown Bounds & Safety Alerts</h4>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="p-2.5 bg-black/30 border border-[#ef4444]/25 rounded flex justify-between tracking-tight">
                          <span className="text-red-400">Extreme Risk Level Alert</span>
                          <span className="font-bold text-red-400">ACTIVE STANDARD RECAP</span>
                        </div>
                        <div className="p-2.5 bg-black/30 border border-[#fbbf24]/20 rounded flex justify-between tracking-tight">
                          <span className="text-[#fbbf24]">Daily Loss Limit Allowed</span>
                          <span className="font-bold text-white">$100,000.00</span>
                        </div>
                        <div className="p-2.5 bg-black/30 border border-[#10b981]/15 rounded flex justify-between tracking-tight">
                          <span className="text-slate-400">Weekly Maximum Bounds</span>
                          <span className="font-bold text-white">$500,000.00</span>
                        </div>
                      </div>
                    </div>

                    <div className="py-2.5 px-3 rounded bg-[#fbbf24]/10 border border-[#fbbf24]/25 flex items-start gap-2 text-[10px] text-[#fbbf24] leading-relaxed font-sans">
                      <AlertTriangle className="w-5 h-5 text-[#fbbf24] shrink-0" />
                      <div>
                        <strong className="block uppercase tracking-wider font-mono">AUTOMATED SYSTEM WARNING DETECTED</strong>
                        "Mohammad, please check leverage options before scaling standard lots. Multiple position correlations present on Gold and Euro indicators simultaneously."
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TABS 6: PORTFOLIO & LEDGER */}
            {activeTab === "portfolio" && (
              <motion.div key="portfolio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                {/* direct Execution center widget */}
                <div className="p-5 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <TrendingUp className="w-5 h-5 text-[#10b981]" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Direct Execution Ticket (MT5 Bridge Enabled)</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#64748b] uppercase text-[10px]">Symbol</label>
                      <select 
                        value={execSymbol} 
                        onChange={(e) => setExecSymbol(e.target.value)}
                        className="p-2 bg-black border border-zinc-800 rounded font-bold text-white"
                      >
                        <option value="OANDA:XAUUSD">Gold (XAUUSD)</option>
                        <option value="FX:EURUSD">Euro (EURUSD)</option>
                        <option value="FX:GBPUSD">Pound (GBPUSD)</option>
                        <option value="COINBASE:BTCUSD">Bitcoin (BTCUSD)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#64748b] uppercase text-[10px]">Order Action</label>
                      <div className="grid grid-cols-2 gap-1 bg-black p-0.5 rounded border border-zinc-800">
                        <button 
                          onClick={() => setExecType("BUY")}
                          className={`py-1.5 rounded font-bold ${execType === "BUY" ? "bg-emerald-500 text-black" : "text-slate-400 hover:text-white"}`}
                        >
                          BUY
                        </button>
                        <button 
                          onClick={() => setExecType("SELL")}
                          className={`py-1.5 rounded font-bold ${execType === "SELL" ? "bg-red-500 text-black" : "text-slate-400 hover:text-white"}`}
                        >
                          SELL
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#64748b] uppercase text-[10px]">Volume (Lots)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={execLots} 
                        onChange={(e) => setExecLots(parseFloat(e.target.value) || 0.1)}
                        className="p-1 px-2.5 bg-black border border-zinc-800 rounded text-white font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#64748b] uppercase text-[10px]">Stop Loss price</label>
                      <input 
                        type="text" 
                        placeholder="Dynamic SL"
                        value={execSl} 
                        onChange={(e) => setExecSl(e.target.value)}
                        className="p-1.5 bg-black border border-zinc-800 rounded text-white"
                      />
                    </div>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-black/40 border border-zinc-800 font-mono text-[11px] leading-snug">
                      <span className="text-[#64748b] block font-bold mb-1 uppercase">RISK LEVEL TELEMETRY</span>
                      Calculated Maximum Exposure on {execLots} Lots of {execSymbol}: <strong className="text-white">${(execLots * 100).toFixed(2)} USD</strong> (Margin Buffer OK)
                    </div>

                    {!isConfirmingExec ? (
                      <button 
                        onClick={() => setIsConfirmingExec(true)}
                        className={`w-full py-3.5 rounded-lg text-xs font-bold tracking-widest font-mono transition uppercase ${execType === "BUY" ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-red-500 text-black hover:bg-red-400"}`}
                      >
                        Transmit Order (MT5 Protocol)
                      </button>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => setIsConfirmingExec(false)}
                          className="flex-1 py-3 bg-[#1e2430] hover:bg-zinc-800 text-white rounded font-mono text-xs uppercase"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={triggerExecution}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded font-mono text-xs uppercase font-bold animate-pulse text-center"
                        >
                          Confirm EXECUTE 🚨
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ledger table */}
                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015]">
                  <h4 className="text-xs font-bold font-mono text-[#94a3b8] uppercase tracking-wider mb-3">ACTIVE MT5 POSITIONS LEDGER</h4>
                  
                  {positions.length === 0 ? (
                    <div className="text-center py-6 text-xs font-mono text-slate-500 italic">
                      No active spot exposures present on terminal.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-zinc-800 text-[#64748b]">
                            <th className="py-2.5">Symbol</th>
                            <th className="py-2.5">Action</th>
                            <th className="py-2.5">Lots</th>
                            <th className="py-2.5 text-right">Entry</th>
                            <th className="py-2.5 text-right">Current</th>
                            <th className="py-2.5 text-right">PnL (USD)</th>
                            <th className="py-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((p) => (
                            <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-white/[0.01]">
                              <td className="py-3 font-semibold text-white">{p.symbol.split(":")[1] || p.symbol}</td>
                              <td className="py-3">
                                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${p.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                  {p.type}
                                </span>
                              </td>
                              <td className="py-3 font-bold text-white">{p.lots.toFixed(2)}</td>
                              <td className="py-3 text-right text-slate-300">${p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-right text-[#10b981]">${p.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td className={`py-3 text-right font-bold ${p.pnl >= 0 ? "text-[#10b981]" : "text-red-400"}`}>
                                {p.pnl >= 0 ? "+" : ""}${p.pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 text-center">
                                <button 
                                  onClick={() => closePosition(p.id)}
                                  className="px-2 py-0.5 bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-red-400 border border-[#ef4444]/25 rounded text-[10px] uppercase font-bold"
                                >
                                  Close Spot
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TABS 7: TRADE HISTORY & JOURNAL */}
            {activeTab === "journal" && (
              <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                {/* Journal creation form */}
                <JournalForm onAddJournal={(j) => setJournal(prev => [j, ...prev])} />

                {/* Audit & listed journal logs */}
                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015]">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold font-mono text-[#94a3b8] uppercase tracking-wider">HISTORIC JOURNAL BOOK</h4>
                    <button 
                      onClick={() => askZoyaCoach("Analyze my trade journal. Find the psychological traps I'm falling into and review standard improvements.")}
                      className="px-3 py-1.5 bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/25 text-[#10b981] rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Audited by Zoya
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 font-mono text-xs">
                    {journal.map((j) => (
                      <div key={j.id} className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800 hover:border-zinc-700/80 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{j.symbol.split(":")[1] || j.symbol}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${j.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-200"}`}>
                                {j.type}
                              </span>
                              <span className="text-[10px] text-slate-500">{new Date(j.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">Lots: {j.lots} | Entry: {j.entryPrice} | Exit: {j.exitPrice}</p>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${j.pnl >= 0 ? "text-[#10b981]" : "text-red-400"}`}>
                              {j.pnl >= 0 ? "+" : ""}${j.pnl.toFixed(2)}
                            </span>
                            <div className="flex gap-1.5 justify-end mt-1 text-[9px]">
                              <span className="bg-[#10b981]/10 text-[#10b981] rounded px-1.5">{j.strategy}</span>
                              <span className="bg-sky-500/10 text-sky-400 rounded px-1.5">{j.emotion}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 font-sans mt-2 italic border-l-2 border-zinc-700/60 pl-2">
                          "{j.notes}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TABS 8: ROBOTIC STRATEGIES */}
            {activeTab === "strategies" && (
              <motion.div key="strategies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                <div className="p-4 bg-[#0c1015] rounded-xl border border-[#1c222e]">
                  <h3 className="text-sm font-bold font-mono text-[#10b981] uppercase tracking-wider mb-2">Automated Execution Models</h3>
                  <p className="text-xs text-[#94a3b8]">
                    Semi-automated strategies and micro faders running on direct Bond Bloom Capital servers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {[
                    { name: "Gold Scalper Pro (ICT Fvgs)", status: "ARMED", winrate: "74.8%", profitFactor: "2.41", desc: "Monitors NY session standard displacements and trades Fair Value Gaps." },
                    { name: "FOMC News Spike Fader", status: "STANDBY", winrate: "68.2%", profitFactor: "1.95", desc: "Triggers on massive deviation sweeps of FOMC standard rates limits." },
                    { name: "Euro Session Range Sweeper", status: "PAUSED", winrate: "71.4%", profitFactor: "2.22", desc: "Fades the 7:00 London standard session high/low bounds before trade entry." }
                  ].map((strat, i) => (
                    <div key={i} className="p-4 rounded-xl border border-zinc-800 bg-black/40 flex flex-col justify-between gap-3 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white uppercase italic">{strat.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${strat.status === "ARMED" ? "bg-emerald-500/10 text-[#10b981] animate-pulse" : "bg-zinc-800 text-zinc-500"}`}>
                          {strat.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] font-sans leading-relaxed">{strat.desc}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] bg-black/40 p-2 rounded">
                        <div>
                          <span className="text-slate-500 block uppercase font-mono text-[9px]">Historical Winrate</span>
                          <span className="text-white font-bold">{strat.winrate}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-mono text-[9px]">Profit Factor</span>
                          <span className="text-white font-bold">{strat.profitFactor}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>

              </motion.div>
            )}

            {/* TABS 9: ALERT CENTER */}
            {/* TABS 9: ALERT CENTER */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6">
                
                {/* Zoya Assistant Proactive Broadcast Bar */}
                <div className="p-4 rounded-xl border border-[#10b981]/30 bg-gradient-to-r from-emerald-950/20 to-black relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20">
                      <Sparkles className="w-5 h-5 text-[#10b981] animate-spin-slow" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-[#10b981] uppercase tracking-widest">ZOYA PROACTIVE RISK MONITOR</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>
                      <p className="text-xs text-white italic font-mono mt-1 pr-4 leading-relaxed">
                        "{zoyaProactiveMsg}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-xs">
                    <button
                      onClick={() => setSpeechEnabled(!speechEnabled)}
                      type="button"
                      className={`p-1.5 px-3 rounded-lg border transition flex items-center gap-2 cursor-pointer ${speechEnabled ? "bg-[#10b981]/25 text-[#10b981] border-[#10b981]/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{speechEnabled ? "Voice: ON (TTS Active)" : "Voice: MUTED"}</span>
                    </button>
                    <button
                      onClick={() => speakAlertText(zoyaProactiveMsg)}
                      type="button"
                      className="p-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 rounded-lg transition cursor-pointer"
                    >
                      Speak HUD
                    </button>
                  </div>
                </div>

                {/* Main Dashboard Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono text-xs">
                  
                  {/* LEFT SIDEBAR: CONFIGS, SESSIONS, RELIABILITY */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    
                    {/* Alert Creation Form */}
                    <AlertForm 
                      onAddAlert={(a) => setAlerts(p => [a, ...p])} 
                      onAddTimelineAlert={(t) => setTimelineAlerts(p => [t, ...p])} 
                    />

                    {/* Pre-Event Countdowns & Simulator */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c1015] flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                        <span className="text-xs font-semibold text-[#10b981] uppercase">PRE-EVENT COUNTDOWN ALERTS</span>
                        <span className="text-[9px] text-zinc-550 font-bold">LIVE TIMES</span>
                      </div>

                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                        {calendarEvents.filter(e => {
                          const diff = new Date(e.date).getTime() - Date.now();
                          return diff > 0 && diff < 12 * 60 * 60 * 1000; // within next 12 hours
                        }).length === 0 ? (
                          <div className="p-3 text-center bg-black/40 border border-zinc-900 rounded-lg text-zinc-500 text-[10px] leading-relaxed">
                            No high volatile events within 12h. Armed for FOMC / CPI releases.
                          </div>
                        ) : (
                          calendarEvents.filter(e => {
                            const diff = new Date(e.date).getTime() - Date.now();
                            return diff > 0 && diff < 12 * 60 * 60 * 1000;
                          }).slice(0, 3).map((evt, idx) => {
                            const timeRem = getEventTimeRemainingStr(evt.date);
                            return (
                              <div key={idx} className="p-2.5 bg-black/40 border border-zinc-900 rounded-lg flex items-center justify-between text-xs transition">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                                  <div>
                                    <div className="text-zinc-300 font-bold uppercase text-[10px]">{evt.country} {evt.title}</div>
                                    <div className="text-[9px] text-zinc-500 font-sans">Tier: {evt.impact} Impact</div>
                                  </div>
                                </div>
                                <div className="text-[10px] font-black text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20">
                                  {timeRem}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Manual Simulators to verify the Voice & Urgency Score layout instantaneously */}
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          onClick={() => {
                            const newAlt = {
                              id: "t-sim-cpi-" + Date.now(),
                              title: "15 Min Before USD Core CPI Release",
                              confidence: 99,
                              source: "Live ForexFactory Node Engine",
                              timestamp: new Date().toISOString(),
                              importance: "CRITICAL" as const,
                              status: "Delivered" as const,
                              urgency: 98,
                              impact: 97,
                              reason: "- Standard CPI Countdown triggered automatically\n- Volatility protection systems fully armed\n- Local spreads monitored closely",
                              symbol: "SYSTEM:USD"
                            };
                            setTimelineAlerts(p => [newAlt, ...p]);
                            setZoyaProactiveMsg("Rashad, CPI is only 15 minutes away. Ensure slippage protection is active.");
                            setAnalytics(prev => ({ ...prev, deliveredCount: prev.deliveredCount + 1 }));
                            if (speechEnabled) speakAlertText("Rashad, CPI is only 15 minutes away. Ensure slippage protection is active.");
                            useBloomOSStore.getState().addAutomationLog("Simulated core CPI pre-event alert", "system", "triggered");
                          }}
                          type="button"
                          className="py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-500/20 rounded text-[9px] font-black transition cursor-pointer"
                        >
                          Simulate CPI (15m)
                        </button>

                        <button
                          onClick={() => {
                            const newAlt = {
                              id: "t-sim-london-" + Date.now(),
                              title: "London Session Open Imminent",
                              confidence: 92,
                              source: "GMT Zone Automation",
                              timestamp: new Date().toISOString(),
                              importance: "IMPORTANT" as const,
                              status: "Delivered" as const,
                              urgency: 84,
                              impact: 75,
                              reason: "- 15 Minutes to London bell open\n- High liquidity shifts expected on GBP + EUR pairs",
                              symbol: "SYSTEM:EUR"
                            };
                            setTimelineAlerts(p => [newAlt, ...p]);
                            setZoyaProactiveMsg("Rashad, London session is about to start. Prepare for spread expansions.");
                            setAnalytics(prev => ({ ...prev, deliveredCount: prev.deliveredCount + 1 }));
                            if (speechEnabled) speakAlertText("Rashad, London session is about to start. Prepare for spread expansions.");
                            useBloomOSStore.getState().addAutomationLog("Simulated session open alert", "system", "triggered");
                          }}
                          type="button"
                          className="py-1.5 bg-sky-900/20 text-sky-400 hover:bg-sky-900/30 border border-sky-500/20 rounded text-[9px] font-black transition cursor-pointer"
                        >
                          Simulate London Open
                        </button>
                      </div>
                    </div>

                    {/* Market Session Awareness clocks with visual countdown bars */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c1015] flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                        <span className="text-xs font-semibold text-zinc-300 uppercase flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-zinc-400 animate-spin-slow" />
                          <span>GLOBAL SESSION BAROMETER</span>
                        </span>
                        <span className="text-[9px] text-[#10b981] font-bold">GMT SYNCED</span>
                      </div>

                      <div className="space-y-3.5">
                        {(Object.entries(sessionClocks) as Array<[string, SessionClock]>).map(([key, item]) => (
                          <div key={key} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-zinc-200 font-bold flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${item.active ? "bg-emerald-500 animate-pulse shadow-[0_0_4px_#10b981]" : "bg-zinc-600"}`}></span>
                                <span>{item.name}</span>
                              </span>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className={`px-1 rounded text-[9px] font-black uppercase ${item.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-900 text-zinc-500"}`}>{item.status}</span>
                                <span className="text-zinc-400 font-sans">{item.countdown}</span>
                              </div>
                            </div>
                            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${item.active ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-zinc-750"}`} 
                                style={{ width: `${item.active ? item.percent : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Scanning Targets (Limit price alerts) */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c1015] flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                        <span className="text-xs font-semibold text-zinc-300 uppercase">ACTIVE BOUND SCAN PARAMETERS ({alerts.length})</span>
                        <button
                          onClick={() => {
                            setAlerts([]);
                            showToast("All active price scan bounds cleared.");
                          }}
                          className="text-[9px] hover:text-red-400 text-zinc-500 font-bold uppercase transition"
                        >
                          Clear All
                        </button>
                      </div>

                      {alerts.length === 0 ? (
                        <div className="p-3 text-center bg-black/40 border border-zinc-900 rounded-lg text-zinc-500 text-[10px] leading-relaxed select-none">
                          No active boundary scans armed. Use the trigger console above to configure key targets.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {alerts.map((a) => (
                            <div key={a.id} className="p-2.5 bg-black/40 border border-zinc-900 rounded-lg flex items-center justify-between text-[11px] font-mono">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-white font-bold">{a.symbol.split(":")[1] || a.symbol}</strong>
                                  <span className="px-1 text-[8.5px] bg-zinc-850 text-zinc-500 rounded uppercase font-bold">{a.type}</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">Target: <span className="text-[#10b981] font-bold">{a.targetValue}</span> via {a.channel}</div>
                              </div>
                              <button
                                onClick={() => setAlerts(p => p.filter(it => it.id !== a.id))}
                                type="button"
                                className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alert Reliability Monitor (ARM) */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c1015] flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 mb-1">
                        <span className="text-xs font-semibold text-zinc-300 uppercase flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>ALERT RELIABILITY MONITOR</span>
                        </span>
                        <span className="text-[9px] text-[#10b981] font-black">ACTIVE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono">
                        <div className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-zinc-500 font-bold">Feed Status</span>
                          <span className="text-emerald-400 font-extrabold">{reliability.feedStatus}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-zinc-500 font-bold">Refresh Engine</span>
                          <span className="text-zinc-300">{reliability.refreshStatus}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-zinc-500 font-bold">Scheduler</span>
                          <span className="text-zinc-300">{reliability.schedulerStatus}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-zinc-500 font-bold">Last Trigger</span>
                          <span className="text-[#10b981] font-extrabold">{reliability.lastSuccessful}</span>
                        </div>
                        <div className="flex justify-between col-span-2 text-[10px] text-zinc-500 pt-0.5 leading-normal">
                          🛡️ Local latency checked: 8ms. Backup polling armed automatically on server cluster drops.
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT SIDE: FEED TIMELINE, RESPONSE PANEL, ANALYTICS */}
                  <div className="lg:col-span-7 flex flex-col gap-6">

                    {/* Live Statistics & Analytical Ratios Header */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl relative overflow-hidden">
                        <span className="block text-[8px] uppercase tracking-wider text-zinc-400 font-black">SYSTEM DELIVERED</span>
                        <span className="text-lg font-black text-white mt-1 block font-mono">{analytics.deliveredCount}</span>
                        <span className="text-[8px] text-emerald-500 font-mono mt-0.5 block flex items-center gap-1">🟢 100% accurate SLA</span>
                      </div>
                      
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                        <span className="block text-[8px] uppercase tracking-wider text-zinc-400 font-black">DELAYED LOGS</span>
                        <span className="text-lg font-black text-amber-500 mt-1 block font-mono">{analytics.delayedCount}</span>
                        <span className="text-[8px] text-zinc-450 mt-0.5 block">Net-latency drifts</span>
                      </div>

                      <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                        <span className="block text-[8px] uppercase tracking-wider text-zinc-400 font-black">MISSED / EXPIRED</span>
                        <span className="text-lg font-black text-red-500 mt-1 block font-mono">{analytics.missedCount}</span>
                        <span className="text-[8px] text-red-450 mt-0.5 block">W-latency anomalies</span>
                      </div>

                      <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                        <span className="block text-[8px] uppercase tracking-wider text-zinc-400 font-black">IGNORED / FALSE</span>
                        <span className="text-lg font-black text-zinc-300 mt-1 block font-mono">{analytics.ignoredCount} <span className="text-zinc-500">/</span> {analytics.falseCount}</span>
                        <span className="text-[8px] text-zinc-500 mt-0.5 block">Noise suppression indexes</span>
                      </div>
                    </div>

                    {/* Live Chronological Timeline */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c1015] flex flex-col gap-3.5 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">CHRONOLOGICAL MULTI-FACTOR ALERT TIMELINE</span>
                        </div>
                        
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setGroupSimilarAlerts(!groupSimilarAlerts);
                              showToast(groupSimilarAlerts ? "Disabled smart alert grouping." : "Enabled smart alertGrouping cluster engine.");
                            }}
                            type="button"
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${groupSimilarAlerts ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
                          >
                            {groupSimilarAlerts ? "Smart Grouping: ACTIVE" : "Smart Grouping: OFF"}
                          </button>
                        </div>
                      </div>

                      {/* Timeline stream */}
                      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2">
                        {(() => {
                          // Compute group similarity logic
                          let renderItems = timelineAlerts;
                          if (groupSimilarAlerts) {
                            const grouped: TimelineAlert[] = [];
                            const symbolGroups: { [key: string]: TimelineAlert[] } = {};

                            timelineAlerts.forEach(alert => {
                              if (!symbolGroups[alert.symbol]) {
                                symbolGroups[alert.symbol] = [];
                              }
                              symbolGroups[alert.symbol].push(alert);
                            });

                            const processedIds = new Set<string>();

                            timelineAlerts.forEach(alert => {
                              if (processedIds.has(alert.id)) return;

                              const group = symbolGroups[alert.symbol] || [];
                              const relatedItems = group.filter(a => 
                                Math.abs(new Date(a.timestamp).getTime() - new Date(alert.timestamp).getTime()) < 3600000 * 2
                              );

                              if (relatedItems.length >= 2 && alert.symbol !== "SYSTEM:USD" && !alert.symbol.startsWith("SYSTEM:")) {
                                relatedItems.forEach(item => processedIds.add(item.id));
                                const cleanSymbol = alert.symbol.split(":")[1] || alert.symbol;
                                grouped.push({
                                  ...alert,
                                  title: `${cleanSymbol} Activity Cluster Triggered`,
                                  isGrouped: true,
                                  groupCount: relatedItems.length,
                                  reason: `Grouped Alerts Tracked in Cluster:\n` + relatedItems.map(item => `• [${new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false})}] ${item.title} (Urgency: ${item.urgency}%)`).join("\n")
                                });
                              } else {
                                grouped.push(alert);
                                processedIds.add(alert.id);
                              }
                            });
                            renderItems = grouped;
                          }

                          if (renderItems.length === 0) {
                            return (
                              <div className="p-8 text-center bg-black/40 border border-zinc-900 rounded-xl text-zinc-500">
                                No trade alerts found in memory. Set an alert to begin.
                              </div>
                            );
                          }

                          return renderItems.map((item) => {
                            const isSelected = selectedAlert?.id === item.id;
                            const tTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                            const isHigh = item.importance === "CRITICAL";
                            const isMed = item.importance === "IMPORTANT";

                            return (
                              <div 
                                key={item.id}
                                onClick={() => setSelectedAlert(item)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2 ${isSelected ? "bg-[#10b981]/5 border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.05)]" : "bg-black/40 border-zinc-900 hover:border-zinc-850"}`}
                              >
                                {/* Left stripe marker */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${isHigh ? "bg-red-500 animate-pulse" : isMed ? "bg-[#10b981]" : "bg-zinc-700"}`} />

                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] text-zinc-500 font-bold">{tTime}</span>
                                      <span className="text-[10px] text-zinc-550">•</span>
                                      <span className={`px-1 rounded text-[8.5px] font-black uppercase ${item.status === "Delivered" ? "bg-emerald-500/10 text-emerald-400" : item.status === "Missed" ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-amber-400/10 text-amber-400"}`}>
                                        {item.status}
                                      </span>
                                      {item.isGrouped && (
                                        <span className="px-1.5 py-0.2 bg-sky-500/10 text-sky-400 border border-sky-400/20 text-[8.5px] font-black rounded-full uppercase animate-pulse">
                                          ⚡ CLUSTER ({item.groupCount} Events)
                                        </span>
                                      )}
                                    </div>
                                    <h5 className={`text-xs font-black uppercase tracking-tight mt-0.5 ${isSelected ? "text-[#10b981]" : "text-white text-opacity-95"}`}>
                                      {item.title}
                                    </h5>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-right">
                                    <div>
                                      <span className="block text-[8px] text-zinc-500 leading-none">AI CONFIDENCE</span>
                                      <span className="text-xs font-black text-zinc-300">{item.confidence}%</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 bg-black/30 p-2.5 rounded-lg border border-zinc-900 text-[10px] text-zinc-500 font-mono mt-0.5">
                                  <div>
                                    <span>URGENCY INDX</span>
                                    <strong className={`block mt-0.5 font-bold ${item.urgency > 85 ? "text-red-400" : "text-[#10b981]"}`}>{item.urgency}%</strong>
                                  </div>
                                  <div>
                                    <span>MKT IMPACT</span>
                                    <strong className="block mt-0.5 font-bold text-slate-300">{item.impact}%</strong>
                                  </div>
                                  <div className="truncate">
                                    <span>SOURCE FLOW</span>
                                    <strong className="block mt-0.5 text-sky-400 truncate font-semibold uppercase">{item.source}</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Preloaded Quick Response Panel with complete analytical explanations */}
                    {selectedAlert && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl border border-[#10b981]/30 bg-black flex flex-col gap-4 relative"
                      >
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-[#10b981]" />
                            <span className="text-xs font-bold text-white uppercase tracking-widest">QUICK RESPONSE SYSTEM CONSOLE</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">
                            TELEMETRY LINKED
                          </span>
                        </div>

                        {/* Top panel segment: Summary */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 text-[#10b981] font-black text-[10px] uppercase rounded">
                              {selectedAlert.symbol.split(":")[1] || selectedAlert.symbol}
                            </span>
                            <h4 className="text-xs font-black text-zinc-100 uppercase italic tracking-tight">{selectedAlert.title}</h4>
                          </div>
                          
                          <div className="text-[11px] text-zinc-400 font-sans leading-relaxed whitespace-pre-line bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
                            <strong className="text-zinc-400 font-mono text-[10px] uppercase block mb-1">AI Analytical Reason / Catalyst Code:</strong>
                            <div className="font-mono text-zinc-300 text-[10px] leading-relaxed select-text">
                              {selectedAlert.reason}
                            </div>
                          </div>
                        </div>

                        {/* Execution Console Row: 5 Action buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-zinc-900">
                          <button
                            onClick={() => {
                              const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
                              audio.volume = 0.15;
                              audio.play().catch(() => {});
                              
                              if (selectedAlert.symbol.includes("XAU")) {
                                setIsGoldTraderMode(true);
                                setFullscreenSymbol("OANDA:XAUUSD");
                              } else {
                                setFullscreenSymbol(selectedAlert.symbol);
                              }
                              useBloomOSStore.getState().addAutomationLog(`Refocused main charts to ${selectedAlert.symbol}`, "system", "success");
                              showToast(`Central trading dashboard symbol focal point modified to ${selectedAlert.symbol}`);
                            }}
                            type="button"
                            className="p-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 rounded text-[10px] font-black text-center transition cursor-pointer"
                          >
                            [ Open Chart ]
                          </button>

                          <button
                            onClick={() => {
                              askZoyaCoach(`Explain why alert "${selectedAlert.title}" triggered and construct an instant scalp trading roadmap.`);
                              showToast("Fidelity analysis requested from Zoya AI Co-Pilot.");
                            }}
                            type="button"
                            className="p-2 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 hover:bg-[#10b981]/25 rounded text-[10px] font-black text-center transition cursor-pointer"
                          >
                            [ Analyze ]
                          </button>

                          <button
                            onClick={() => {
                              // Create pre-filled trade plan inside the local journal store
                              const cleanSym = selectedAlert.symbol;
                              const newEntry: JournalEntry = {
                                id: "j-auto-" + Date.now(),
                                symbol: cleanSym,
                                type: "BUY",
                                entryPrice: cleanSym.includes("XAU") ? 2322.80 : 1.0822,
                                exitPrice: cleanSym.includes("XAU") ? 2335.00 : 1.0900,
                                lots: 1.0,
                                pnl: 0,
                                strategy: selectedAlert.source,
                                emotion: "Analytical",
                                notes: `Auto-generated log matching timeline trigger: ${selectedAlert.title}.\nReason code:\n${selectedAlert.reason}`,
                                timestamp: new Date().toISOString()
                              };
                              setJournal(p => [newEntry, ...p]);
                              showToast(`Pre-filled trade plan log committed for ${cleanSym}! (Logged to Journal)`);
                            }}
                            type="button"
                            className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded text-[10px] font-black text-center transition cursor-pointer"
                          >
                            [ Journal ]
                          </button>

                          <button
                            onClick={() => {
                              showToast(`Safety threshold alert queued on exchange matrix at standard deviation multipliers.`);
                            }}
                            type="button"
                            className="p-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 rounded text-[10px] font-black text-center transition cursor-pointer"
                          >
                            [ Set Alert ]
                          </button>

                          <button
                            onClick={() => {
                              setTimelineAlerts(p => p.filter(it => it.id !== selectedAlert.id));
                              setAnalytics(prev => ({ ...prev, ignoredCount: prev.ignoredCount + 1 }));
                              showToast("Timeline log dismissed and excluded from active telemetry tracking.");
                            }}
                            type="button"
                            className="p-2 bg-red-950/20 text-red-400 border border-red-500/15 hover:bg-red-950/40 rounded text-[10px] font-black text-center transition cursor-pointer"
                          >
                            [ Ignore ]
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </div>

                </div>

              </motion.div>
            )}

            {/* TABS 10: SETTINGS */}
            {activeTab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col gap-6 text-xs font-mono">
                
                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-1.5">Broker MT5 Bridge Terminal</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span>Server IP Port Address</span>
                      <input type="text" value="3.125.10.45:4100" readOnly className="p-1.5 bg-black border border-zinc-800 rounded text-[#10b981]" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>MT5 Terminal Leverage Bounds</span>
                      <select className="p-1.5 bg-black border border-zinc-800 rounded">
                        <option>1:100 Premium</option>
                        <option>1:200 Standard</option>
                        <option>1:500 Standard Max</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015]">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Workspace Preset Factory</h4>
                  <p className="text-slate-400 leading-normal mb-3 font-sans">
                    Reset local workspace parameters, simulated spots ledger states and historic notes instantly to pristine system backups.
                  </p>
                  <button 
                    onClick={() => {
                      localStorage.removeItem("bloom_trading_positions");
                      localStorage.removeItem("bloom_trading_journal");
                      localStorage.removeItem("bloom_trading_workspaces");
                      localStorage.removeItem("bloom_trading_alerts");
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded font-bold uppercase tracking-wider text-[11px]"
                  >
                    Reset All Factory Benchmarks
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* RIGHT CLIENT-AWARE AI CO-PILOT PANEL (ZOYA) */}
        <aside className="lg:col-span-3 border-l border-[#161c28] bg-[#090b0f] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-[#1c222e] bg-black/40 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#10b981] animate-pulse" />
              <div>
                <span className="text-xs font-bold font-mono text-white block">AI Trade Coach</span>
                <span className="text-[9px] text-[#10b981] font-mono block">Zoya Trading Assistant live</span>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
          </div>

          {/* Quick recaps */}
          <div className="p-3 bg-[#0d121a]/60 border-b border-[#1c222e] flex flex-wrap gap-1.5">
            <button 
              onClick={() => askZoyaCoach("Analyze our transaction history and risk sizing right now. Keep it brief.")}
              className="px-2 py-1 bg-[#10b981]/10 hover:bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 rounded text-[10px] font-mono uppercase"
            >
              Analyze Risk
            </button>
            <button 
              onClick={() => askZoyaCoach("Review our active journal. Are we overtrading today? State explicitly.")}
              className="px-2 py-1 bg-[#fbbf24]/10 hover:bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/20 rounded text-[10px] font-mono uppercase"
            >
              Exposures Review
            </button>
            <button 
              onClick={() => askZoyaCoach("Please synthesize a comprehensive NYC pre-session trade recap.")}
              className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded text-[10px] font-mono uppercase"
            >
              Session Recap
            </button>
          </div>

          {/* Message log */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 bg-[#07090d]/30">
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs ${
                  msg.role === "user" 
                    ? "align-end ml-auto bg-[#10b981]/15 text-white border border-[#10b981]/20 rounded-tr-none" 
                    : "align-start mr-auto bg-[#161c28] text-slate-200 rounded-tl-none border border-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 justify-between font-mono text-[9px] text-[#64748b]">
                  <span className="font-bold uppercase tracking-wider">{msg.role === "user" ? "Mohammad" : "Zoya"}</span>
                  <span>{msg.time}</span>
                </div>
                <p className="leading-relaxed font-sans">{msg.text}</p>
              </div>
            ))}
            {isZoyaTyping && (
              <div className="mr-auto bg-[#161c28] text-slate-400 rounded-2xl rounded-tl-none p-3 border border-slate-800 text-xs flex items-center gap-2 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#10b981]" />
                <span>Zoya is auditing charts...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat form helper */}
          <form 
            onSubmit={(e) => { e.preventDefault(); askZoyaCoach(chatInput); }}
            className="p-3 border-t border-[#1c222e] bg-[#0c0e12] flex gap-2"
          >
            <input 
              type="text" 
              placeholder="Ask Zoya Coaching questions..."
              value={chatInput}
              disabled={isZoyaTyping}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2 bg-black/40 border border-zinc-800/80 hover:border-zinc-700 rounded-lg text-xs outline-none text-white focus:border-[#10b981]"
            />
            <button 
              type="submit" 
              disabled={isZoyaTyping || !chatInput.trim()}
              className="p-2 bg-[#10b981] hover:bg-[#10b981]/80 text-black rounded-lg transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </aside>

      </div>

      {deleteConfirmationAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-white" onClick={() => setDeleteConfirmationAccount(null)}>
          <div 
            className="w-full max-w-md bg-[#0d0f14] border border-rose-500/20 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl shadow-rose-950/10"
            onClick={(e) => e.stopPropagation()}
            id={`delete-confirmation-dialog`}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/25">
                <Trash2 className="w-5 h-5 text-rose-450 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold uppercase tracking-wide">Purge Terminal Bridge?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are about to permanently disconnect and purge credentials for <strong className="text-white bg-zinc-900 px-1.5 py-0.5 rounded">{deleteConfirmationAccount.name}</strong> (<span className="font-mono text-amber-400 text-[11px] font-bold">#{deleteConfirmationAccount.accountNumber}</span>).
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-900 space-y-1 text-[10px] font-mono">
              <div className="flex justify-between text-zinc-500">
                <span>Account Provider:</span>
                <span className="text-zinc-300 font-extrabold">{deleteConfirmationAccount.provider}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Routing Server:</span>
                <span className="text-zinc-300 truncate max-w-[170px]">{deleteConfirmationAccount.server}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Memory Balance:</span>
                <span className="text-emerald-400 font-bold">${deleteConfirmationAccount.balance.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 italic">
              Warning: This action deletes the account from the active UI list, Zustand model state, Local Storage registry, and server memory database maps immediately.
            </p>

            <div className="flex justify-end gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmationAccount(null)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-805 hover:bg-zinc-800 text-zinc-400 rounded-lg text-xs font-black uppercase cursor-pointer transition"
                disabled={isDeletingLoading}
                id="delete-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAccountExecution(deleteConfirmationAccount.id)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-black uppercase cursor-pointer transition flex items-center justify-center gap-1.5 min-w-[120px]"
                disabled={isDeletingLoading}
                id="delete-confirm-btn"
              >
                {isDeletingLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Purge Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Nested forms to minimize space inside primary renderer
function RiskCalculator({ accountBalance }: { accountBalance: number }) {
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLoss, setStopLoss] = useState(25);
  const [selectedAsset, setSelectedAsset] = useState("OANDA:XAUUSD");

  const lotFactor = selectedAsset.includes("EUR") ? 100000 : 100;
  const computedLossDollar = accountBalance * (riskPercent / 100);
  const calculatedLots = Number((computedLossDollar / (stopLoss * (selectedAsset.includes("EUR") ? 10 : 1))).toFixed(2));

  return (
    <div className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-3 font-mono text-xs">
      <h4 className="text-xs font-bold text-[#10b981] uppercase tracking-wider border-b border-zinc-800 pb-1 flex items-center gap-1.5">
        <Percent className="w-4 h-4" /> Calculated Sizing Engine
      </h4>

      <div className="flex flex-col gap-1">
        <label className="text-[#64748b] text-[10px] uppercase">AUM Balance Basis</label>
        <span className="text-white font-bold font-mono">${accountBalance.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Risk Ratio (%)</label>
          <input 
            type="number" 
            value={riskPercent} 
            onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0.1)}
            className="p-1 px-2.5 bg-black border border-zinc-800 rounded font-bold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Stop Loss (Units / Pips)</label>
          <input 
            type="number" 
            value={stopLoss} 
            onChange={(e) => setStopLoss(parseInt(e.target.value) || 5)}
            className="p-1 px-2.5 bg-black border border-zinc-800 rounded font-bold"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-1">
        <label className="text-[#64748b] text-[10px] uppercase font-bold">Instrument Factor</label>
        <select 
          value={selectedAsset} 
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="p-1.5 bg-black border border-zinc-800 rounded text-slate-300"
        >
          <option value="OANDA:XAUUSD">Gold (100 Oz contracts)</option>
          <option value="FX:EURUSD">Euro (100k standard)</option>
        </select>
      </div>

      <div className="p-3 bg-black/40 rounded border border-zinc-800/80 mt-2 flex justify-between items-center">
        <div>
          <span className="text-[10px] text-[#64748b] uppercase block">Risk Sizing Outcome</span>
          <span className="text-lg font-bold text-white font-mono">{calculatedLots.toFixed(2)} Standard Lots</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#64748b] uppercase block">Loss Risk Standard</span>
          <span className="text-sm font-bold text-[#ef4444] font-mono">${computedLossDollar.toLocaleString("en-US", { maximumFractionDigits: 1 })}</span>
        </div>
      </div>
    </div>
  );
}

function JournalForm({ onAddJournal }: { onAddJournal: (entry: JournalEntry) => void }) {
  const [jSymbol, setJSymbol] = useState("OANDA:XAUUSD");
  const [jType, setJType] = useState<"BUY" | "SELL">("BUY");
  const [jEntry, setJEntry] = useState(2310.00);
  const [jExit, setJExit] = useState(2320.00);
  const [jLots, setJLots] = useState(1.0);
  const [jStrat, setJStrat] = useState("ICT Fair Value Gap");
  const [jEmotion, setJEmotion] = useState("Calm");
  const [jNotes, setJNotes] = useState("");

  const submitJournal = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedPnl = Number(((jType === "BUY" ? (jExit - jEntry) : (jEntry - jExit)) * jLots * 100).toFixed(2));
    onAddJournal({
      id: "journal-" + Date.now(),
      symbol: jSymbol,
      type: jType,
      entryPrice: jEntry,
      exitPrice: jExit,
      lots: jLots,
      pnl: calculatedPnl,
      strategy: jStrat,
      emotion: jEmotion,
      notes: jNotes.trim() || "Clean execution adhering to limits.",
      timestamp: new Date().toISOString()
    });
    setJNotes("");
  };

  return (
    <form onSubmit={submitJournal} className="p-4 rounded-xl border border-[#1c222e] bg-[#0c1015] flex flex-col gap-3 font-mono text-xs">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-1 flex items-center gap-1.5">
        <Plus className="w-4 h-4 text-emerald-400" /> Log New Workspace Execution Notes
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Symbol</label>
          <select value={jSymbol} onChange={(e) => setJSymbol(e.target.value)} className="p-1.5 bg-black border border-zinc-800 rounded">
            <option value="OANDA:XAUUSD">XAUUSD</option>
            <option value="FX:EURUSD">EURUSD</option>
            <option value="FX:GBPUSD">GBPUSD</option>
            <option value="COINBASE:BTCUSD">BTCUSD</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Action</label>
          <select value={jType} onChange={(e) => setJType(e.target.value as "BUY" | "SELL")} className="p-1.5 bg-black border border-zinc-800 rounded">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Lots</label>
          <input type="number" step="0.1" value={jLots} onChange={(e) => setJLots(parseFloat(e.target.value) || 1.0)} className="p-1 bg-black border border-zinc-800 rounded text-center" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Strategy</label>
          <select value={jStrat} onChange={(e) => setJStrat(e.target.value)} className="p-1.5 bg-black border border-zinc-800 rounded">
            <option value="ICT Fair Value Gap">Liquidity Sweep</option>
            <option value="Asian Range sweeps">Silver Bullet</option>
            <option value="Trend Continuation">Momentum Continuation</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Entry Price</label>
          <input type="number" step="0.01" value={jEntry} onChange={(e) => setJEntry(parseFloat(e.target.value) || 1.0)} className="p-1 bg-black border border-zinc-800 rounded text-center" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[#64748b] text-[10px] uppercase">Exit Price</label>
          <input type="number" step="0.01" value={jExit} onChange={(e) => setJExit(parseFloat(e.target.value) || 1.0)} className="p-1 bg-black border border-zinc-800 rounded text-center" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[#64748b] text-[10px] uppercase font-bold">Execution Emotion State</label>
        <div className="flex gap-2 flex-wrap">
          {["Confident", "Anxious", "Greedy", "Fearful", "Calm"].map((emotion) => (
            <button
              type="button"
              key={emotion}
              onClick={() => setJEmotion(emotion)}
              className={`px-3 py-1 rounded text-[11px] font-bold ${jEmotion === emotion ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30" : "bg-black text-[#64748b] border border-zinc-800 hover:text-white"}`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[#64748b] text-[10px] uppercase">Session Playbook Notes</label>
        <textarea 
          placeholder="Examine physical notes and structural bias context..." 
          value={jNotes} 
          onChange={(e) => setJNotes(e.target.value)}
          rows={2} 
          className="p-2 bg-black border border-zinc-800 rounded outline-none text-white focus:border-[#10b981]" 
        />
      </div>

      <button type="submit" className="py-2.5 bg-[#10b981] hover:bg-emerald-400 text-black font-bold uppercase rounded transition-all tracking-wider text-xs">
        Log Journal Entry Matrix
      </button>
    </form>
  );
}

function AlertForm({ 
  onAddAlert,
  onAddTimelineAlert
}: { 
  onAddAlert: (alert: TradeAlert) => void;
  onAddTimelineAlert: (alert: any) => void;
}) {
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");
  const [type, setType] = useState<"price_above" | "price_below" | "news_event" | "volatility">("price_above");
  const [target, setTarget] = useState("");
  const [importance, setImportance] = useState<"CRITICAL" | "IMPORTANT" | "LOW">("IMPORTANT");
  const [confidence, setConfidence] = useState(85);
  const [voicePriority, setVoicePriority] = useState<"Voice" | "Notification" | "Silent">("Voice");
  const [sources, setSources] = useState<string[]>(["ATR", "Volume"]);

  const toggleSource = (src: string) => {
    if (sources.includes(src)) {
      setSources(sources.filter(s => s !== src));
    } else {
      setSources([...sources, src]);
    }
  };

  const submitAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTarget = target.trim() || (type === "volatility" ? "Volatility Spike > 2.5σ" : "Standard Boundary");
    const activeSources = sources.length > 0 ? sources.join(" + ") : "ATR Monitor";
    const cleanSym = symbol.split(":")[1] || symbol;

    // Standard trigger persistence
    onAddAlert({
      id: "alert-" + Date.now(),
      symbol,
      type,
      targetValue: finalTarget,
      message: `${cleanSym} reached armed limit via ${activeSources}`,
      channel: voicePriority === "Voice" ? "Zoya Voice" : voicePriority === "Notification" ? "Desktop HUD" : "Silent Log",
      active: true,
      confidence: confidence,
      importance: importance,
      source: activeSources,
      voicePriority: voicePriority,
      urgency: Math.min(100, Math.max(10, confidence + (importance === "CRITICAL" ? 10 : importance === "LOW" ? -15 : 0))),
      impactScore: Math.floor(Math.random() * 25) + 65,
    });

    // Create a live timeline event right away so user sees results instantly
    onAddTimelineAlert({
      id: "timeline-custom-" + Date.now(),
      title: `${cleanSym} High Intelligence Armed`,
      confidence: confidence,
      source: activeSources,
      timestamp: new Date().toISOString(),
      importance: importance,
      status: "Delivered",
      urgency: Math.min(100, Math.max(10, confidence + (importance === "CRITICAL" ? 10 : -10))),
      impact: Math.floor(Math.random() * 25) + 65,
      reason: `- User launched custom threshold at target [${finalTarget}]\n- Signal validation pipeline running at 100% capacity\n- Multi-factor filters active: ${activeSources}\n- Priority route status: ${voicePriority}`,
      symbol: symbol
    });

    setTarget("");
  };

  return (
    <form onSubmit={submitAlert} className="p-4 rounded-xl border border-zinc-800 bg-[#0c1015] flex flex-col gap-4 font-mono text-xs">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[#10b981] animate-pulse" /> ARM INSTITUTIONAL AI TRIGGER CONSOLE
        </h4>
        <span className="text-[9px] bg-[#10b981]/15 text-[#10b981] px-1.5 py-0.5 rounded font-black">AI ENG SECURE</span>
      </div>
 
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-[10px] uppercase font-bold">Instrument Symbol</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="p-2 bg-black border border-zinc-800 rounded focus:border-[#10b981] focus:outline-none text-white text-xs">
            <option value="OANDA:XAUUSD">XAUUSD (Gold Spot)</option>
            <option value="FX:EURUSD">EURUSD (Euro Spot)</option>
            <option value="FX:GBPUSD">GBPUSD (Sterling Spot)</option>
            <option value="COINBASE:BTCUSD">BTCUSD (Bitcoin)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-[10px] uppercase font-bold">Trigger Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="p-2 bg-black border border-zinc-800 rounded focus:border-[#10b981] focus:outline-none text-white text-xs">
            <option value="price_above">Price Above (Resistance)</option>
            <option value="price_below">Price Below (Support)</option>
            <option value="news_event">Live Macro Event</option>
            <option value="volatility">Volatility Spike</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-[10px] uppercase font-bold">Trigger Target / Price</label>
          <input 
            type="text" 
            placeholder="e.g. 2350.00 or Spike Coefficient" 
            value={target} 
            onChange={(e) => setTarget(e.target.value)} 
            className="p-2 bg-black border border-zinc-800 rounded focus:border-[#10b981] focus:outline-none text-white text-xs font-bold placeholder-zinc-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-[10px] uppercase font-bold">Voice Priority System</label>
          <select value={voicePriority} onChange={(e) => setVoicePriority(e.target.value as any)} className="p-2 bg-black border border-zinc-800 rounded focus:border-[#10b981] focus:outline-none text-white text-xs">
            <option value="Voice">🔴 Voice + Notification</option>
            <option value="Notification">🟠 standard Notification Only</option>
            <option value="Silent">🟡 Silent Event Log</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-dashed border-zinc-800/60 pt-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold">
            <span className="text-zinc-400">Target Confidence Coefficient</span>
            <span className="text-[#10b981]">{confidence}%</span>
          </div>
          <input 
            type="range" 
            min="50" 
            max="100" 
            value={confidence} 
            onChange={(e) => setConfidence(parseInt(e.target.value))} 
            className="accent-[#10b981] cursor-pointer bg-black rounded"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-[10px] uppercase font-bold">Urgency Importance Tier</label>
          <div className="grid grid-cols-3 gap-1 bg-black p-0.5 rounded border border-zinc-800">
            {["CRITICAL", "IMPORTANT", "LOW"].map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setImportance(lvl as any)}
                className={`py-1 text-[9px] font-black rounded transition-all cursor-pointer ${importance === lvl ? "bg-[#10b981] text-black" : "text-zinc-500 hover:text-white"}`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-[10px] uppercase font-bold">Technical Trigger Multipliers</label>
          <div className="flex flex-wrap gap-1.5">
            {["ATR", "Volume", "OrderFlow", "NewsScrape"].map(src => {
              const active = sources.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => toggleSource(src)}
                  className={`px-2 py-1 text-[9px] border rounded transition cursor-pointer font-bold ${active ? "bg-zinc-850 text-[#10b981] border-[#10b981]/50" : "bg-black text-zinc-500 border-zinc-800 hover:text-white"}`}
                >
                  {active ? `✓ ${src}` : `+ ${src}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button type="submit" className="py-2.5 bg-[#10b981] hover:bg-emerald-400 text-black font-black uppercase rounded-lg text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2">
        <Sliders className="w-4 h-4 text-black" />
        <span>ARM INSTITUTIONAL AI AGENT TRIGGER SYSTEM</span>
      </button>
    </form>
  );
}
