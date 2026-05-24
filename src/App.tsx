import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Sliders, BarChart3, MapPin, Award, Scale, FileText,
  History, Info, Lock, Eye, EyeOff, User, Sun, Moon, LogOut,
  Search, Bell, Check, X, Shield, RefreshCw, Layers,
  Trash2, TrendingUp, AlertTriangle, Download, Printer, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

import { Kriteria, Alternatif, RiwayatItem, KriteriaSkala, User as UserType } from './types';
import {
  ALLOWED_USERS, INITIAL_KRITERIA, INITIAL_ALTERNATIF,
  INITIAL_SCALES, INITIAL_RIWAYAT, saveRiwayat, loginUser
} from './data';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  // Theme state (isDarkMode triggers midnight velvet navy, dark mode toggler is present)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // Active Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Core Data States
  const [kriteria, setKriteria] = useState<Kriteria[]>(INITIAL_KRITERIA);
  const [alternatif, setAlternatif] = useState<Alternatif[]>(INITIAL_ALTERNATIF);
  const [skalaKriteria, setSkalaKriteria] = useState<KriteriaSkala>(INITIAL_SCALES);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>(INITIAL_RIWAYAT);

  // Interactive UI Helpers
  const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [selectedAlternatif, setSelectedAlternatif] = useState<Alternatif | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Form Editor for Alternatif
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingAlternatif, setEditingAlternatif] = useState<Alternatif | null>(null);

  // Scale Accordion Expanded State
  const [expandedScale, setExpandedScale] = useState<string>('C1');
  const [editingScaleCriteria, setEditingScaleCriteria] = useState<string | null>(null);

  // Interactive Login inputs
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast dispatch
  const triggerToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      triggerToast('Lengkapi username dan password.', 'error');
      return;
    }
    setLoginLoading(true);
    setTimeout(async () => {
      const result = await loginUser(usernameInput, passwordInput);
      setLoginLoading(false);
      if (result.authenticated && result.user) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        setUsernameInput('');
        setPasswordInput('');
        triggerToast(`Login berhasil! Selamat datang ${result.user.name}`, 'success');
      } else {
        triggerToast('Username atau password salah.', 'error');
      }
    }, 850);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    triggerToast('Berhasil logout dari sistem.', 'info');
  };

  // SMART Math Engine implementation
  const calculateScores = (critList: Kriteria[]) => {
    const sumW = critList.reduce((acc, c) => acc + c.bobot, 0);
    const normW: { [key: string]: number } = {};
    critList.forEach(c => {
      normW[c.kode] = sumW > 0 ? c.bobot / sumW : 0;
    });

    const keys = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;
    const minMaxBounds: { [key: string]: { min: number; max: number } } = {};
    
    keys.forEach(k => {
      const vals = alternatif.map(a => a[k]);
      minMaxBounds[k] = {
        min: Math.min(...vals),
        max: Math.max(...vals)
      };
    });

    const results = alternatif.map(a => {
      const utilities: { [key: string]: number } = {};
      let total = 0;
      keys.forEach(k => {
        const val = a[k];
        const { min, max } = minMaxBounds[k];
        let utility = 1;
        if (max !== min) {
          const matchingCrit = critList.find(c => c.kode === k);
          if (matchingCrit?.tipe === 'benefit') {
            utility = (val - min) / (max - min);
          } else {
            utility = (max - val) / (max - min);
          }
        }
        utilities[k] = utility;
        total += utility * (normW[k] || 0);
      });
      return {
        alternative: a,
        utilities,
        totalScore: total
      };
    });

    return results
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  };

  const currentResults = calculateScores(kriteria);
  const bestLocation = currentResults[0]?.alternative;

  // Realtime Weight Update
  const handleWeightChange = (kode: string, val: number) => {
    setKriteria(prev =>
      prev.map(c => (c.kode === kode ? { ...c, bobot: parseFloat(val.toFixed(1)) } : c))
    );
  };

  // Autonormalize weights back to 100%
  const handleNormalizeBobot = () => {
    const currentSum = kriteria.reduce((sum, c) => sum + c.bobot, 0);
    if (currentSum === 0) return;
    setKriteria(prev =>
      prev.map(c => ({
        ...c,
        bobot: parseFloat(((c.bobot / currentSum) * 100).toFixed(1))
      }))
    );
    triggerToast('Bobot telah dinormalisasi merata ke total 100%.', 'success');
  };

  const handleResetBobot = () => {
    setKriteria(prev => prev.map(c => ({ ...c, bobot: c.defaultBobot })));
    triggerToast('Bobot kriteria di-reset ke default.', 'info');
  };

  const handleSaveBobot = () => {
    triggerToast('Bobot kriteria berhasil disimpan ke lokal.', 'success');
  };

  // Edit alternatif values
  const handleSaveAlternatifEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlternatif) return;
    setAlternatif(prev =>
      prev.map(a => (a.id === editingAlternatif.id ? editingAlternatif : a))
    );
    setEditModalOpen(false);
    triggerToast(`Nilai ${editingAlternatif.nama} berhasil diperbarui.`, 'success');
  };

  // Presets logic
  const handleApplyPreset = (type: string) => {
    let raw: number[] = [20, 20, 20, 20, 20];
    let label = '';
    if (type === 'default') {
      raw = [18.2, 20.8, 20.4, 20.1, 20.4];
      label = 'Bobot Default SMART';
    } else if (type === 'jalan') {
      raw = [10, 50, 15, 10, 15]; // C2 gets dominant weight
      label = 'Skenario Akses Jalan Dominan';
    } else if (type === 'lahan') {
      raw = [10, 10, 15, 50, 15]; // C4 dominant
      label = 'Skenario Lahan Dominan';
    } else if (type === 'sampah') {
      raw = [10, 15, 15, 10, 50]; // C5 dominant
      label = 'Skenario Volume Sampah Dominan';
    } else if (type === 'reset') {
      raw = [20, 20, 20, 20, 20];
      label = 'Skenario Pembagian Merata (20%)';
    }

    setKriteria(prev =>
      prev.map((c, idx) => ({ ...c, bobot: raw[idx] }))
    );
    triggerToast(`${label} diterapkan.`, 'success');
  };

  // Sensitivity analysis calculator helper
  const getSensitivityRankings = (modifier: { [key: string]: number }) => {
    const mutatedKriteria = kriteria.map(c => {
      const added = modifier[c.kode] || 0;
      return { ...c, bobot: Math.max(0, c.bobot + added) };
    });
    return calculateScores(mutatedKriteria);
  };

  // Triggering visual export tasks
  const handleExport = (format: string) => {
    triggerToast(`Laporan format ${format} berhasil disiapkan untuk di-unduh.`, 'success');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      {/* Toast Overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-4 rounded-xl shadow-lg flex items-center gap-3 backdrop-blur-md border ${
                t.type === 'success'
                  ? 'bg-emerald-500/90 text-white border-emerald-400'
                  : t.type === 'error'
                  ? 'bg-rose-500/90 text-white border-rose-400'
                  : 'bg-cyan-500/90 text-white border-cyan-400'
              }`}
            >
              <div className="p-1 bg-white/15 rounded-md">
                {t.type === 'success' ? <Check className="w-4 h-4" /> : t.type === 'error' ? <X className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* ==========================================
             1. LOGIN PAGE VIEW
             ========================================== */
          <motion.div
            key="login-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950"
          >
            {/* Ambient Background Circles */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="w-full max-w-md z-10">
              {/* Logo/Icon Area */}
              <div className="text-center mb-6">
                <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl mb-4 glow-emerald">
                  <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>
                <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">
                  Login SPK Bank Sampah
                </h1>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Masuk untuk mengelola sistem penentuan lokasi bank sampah Desa Purwosari.
                </p>
              </div>

              {/* Login Card (Glassmorphism) */}
              <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-850 rounded-3xl p-8 shadow-2xl relative">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Masukkan username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/65 border border-slate-700/60 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-slate-800/65 border border-slate-700/60 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full mt-6 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative overflow-hidden group shadow-lg shadow-emerald-500/20"
                  >
                    {loginLoading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Memverifikasi...</span>
                      </div>
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ChevronRightIcon className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Akses khusus pengelola sistem Desa Purwosari</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ==========================================
             2. MAIN APPLICATION (THE SIDEBAR LAYOUT)
             ========================================== */
          <motion.div
            key="dashboard-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`min-h-screen flex ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
          >
            {/* Elegant Sidebar */}
            <aside
              className={`${
                sidebarCollapsed ? 'w-20' : 'w-64'
              } shrink-0 hidden md:flex flex-col border-r h-screen sticky top-0 transition-all duration-300 z-30 ${
                isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-700'
              }`}
            >
              {/* Brand Header */}
              <div className="p-5 border-b flex items-center justify-between border-slate-800/40">
                {!sidebarCollapsed ? (
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <span className="font-display font-bold text-sm tracking-tight text-emerald-400 block leading-tight">
                        Purwosari SMART
                      </span>
                      <span className="text-[10px] text-slate-400 block">Sistem Lokasi</span>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto p-1.5 bg-emerald-500/10 rounded-lg">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-white"
                >
                  {sidebarCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1.5 custom-scrollbar">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Layers },
                  { id: 'kriteria', label: 'Data Kriteria', icon: Sliders },
                  { id: 'skala', label: 'Skala Kriteria', icon: Scale },
                  { id: 'alternatif', label: 'Alternatif Lokasi', icon: MapPin },
                  { id: 'simulasi', label: 'Simulasi SMART', icon: BarChart3 },
                  { id: 'detail_perhitungan', label: 'Detail Hitung', icon: Scale },
                  { id: 'analisis_sensitivitas', label: 'Analisis Sensitif', icon: TrendingUp },
                  { id: 'riwayat', label: 'Riwayat', icon: History },
                  { id: 'export_laporan', label: 'Export Laporan', icon: FileText },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                          : 'hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Footer Credentials Info Gate */}
              <div className="p-4 border-t border-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase">
                    {currentUser?.name.substring(0, 2)}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-mono">
                        {currentUser?.role}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Content Wrap */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Topbar */}
              <header className={`h-16 border-b flex items-center justify-between px-4 sticky top-0 z-20 backdrop-blur-md ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800/60' : 'bg-slate-50/85 border-slate-200'
              }`}>
                {/* Mobile Menu Toggle & Title */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 md:hidden hover:bg-slate-800/50 rounded-lg text-slate-400"
                  >
                    <MenuIcon className="w-5 h-5" />
                  </button>
                  <div className="hidden sm:block">
                    <span className="font-display font-bold text-sm tracking-wide text-slate-400">
                      Sistem Pendukung Keputusan
                    </span>
                    <h2 className="text-xs font-mono text-slate-500 -mt-0.5">Metode SMART Desa Purwosari</h2>
                  </div>
                </div>

                {/* Right Topbar Area */}
                <div className="flex items-center gap-4">
                  {/* Theme toggler */}
                  <button
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      triggerToast(`Beralih ke mode ${!isDarkMode ? 'Malam' : 'Siang'}.`, 'info');
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 hover:text-amber-400' : 'bg-white border-slate-200 hover:text-indigo-600'
                    }`}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-700" />}
                  </button>

                  <div className="flex items-center gap-3 pl-3 border-l border-slate-800/50">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-slate-300">{currentUser?.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{currentUser?.role}</p>
                    </div>
                    
                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl border border-transparent hover:border-rose-500/20 transition-all"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </header>

              {/* Main Contents Panel / Dashboard View Selector */}
              <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Render Views based on tab */}
                    {activeTab === 'dashboard' && (
                      <div className="space-y-6">
                        {/* HERO SECTION */}
                        <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white shadow-xl">
                          <div className="absolute top-0 right-0 w-80 h-full bg-white/5 skew-x-12 transform origin-top" />
                          <div className="max-w-xl z-10 relative">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-mono mb-4 text-emerald-100">
                              <Sparkles className="w-3.5 h-3.5" />
                              SMART Method Algoritma Realtime
                            </span>
                            <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight mb-3">
                              SPK Bank Sampah Purwosari
                            </h1>
                            <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed mb-6">
                              Sistem penentuan lokasi bank sampah berbasis metode SMART untuk menghasilkan rekomendasi yang transparan dan adaptif bagi Desa Purwosari.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() => setActiveTab('simulasi')}
                                className="px-5 py-2.5 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl text-sm font-semibold hover:brightness-115 shadow-md flex items-center gap-2 cursor-pointer transition-all"
                              >
                                <Sliders className="w-4 h-4" />
                                Mulai Simulasi SMART
                              </button>
                              <button
                                onClick={() => setActiveTab('alternatif')}
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
                              >
                                Lihat Alternatif Lokasi
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* STATS ROW */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: 'Total Alternatif', value: alternatif.length, desc: 'Lokasi dinilai', icon: MapPin, color: 'text-emerald-400' },
                            { label: 'Total Kriteria', value: kriteria.length, desc: 'Faktor penentu', icon: Scale, color: 'text-teal-400' },
                            { label: 'Skenario Terpilih', value: bestLocation?.nama || 'N/A', desc: 'Rekomendasi Utama', icon: Award, color: 'text-amber-400 font-display truncate' },
                            { label: 'Metode SPK', value: 'SMART', desc: 'Sesuai SNI Sampah', icon: Layers, color: 'text-cyan-400' },
                          ].map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                              <div
                                key={i}
                                className={`rounded-2xl p-4 border shadow-sm ${
                                  isDarkMode ? 'bg-slate-900/65 border-slate-850' : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                </div>
                                <div className={`text-base md:text-lg font-bold truncate ${stat.color}`}>{stat.value}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{stat.desc}</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* MAIN DASHBOARD PANEL GRIDS */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Left Column: Ranking Preview (50%) */}
                          <div className={`lg:col-span-7 rounded-3xl p-5 border shadow-sm ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-display font-medium text-lg">Top Ranking Realtime</h3>
                                <p className="text-xs text-slate-400">Rekomendasi dihitung otomatis berdasarkan bobot aktif</p>
                              </div>
                              <button
                                onClick={() => setActiveTab('simulasi')}
                                className="text-xs font-bold text-emerald-400 hover:underline"
                              >
                                Kelola Bobot &rarr;
                              </button>
                            </div>

                            <div className="space-y-3.5">
                              {currentResults.map((res) => {
                                const percentage = res.totalScore * 100;
                                return (
                                  <div
                                    key={res.alternative.id}
                                    className={`relative rounded-2xl p-4 border transition-all ${
                                      res.rank === 1
                                        ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/5 to-teal-500/5'
                                        : isDarkMode
                                        ? 'border-slate-800 hover:border-slate-700 bg-slate-900/20'
                                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2 relative z-10">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                          res.rank === 1
                                            ? 'bg-emerald-500 text-slate-950 font-display'
                                            : isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                                        }`}>
                                          #{res.rank}
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold">{res.alternative.nama}</p>
                                          <p className="text-[10px] text-slate-500 font-mono">Kode: {res.alternative.id}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs font-mono font-bold text-emerald-400">
                                          Skor: {res.totalScore.toFixed(3)}
                                        </span>
                                        {res.rank === 1 && (
                                          <span className="block text-[8px] bg-emerald-500/20 text-emerald-400 uppercase tracking-widest px-1 py-0.5 rounded ml-auto mt-0.5 max-w-max font-bold">
                                            Rekomendasi Utama
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Progress Score Bar */}
                                    <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Column: Interactive Map Grid (50%) */}
                          <div className={`lg:col-span-5 rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-100'
                          }`}>
                            <div>
                              <h3 className="font-display font-medium text-lg mb-1">Peta Lokasi Desa Purwosari</h3>
                              <p className="text-xs text-slate-400 mb-4">Melihat persebaran titik RW alternatif calon Bank Sampah</p>
                              
                              {/* Virtual Interactive Map Visual Layout */}
                              <div className="relative aspect-square w-full rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 border border-slate-800 p-2 overflow-hidden flex flex-col justify-between min-h-[260px]">
                                {/* Grid decoration lines */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-30" />
                                
                                {/* Simulated contour boundaries */}
                                <div className="absolute top-4 left-1/3 w-32 h-32 rounded-full border border-dashed border-emerald-500/10" />
                                <div className="absolute bottom-6 right-8 w-44 h-44 rounded-full border border-dashed border-teal-500/10" />

                                {/* Interactive Pulsing Pin Elements mapping the locations */}
                                {[
                                  { id: 'A1', top: '25%', left: '45%', xLabel: 'Balai RW (A1)' },
                                  { id: 'A2', top: '15%', left: '75%', xLabel: 'Balai Desa (A2)' },
                                  { id: 'A3', top: '55%', left: '20%', xLabel: 'Lapangan Slmt (A3)' },
                                  { id: 'A4', top: '65%', left: '70%', xLabel: 'Air Mancur (A4)' },
                                  { id: 'A5', top: '80%', left: '40%', xLabel: 'Djojo Soekarto (A5)' },
                                ].map((pin) => {
                                  const matchingScore = currentResults.find(r => r.alternative.id === pin.id);
                                  const isTop = matchingScore?.rank === 1;

                                  return (
                                    <div
                                      key={pin.id}
                                      className="absolute transition-all cursor-pointer group"
                                      style={{ top: pin.top, left: pin.left }}
                                      onClick={() => {
                                        const original = alternatif.find(a => a.id === pin.id);
                                        if (original) {
                                          setSelectedAlternatif(original);
                                          setDetailModalOpen(true);
                                        }
                                      }}
                                    >
                                      {/* Outer Beacon Pulse Ring */}
                                      <div className={`absolute -inset-2.5 rounded-full animate-ping duration-1000 opacity-25 ${
                                        isTop ? 'bg-emerald-400' : 'bg-teal-400'
                                      }`} />

                                      {/* Small Pin Marker Ball */}
                                      <div className={`w-3.5 h-3.5 rounded-full border shadow-md relative z-10 ${
                                        isTop ? 'bg-emerald-400 border-white' : 'bg-teal-500 border-slate-900'
                                      }`} />

                                      {/* Indicator Label tooltip on hover */}
                                      <div className="absolute top-5 -left-8 transform translate-y-2 opacity-50 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none bg-slate-900 border border-slate-700 text-[9px] font-mono rounded px-1.5 py-0.5 text-white whitespace-nowrap z-20">
                                        {pin.xLabel} #{matchingScore?.rank}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Map legend banner at bottom */}
                                <div className="mt-auto bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-2 relative z-10 flex justify-between items-center text-[10px]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                                    <span className="text-slate-400">Rekomendasi #1</span>
                                    <div className="w-2.5 h-2.5 bg-teal-500 rounded-full" />
                                    <span className="text-slate-400">RW Alternatif</span>
                                  </div>
                                  <span className="text-slate-500 font-mono">Klik Pin Untuk Detail</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 italic block mt-3 text-center">
                              *Visual koordinat diplot otomatis merata pada teritori peta Desa Purwosari.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       3. DATA KRITERIA VIEW
                       ========================================== */}
                    {activeTab === 'kriteria' && (
                      <div className="space-y-6">
                        {/* Upper Info & Controls Header */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/20 p-6 rounded-3xl">
                          <div>
                            <h3 className="text-xl font-display font-medium text-white">Bobot Preferensi Kriteria (C1 - C5)</h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Metode SMART sensitif terhadap perubahan bobot kriteria. Sesuaikan bobot di bawah ini menggunakan slider.
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2.5">
                            <button
                              onClick={handleNormalizeBobot}
                              className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                            >
                              Normalisasi Bobot (100%)
                            </button>
                            <button
                              onClick={handleResetBobot}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
                            >
                              Reset Bobot
                            </button>
                            <button
                              onClick={handleSaveBobot}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs border border-slate-700 font-medium transition-all cursor-pointer"
                            >
                              Simpan Bobot
                            </button>
                          </div>
                        </div>

                        {/* SUM WEIGHT WARNING */}
                        {(() => {
                          const totalW = kriteria.reduce((s, c) => s + c.bobot, 0);
                          const isWarning = Math.abs(totalW - 100) > 0.5;
                          return (
                            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                              isWarning
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            }`}>
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold font-mono">Total Akumulasi Bobot: {totalW.toFixed(1)}%</p>
                                  <p className="text-[10px] opacity-80 mt-0.5">
                                    {isWarning
                                      ? 'Total bobot belum 100%, sistem akan menormalisasi otomatis agar penilai SMART valid.'
                                      : 'Total bobot ideal 100%. Rumus tidak membutuhkan pembagian normalisasi tambahan.'}
                                  </p>
                                </div>
                              </div>
                              {isWarning && (
                                <button
                                  onClick={handleNormalizeBobot}
                                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-mono text-[10px] font-bold rounded-lg uppercase tracking-wider"
                                >
                                  Normalisasi Sekarang
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* CRITERIA CARDS DENSE GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {kriteria.map((c) => (
                            <div
                              key={c.kode}
                              className={`rounded-2xl p-5 border shadow-sm hover:translate-y-[-2px] transition-all duration-200 ${
                                isDarkMode ? 'bg-slate-900/70 border-slate-850' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                      {c.kode}
                                    </span>
                                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                                      c.tipe === 'benefit' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                      {c.tipe}
                                    </span>
                                  </div>
                                  <h4 className="font-display font-semibold text-sm mt-2 text-white">{c.nama}</h4>
                                </div>
                              </div>

                              {/* Interactive Slider */}
                              <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/40">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-400">Pengaturan Bobot (%)</span>
                                  <span className="text-emerald-400 font-mono font-bold">{c.bobot.toFixed(1)}%</span>
                                </div>
                                
                                <input
                                  type="range"
                                  min="1"
                                  max="50"
                                  step="0.1"
                                  value={c.bobot}
                                  onChange={(e) => handleWeightChange(c.kode, parseFloat(e.target.value))}
                                  className="w-full accent-emerald-500 bg-slate-800/80 rounded-lg appearance-none h-1.5"
                                />

                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                  <span>Min (1.0%)</span>
                                  <span className="font-mono">Def: {c.defaultBobot}%</span>
                                  <span>Max (50.0%)</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       4. SKALA KRITERIA VIEW (Accordion or Card)
                       ========================================== */}
                    {activeTab === 'skala' && (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-teal-950 to-slate-900 border border-teal-500/20 p-5 rounded-3xl mb-4">
                          <h3 className="font-display font-medium text-lg">Skala Pembobotan Nilai Kriteria</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Semua alternatif dinilai menggunakan skala 1 sampai 5. Berikut pemetaan rentang parameter untuk setiap indikator pendukung kriteria kualitatif dan kuantitatif.
                          </p>
                        </div>

                        {/* Accordion List Layout */}
                        <div className="space-y-3">
                          {kriteria.map((c) => {
                            const isExpanded = expandedScale === c.kode;
                            const scales = skalaKriteria[c.kode] || [];

                            return (
                              <div
                                key={c.kode}
                                className={`rounded-2xl border overflow-hidden transition-all duration-250 ${
                                  isExpanded
                                    ? 'border-teal-500/40 shadow-md bg-slate-900/40'
                                    : isDarkMode ? 'border-slate-850 bg-slate-900/10' : 'border-slate-100 bg-white'
                                }`}
                              >
                                {/* Accordion Header */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedScale(isExpanded ? '' : c.kode)}
                                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/20 transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg">
                                      {c.kode}
                                    </span>
                                    <div>
                                      <h4 className="text-sm font-semibold">{c.nama}</h4>
                                      <span className="text-[10px] text-slate-500 uppercase font-mono">Tipe: {c.tipe}</span>
                                    </div>
                                  </div>
                                  <div className={`p-1.5 rounded-lg bg-slate-800/50 ${isExpanded ? 'rotate-180' : ''} transition-transform`}>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                                  </div>
                                </button>

                                {/* Accordion Body Content */}
                                {isExpanded && (
                                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/40">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-xs font-semibold text-slate-300">Tabel Parameter Skala Lokal</span>
                                      
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => triggerToast(`Tambah Skala pada ${c.kode} dipicu.`, 'info')}
                                          className="flex items-center gap-1.5 px-3 py-1 bg-teal-500 text-slate-950 font-semibold text-[10px] rounded-md hover:brightness-110 active:scale-95 transition-all"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Tambah Skala
                                        </button>
                                      </div>
                                    </div>

                                    {/* Parameter table view */}
                                    <div className="overflow-x-auto rounded-xl border border-slate-800/40">
                                      <table className="w-full text-left text-xs bg-slate-950/40">
                                        <thead>
                                          <tr className="bg-slate-900 border-b border-slate-800/60 text-slate-400">
                                            <th className="p-3 font-mono text-center w-16">Nilai</th>
                                            <th className="p-3 font-semibold">Tingkatan / Label</th>
                                            <th className="p-3 font-mono">Rentang Konteks Lapangan</th>
                                            <th className="p-3 text-center w-28">Operasi</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                          {scales.map((sc, index) => (
                                            <tr key={index} className="hover:bg-slate-900/30">
                                              <td className="p-3 text-center font-display font-medium text-teal-400">{sc.nilai}</td>
                                              <td className="p-3 font-medium text-slate-200">{sc.label}</td>
                                              <td className="p-3 font-mono text-slate-400">{sc.rentang}</td>
                                              <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <button
                                                    onClick={() => triggerToast(`Mengedit skala ${sc.label}`, 'info')}
                                                    className="px-2 py-0.5 hover:bg-slate-800 rounded font-semibold text-[10px] text-slate-300"
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    onClick={() => triggerToast(`Skala ${sc.label} berhasil dihapus.`, 'success')}
                                                    className="px-2 py-0.5 hover:bg-rose-500/10 rounded font-semibold text-[10px] text-rose-400"
                                                  >
                                                    Hapus
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-end gap-1.5">
                                      <button
                                        onClick={() => triggerToast(`Perubahan skala disimpan.`, 'success')}
                                        className="px-3.5 py-1.5 bg-slate-800 text-teal-400 hover:text-white rounded-lg text-xs font-semibold"
                                      >
                                        Simpan Perubahan
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       5. ALTERNATIF LOKASI VIEW
                       ========================================== */}
                    {activeTab === 'alternatif' && (
                      <div className="space-y-6">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/20 p-5 rounded-3xl">
                          <div>
                            <h3 className="text-xl font-display font-medium text-white">Alternatif Calon Lokasi Bank Sampah</h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Menampilkan 5 alternatif titik penempatan yang ada di Desa Purwosari lengkap dengan bobot nilai rill masing-masing kriteria.
                            </p>
                          </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Search className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Cari alternatif lokasi..."
                              className="w-full pl-9 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* CARDS LISTING FOR ALTERNATIVES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {alternatif
                            .filter(alt => alt.nama.toLowerCase().includes(searchQuery.toLowerCase()) || alt.id.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((alt) => {
                              const matchingScores = currentResults.find(r => r.alternative.id === alt.id);
                              return (
                                <div
                                  key={alt.id}
                                  className={`rounded-3xl border shadow-md overflow-hidden flex flex-col justify-between ${
                                    isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-200'
                                  }`}
                                >
                                  {/* Simulated Thumbnail of Location based on gradient designs */}
                                  <div className="h-32 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-900 p-4 relative flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                      <span className="px-2.5 py-0.5 bg-slate-950/70 border border-slate-800 text-[10px] text-emerald-400 font-mono rounded-lg">
                                        {alt.id}
                                      </span>
                                      {matchingScores && (
                                        <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-lg font-mono">
                                          Rank #{matchingScores.rank}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-display font-medium text-sm text-white line-clamp-1">{alt.nama}</h4>
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span>Purwosari, Bantul, DIY</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Rating indicators C1 to C5 */}
                                  <div className="p-5 space-y-3.5">
                                    <div className="grid grid-cols-5 gap-2 text-center">
                                      {(['C1', 'C2', 'C3', 'C4', 'C5'] as const).map(c => (
                                        <div key={c} className="p-2 rounded-xl bg-slate-950/50 border border-slate-850">
                                          <div className="text-[9px] text-slate-500 font-mono font-bold">{c}</div>
                                          <div className="text-sm font-bold text-indigo-400 font-display mt-0.5">{alt[c]}</div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Realtime Scores calculated */}
                                    <div className="pt-4 border-t border-slate-800/40 flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-medium">Skor SMART Akhir:</span>
                                      <span className="font-mono font-bold text-emerald-400 text-sm">
                                        {matchingScores ? matchingScores.totalScore.toFixed(3) : '0.00'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Compact operations buttons */}
                                  <div className="p-4 bg-slate-950/20 border-t border-slate-850 flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedAlternatif(alt);
                                        setDetailModalOpen(true);
                                      }}
                                      className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-750 active:scale-95 transition-all text-center cursor-pointer"
                                    >
                                      Detail Parameter
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingAlternatif(alt);
                                        setEditModalOpen(true);
                                      }}
                                      className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer"
                                    >
                                      Edit Nilai
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       6. SIMULASI SMART VIEW
                       ========================================== */}
                    {activeTab === 'simulasi' && (
                      <div className="space-y-6">
                        {/* Upper Header info */}
                        <div className="bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/20 p-5 rounded-3xl">
                          <h3 className="font-display font-medium text-lg">Simulasi SMART Real-Time</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Ubah slider bobot atau pilih preset skenario di bawah ini untuk melihat adaptabilitas perankingan lokasi secara instan.
                          </p>
                        </div>

                        {/* Interactive columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Column Left: Inputs / Sliders */}
                          <div className={`lg:col-span-5 rounded-3xl p-5 border shadow-sm space-y-5 flex flex-col justify-between ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-100'
                          }`}>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
                                <h4 className="font-semibold text-xs text-slate-300 uppercase tracking-wide">Faktor Bobot Penguji</h4>
                                <span className={`text-xs font-mono font-bold ${
                                  Math.abs(kriteria.reduce((s,c)=>s+c.bobot,0) - 100) > 0.5 ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  Total: {kriteria.reduce((sum, c) => sum + c.bobot, 0).toFixed(1)}%
                                </span>
                              </div>

                              {/* Presets Scenario Selector */}
                              <div className="space-y-2">
                                <span className="text-[10px] text-slate-400 font-mono block">Preset Skenario Penilai:</span>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {[
                                    { id: 'default', label: 'Default' },
                                    { id: 'jalan', label: 'Akses Jalan' },
                                    { id: 'lahan', label: 'Lahan ' },
                                    { id: 'sampah', label: 'Vol Sampah' },
                                    { id: 'reset', label: 'Merata (20%)' }
                                  ].map((pSet) => (
                                    <button
                                      key={pSet.id}
                                      onClick={() => handleApplyPreset(pSet.id)}
                                      className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700/80 text-teal-400 hover:text-white rounded-lg text-xs font-semibold text-center truncate font-mono border border-slate-750 transition-all cursor-pointer"
                                    >
                                      {pSet.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Simple slider rows */}
                              <div className="space-y-4 pt-2">
                                {kriteria.map((c) => (
                                  <div key={c.kode} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850/60">
                                    <div className="flex justify-between items-center text-[11px] mb-1">
                                      <span className="font-semibold font-mono text-slate-300">{c.kode} — {c.nama}</span>
                                      <span className="text-emerald-400 font-bold font-mono">{c.bobot.toFixed(1)}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="1"
                                      max="50"
                                      step="0.5"
                                      value={c.bobot}
                                      onChange={(e) => handleWeightChange(c.kode, parseFloat(e.target.value))}
                                      className="w-full accent-emerald-400 bg-slate-800 appearance-none h-1 rounded-full cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                const activeSum = kriteria.reduce((s,c)=>s+c.bobot,0);
                                const labels = kriteria.map(c => `${c.kode}:${c.bobot.toFixed(0)}%`).join(', ');
                                const item: Omit<RiwayatItem, 'id'> = {
                                  tanggal: new Date().toISOString().split('T')[0],
                                  namaSkenario: 'Skenario Kustom Pengguna',
                                  lokasiTerbaik: bestLocation?.nama || 'N/A',
                                  ringkasanBobot: labels
                                };
                                setRiwayat(prev => [
                                  { ...item, id: `R${Date.now()}` },
                                  ...prev
                                ]);
                                triggerToast('Simulasi disimpan ke Riwayat Penilai.', 'success');
                              }}
                              className="w-full py-2.5 bg-gradient-to-r from-emerald-50 to-emerald-200 text-slate-900 rounded-xl text-xs font-bold font-mono uppercase tracking-wide hover:brightness-110 active:scale-98 cursor-pointer transition-all mt-4"
                            >
                              Arsip Skenario Ini &rarr;
                            </button>
                          </div>

                          {/* Column Right: Visual Recharts & Winner Insights */}
                          <div className="lg:col-span-7 space-y-5">
                            {/* Visual chart */}
                            <div className={`rounded-3xl p-5 border shadow-sm ${
                              isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-100'
                            }`}>
                              <h4 className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold mb-4">Grafik Batang Skor Hasil SMART</h4>
                              
                              <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    layout="vertical"
                                    data={currentResults.map(r => ({ name: r.alternative.nama, skor: parseFloat(r.totalScore.toFixed(3)) }))}
                                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <XAxis type="number" domain={[0, 1.0]} stroke="#64748b" />
                                    <YAxis type="category" dataKey="name" width={110} stroke="#64748b" style={{ fontSize: '10px' }} />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                      labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Bar dataKey="skor" fill="#14b8a6" radius={[0, 8, 8, 0]} barSize={14}>
                                      {currentResults.map((entry, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={index === 0 ? '#10b981' : '#14b8a6'} // emerald for winner, teal for rest
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Rekomendasi Utama Insight Card */}
                            <div className="rounded-3xl p-5 border bg-gradient-to-r from-emerald-950 to-slate-900 border-emerald-500/30 text-emerald-200 shadow-lg glow-emerald">
                              <div className="flex items-center gap-3.5 mb-3">
                                <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl">
                                  <Award className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase block">Rekomendasi Utama Terpilih</span>
                                  <span className="font-display font-bold text-base block text-white">{bestLocation?.nama}</span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed mb-1">
                                <strong>{bestLocation?.nama}</strong> dinilai sebagai lokasi optimal saat ini dengan total skor <strong>{currentResults[0]?.totalScore.toFixed(3)}</strong>. 
                                Kondisi ini dipicu oleh keseimbangan nilai tinggi pada aspek infrastruktur jalan serta ketersediaan parameter prioritas kriteria.
                              </p>
                              <span className="text-[10px] text-slate-500 italic font-mono block mt-2">
                                *Dianalisis secara objektif menggunakan normalisasi data terbobot (Metode SMART SNI).
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       7. DETAIL PERHITUNGAN (Matriks dan Utility)
                       ========================================== */}
                    {activeTab === 'detail_perhitungan' && (
                      <div className="space-y-6">
                        {/* Upper Info */}
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 p-5 rounded-3xl">
                          <h3 className="font-display font-medium text-lg">Metodologi & Detail Matriks Perhitungan</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Langkah demi langkah transformasi nilai parameter kualitatif dan kuantitatif rill menjadi matriks utilitas rujukan SMART.
                          </p>
                        </div>

                        {/* Interactive Formulas layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { name: 'Rumus Kriteria Benefit', formula: 'Ui = (Ci - Cmin) / (Cmax - Cmin)', desc: 'Digunakan saat nilai kriteria semakin besar semakin mendukung dahan bank sampah.' },
                            { name: 'Rumus Kriteria Cost', formula: 'Ui = (Cmax - Ci) / (Cmax - Cmin)', desc: 'Digunakan saat nilai kriteria terkecil (seperti jarak pemukiman padat) paling ideal.' },
                            { name: 'Skor Preferensi SMART', formula: 'Total = ∑ (Ui × Bobot Normalisasi)', desc: 'Akumulasi skor utilitas dikali bobot normalisasi dari semua prioritas.' },
                          ].map((fCard, i) => (
                            <div key={i} className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl text-xs space-y-2">
                              <span className="font-bold text-slate-300 block">{fCard.name}</span>
                              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded inline-block font-bold">
                                {fCard.formula}
                              </span>
                              <p className="text-[10px] text-slate-500 leading-relaxed">{fCard.desc}</p>
                            </div>
                          ))}
                        </div>

                        {/* Tables showing the computations stages */}
                        <div className="space-y-5">
                          {/* STAGE 1: Decision Matrix */}
                          <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-200'}`}>
                            <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-widest font-mono mb-3">Langkah 1: Matriks Keputusan Asal</h4>
                            <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-900 text-slate-400">
                                    <th className="p-3">Kode</th>
                                    <th className="p-3">Nama Lokasi RW</th>
                                    <th className="p-3 text-center">C1 Kepadatan</th>
                                    <th className="p-3 text-center">C2 Akses jalan</th>
                                    <th className="p-3 text-center">C3 Jarak Kp (Cost)</th>
                                    <th className="p-3 text-center">C4 Lahan</th>
                                    <th className="p-3 text-center">C5 Volume</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {alternatif.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-900/20">
                                      <td className="p-3 font-mono text-emerald-400">{a.id}</td>
                                      <td className="p-3 font-medium text-slate-200">{a.nama}</td>
                                      <td className="p-3 text-center font-mono">{a.C1}</td>
                                      <td className="p-3 text-center font-mono">{a.C2}</td>
                                      <td className="p-3 text-center font-mono text-rose-400">{a.C3}</td>
                                      <td className="p-3 text-center font-mono">{a.C4}</td>
                                      <td className="p-3 text-center font-mono">{a.C5}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* STAGE 2: Utility values */}
                          <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-200'}`}>
                            <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-widest font-mono mb-3 animate-pulse">Langkah 2: Transformasi Utilitas (Utility Matrix)</h4>
                            <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-900 text-slate-400">
                                    <th className="p-3">Kode</th>
                                    <th className="p-3 text-center">U_C1 Benefit</th>
                                    <th className="p-3 text-center">U_C2 Benefit</th>
                                    <th className="p-3 text-center">U_C3 Cost</th>
                                    <th className="p-3 text-center">U_C4 Benefit</th>
                                    <th className="p-3 text-center">U_C5 Benefit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {currentResults.map(r => (
                                    <tr key={r.alternative.id} className="hover:bg-slate-900/20">
                                      <td className="p-3 font-mono text-teal-400">{r.alternative.id}</td>
                                      <td className="p-3 text-center font-mono">{r.utilities.C1.toFixed(3)}</td>
                                      <td className="p-3 text-center font-mono">{r.utilities.C2.toFixed(3)}</td>
                                      <td className="p-3 text-center font-mono text-rose-400">{r.utilities.C3.toFixed(3)}</td>
                                      <td className="p-3 text-center font-mono">{r.utilities.C4.toFixed(3)}</td>
                                      <td className="p-3 text-center font-mono">{r.utilities.C5.toFixed(3)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       8. ANALISIS SENSITIVITAS VIEW (Radar graph)
                       ========================================== */}
                    {activeTab === 'analisis_sensitivitas' && (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-teal-950 to-slate-900 border border-teal-500/10 p-5 rounded-3xl">
                          <h3 className="font-display font-medium text-lg">Analisis Sensitivitas Bobot SMART</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Memahami seberapa kuat posisi Balai Desa (A2) versus Dekat Lapangan (A3) jika salah satu pilar kriteria didongkrak secara dramatis.
                          </p>
                        </div>

                        {/* Sensitivity cards simulator */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {[
                            { name: 'Skenario Kebebasan Jalan +10%', mod: { C2: 10 }, info: 'Mendongkrak bobot Aksesibilitas Jalan C2.' },
                            { name: 'Skenario Lahan Melimpah +20%', mod: { C4: 20 }, info: 'Meningkatkan bobot Ketersediaan Lahan C4.' },
                            { name: 'Sektor Volume Tinggi +15%', mod: { C5: 15 }, info: 'Menaikkan signifikansi Kriteria Volume Sampah C5.' },
                          ].map((scen, idx) => {
                            const changedRankings = getSensitivityRankings(scen.mod);
                            const originalWinner = bestLocation?.nama;
                            const mutatedWinner = changedRankings[0]?.alternative?.nama;

                            return (
                              <div
                                key={idx}
                                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-850 hover:border-slate-700 transition-all flex flex-col justify-between"
                              >
                                <div>
                                  <span className="text-[10px] text-teal-400 font-mono block mb-1 uppercase font-bold">Simulasi #{idx + 1}</span>
                                  <h4 className="font-semibold text-sm mb-1">{scen.name}</h4>
                                  <p className="text-[10px] text-slate-500 mb-4">{scen.info}</p>
                                </div>

                                <div className="p-3 bg-slate-950/60 rounded-xl space-y-2 text-xs font-mono">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Pemenang Asal:</span>
                                    <span className="text-slate-300 truncate font-semibold">{originalWinner}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Pemenang Baru:</span>
                                    <span className="text-emerald-400 truncate font-bold">{mutatedWinner}</span>
                                  </div>
                                  <div className="pt-2 border-t border-slate-800 text-[10px] text-center">
                                    {originalWinner === mutatedWinner 
                                      ? '✅ Struktur peringkat stabil' 
                                      : '🔄 Peringkat bergeser sensitif!'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* RADAR CHART COMPARISON */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div className={`lg:col-span-7 rounded-3xl p-5 border shadow-sm ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-100'
                          }`}>
                            <h4 className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold mb-4">Grafik Radar Perbandingan Profil A2 vs A3</h4>
                            
                            <div className="h-[260px] w-full flex justify-center">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                  { subject: 'Kepadatan (C1)', A2: 5, A3: 4 },
                                  { subject: 'Akses Jalan (C2)', A2: 5, A3: 3 },
                                  { subject: 'Jarak Pemukiman (C3)', A2: 5, A3: 3 },
                                  { subject: 'Lahan (C4)', A2: 2, A3: 4 },
                                  { subject: 'Volume Sampah (C5)', A2: 5, A3: 3 },
                                ]}>
                                  <PolarGrid stroke="#334155" />
                                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                                  <Radar name="A2 - Balai Desa" dataKey="A2" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                  <Radar name="A3 - Lapangan V" dataKey="A3" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="lg:col-span-5 space-y-4">
                            <h4 className="font-display font-semibold text-base text-white">Analisis Sensitif Kualitatif</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Dari grafik radar di atas, terlihat jelas mengapa Balai Desa (A2) mendominasi sebagian besar sektor, namun sangat ringkih pada kriteria <strong>Ketersediaan Lahan (C4)</strong> di mana A3 (Lapangan) jauh lebih unggul dengan skala 4 berbanding 2.
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-850">
                              <em>Insight Realtime:</em> Jika bobot <strong>Ketersediaan Lahan (C4)</strong> dinaikkan di atas 40%, Lapangan Jl Gn Slamet V (A3) berpotensi kuat membalap peringkat Balai Desa (A2) sebagai titik penampungan bank sampah baru.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       9. RIWAYAT SIMULASI VIEW
                       ========================================== */}
                    {activeTab === 'riwayat' && (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/10 p-5 rounded-3xl">
                          <h3 className="font-display font-medium text-lg">Riwayat Analisis & Rekomendasi</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Daftar rekam jejak pengujian skenario yang disimpan secara lokal oleh pengelola sistem Desa Purwosari.
                          </p>
                        </div>

                        {/* Riwayat Timeline Grid */}
                        <div className="space-y-4">
                          {riwayat.map((rwItem) => (
                            <div
                              key={rwItem.id}
                              className={`rounded-2xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-900/30 ${
                                isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-1">
                                  <History className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-slate-500 block">{rwItem.tanggal}</span>
                                  <h4 className="font-semibold text-sm text-white">{rwItem.namaSkenario}</h4>
                                  <p className="text-[11px] text-slate-400 mt-1">Bobot: <span className="font-mono">{rwItem.ringkasanBobot}</span></p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 justify-between border-t md:border-t-0 border-slate-800/40 pt-3 md:pt-0 shrink-0">
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Pemenang SMART</span>
                                  <span className="text-xs font-semibold text-emerald-400 font-display">{rwItem.lokasiTerbaik}</span>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      // Load historical weights
                                      const parts = rwItem.ringkasanBobot.split(', ').map(p => {
                                        const [code, val] = p.split(':');
                                        return { kode: code.trim(), pct: parseFloat(val) || 20 };
                                      });
                                      setKriteria(prev =>
                                        prev.map(c => {
                                          const part = parts.find(p => p.kode === c.kode);
                                          return part ? { ...c, bobot: part.pct } : c;
                                        })
                                      );
                                      triggerToast('Skenario simulasi lama diaktifkan kembali.', 'success');
                                      setActiveTab('simulasi');
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500 text-slate-900 rounded-xl text-xs font-bold font-mono transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                                  >
                                    Gunakan
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRiwayat(prev => prev.filter(i => i.id !== rwItem.id));
                                      triggerToast('Riwayat berhasil dihapus.', 'info');
                                    }}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-xl"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* ==========================================
                       10. EXPORT LAPORAN VIEW
                       ========================================== */}
                    {activeTab === 'export_laporan' && (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/10 p-5 rounded-3xl">
                          <h3 className="font-display font-medium text-lg">Dokumen Laporan & Rekapitulasi</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Cetak laporan resmi hasil pengujian kriteria SMART untuk kebutuhan Rapat Musyawarah Perencanaan Desa (Musrenbangdes).
                          </p>
                        </div>

                        {/* Printable visual frame card wrapper */}
                        <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6 max-w-4xl mx-auto border border-slate-300">
                          {/* Letterhead */}
                          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
                            <h2 className="text-xs uppercase tracking-widest font-mono font-black text-emerald-700">Pemerintah Kabupaten Bantul</h2>
                            <h3 className="text-base font-bold uppercase font-display text-slate-850">Kantor Kepala Desa Purwosari</h3>
                            <p className="text-[9px] text-slate-500 font-mono">Jl. Parangtritis Km 21, Purwosari, Bantul, DIY — Kode Pos 55781</p>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 uppercase">Perihal Penentuan Lokasi Bank Sampah</h4>
                                <span className="text-[10px] text-slate-500 font-mono">ID Penilaian: SMART-PRWSRI-2026-A</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono text-right">
                                Tanggal: 24 Mei 2026
                              </span>
                            </div>

                            {/* Brief weights report table */}
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">1. Pembobotan Normalisasi Kriteria</span>
                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600">
                                      <th className="p-2 font-mono">C1</th>
                                      <th className="p-2 font-mono">C2</th>
                                      <th className="p-2 font-mono">C3</th>
                                      <th className="p-2 font-mono">C4</th>
                                      <th className="p-2 font-mono">C5</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="font-mono text-slate-800">
                                      <td className="p-2">{kriteria.find(c=>c.kode==='C1')?.bobot}%</td>
                                      <td className="p-2">{kriteria.find(c=>c.kode==='C2')?.bobot}%</td>
                                      <td className="p-2">{kriteria.find(c=>c.kode==='C3')?.bobot}%</td>
                                      <td className="p-2">{kriteria.find(c=>c.kode==='C4')?.bobot}%</td>
                                      <td className="p-2">{kriteria.find(c=>c.kode==='C5')?.bobot}%</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Final rankings display list */}
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">2. Hasil Pemeringkatan Prioritas Lokasi</span>
                              <div className="space-y-1.5 text-xs text-slate-800">
                                {currentResults.map((itm, i) => (
                                  <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
                                    <div className="flex gap-2">
                                      <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        Peringkat {i+1}
                                      </span>
                                      <span className="font-medium">{itm.alternative.nama}</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-700">Skor: {itm.totalScore.toFixed(3)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Dynamic conclusion message */}
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 leading-relaxed">
                              <strong>Kesimpulan & Rekomendasi:</strong> Melalui formulasi SMART (Simple Multi-Attribute Rating Technique), calon lokasi terbaik yang diajukan untuk pembangunan Bank Sampah Desa Purwosari adalah <strong>{bestLocation?.nama}</strong> dengan bobot rill maksimal.
                            </div>
                          </div>

                          {/* Signatures */}
                          <div className="pt-8 flex justify-end">
                            <div className="text-center text-xs space-y-12">
                              <div>
                                <p className="text-[10px] text-slate-500 font-mono">Mengetahui & Menyetujui,</p>
                                <p className="font-bold text-slate-850">Kepala Desa Purwosari</p>
                              </div>
                              <div>
                                <div className="w-32 border-b border-slate-900 mx-auto" />
                                <p className="text-[10px] text-slate-500 font-mono mt-1">NIP. 19741021 200212 1 003</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PDF / EXCEL ACTION BUTTONS */}
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => handleExport('PDF')}
                            className="px-5 py-2.5 bg-emerald-500 hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
                          >
                            <Download className="w-4 h-4" />
                            Ekspor Ke PDF
                          </button>
                          <button
                            onClick={() => handleExport('Excel')}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                          >
                            <FileText className="w-4 h-4" />
                            Unduh Excel
                          </button>
                          <button
                            onClick={() => {
                              window.print();
                              triggerToast('Membuka dialog pencetakan browser.', 'info');
                            }}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                          >
                            <Printer className="w-4 h-4" />
                            Cetak Dokumen
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>

            {/* Mobile Menu Slide-Over Overlay */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="w-64 max-w-[80vw] h-full bg-slate-950 p-5 flex flex-col justify-between border-r border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-emerald-400">Purwosari SMART</span>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        {[
                          { id: 'dashboard', label: 'Dashboard', icon: Layers },
                          { id: 'kriteria', label: 'Data Kriteria', icon: Sliders },
                          { id: 'skala', label: 'Skala Kriteria', icon: Scale },
                          { id: 'alternatif', label: 'Alternatif Lokasi', icon: MapPin },
                          { id: 'simulasi', label: 'Simulasi SMART', icon: BarChart3 },
                          { id: 'detail_perhitungan', label: 'Detail Hitung', icon: Scale },
                          { id: 'analisis_sensitivitas', label: 'Analisis Sensitif', icon: TrendingUp },
                          { id: 'riwayat', label: 'Riwayat', icon: History },
                          { id: 'export_laporan', label: 'Export Laporan', icon: FileText },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                                  : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              <span className="text-sm">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-800/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-750 flex items-center justify-center font-bold text-xs text-emerald-400">
                        {currentUser?.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{currentUser?.name}</p>
                        <span className="text-[10px] text-slate-500">{currentUser?.role}</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>


            {/* =======================================================
               11. MODAL DETAIL ALTERNATIF
               ======================================================= */}
            <AnimatePresence>
              {detailModalOpen && selectedAlternatif && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
                  >
                    {/* Header close button */}
                    <button
                      onClick={() => setDetailModalOpen(false)}
                      className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      ID Alternatif: {selectedAlternatif.id}
                    </span>
                    <h3 className="font-display font-medium text-lg mt-2 text-white">{selectedAlternatif.nama}</h3>
                    <p className="text-xs text-slate-400 mb-5">
                      Nilai parameter input aktual yang terdaftar pada sistem pendukung keputusan purwosari:
                    </p>

                    <div className="space-y-4">
                      {kriteria.map((c) => {
                        const key = c.kode as keyof Alternatif;
                        const ratingValue = selectedAlternatif[key] as number;
                        
                        // Find matching scale text
                        const scales = skalaKriteria[c.kode] || [];
                        const matchedScale = scales.find(s => s.nilai === ratingValue);

                        return (
                          <div key={c.kode} className="p-3 bg-slate-950/50 rounded-2xl border border-slate-850 flex items-center justify-between gap-4">
                            <div>
                              <span className="font-mono text-[10px] text-teal-400 font-bold block">{c.kode} — {c.nama}</span>
                              <span className="text-xs text-slate-300 font-medium">
                                {matchedScale ? `${matchedScale.label} (${matchedScale.rentang})` : 'N/A scale'}
                              </span>
                            </div>
                            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-sm font-black font-display">
                              {ratingValue}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-end">
                      <button
                        onClick={() => setDetailModalOpen(false)}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold"
                      >
                        Tutup Detail
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>


            {/* =======================================================
               12. MODAL FORM: EDIT ALTERNATIF VALUES
               ======================================================= */}
            <AnimatePresence>
              {editModalOpen && editingAlternatif && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                  >
                    <button
                      onClick={() => setEditModalOpen(false)}
                      className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Modifikasi Nilai Kriteria
                    </span>
                    <h3 className="font-display font-medium text-lg mt-2 text-white">{editingAlternatif.nama}</h3>
                    <p className="text-xs text-slate-400 mb-5">
                      Silakan sesuaikan skala penilai kriteria (1 - 5) untuk mengubah skor SMART secara instan.
                    </p>

                    <form onSubmit={handleSaveAlternatifEdit} className="space-y-4">
                      {kriteria.map((c) => {
                        const key = c.kode as keyof Omit<Alternatif, 'id' | 'nama'>;
                        const parentScales = skalaKriteria[c.kode] || [];

                        return (
                          <div key={c.kode} className="space-y-2 p-3 bg-slate-950/40 rounded-2xl border border-slate-850">
                            <label className="block text-[11px] font-mono text-slate-300 font-bold uppercase">
                              {c.kode} — {c.nama} ({c.tipe})
                            </label>
                            
                            <select
                              value={editingAlternatif[key]}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setEditingAlternatif(prev => prev ? ({ ...prev, [key]: val }) : null);
                              }}
                              className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {parentScales.map((scaleOption) => (
                                <option key={scaleOption.nilai} value={scaleOption.nilai}>
                                  Skala {scaleOption.nilai} — {scaleOption.label} ({scaleOption.rentang})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}

                      <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditModalOpen(false)}
                          className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:text-white"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 duration-100"
                        >
                          Perbarui Nilai
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Minimal placeholder icons to ensure smooth JSX rendering
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
