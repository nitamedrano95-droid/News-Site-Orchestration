import React, { useState, useEffect } from 'react';
import { Download, LayoutTemplate, Type, Square, Maximize, MousePointer2, TextCursorInput, Check, AlertCircle, CheckCircle2, Info, ShieldAlert, Newspaper, TrendingUp, Wallet, Clock, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';

// --- DATA: Las 50 Paletas ---
const PALETTES = [
  { id: 1, name: 'Obsidian Citadel', base: '#0a0a0a', accent: '#4a90e2' },
  { id: 2, name: 'Iron Vault', base: '#121212', accent: '#d4a574' },
  { id: 3, name: 'Granite Sovereign', base: '#0f1414', accent: '#8a9a8c' },
  { id: 4, name: 'Cobalt Bastion', base: '#111111', accent: '#4a7cff' },
  { id: 5, name: 'Bronze Monolith', base: '#141010', accent: '#cd7f32' },
  { id: 6, name: 'Slate Emperor', base: '#0d1212', accent: '#6b7280' },
  { id: 7, name: 'Onyx Fortress', base: '#080808', accent: '#1e3a8a' },
  { id: 8, name: 'Steel Titan', base: '#101010', accent: '#9ca3af' },
  { id: 9, name: 'Marble Authority', base: '#0e0e0e', accent: '#64748b' },
  { id: 10, name: 'Basalt Keeper', base: '#0b0f0f', accent: '#334155' },
  { id: 11, name: 'Titanium Core', base: '#121212', accent: '#f59e0b' },
  { id: 12, name: 'Quartz Vault', base: '#0f1414', accent: '#ec4899' },
  { id: 13, name: 'Flint Bastion', base: '#111111', accent: '#06b6d4' },
  { id: 14, name: 'Lava Monolith', base: '#1a0f0f', accent: '#ef4444' },
  { id: 15, name: 'Jade Citadel', base: '#0a1212', accent: '#10b981' },
  { id: 16, name: 'Sapphire Sovereign', base: '#0d0d0d', accent: '#3b82f6' },
  { id: 17, name: 'Ruby Emperor', base: '#100f0f', accent: '#f43f5e' },
  { id: 18, name: 'Emerald Titan', base: '#0e1212', accent: '#059669' },
  { id: 19, name: 'Amethyst Fortress', base: '#0b1111', accent: '#8b5cf6' },
  { id: 20, name: 'Topaz Keeper', base: '#121010', accent: '#eab308' },
  { id: 21, name: 'Platinum Vault', base: '#0f0f0f', accent: '#d1d5db' },
  { id: 22, name: 'Carbon Bastion', base: '#111212', accent: '#14b8a6' },
  { id: 23, name: 'Silicon Monolith', base: '#0a0f0f', accent: '#f97316' },
  { id: 24, name: 'Uranium Citadel', base: '#141111', accent: '#8b4513' },
  { id: 25, name: 'Neon Sovereign', base: '#0d1212', accent: '#ec4899' },
  { id: 26, name: 'Plasma Emperor', base: '#101010', accent: '#06b6d4' },
  { id: 27, name: 'Quantum Titan', base: '#0e0e0e', accent: '#f59e0b' },
  { id: 28, name: 'Fusion Fortress', base: '#0b0f0f', accent: '#10b981' },
  { id: 29, name: 'Stellar Vault', base: '#121212', accent: '#3b82f6' },
  { id: 30, name: 'Cosmic Keeper', base: '#0f1414', accent: '#ef4444' },
  { id: 31, name: 'Void Bastion', base: '#080808', accent: '#1e40af' },
  { id: 32, name: 'Abyss Monolith', base: '#0a0a0a', accent: '#7c3aed' },
  { id: 33, name: 'Eclipse Citadel', base: '#111111', accent: '#f43f5e' },
  { id: 34, name: 'Nebula Sovereign', base: '#0d0d0d', accent: '#14b8a6' },
  { id: 35, name: 'Aurora Emperor', base: '#101010', accent: '#eab308' },
  { id: 36, name: 'Zenith Titan', base: '#0e1212', accent: '#ec4899' },
  { id: 37, name: 'Apex Fortress', base: '#0b1111', accent: '#06b6d4' },
  { id: 38, name: 'Summit Vault', base: '#121010', accent: '#10b981' },
  { id: 39, name: 'Pinnacle Keeper', base: '#0f0f0f', accent: '#f59e0b' },
  { id: 40, name: 'Vertex Bastion', base: '#111212', accent: '#8b5cf6' },
  { id: 41, name: 'Chromium Monolith', base: '#0a1212', accent: '#d1d5db' },
  { id: 42, name: 'Rhodium Citadel', base: '#141414', accent: '#9ca3af' },
  { id: 43, name: 'Iridium Sovereign', base: '#0d1111', accent: '#6b7280' },
  { id: 44, name: 'Osmium Emperor', base: '#100f0f', accent: '#4b5563' },
  { id: 45, name: 'Rhenium Titan', base: '#0e0e0e', accent: '#374151' },
  { id: 46, name: 'Tungsten Fortress', base: '#0b0f0f', accent: '#1f2937' },
  { id: 47, name: 'Molybdenum Vault', base: '#121212', accent: '#111827' },
  { id: 48, name: 'Niobium Keeper', base: '#0f1414', accent: '#1e1e2e' },
  { id: 49, name: 'Tantalum Bastion', base: '#111111', accent: '#18181b' },
  { id: 50, name: 'Hafnium Monolith', base: '#0a0f0f', accent: '#0f0f0f' }
];

// --- VARIABLES DE DISEÑO EXPANDIDAS ---
const TYPOGRAPHIES = [
  { id: 'inter', name: 'Inter (The Authority)', family: 'system-ui, -apple-system, sans-serif' },
  { id: 'space', name: 'Space Grotesk (The Brutalist)', family: '"Space Grotesk", sans-serif' },
  { id: 'mono', name: 'JetBrains Mono (The Terminal)', family: 'monospace' },
  { id: 'serif', name: 'Playfair (The Imperial)', family: 'Georgia, serif' },
  { id: 'montserrat', name: 'Montserrat (The Modernist)', family: '"Montserrat", sans-serif' },
  { id: 'fira', name: 'Fira Code (The Developer)', family: '"Fira Code", monospace' },
  { id: 'helvetica', name: 'Helvetica Neue (The Classic)', family: '"Helvetica Neue", Helvetica, Arial, sans-serif' }
];

const CORNER_RADIUS = [
  { id: '0px', name: '0px (Absolute Monolith)', value: '0px' },
  { id: '2px', name: '2px (Micro-bevel)', value: '2px' },
  { id: '4px', name: '4px (Soft Structural)', value: '4px' },
  { id: '8px', name: '8px (Corporate)', value: '8px' },
  { id: '12px', name: '12px (Modern Web)', value: '12px' },
  { id: '16px', name: '16px (App Style)', value: '16px' },
  { id: '99px', name: 'Pill (Fully Rounded)', value: '9999px' }
];

const BORDERS = [
  { id: 'none', name: 'No-Line (Depth only)', desc: 'Sin bordes, separación por color' },
  { id: 'ghost', name: 'Ghost (15% Opacity)', desc: 'Borde sutil semitransparente' },
  { id: 'solid', name: 'Solid Structural', desc: 'Línea de 1px usando el color de acento' },
  { id: 'dashed', name: 'Dashed Wireframe', desc: 'Borde punteado para zonas de interacción' },
  { id: 'glow', name: 'Neon Glow Effect', desc: 'Sombra exterior brillante que simula borde' }
];

const BUTTONS = [
  { id: 'gradient', name: 'Tectonic Gradient', desc: 'Gradiente vertical metálico' },
  { id: 'solid', name: 'Solid Block', desc: 'Bloque de color de acento puro' },
  { id: 'ghost', name: 'Ghost Outlined', desc: 'Transparente con borde de acento' },
  { id: 'tonal', name: 'Soft Tonal', desc: 'Color de acento al 15% de opacidad' },
  { id: 'glow', name: 'Energy Glow', desc: 'Fondo sólido con resplandor exterior' }
];

const INPUTS = [
  { id: 'underline', name: 'Recessed (Bottom Line)', desc: 'Fondo oscuro, línea inferior al enfocar' },
  { id: 'outline', name: 'Carved (Full Outline)', desc: 'Borde completo al interactuar' },
  { id: 'filled', name: 'Invisible (Fill Only)', desc: 'Solo cambio de color de fondo' },
  { id: 'glass', name: 'Glassmorphism', desc: 'Fondo semitransparente oscuro' }
];

// Datos Simulados para el Ticker
const MARKET_DATA = [
  { symbol: 'BTC/USD', price: '94,230.50', change: '+5.42%', up: true },
  { symbol: 'ETH/USD', price: '3,105.20', change: '-1.20%', up: false },
  { symbol: 'S&P 500', price: '5,120.45', change: '+0.85%', up: true },
  { symbol: 'NASDAQ', price: '16,240.10', change: '+1.12%', up: true },
  { symbol: 'GLD', price: '2,340.80', change: '+0.15%', up: true },
  { symbol: 'TSLA', price: '185.40', change: '-3.45%', up: false },
  { symbol: 'NVDA', price: '890.20', change: '+4.20%', up: true },
];

// Utilidades de color avanzadas para Psicología de Color Dinámica
const hexToHsl = (hex) => {
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const shiftHue = (baseH, targetH, percent, maxShift) => {
    let diff = targetH - baseH;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let shift = diff * percent;
    if (shift > maxShift) shift = maxShift;
    if (shift < -maxShift) shift = -maxShift;
    let newH = baseH + shift;
    if (newH < 0) newH += 360;
    if (newH >= 360) newH -= 360;
    return newH;
};

const generateSemanticColors = (accentHex) => {
   const accentHsl = hexToHsl(accentHex);
   const bases = {
       success: { h: 145, s: 75, l: 45, maxShift: 25 },
       warning: { h: 35,  s: 90, l: 50, maxShift: 15 },
       error:   { h: 0,   s: 80, l: 55, maxShift: 15 },
       info:    { h: 210, s: 90, l: 55, maxShift: 25 } 
   };

   const blendSat = (baseS, targetS) => baseS + ((targetS - baseS) * 0.3);
   const blendLight = (baseL, targetL) => baseL + ((targetL - baseL) * 0.15);

   return {
       success: hslToHex(shiftHue(bases.success.h, accentHsl.h, 0.3, bases.success.maxShift), Math.min(100, blendSat(bases.success.s, accentHsl.s)), blendLight(bases.success.l, accentHsl.l)),
       warning: hslToHex(shiftHue(bases.warning.h, accentHsl.h, 0.3, bases.warning.maxShift), Math.min(100, blendSat(bases.warning.s, accentHsl.s)), blendLight(bases.warning.l, accentHsl.l)),
       error: hslToHex(shiftHue(bases.error.h, accentHsl.h, 0.3, bases.error.maxShift), Math.min(100, blendSat(bases.error.s, accentHsl.s)), blendLight(bases.error.l, accentHsl.l)),
       info: hslToHex(shiftHue(bases.info.h, accentHsl.h, 0.3, bases.info.maxShift), Math.min(100, blendSat(bases.info.s, accentHsl.s)), blendLight(bases.info.l, accentHsl.l))
   };
};

const hexToRgb = (hex) => {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);
  return {r, g, b};
};

const lightenHex = (hex, amount) => {
  let {r, g, b} = hexToRgb(hex);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
};

const hexOpacity = (hex, opacity) => {
  let {r, g, b} = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function App() {
  const [previewMode, setPreviewMode] = useState('markets'); // 'transaction' or 'markets'
  const [config, setConfig] = useState({
    palette: PALETTES[0],
    typography: TYPOGRAPHIES[0],
    radius: CORNER_RADIUS[0],
    border: BORDERS[0],
    button: BUTTONS[0],
    input: INPUTS[0]
  });
  const [copied, setCopied] = useState(false);

  // --- GENERACIÓN DEL SISTEMA DE COLORES COMPLETO ---
  const semantics = generateSemanticColors(config.palette.accent);
  
  const colors = {
    base: config.palette.base,
    surfaceLow: lightenHex(config.palette.base, 8),
    surfaceMid: lightenHex(config.palette.base, 16),
    surfaceHigh: lightenHex(config.palette.base, 24),
    surfaceHighest: lightenHex(config.palette.base, 32),
    primary: config.palette.accent,
    primaryHover: lightenHex(config.palette.accent, 20),
    primaryTonal: hexOpacity(config.palette.accent, 0.15),
    success: semantics.success,
    successBg: hexOpacity(semantics.success, 0.1),
    warning: semantics.warning,
    warningBg: hexOpacity(semantics.warning, 0.1),
    error: semantics.error,
    errorBg: hexOpacity(semantics.error, 0.1),
    info: semantics.info,
    infoBg: hexOpacity(semantics.info, 0.1),
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.65)',
    textDisabled: 'rgba(255, 255, 255, 0.38)',
    borderSubtle: 'rgba(255, 255, 255, 0.12)'
  };

  // Generador de Markdown Extendido
  const generateMarkdown = () => {
    const md = `
# Design System: ${config.palette.name}
**Strategy: The Sovereign Monolith - News & Markets Edition**

---

## 1. Core Identity & Atmosphere
* **Theme Name:** ${config.palette.name}
* **Base Philosophy:** Rigidez institucional, alta densidad de información editorial y financiera.
* **Typography Foundation:** ${config.typography.name}

## 2. Global Functional Colors
* \`Surface Base\`: **${colors.base}**
* \`Surface Container Low\`: **${colors.surfaceLow}**
* \`Primary Accent\`: **${colors.primary}**
* \`Semantic Success (Bull Market)\`: **${colors.success}**
* \`Semantic Error (Bear Market)\`: **${colors.error}**

## 3. Structural Directives
* **Corner Radius Global:** \`${config.radius.name}\` (${config.radius.value}).
* **Border Strategy:** \`${config.border.name}\`

## 4. Financial & Editorial Widgets

### Market Tickers
* *Directive:* Los tickers deben usar \`Surface Container Low\` como fondo base. El cambio porcentual dictamina el color semántico (Éxito o Error). 
* *Typography:* Usar fuentes monoespaciadas para valores numéricos si la familia principal lo permite, o asegurar alineación tabular.

### Editorial / News Cards
* *Directive:* Las imágenes de portada deben heredar el radio de borde global (\`${config.radius.value}\`).
* *Layout:* El meta-dato (ej. "MERCADOS", "HACE 2H") debe usar \`Primary Accent\` en tamaño \`xs\` con tracking amplio. El titular usa el color \`Text Primary\` en peso Bold.

---
*System generated by The Monolith Builder v5.0 | sebastianvernis@gmail.com*
`;
    return md;
  };

  const handleExportMarkdown = () => {
    const mdContent = generateMarkdown();
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DS_News_${config.palette.name.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ESTILOS DINÁMICOS
  const previewStyles = {
    fontFamily: config.typography.family,
    backgroundColor: colors.base,
    color: colors.textPrimary,
  };

  const getBorderValue = () => {
    if (config.border.id === 'none') return 'none';
    if (config.border.id === 'ghost') return `1px solid ${colors.borderSubtle}`;
    if (config.border.id === 'dashed') return `1px dashed ${colors.borderSubtle}`;
    if (config.border.id === 'glow') return 'none';
    return `1px solid ${colors.primary}`;
  };

  const cardStyles = {
    backgroundColor: colors.surfaceLow,
    borderRadius: config.radius.value,
    border: getBorderValue(),
    boxShadow: config.border.id === 'glow' ? `0 0 15px ${hexOpacity(colors.primary, 0.15)}` : 'none',
    overflow: 'hidden'
  };

  const getButtonStyles = (isPrimary) => {
    const baseBtn = {
      borderRadius: config.radius.value,
      padding: '0.75rem 1.5rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem'
    };

    if (!isPrimary) {
      return {
        ...baseBtn,
        backgroundColor: 'transparent',
        border: `1px solid ${config.border.id === 'solid' ? colors.primary : colors.borderSubtle}`,
        color: colors.textPrimary
      };
    }

    switch (config.button.id) {
      case 'gradient': return { ...baseBtn, background: `linear-gradient(135deg, ${colors.primary}, ${colors.surfaceHigh})`, color: '#000', border: 'none' };
      case 'ghost': return { ...baseBtn, backgroundColor: 'transparent', border: `1px solid ${colors.primary}`, color: colors.primary };
      case 'tonal': return { ...baseBtn, backgroundColor: colors.primaryTonal, color: colors.primary, border: 'none' };
      case 'glow': return { ...baseBtn, backgroundColor: colors.primary, color: '#000', border: 'none', boxShadow: `0 0 20px ${hexOpacity(colors.primary, 0.4)}` };
      case 'solid':
      default: return { ...baseBtn, backgroundColor: colors.primary, color: '#000', border: 'none' };
    }
  };

  const getInputStyles = () => {
    const baseInput = {
      width: '100%',
      padding: '0.875rem',
      backgroundColor: config.input.id === 'glass' ? hexOpacity(colors.surfaceHigh, 0.5) : colors.surfaceHigh,
      backdropFilter: config.input.id === 'glass' ? 'blur(10px)' : 'none',
      color: colors.textPrimary,
      borderRadius: config.radius.id === '0px' || config.input.id === 'underline' ? '0px' : config.radius.value,
      outline: 'none',
      transition: 'all 0.2s',
      fontSize: '0.875rem'
    };

    switch (config.input.id) {
      case 'outline': return { ...baseInput, border: `1px solid ${colors.borderSubtle}` };
      case 'filled': case 'glass': return { ...baseInput, border: 'none' };
      case 'underline':
      default: return { ...baseInput, border: 'none', borderBottom: `2px solid ${colors.borderSubtle}` };
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col lg:flex-row overflow-hidden">
      
      {/* SIDEBAR CON CONTROLES (Left Panel) */}
      <div className="w-full lg:w-[380px] h-screen overflow-y-auto border-r border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-6 hide-scrollbar z-20 shadow-2xl">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Monolith Builder v5</h1>
          <p className="text-xs text-neutral-500">Sistema Generativo de Sitios Completos</p>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-neutral-950 p-1 rounded-md flex gap-1 border border-neutral-800">
          <button 
            onClick={() => setPreviewMode('markets')}
            className={`flex-1 py-2 px-3 text-xs font-semibold flex items-center justify-center gap-2 rounded transition-colors ${previewMode === 'markets' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}
          >
            <Newspaper size={14} /> Noticias & Mercados
          </button>
          <button 
            onClick={() => setPreviewMode('transaction')}
            className={`flex-1 py-2 px-3 text-xs font-semibold flex items-center justify-center gap-2 rounded transition-colors ${previewMode === 'transaction' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}
          >
            <Wallet size={14} /> Transaccional
          </button>
        </div>

        {/* Palette Selector */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
            <LayoutTemplate size={14} /> Paleta Base (50 opciones)
          </label>
          <select 
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-sm focus:border-neutral-500 outline-none transition-colors cursor-pointer"
            value={config.palette.id}
            onChange={(e) => setConfig({...config, palette: PALETTES.find(p => p.id === parseInt(e.target.value))})}
          >
            {PALETTES.map(p => (
              <option key={p.id} value={p.id}>{p.id}. {p.name}</option>
            ))}
          </select>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden mt-2 opacity-80">
            <div className="flex-1" style={{ backgroundColor: colors.base }}></div>
            <div className="flex-1" style={{ backgroundColor: colors.surfaceLow }}></div>
            <div className="flex-1" style={{ backgroundColor: colors.surfaceMid }}></div>
            <div className="flex-1" style={{ backgroundColor: colors.primary }}></div>
            <div className="flex-1" style={{ backgroundColor: colors.success }}></div>
            <div className="flex-1" style={{ backgroundColor: colors.error }}></div>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
            <Type size={14} /> Familia Tipográfica
          </label>
          <div className="grid grid-cols-1 gap-2">
            {TYPOGRAPHIES.map(t => (
              <button 
                key={t.id}
                onClick={() => setConfig({...config, typography: t})}
                className={`text-left p-2.5 text-xs rounded-md border transition-colors ${config.typography.id === t.id ? 'border-white text-white bg-neutral-800' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Radius */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
            <Maximize size={14} /> Corner Radius
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CORNER_RADIUS.map(r => (
              <button 
                key={r.id}
                onClick={() => setConfig({...config, radius: r})}
                className={`text-center p-2 text-xs rounded-md border transition-colors ${config.radius.id === r.id ? 'border-white text-white bg-neutral-800' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}
              >
                {r.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Borders */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
            <Square size={14} /> Bordes & Contenedores
          </label>
          <div className="grid grid-cols-1 gap-2">
            {BORDERS.map(b => (
              <button 
                key={b.id}
                onClick={() => setConfig({...config, border: b})}
                className={`text-left p-2.5 text-xs rounded-md border transition-colors ${config.border.id === b.id ? 'border-white text-white bg-neutral-800' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons & Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-semibold text-white uppercase tracking-wider">
              <MousePointer2 size={12} /> Botones
            </label>
            <div className="flex flex-col gap-2">
              {BUTTONS.map(b => (
                <button key={b.id} onClick={() => setConfig({...config, button: b})} className={`text-left p-2 text-[11px] rounded-md border transition-colors ${config.button.id === b.id ? 'border-white text-white bg-neutral-800' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-semibold text-white uppercase tracking-wider">
              <TextCursorInput size={12} /> Inputs
            </label>
            <div className="flex flex-col gap-2">
              {INPUTS.map(i => (
                <button key={i.id} onClick={() => setConfig({...config, input: i})} className={`text-left p-2 text-[11px] rounded-md border transition-colors ${config.input.id === i.id ? 'border-white text-white bg-neutral-800' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                  {i.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-neutral-800 pb-4 mt-auto">
          <button 
            onClick={handleExportMarkdown}
            className="w-full bg-white text-black font-bold p-3 rounded-md flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            {copied ? <Check size={16} /> : <Download size={16} />}
            {copied ? 'Exportado con Éxito!' : 'Exportar Full System MD'}
          </button>
          <p className="text-[10px] text-neutral-500 text-center mt-3">Soporte y feedback: sebastianvernis@gmail.com</p>
        </div>
      </div>

      {/* ÁREA DE PREVIEW (Right Panel) */}
      <div className="flex-1 h-screen overflow-y-auto relative transition-all duration-300" style={previewStyles}>
        
        {/* Decorative ambient light */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-500 fixed"
          style={{ background: `radial-gradient(circle at 50% 0%, ${colors.primary} 0%, transparent 50%)` }}
        />

        {previewMode === 'markets' ? (
          // ==========================================
          // VISTA: NOTICIAS & MERCADOS
          // ==========================================
          <div className="relative z-10">
            {/* Top Ticker Bar */}
            <div className="w-full flex items-center overflow-x-auto hide-scrollbar border-b px-6 py-3 shadow-sm whitespace-nowrap" style={{ backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }}>
              <div className="flex gap-8">
                {MARKET_DATA.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm font-medium">
                    <span style={{ color: colors.textSecondary }}>{item.symbol}</span>
                    <span style={{ color: colors.textPrimary }}>{item.price}</span>
                    <span className="flex items-center text-xs" style={{ color: item.up ? colors.success : colors.error }}>
                      {item.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {item.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 lg:p-12 max-w-7xl mx-auto grid gap-8">
              {/* Main Headline Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b pb-8" style={{ borderColor: colors.borderSubtle }}>
                {/* Featured News */}
                <div className="lg:col-span-8 group cursor-pointer">
                  <div className="w-full aspect-video mb-4 relative overflow-hidden transition-all duration-300" style={{ backgroundColor: colors.surfaceHighest, borderRadius: config.radius.value }}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <Newspaper size={48} style={{ color: colors.textPrimary }} />
                    </div>
                    {/* Image overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 uppercase tracking-wider" style={{ backgroundColor: colors.primary, color: '#000', borderRadius: config.radius.id === '0px' ? '0px' : '4px' }}>
                        Mercados
                      </span>
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight group-hover:opacity-80 transition-opacity" style={{ color: colors.textPrimary }}>
                    El Banco Central Anuncia Nuevas Medidas de Estabilización Cuantitativa
                  </h1>
                  <p className="text-base md:text-lg mb-4" style={{ color: colors.textSecondary }}>
                    En un movimiento inesperado, las autoridades monetarias han decidido ajustar las tasas de interés base, provocando un repunte inmediato en los principales índices bursátiles.
                  </p>
                  <div className="flex items-center gap-4 text-xs font-medium" style={{ color: colors.textDisabled }}>
                    <span>Por Equipo Editorial</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> Hace 2 horas</span>
                  </div>
                </div>

                {/* Trending News List */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2" style={{ color: colors.primary, borderColor: colors.borderSubtle }}>
                    <TrendingUp size={18} /> Tendencias
                  </h3>
                  {[
                    "La Fusión Corporativa del Año: Detalles Exclusivos del Acuerdo",
                    "Criptoactivos alcanzan nuevo soporte histórico institucional",
                    "Impacto de las nuevas regulaciones en el sector energético",
                    "Análisis: ¿Es momento de rotar portafolios hacia mercados emergentes?"
                  ].map((title, i) => (
                    <div key={i} className="group cursor-pointer flex flex-col gap-2">
                      <div className="text-[10px] font-bold tracking-widest" style={{ color: colors.primary }}>0{i+1} // {i%2===0 ? 'ANÁLISIS' : 'ÚLTIMA HORA'}</div>
                      <h4 className="text-base font-semibold group-hover:opacity-80 transition-opacity leading-snug" style={{ color: colors.textPrimary }}>{title}</h4>
                      <div className="h-[1px] w-full mt-2" style={{ backgroundColor: colors.borderSubtle }}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex flex-col transition-all duration-300" style={cardStyles}>
                    <div className="h-40 w-full relative" style={{ backgroundColor: colors.surfaceMid }}>
                       <div className="absolute inset-0 bg-gradient-to-tr from-transparent" style={{ to: hexOpacity(colors.primary, 0.2) }}></div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-widest mb-2" style={{ color: colors.primary }}>FINTECH</span>
                      <h4 className="text-lg font-bold mb-3 leading-snug" style={{ color: colors.textPrimary }}>
                        Nuevas infraestructuras de pagos transfronterizos reducen costos en 40%
                      </h4>
                      <p className="text-sm mb-4 flex-1" style={{ color: colors.textSecondary }}>
                        La adopción de tecnologías blockchain de capa 2 está transformando las remesas internacionales.
                      </p>
                      <button className="text-sm font-semibold flex items-center gap-1 mt-auto hover:opacity-80 transition-opacity" style={{ color: colors.primary }}>
                        Leer artículo <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // ==========================================
          // VISTA: TRANSACCIONAL (Anterior)
          // ==========================================
          <div className="p-4 lg:p-12 max-w-4xl mx-auto relative z-10 grid gap-8">
            <div className="pb-6 border-b" style={{ borderColor: colors.borderSubtle }}>
              <h2 className="text-4xl font-bold mb-3 tracking-tight transition-colors duration-300" style={{ color: colors.primary }}>
                {config.palette.name}
              </h2>
              <p className="text-sm md:text-base leading-relaxed max-w-2xl" style={{ color: colors.textSecondary }}>
                Visualización de interfaz de usuario transaccional. Enfoque en legibilidad, formularios estructurados y retroalimentación semántica.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 lg:col-span-2 space-y-8">
                <div className="p-8 transition-all duration-300 shadow-xl" style={cardStyles}>
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <ShieldAlert size={18} style={{ color: colors.primary }} /> Transferencia Segura
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest mb-2 font-semibold" style={{ color: colors.textSecondary }}>Destinatario (Wallet)</label>
                      <input type="text" value="0x71C...976F" readOnly style={getInputStyles()} />
                      {config.input.id === 'underline' && <div className="h-[2px] w-full transition-colors mt-[-2px] relative z-10" style={{ backgroundColor: colors.primary }} />}
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-[11px] uppercase tracking-widest mb-2 font-semibold" style={{ color: colors.textSecondary }}>Monto a Enviar</label>
                        <input type="number" placeholder="0.00" style={getInputStyles()} />
                      </div>
                      <div className="w-32">
                        <label className="block text-[11px] uppercase tracking-widest mb-2 font-semibold" style={{ color: colors.textSecondary }}>Moneda</label>
                        <select style={getInputStyles()} className="cursor-pointer appearance-none">
                          <option>USDC</option>
                          <option>ETH</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-5 mt-4 text-sm transition-all duration-300" style={{ backgroundColor: colors.surfaceMid, borderRadius: config.radius.value, border: config.border.id === 'solid' ? `1px solid ${colors.borderSubtle}` : 'none' }}>
                      <div className="flex justify-between border-b pb-3 mb-3" style={{ borderColor: colors.borderSubtle }}>
                        <span style={{ color: colors.textSecondary }}>Comisión de Red</span>
                        <span className="font-mono" style={{ color: colors.textPrimary }}>0.0012 ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: colors.textSecondary }}>Tiempo Estimado</span>
                        <span style={{ color: colors.success }}>&lt; 2 minutos</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button style={getButtonStyles(true)} className="flex-1 hover:brightness-110">Ejecutar Transacción</button>
                      <button style={getButtonStyles(false)} className="px-8 hover:bg-white/5">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 space-y-6">
                <div className="p-4 flex items-start gap-3 transition-all duration-300" style={{ backgroundColor: colors.warningBg, borderLeft: `4px solid ${colors.warning}`, borderRadius: config.radius.id === '0px' ? '0px' : `0 ${config.radius.value} ${config.radius.value} 0` }}>
                  <AlertCircle size={20} style={{ color: colors.warning, flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 className="text-sm font-bold mb-1" style={{ color: colors.warning }}>Atención Requerida</h4>
                    <p className="text-xs leading-relaxed opacity-90" style={{ color: colors.textSecondary }}>La red está experimentando congestión. Las comisiones pueden variar.</p>
                  </div>
                </div>

                <div className="p-6 transition-all duration-300" style={cardStyles}>
                  <h3 className="text-sm font-semibold mb-4 border-b pb-2" style={{ borderColor: colors.borderSubtle }}>Paleta Semántica Dinámica</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 text-xs font-medium" style={{ backgroundColor: colors.successBg, color: colors.success, borderRadius: config.radius.value }}>
                      <span className="flex items-center gap-2"><CheckCircle2 size={14}/> Éxito</span>
                      <span className="font-mono">{colors.success.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 text-xs font-medium" style={{ backgroundColor: colors.infoBg, color: colors.info, borderRadius: config.radius.value }}>
                      <span className="flex items-center gap-2"><Info size={14}/> Info</span>
                      <span className="font-mono">{colors.info.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 text-xs font-medium" style={{ backgroundColor: colors.warningBg, color: colors.warning, borderRadius: config.radius.value }}>
                      <span className="flex items-center gap-2"><AlertCircle size={14}/> Alerta</span>
                      <span className="font-mono">{colors.warning.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 text-xs font-medium" style={{ backgroundColor: colors.errorBg, color: colors.error, borderRadius: config.radius.value }}>
                      <span className="flex items-center gap-2"><ShieldAlert size={14}/> Error</span>
                      <span className="font-mono">{colors.error.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { height: 4px; width: 6px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: #404040; border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar-thumb:hover { background: #525252; }
      `}} />
    </div>
  );
}
