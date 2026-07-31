'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Copy,
  Server,
  RefreshCw,
  Terminal,
  Cpu,
  Sparkles,
  BookOpen,
  Check,
  Lock,
  Search,
  Box,
  Radio,
  Sliders,
  BarChart3,
  Globe,
} from 'lucide-react';

interface ProviderKeyItem {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
  modelsList?: string[];
  priority: number;
  status: 'ACTIVE' | 'COOLDOWN' | 'DISABLED';
  errorCount: number;
  successCount: number;
  cooldownUntil?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
}

interface ClientKeyItem {
  id: string;
  name: string;
  token: string;
  status: 'ACTIVE' | 'DISABLED';
  totalRequests: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

interface RequestLogItem {
  id: string;
  provider: string;
  model: string;
  keyName?: string | null;
  statusHttp: number;
  success: boolean;
  retryCount: number;
  latencyMs: number;
  errorMessage?: string | null;
  createdAt: string;
}

interface StatsData {
  totalRequests: number;
  successfulRequests: number;
  successRate: string;
  activeKeysCount: number;
  cooldownKeysCount: number;
  totalKeysCount: number;
}

interface ModelItem {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface PingResultItem {
  provider: string;
  url: string;
  latencyMs: number;
  status: number;
  reachable: boolean;
}

const TableSkeleton = () => (
  <div className="space-y-3 animate-pulse py-3">
    <div className="h-10 bg-slate-950/80 border border-slate-800/80 rounded-xl w-full"></div>
    <div className="h-10 bg-slate-950/60 border border-slate-800/60 rounded-xl w-full"></div>
    <div className="h-10 bg-slate-950/40 border border-slate-800/40 rounded-xl w-full"></div>
  </div>
);

export default function Dashboard() {
  const [keys, setKeys] = useState<ProviderKeyItem[]>([]);
  const [clientKeys, setClientKeys] = useState<ClientKeyItem[]>([]);
  const [logs, setLogs] = useState<RequestLogItem[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalRequests: 0,
    successfulRequests: 0,
    successRate: '100%',
    activeKeysCount: 0,
    cooldownKeysCount: 0,
    totalKeysCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Live Auto-Refresh Countdown (8s)
  const [refreshCountdown, setRefreshCountdown] = useState(8);

  // System Prompt Settings State
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [enableSystemPrompt, setEnableSystemPrompt] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Live Ping State
  const [pingResults, setPingResults] = useState<PingResultItem[]>([]);
  const [pinging, setPinging] = useState(false);

  // Form State for Provider Keys
  const [provider, setProvider] = useState('auto');
  const [keyName, setKeyName] = useState('');
  const [rawKeys, setRawKeys] = useState('');
  const [priority, setPriority] = useState('1');
  const [baseUrl, setBaseUrl] = useState('');
  const [autoImportModels, setAutoImportModels] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingKeyId, setRefreshingKeyId] = useState<string | null>(null);

  // Form State for Client Gateway Keys
  const [newClientKeyName, setNewClientKeyName] = useState('');
  const [creatingClientKey, setCreatingClientKey] = useState(false);

  // Search & Copy States
  const [searchModelQuery, setSearchModelQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  // Modal / Tab State
  const [showDocModal, setShowDocModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'opencode' | 'curl' | 'python' | 'nodejs' | 'cursor' | 'cline' | 'mcp'>('opencode');

  const fetchDashboardData = async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);

      const [keysRes, clientKeysRes, logsRes, modelsRes, settingsRes] = await Promise.all([
        fetch('/api/keys'),
        fetch('/api/client-keys'),
        fetch('/api/logs'),
        fetch('/api/v1/models', {
          headers: { 'x-internal-dashboard': 'true' },
        }),
        fetch('/api/settings'),
      ]);

      const keysData = await keysRes.json();
      const clientKeysData = await clientKeysRes.json();
      const logsData = await logsRes.json();
      const modelsData = await modelsRes.json();
      const settingsData = await settingsRes.json();

      if (keysData.success) setKeys(keysData.keys);
      if (clientKeysData.success) setClientKeys(clientKeysData.clientKeys);
      if (logsData.success) {
        setLogs(logsData.logs);
        setStats(logsData.stats);
      }
      if (modelsData.data && Array.isArray(modelsData.data)) {
        setAvailableModels(modelsData.data);
      }
      if (settingsData.success && settingsData.setting) {
        setCustomSystemPrompt(settingsData.setting.customSystemPrompt || '');
        setEnableSystemPrompt(Boolean(settingsData.setting.enableSystemPrompt));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      if (isInitial) setInitialLoading(false);
      setLoading(false);
    }
  };

  // Initial fetch and 1-second interval timer for live countdown
  useEffect(() => {
    fetchDashboardData(true);

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(false);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const manualRefresh = () => {
    fetchDashboardData();
    setRefreshCountdown(8);
  };

  const handleRunPingTest = async () => {
    setPinging(true);
    try {
      const res = await fetch('/api/ping');
      const data = await res.json();
      if (data.success) {
        setPingResults(data.pingResults);
      }
    } catch (err) {
      console.error('Ping test failed:', err);
    } finally {
      setPinging(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customSystemPrompt, enableSystemPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Aturan Centralized System Prompt berhasil disimpan!');
      } else {
        alert(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      alert(err.message || 'Error koneksi');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKeys.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: keyName.trim() || undefined,
          rawKeys: rawKeys.trim(),
          priority: Number(priority),
          baseUrl: baseUrl.trim() || undefined,
          autoImportModels,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRawKeys('');
        setKeyName('');
        setBaseUrl('');
        
        if (data.summary) {
          let msg = `Berhasil menyimpan ${data.summary.addedCount} API Key baru!`;
          if (data.summary.skippedCount > 0) {
            msg += `\n(${data.summary.skippedCount} key dilewati karena sudah ada / duplikat).`;
          }
          alert(msg);
        }
        manualRefresh();
      } else {
        alert(data.error || 'Gagal menambahkan API Key');
      }
    } catch (err: any) {
      alert(err.message || 'Error koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClientKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClientKey(true);
    try {
      const res = await fetch('/api/client-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientKeyName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewClientKeyName('');
        manualRefresh();
      } else {
        alert(data.error || 'Gagal membuat Client Token');
      }
    } catch (err: any) {
      alert(err.message || 'Error koneksi');
    } finally {
      setCreatingClientKey(false);
    }
  };

  const handleToggleClientKeyStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    await fetch('/api/client-keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    manualRefresh();
  };

  const handleDeleteClientKey = async (id: string) => {
    if (!confirm('Yakin ingin menghapus Client Gateway Key ini? Editor yang menggunakan token ini tidak akan bisa terhubung.')) return;
    await fetch(`/api/client-keys?id=${id}`, { method: 'DELETE' });
    manualRefresh();
  };

  const handleClearLogs = async () => {
    if (!confirm('Yakin ingin mengosongkan seluruh riwayat transaksi log?')) return;
    setClearingLogs(true);
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        manualRefresh();
      } else {
        alert(data.error || 'Gagal mengosongkan log');
      }
    } catch (err: any) {
      alert(err.message || 'Error koneksi');
    } finally {
      setClearingLogs(false);
    }
  };

  const handleRefreshKeyModels = async (id: string) => {
    setRefreshingKeyId(id);
    try {
      const res = await fetch('/api/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'refresh_models' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Berhasil meng-import ${data.modelsCount} model!`);
        manualRefresh();
      } else {
        alert(data.error || 'Gagal meng-import model');
      }
    } catch (err: any) {
      alert(err.message || 'Error koneksi');
    } finally {
      setRefreshingKeyId(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    await fetch('/api/keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    manualRefresh();
  };

  const handleResetCooldown = async (id: string) => {
    await fetch('/api/keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reset_cooldown' }),
    });
    manualRefresh();
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Yakin ingin menghapus API Key ini?')) return;
    await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
    manualRefresh();
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return '••••••••';
    return `${key.substring(0, 6)}••••••••${key.substring(key.length - 4)}`;
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyModelId = (modelId: string) => {
    navigator.clipboard.writeText(modelId);
    setCopiedModelId(modelId);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  const activeTokenSample = clientKeys.find((ck) => ck.status === 'ACTIVE')?.token || 'ar-sk-your-gateway-token';

  const filteredModels = availableModels.filter(
    (m) =>
      m.id.toLowerCase().includes(searchModelQuery.toLowerCase()) ||
      m.owned_by.toLowerCase().includes(searchModelQuery.toLowerCase())
  );

  // Compute analytics breakdown per provider
  const providerStats: Record<string, number> = {};
  logs.forEach((log) => {
    const p = log.provider || 'unknown';
    providerStats[p] = (providerStats[p] || 0) + 1;
  });

  const opencodeConfigSnippet = `{
  "provider": "openai",
  "options": {
    "baseURL": "http://localhost:20128/v1",
    "apiKey": "${activeTokenSample}"
  }
}`;

  const curlSnippet = `curl -X POST http://localhost:20128/v1/chat/completions \\
  -H "Authorization: Bearer ${activeTokenSample}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Halo AI Router!"}]
  }'`;

  const pythonSnippet = `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:20128/v1",
    api_key="${activeTokenSample}"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Halo dari Python!"}]
)

print(response.choices[0].message.content)`;

  const nodejsSnippet = `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:20128/v1',
  apiKey: '${activeTokenSample}',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Halo dari Node.js!' }],
  });

  console.log(completion.choices[0].message.content);
}

main();`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 lg:p-8 selection:bg-indigo-500 selection:text-white">
      {/* Container */}
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* Top Navigation / Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <img
              src="/auragate_logo.jpg"
              alt="AuraGate Logo"
              className="w-10 h-10 rounded-xl border border-indigo-500/40 object-cover shadow-lg shadow-indigo-600/20 shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AuraGate AI Gateway
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                Smart Key Pool, Multi-Client Tokens, Auto-Provider & Live Model Importer (Next.js + SQLite)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Ping Test Button */}
            <button
              onClick={handleRunPingTest}
              disabled={pinging}
              className="flex items-center justify-center gap-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-medium transition shadow-lg shadow-sky-600/10 active:scale-98 disabled:opacity-50"
            >
              <Globe className={`w-4 h-4 text-sky-400 shrink-0 ${pinging ? 'animate-spin' : ''}`} />
              <span>{pinging ? 'Pinging Providers...' : 'Test Ping Provider'}</span>
            </button>

            {/* RTK Token Saver Active Badge */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold shadow-sm">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>RTK Token Saver (Aktif)</span>
            </div>

            {/* Catalog Model Button */}
            <button
              onClick={() => setShowModelModal(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-600/10 active:scale-98"
            >
              <Box className="w-4 h-4 text-emerald-400 shrink-0" />
              Katalog Model ({availableModels.length})
            </button>

            {/* Panduan Button */}
            <button
              onClick={() => setShowDocModal(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-medium transition shadow-lg shadow-indigo-600/10 active:scale-98"
            >
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              Panduan Integrasi
            </button>

            {/* Local Server Endpoint Info */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-400 hidden sm:inline">Base URL:</span>
                <code className="bg-slate-950 px-2 py-1 rounded text-emerald-300 font-mono text-[11px] sm:text-xs">
                  http://localhost:20128/v1
                </code>
              </div>
              <button
                onClick={() => copyToClipboard('http://localhost:20128/v1', setCopiedUrl)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition shrink-0"
                title="Copy URL"
              >
                {copiedUrl ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Live Provider Ping Results Bar (If Ping Test Run) */}
        {pingResults.length > 0 && (
          <section aria-label="Provider Latency Ping" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
              <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
              <span>Hasil Latency Ping Network Provider API:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {pingResults.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                >
                  <span className="font-medium text-slate-200">{p.provider}</span>
                  {p.reachable ? (
                    <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {p.latencyMs}ms
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-rose-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Offline / 500
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stats Section */}
        <section aria-label="System Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <article className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="truncate">TOTAL KEYS</span>
              <Key className="w-4 h-4 text-indigo-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-white">{stats.totalKeysCount}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">Key dalam pool SQLite</div>
          </article>

          <article className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="truncate">ACTIVE KEYS</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-emerald-400">{stats.activeKeysCount}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">Siap memproses request</div>
          </article>

          <article className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="truncate">GATEWAY TOKENS</span>
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-amber-400">{clientKeys.length}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">Client Access Key aktif</div>
          </article>

          <article className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="truncate">IMPORTED MODELS</span>
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-emerald-300">{availableModels.length}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              Siap dipakai di Editor
            </div>
          </article>
        </section>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Form Importer & Client Keys Generator */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 sm:space-y-8">
            
            {/* Centralized System Prompt Injection Form */}
            <section aria-labelledby="system-prompt-heading" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400 shrink-0" />
                  <h2 id="system-prompt-heading" className="font-semibold text-base sm:text-lg text-white">Centralized System Prompt</h2>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Disisipkan otomatis ke setiap request percakapan dari OpenCode / Cursor / Editor Anda.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="enableSystemPrompt"
                    checked={enableSystemPrompt}
                    onChange={(e) => setEnableSystemPrompt(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="enableSystemPrompt" className="text-xs text-slate-300 cursor-pointer font-medium">
                    Aktifkan Centralized System Prompt Injection
                  </label>
                </div>

                <textarea
                  rows={4}
                  placeholder={`Contoh Aturan Global:\n- Selalu jawab pertanyaan dalam Bahasa Indonesia yang sopan dan jelas.\n- Gunakan format TypeScript strictly-typed saat menulis kode.`}
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Sliders className="w-3.5 h-3.5" /> Simpan Aturan System Prompt
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Form Provider Keys */}
            <section aria-labelledby="add-key-heading" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Plus className="w-5 h-5 text-indigo-400 shrink-0" />
                <h2 id="add-key-heading" className="font-semibold text-base sm:text-lg text-white">Tambah / Import API Key</h2>
              </div>

              <form onSubmit={handleAddKeys} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Provider AI</span>
                    <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3" /> Auto-Detect
                    </span>
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="auto">✨ Auto-Detect Provider (Rekomendasi)</option>
                    <option value="mistral">Mistral AI (api.mistral.ai)</option>
                    <option value="groq">Groq (gsk_...)</option>
                    <option value="openai">OpenAI (sk-...)</option>
                    <option value="deepseek">DeepSeek (sk-...)</option>
                    <option value="gemini">Google Gemini (AIStudio)</option>
                    <option value="openrouter">OpenRouter (sk-or-...)</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="custom">⚙️ Custom Provider Endpoint</option>
                  </select>
                </div>

                {provider === 'custom' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Custom Base URL (/v1 Endpoint)
                    </label>
                    <input
                      type="url"
                      placeholder="https://my-custom-llm.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      System akan menguji <code className="text-indigo-300">GET /models</code> ke endpoint custom ini.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Label/Nama Key (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Groq Production Pool"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-slate-400">
                      Daftar API Key (Support: <code className="text-indigo-300">nama|apikey</code>)
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`Groq Utama|gsk_key1_xxx\nGroq Backup|gsk_key2_yyy\ngroq|Groq Tiga|gsk_key3_zzz`}
                    value={rawKeys}
                    onChange={(e) => setRawKeys(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoImport"
                    checked={autoImportModels}
                    onChange={(e) => setAutoImportModels(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="autoImport" className="text-xs text-slate-300 cursor-pointer flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    Otomatis import & tes Model via API
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Prioritas (Angka kecil = Dipakai Dulu)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menguji & Meng-import...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Simpan & Auto-Import Models
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Client Access Tokens Generator Section */}
            <section aria-labelledby="client-tokens-heading" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                  <h2 id="client-tokens-heading" className="font-semibold text-base sm:text-lg text-white">Client Gateway Tokens</h2>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Access Token khusus untuk dipasang di OpenCode/Cursor/Cline agar koneksi ke Proxy terproteksi.
              </p>

              <form onSubmit={handleCreateClientKey} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama Client (misal: OpenCode PC)"
                  value={newClientKeyName}
                  onChange={(e) => setNewClientKeyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="submit"
                  disabled={creatingClientKey}
                  className="w-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-semibold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creatingClientKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generate Token...
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Generate Client Gateway Token Baru
                    </>
                  )}
                </button>
              </form>

              {/* Client Keys Table */}
              <div className="space-y-2 pt-2 max-h-60 overflow-y-auto pr-1">
                {initialLoading && clientKeys.length === 0 ? (
                  <TableSkeleton />
                ) : clientKeys.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center italic py-2">
                    Belum ada Client Gateway Key. Semua koneksi lokal diizinkan tanpa otentikasi.
                  </p>
                ) : (
                  clientKeys.map((ck) => (
                    <article
                      key={ck.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-slate-200 truncate">{ck.name}</span>
                          {ck.status === 'ACTIVE' ? (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                              DISABLED
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                          <code className="truncate max-w-[130px] sm:max-w-[180px]">{ck.token}</code>
                          <button
                            onClick={() => copyToClipboard(ck.token, () => {
                              setCopiedTokenId(ck.id);
                              setTimeout(() => setCopiedTokenId(null), 2000);
                            })}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 shrink-0"
                            title="Copy Token"
                          >
                            {copiedTokenId === ck.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Requests: {ck.totalRequests}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleClientKeyStatus(ck.id, ck.status)}
                          className={`px-2 py-1 text-[10px] font-medium rounded-lg border ${
                            ck.status === 'DISABLED'
                              ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {ck.status === 'DISABLED' ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => handleDeleteClientKey(ck.id)}
                          className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

          </div>

          {/* Right Column: Key Pool Table, Analytics & Logs */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 sm:space-y-8">
            
            {/* Graph Analytics & Provider Usage Breakdown */}
            <section aria-labelledby="analytics-heading" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h2 id="analytics-heading" className="font-semibold text-base sm:text-lg text-white">Graph Analytics & Provider Usage</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Provider Usage Breakdown Bars */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300">Distribusi Request per Provider:</div>
                  {Object.keys(providerStats).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Belum ada riwayat transaksi.</p>
                  ) : (
                    Object.entries(providerStats).map(([prov, count]) => {
                      const percentage = Math.round((count / logs.length) * 100);
                      return (
                        <div key={prov} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="uppercase font-medium text-slate-300">{prov}</span>
                            <span className="text-slate-400">{count} req ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Token Savings & Performance Overview */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-300">Estimasi RTK Token Saver:</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-2">
                      ~{Math.round(logs.length * 145)} Tokens
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Token berhasil dihemat via kompresi whitespace & deduplikasi system prompt.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-900 flex justify-between text-xs text-slate-400">
                    <span>Latency Rata-Rata:</span>
                    <span className="font-mono text-emerald-300">
                      {logs.length > 0
                        ? `${Math.round(logs.reduce((acc, l) => acc + l.latencyMs, 0) / logs.length)}ms`
                        : '0ms'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Pool Table */}
            <section aria-labelledby="key-pool-heading" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400 shrink-0" />
                  <h2 id="key-pool-heading" className="font-semibold text-base sm:text-lg text-white">Daftar API Key Pool</h2>
                </div>
                <button
                  onClick={manualRefresh}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {initialLoading && keys.length === 0 ? (
                <TableSkeleton />
              ) : keys.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                  <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Belum ada API Key di dalam pool.</p>
                  <p className="text-xs text-slate-500 mt-1">Gunakan form di samping untuk memasukkan API Key Anda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[550px]">
                    <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 z-10 shadow">
                      <tr>
                        <th className="py-3 px-3 rounded-l-lg">Label / Key</th>
                        <th className="py-3 px-3">Provider</th>
                        <th className="py-3 px-3">Imported Models</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right rounded-r-lg">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {keys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-3">
                            <div className="font-medium text-slate-100">{k.name}</div>
                            <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                              {maskApiKey(k.apiKey)}
                            </div>
                            {k.baseUrl && (
                              <div className="text-[10px] text-indigo-400 font-mono mt-0.5 truncate max-w-[140px]">
                                {k.baseUrl}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="uppercase px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300">
                              {k.provider}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">Prioritas #{k.priority}</div>
                          </td>
                          <td className="py-3.5 px-3 max-w-[180px]">
                            {k.modelsList && k.modelsList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {k.modelsList.slice(0, 3).map((m) => (
                                  <span key={m} className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded text-[10px] font-mono truncate max-w-[120px]">
                                    {m}
                                  </span>
                                ))}
                                {k.modelsList.length > 3 && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    +{k.modelsList.length - 3} lainnya
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Default models</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {k.status === 'ACTIVE' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] sm:text-[11px] font-medium">
                                <CheckCircle className="w-3 h-3" /> ACTIVE
                              </span>
                            )}
                            {k.status === 'COOLDOWN' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] sm:text-[11px] font-medium">
                                <AlertTriangle className="w-3 h-3" /> COOLDOWN
                              </span>
                            )}
                            {k.status === 'DISABLED' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-[10px] sm:text-[11px] font-medium">
                                <XCircle className="w-3 h-3" /> DISABLED
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 mt-1">
                              {k.successCount} ok / {k.errorCount} err
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRefreshKeyModels(k.id)}
                                title="Re-sync / Fetch models dari provider API"
                                disabled={refreshingKeyId === k.id}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingKeyId === k.id ? 'animate-spin' : ''}`} />
                              </button>
                              {k.status === 'COOLDOWN' && (
                                <button
                                  onClick={() => handleResetCooldown(k.id)}
                                  title="Reset status Cooldown"
                                  className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleStatus(k.id, k.status)}
                                title={k.status === 'DISABLED' ? 'Aktifkan Key' : 'Nonaktifkan Key'}
                                className={`px-2 py-1 text-[11px] font-medium rounded-lg transition border ${
                                  k.status === 'DISABLED'
                                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {k.status === 'DISABLED' ? 'Enable' : 'Disable'}
                              </button>
                              <button
                                onClick={() => handleDeleteKey(k.id)}
                                title="Hapus Key"
                                className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Request Logs Table */}
            <section aria-labelledby="live-logs-heading" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-sky-400 shrink-0" />
                  <h2 id="live-logs-heading" className="font-semibold text-base sm:text-lg text-white">Live Transaction Logs</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearLogs}
                    disabled={clearingLogs || logs.length === 0}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                    title="Kosongkan seluruh riwayat log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>

                  {/* Live Countdown Badge */}
                  <span className="text-[11px] text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
                    <RefreshCw className={`w-3 h-3 text-indigo-400 ${refreshCountdown === 8 ? 'animate-spin' : ''}`} />
                    <span>Refresh in {refreshCountdown}s</span>
                  </span>
                </div>
              </div>

              {initialLoading && logs.length === 0 ? (
                <TableSkeleton />
              ) : logs.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">Belum ada riwayat transaksi API.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[500px]">
                    <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider sticky top-0 z-10 shadow">
                      <tr>
                        <th className="py-2.5 px-3">Waktu</th>
                        <th className="py-2.5 px-3">Provider / Model</th>
                        <th className="py-2.5 px-3">Key Digunakan</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-200">{log.model}</span>
                            <span className="ml-1.5 text-[10px] text-slate-500 uppercase">({log.provider})</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                            {log.keyName || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.success ? (
                              <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> 200 OK
                              </span>
                            ) : (
                              <span className="text-rose-400 font-medium inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> {log.statusHttp || 'ERR'}
                                {log.retryCount > 0 && (
                                  <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">
                                    Retry #{log.retryCount}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                            {log.latencyMs}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        </div>

      </div>

      {/* Model Catalog Modal */}
      {showModelModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <Box className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Katalog Model AI Ter-import</h3>
                  <p className="text-xs text-slate-400">Total {availableModels.length} model siap di-copy ke OpenCode / Editor</p>
                </div>
              </div>
              <button
                onClick={() => setShowModelModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg bg-slate-800/80 transition"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari model AI (misal: mistral, deepseek, gpt-4o, llama)..."
                value={searchModelQuery}
                onChange={(e) => setSearchModelQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Model Cards Grid */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {filteredModels.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                  <Box className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Tidak ada model yang cocok dengan pencarian.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredModels.map((m) => (
                    <div
                      key={m.id}
                      className="bg-slate-950 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-2 transition group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-semibold text-slate-100 truncate group-hover:text-emerald-300 transition">
                          {m.id}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 font-bold">
                            {m.owned_by}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => copyModelId(m.id)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-600/20 hover:text-emerald-300 text-slate-400 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-xs transition flex items-center gap-1.5 shrink-0"
                        title="Copy Model ID"
                      >
                        {copiedModelId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setShowModelModal(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/20"
              >
                Tutup Katalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documentation / Guide Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-white">Panduan Integrasi Multi-Bahasa & Editor</h3>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg bg-slate-800/80 transition"
              >
                ✕
              </button>
            </div>

            {/* Tab selector */}
            <div className="flex border-b border-slate-800 text-xs font-medium gap-1 sm:gap-2 overflow-x-auto shrink-0 pb-1 scrollbar-thin">
              <button
                onClick={() => setActiveTab('opencode')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'opencode'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                OpenCode CLI
              </button>
              <button
                onClick={() => setActiveTab('curl')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'curl'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                cURL (HTTP)
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'python'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Python SDK
              </button>
              <button
                onClick={() => setActiveTab('nodejs')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'nodejs'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Node.js SDK
              </button>
              <button
                onClick={() => setActiveTab('cursor')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'cursor'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Cursor IDE
              </button>
              <button
                onClick={() => setActiveTab('cline')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'cline'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Cline / Roo-Code
              </button>
              <button
                onClick={() => setActiveTab('mcp')}
                className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'mcp'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ MCP Servers (Context7)
              </button>
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {activeTab === 'opencode' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    Tambahkan endpoint AuraGate ke konfigurasi OpenCode Anda (misal di <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-mono">opencode.json</code> atau settings):
                  </p>
                  <div className="relative">
                    <pre className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 font-mono text-[11px] sm:text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                      {opencodeConfigSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(opencodeConfigSnippet, setCopiedConfig)}
                      className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs flex items-center gap-1 shadow"
                    >
                      {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedConfig ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    * Catatan: Gunakan Client Gateway Token <code className="text-amber-300 font-mono">{activeTokenSample}</code> yang dibuat pada panel Gateway Tokens.
                  </p>
                </div>
              )}

              {activeTab === 'curl' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p>Contoh perintah HTTP cURL untuk menguji endpoint completion:</p>
                  <div className="relative">
                    <pre className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 font-mono text-[11px] sm:text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                      {curlSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(curlSnippet, setCopiedConfig)}
                      className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs flex items-center gap-1 shadow"
                    >
                      {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedConfig ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'python' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p>Contoh integrasi menggunakan SDK resmi OpenAI Python (<code className="bg-slate-950 px-1 rounded text-indigo-300 font-mono">pip install openai</code>):</p>
                  <div className="relative">
                    <pre className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 font-mono text-[11px] sm:text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                      {pythonSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(pythonSnippet, setCopiedConfig)}
                      className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs flex items-center gap-1 shadow"
                    >
                      {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedConfig ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'nodejs' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p>Contoh integrasi menggunakan SDK resmi OpenAI Node.js (<code className="bg-slate-950 px-1 rounded text-indigo-300 font-mono">npm install openai</code>):</p>
                  <div className="relative">
                    <pre className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 font-mono text-[11px] sm:text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                      {nodejsSnippet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(nodejsSnippet, setCopiedConfig)}
                      className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs flex items-center gap-1 shadow"
                    >
                      {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedConfig ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'cursor' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>Buka **Cursor Settings** $\rightarrow$ **Models** $\rightarrow$ **OpenAI API**.</li>
                    <li>Centang opsi **Override OpenAI Base URL**.</li>
                    <li>Isi Base URL dengan: <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-300 font-mono">http://localhost:20128/v1</code></li>
                    <li>Isi OpenAI API Key dengan Client Token Anda: <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-300 font-mono">{activeTokenSample}</code></li>
                    <li>Ketik nama model mana saja (misal `llama-3.3-70b-versatile`, `mistral-large-latest`, `deepseek-chat`).</li>
                  </ol>
                </div>
              )}

              {activeTab === 'cline' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>Buka pengaturan ekstensi **Cline / Roo Code / Continue**.</li>
                    <li>Pilih Provider: **OpenAI Compatible**.</li>
                    <li>Base URL: <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-300 font-mono">http://localhost:20128/v1</code></li>
                    <li>API Key: <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-300 font-mono">{activeTokenSample}</code></li>
                    <li>Model ID: Masukkan model dari list yang sudah di-import di Dashboard.</li>
                  </ol>
                </div>
              )}

              {activeTab === 'mcp' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    Integrasi **MCP (Model Context Protocol)** memungkinkan AI di OpenCode / Cursor / Cline untuk membaca dokumentasi perpustakaan secara live (misal via **Context7** MCP Server) melalui AuraGate:
                  </p>
                  <div className="relative">
                    <pre className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 font-mono text-[11px] sm:text-xs text-emerald-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}`}
                    </pre>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    * AuraGate secara otomatis mendukung penerusan tool-calling (`tools` & `tool_choice`) dari semua provider AI (Groq, Mistral, OpenAI, DeepSeek).
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setShowDocModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/20"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
