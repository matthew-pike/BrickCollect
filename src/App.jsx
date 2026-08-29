/* ==========================================================================
   FILE: src/App.jsx
   VERSION: 2.51
   BLOCK HEADER: CRISP LIGHT MODE OVERHAUL, SHARPER CONTRAST & CARD DEFINITION
   ========================================================================== */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  ExternalLink, 
  Search, 
  Download, 
  RotateCcw, 
  Sun, 
  Moon, 
  X, 
  Users, 
  Box, 
  RefreshCw, 
  Zap, 
  Maximize, 
  Minimize, 
  FoldHorizontal, 
  UnfoldHorizontal, 
  Globe, 
  FileJson, 
  Upload, 
  Store,
  Clock,
  ChevronDown,
  Info,
  ShieldCheck
} from "lucide-react";
import { THEME_TIMELINES } from "./timelines";

// Lumibricks affiliate tracking code configured
const LUMIBRICKS_AFFILIATE_CODE = "opizuyuw";

function YouTubeIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

export const CURRENCIES = {
  AUD: { code: "AUD", symbol: "$", country: "AU", label: "AUD ($ AU)" },
  USD: { code: "USD", symbol: "$", country: "US", label: "USD ($ US)" },
  EUR: { code: "EUR", symbol: "€", country: "DE", label: "EUR (€ EU)" },
  GBP: { code: "GBP", symbol: "£", country: "UK", label: "GBP (£ UK)" },
  CAD: { code: "CAD", symbol: "$", country: "CA", label: "CAD ($ CA)" },
  NZD: { code: "NZD", symbol: "$", country: "NZ", label: "NZD ($ NZ)" }
};

function ImageThumbnail({ id, name, isSet, brand, imageUrl, onClick, isDark }) {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = imageUrl 
    ? [imageUrl]
    : isSet
      ? [
          `https://images.brickset.com/sets/images/${id}.jpg`,
          `https://img.bricklink.com/ItemImage/SN/0/${id}.png`,
          `https://img.bricklink.com/ItemImage/SL/${id}.jpg`
        ]
      : [
          `https://images.brickset.com/minifigs/large/${id}.jpg`,
          `https://img.bricklink.com/ItemImage/MN/0/${id}.png`,
          `https://img.bricklink.com/ItemImage/ML/${id}.jpg`
        ];

  if (srcIndex >= sources.length) {
    return (
      <div className={`w-12 h-12 rounded-lg border flex flex-col items-center justify-center p-1 text-[10px] font-bold ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-100 border-slate-300 text-slate-500"
      }`}>
        <Box size={14} />
        <span className="text-[8px] uppercase">{brand || "LEGO"}</span>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`w-12 h-12 rounded-lg bg-white border p-1 flex items-center justify-center shrink-0 cursor-pointer transition-all group ${
        isDark ? "border-slate-800 hover:border-[#00AEEF] shadow-sm" : "border-slate-300 hover:border-[#00AEEF] shadow-md"
      }`}
      title="Click to view full preview"
    >
      <img
        src={sources[srcIndex]}
        alt={name}
        onError={() => setSrcIndex(prev => prev + 1)}
        className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-110"
        loading="lazy"
      />
    </div>
  );
}

export default function App() {
  const fileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState("sets");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(() => localStorage.getItem("brickcollect_is_full_width") === "true");
  const [currency, setCurrency] = useState(() => localStorage.getItem("brickcollect_currency") || "AUD");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("brickcollect_is_dark") !== "false");

  const [sets, setSets] = useState([]);
  const [minifigs, setMinifigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableThemesList, setAvailableThemesList] = useState([]);
  const [availableBrandsList, setAvailableBrandsList] = useState(["LEGO"]);

  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState("Please select a theme");
  const [selectedSubtheme, setSelectedSubtheme] = useState("Please select a theme");
  const [selectedSet, setSelectedSet] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Fetch brands on mount
  useEffect(() => {
    fetch("/api/brands")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setAvailableBrandsList(data);
      })
      .catch(err => console.error("Failed to fetch brands:", err));
  }, []);

  // Fetch themes dynamically whenever selectedBrand changes
  useEffect(() => {
    const brandQuery = selectedBrand && selectedBrand !== "All" ? `?brand=${encodeURIComponent(selectedBrand)}` : "";
    fetch(`/api/themes${brandQuery}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableThemesList(data);
        }
      })
      .catch(err => console.error("Failed to fetch themes:", err));
  }, [selectedBrand]);

  const hasActiveSearchOrFilter = search.trim() !== "" || 
    (selectedTheme && selectedTheme !== "Please select a theme" && selectedTheme !== "All") ||
    (selectedBrand && selectedBrand !== "All");

  // Fetch catalog data when filters change
  useEffect(() => {
    async function loadCatalogData() {
      const themeParam = (selectedTheme && selectedTheme !== "Please select a theme" && selectedTheme !== "All") ? selectedTheme : "";
      const brandParam = (selectedBrand && selectedBrand !== "All") ? selectedBrand : "";
      
      if (!hasActiveSearchOrFilter) {
        setSets([]);
        setMinifigs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const subthemeParam = (selectedSubtheme && selectedSubtheme !== "Please select a theme" && selectedSubtheme !== "All") ? selectedSubtheme : "";
        
        let queryStr = "";
        const params = [];
        if (themeParam) params.push(`theme=${encodeURIComponent(themeParam)}`);
        if (subthemeParam) params.push(`subtheme=${encodeURIComponent(subthemeParam)}`);
        if (brandParam) params.push(`brand=${encodeURIComponent(brandParam)}`);
        if (params.length > 0) queryStr = `?${params.join("&")}`;

        const [setsRes, minifigsRes] = await Promise.all([
          fetch(`/api/sets${queryStr}`),
          fetch(`/api/minifigs${queryStr}`)
        ]);

        const dbSets = await setsRes.json();
        const dbMinifigs = await minifigsRes.json();

        if (Array.isArray(dbSets)) {
          setSets(dbSets.map(s => ({
            id: s.setNumber,
            setNumber: s.setNumber,
            name: s.name,
            year: s.year || 2024,
            pieces: s.pieces || 100,
            theme: s.themeName || "General",
            subtheme: s.subthemeName || "General",
            brand: s.brand || "LEGO",
            status: "none",
            usedPrice: null,
            newPrice: null
          })));
        } else {
          setSets([]);
        }

        if (Array.isArray(dbMinifigs)) {
          setMinifigs(dbMinifigs.map(m => ({
            id: m.id || m.figNum,
            figNum: m.figNum,
            minifigureCode: m.minifigureCode || m.minifigure_code || "",
            name: m.name,
            set: `${m.setName} (${m.setNumber})`,
            setNumber: m.setNumber,
            year: m.year || 2024,
            theme: m.themeName || "General",
            subtheme: m.subthemeName || "General",
            brand: m.brand || "LEGO",
            imageUrl: m.imageUrl,
            owned: false,
            usedPrice: null,
            newPrice: null
          })));
        } else {
          setMinifigs([]);
        }
      } catch (err) {
        console.error("Failed to load catalog data:", err);
        setSets([]);
        setMinifigs([]);
      }
      setLoading(false);
    }
    loadCatalogData();
  }, [selectedTheme, selectedSubtheme, selectedBrand, search]);

  useEffect(() => { localStorage.setItem("brickcollect_currency", currency); }, [currency]);
  useEffect(() => { localStorage.setItem("brickcollect_is_dark", isDark.toString()); }, [isDark]);
  useEffect(() => { localStorage.setItem("brickcollect_is_full_width", isFullWidth.toString()); }, [isFullWidth]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const currentCurrencyInfo = CURRENCIES[currency] || CURRENCIES.AUD;

  const toggleOwnedMinifig = (id) => {
    setMinifigs(prev => prev.map(item => item.id === id ? { ...item, owned: !item.owned } : item));
  };

  const cycleSetStatus = (id) => {
    setSets(prev => prev.map(item => {
      if (item.id !== id) return item;
      const current = item.status || "none";
      let next = "none";
      if (current === "none") next = "complete";
      else if (current === "complete") next = "incomplete";
      else next = "none";
      return { ...item, status: next };
    }));
  };

  const syncLivePrice = async (rowId, isSet, apiId) => {
    setSyncingId(rowId);
    try {
      const targetQueryNo = apiId || rowId;
      const res = await fetch(`/api/bricklink-price?itemNo=${targetQueryNo}&itemType=${isSet ? 'S' : 'M'}&currency=${currentCurrencyInfo.code}&country=${currentCurrencyInfo.country}`);
      if (res.ok) {
        const data = await res.json();
        if (isSet) {
          setSets(prev => prev.map(s => s.id !== rowId ? s : { ...s, usedPrice: data.used?.avg !== undefined ? data.used.avg : s.usedPrice, newPrice: data.new?.avg !== undefined ? data.new.avg : s.newPrice }));
        } else {
          setMinifigs(prev => prev.map(m => m.id !== rowId ? m : { ...m, usedPrice: data.used?.avg !== undefined ? data.used.avg : m.usedPrice, newPrice: data.new?.avg !== undefined ? data.new.avg : m.newPrice }));
        }
      }
    } catch (e) { console.error(e); } finally { setSyncingId(null); }
  };

  const syncAllPrices = async () => {
    setIsSyncingAll(true);
    const activeDataset = viewMode === "minifigs" ? minifigs : sets;
    for (const item of activeDataset) {
      setSyncingId(item.id);
      await syncLivePrice(item.id, viewMode === "sets", viewMode === "minifigs" ? (item.minifigureCode || item.figNum) : item.id);
      await new Promise(r => setTimeout(r, 100));
    }
    setSyncingId(null);
    setIsSyncingAll(false);
  };

  const resetToDefaults = () => {
    if (window.confirm("Reset dataset filters and searches?")) {
      setSearch("");
      setSelectedBrand("All");
      setSelectedTheme("Please select a theme");
      setSelectedSubtheme("Please select a theme");
      setSelectedSet("All");
      setSelectedYear("All");
    }
  };

  const handleResetFilterSelection = () => {
    setSelectedBrand("All");
    setSelectedTheme("Please select a theme");
    setSelectedSubtheme("Please select a theme");
    setSelectedSet("All");
    setSelectedYear("All");
    setSearch("");
  };

  const goToHome = () => {
    setViewMode("sets");
    setSelectedBrand("All");
    setSelectedTheme("Please select a theme");
    setSelectedSubtheme("Please select a theme");
    setSelectedSet("All");
    setSelectedYear("All");
    setSearch("");
  };

  const exportBackupJSON = () => {
    const backupData = { app: "Brick Collect", author: "The Art of Bricks", version: "2.51", exportDate: new Date().toISOString(), currency, minifigs, sets };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brick_collect_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result);
        if (data.minifigs && data.sets) {
          setMinifigs(data.minifigs);
          setSets(data.sets);
          if (data.currency && CURRENCIES[data.currency]) setCurrency(data.currency);
          alert("Collection successfully restored!");
        } else { alert("Invalid backup file format."); }
      } catch (err) { console.error(err); alert("Failed to parse the backup file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const getFilteredCollection = (dataset) => {
    return dataset.filter(item => {
      const itemBrand = item.brand || "LEGO";
      const itemTheme = item.theme || selectedTheme;
      const itemSubtheme = item.subtheme || "General";
      const itemYear = item.year || "";
      const itemName = item.name || "";
      const itemId = item.id || "";
      const itemSetNum = item.setNumber || "";

      const matchesBrand = selectedBrand === "All" || itemBrand.toLowerCase() === selectedBrand.toLowerCase();
      const matchesTheme = selectedTheme === "Please select a theme" || selectedTheme === "All" ||
        itemTheme.toLowerCase() === selectedTheme.toLowerCase() || 
        itemSubtheme.toLowerCase() === selectedTheme.toLowerCase();
      
      const matchesSubtheme = selectedSubtheme === "Please select a theme" || selectedSubtheme === "All" || itemSubtheme.toLowerCase() === selectedSubtheme.toLowerCase();
      
      const matchesSet = selectedSet === "All" || 
        (viewMode === "sets" ? (itemId === selectedSet || itemSetNum === selectedSet) : (item.setNumber === selectedSet || (item.set && item.set.includes(selectedSet))));

      const matchesYear = selectedYear === "All" || String(itemYear) === String(selectedYear);
      const matchesSearch = itemName.toLowerCase().includes(search.toLowerCase()) || itemId.toLowerCase().includes(search.toLowerCase()) || (itemSetNum && itemSetNum.toLowerCase().includes(search.toLowerCase())) || (item.minifigureCode && item.minifigureCode.toLowerCase().includes(search.toLowerCase()));
      
      return matchesBrand && matchesTheme && matchesSubtheme && matchesSet && matchesYear && matchesSearch;
    });
  };

  const filteredSets = getFilteredCollection(sets);
  const filteredMinifigs = getFilteredCollection(minifigs);

  // Sorting Handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    const rawDataset = viewMode === "minifigs" ? filteredMinifigs : filteredSets;
    let sortableItems = [...rawDataset];
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [filteredMinifigs, filteredSets, viewMode, sortConfig]);

  const activeDataset = viewMode === "minifigs" ? minifigs : sets;

  const availableBrands = ["All", ...availableBrandsList];
  const availableThemes = ["Please select a theme", ...availableThemesList];
  const availableSubthemes = ["Please select a theme", "All", ...new Set(activeDataset.map(item => item.subtheme || "General"))];
  
  const currentSubthemeSets = sets.filter(s => {
    const matchesSub = selectedSubtheme === "Please select a theme" || selectedSubtheme === "All" || s.subtheme.toLowerCase() === selectedSubtheme.toLowerCase();
    const matchesYr = selectedYear === "All" || String(s.year) === String(selectedYear);
    return matchesSub && matchesYr;
  });
  const availableSets = ["All", ...currentSubthemeSets.map(s => ({ id: s.id, label: `${s.name} (${s.setNumber})` }))];

  const availableYears = ["All", ...new Set(activeDataset.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);

  const totalCount = sortedItems.length;
  const ownedCount = sortedItems.filter(item => viewMode === "minifigs" ? item.owned : item.status === "complete").length;
  const incompleteCount = viewMode === "sets" ? sortedItems.filter(item => item.status === "incomplete").length : 0;
  const progressPercent = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const isAllSelected = totalCount > 0 && ownedCount === totalCount;

  const handleToggleSelectAll = () => {
    const targetState = !isAllSelected;
    const targetIds = new Set(sortedItems.map(item => item.id));
    if (viewMode === "minifigs") {
      setMinifigs(prev => prev.map(m => targetIds.has(m.id) ? { ...m, owned: targetState } : m));
    } else {
      setSets(prev => prev.map(s => targetIds.has(s.id) ? { ...s, status: targetState ? "complete" : "none" } : s));
    }
  };

  const remainingItems = sortedItems.filter(item => viewMode === "minifigs" ? !item.owned : item.status !== "complete");
  const remainingUsedCost = remainingItems.reduce((sum, item) => sum + (item.usedPrice || 0), 0);
  const remainingNewCost = remainingItems.reduce((sum, item) => sum + (item.newPrice || 0), 0);
  const totalScopeUsedValue = sortedItems.reduce((sum, item) => sum + (item.usedPrice || 0), 0);
  const totalScopeNewValue = sortedItems.reduce((sum, item) => sum + (item.newPrice || 0), 0);

  const getBrickLinkUrl = (item, isSet) => {
    const country = currentCurrencyInfo.country;
    const targetId = isSet ? (item.setNumber || item.id) : (item.minifigureCode || item.minifigure_code);
    if (!targetId) return "";
    return isSet 
      ? `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${targetId}&locCountryID=${country}#T=S&O={%22ii%22:0,%22loc%22:%22${country}%22,%22iconly%22:0}` 
      : `https://www.bricklink.com/v2/catalog/catalogitem.page?M=${targetId}&locCountryID=${country}#T=S&O={%22ii%22:0,%22loc%22:%22${country}%22,%22iconly%22:0}`;
  };

  const getLumibricksUrl = (item) => {
    const themeSlug = (item.theme || item.subtheme || "general")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const nameSlug = (item.name || "set")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const setNum = item.setNumber || item.id || "";
    return `https://www.lumibricks.com/collections/${themeSlug}/products/${nameSlug}-${setNum}?ref=${LUMIBRICKS_AFFILIATE_CODE}`;
  };

  const exportCSV = () => {
    let headers = "";
    let rows = "";
    if (viewMode === "minifigs") {
      headers = `Subtheme,Set,Year,Fig ID,Minifigure Name,Owned,Live Used ${currentCurrencyInfo.code},Live New ${currentCurrencyInfo.code},Marketplace URL\n`;
      rows = sortedItems.map(m => `"${m.subtheme || 'General'}","${m.set || ''}",${m.year || ''},"${m.figNum || m.id}","${m.name}",${m.owned ? "Yes" : "No"},${m.usedPrice !== null ? Number(m.usedPrice).toFixed(2) : 0},${m.newPrice !== null ? Number(m.newPrice).toFixed(2) : 0},"${(m.minifigureCode || m.minifigure_code) ? getBrickLinkUrl(m, false) : ''}"`).join("\n");
    } else {
      headers = `Theme,Subtheme,Set Number,Set Name,Year,Pieces,Status,Live Used ${currentCurrencyInfo.code},Live New ${currentCurrencyInfo.code},Marketplace URL\n`;
      rows = sortedItems.map(s => {
        const isLumibricks = selectedBrand.toLowerCase() === "lumibricks";
        const marketUrl = isLumibricks ? getLumibricksUrl(s) : getBrickLinkUrl(s, true);
        return `"${s.theme || ''}","${s.subtheme || ''}","${s.setNumber || s.id}","${s.name}",${s.year || ''},${s.pieces || 0},"${s.status || 'none'}",${s.usedPrice !== null ? Number(s.usedPrice).toFixed(2) : 0},${s.newPrice !== null ? Number(s.newPrice).toFixed(2) : 0},"${marketUrl}"`;
      }).join("\n");
    }
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brick_collect_${viewMode}.csv`;
    a.click();
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-200 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"}`}>
      <div className="p-4 md:p-8 flex-1">
        <div className={`mx-auto w-full space-y-6 transition-all duration-300 ${isFullWidth ? "max-w-full px-2 sm:px-4" : "max-w-6xl"}`}>
          
          <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />

          {/* Header */}
          <header className={`w-full border-b pb-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className="flex flex-col items-center md:items-start cursor-pointer group" onClick={goToHome} title="Go to home page">
              <h1 
                className="text-2xl text-[#00AEEF] m-0 leading-none group-hover:opacity-80 transition-opacity"
                style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, paddingLeft: '5px', paddingTop: '5px' }}
              >
                BrickCollect
              </h1>
              <span 
                className="uppercase tracking-widest transition-colors duration-200"
                style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 300, fontSize: '9px', color: isDark ? '#ffffff' : '#333333', paddingLeft: '6px', marginTop: '3px' }}
              >
                Collect. Price. Buy. Track and Export. In one place.
              </span>
            </div>

            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={viewMode === "minifigs" ? "Search figure, code or ID..." : "Search set name or #..."} 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className={`w-full border rounded-lg pl-10 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-[#00AEEF] shadow-sm ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-300 text-slate-900 shadow-sm"}`} 
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm ${isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-300 text-slate-700 shadow-sm"}`}>
                <Globe size={12} className="text-[#00AEEF]" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-transparent text-[11px] font-extrabold focus:outline-none cursor-pointer py-0.5"
                >
                  {Object.values(CURRENCIES).map(curr => (
                    <option key={curr.code} value={curr.code} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={exportBackupJSON} className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm"}`} title="Backup collection">
                  <FileJson size={13} className="text-[#00AEEF]" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm"}`} title="Restore collection">
                  <Upload size={13} className="text-emerald-500" />
                </button>
                <button onClick={() => setIsFullWidth(!isFullWidth)} className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${isFullWidth ? (isDark ? "bg-[#00AEEF]/20 text-[#00AEEF] border-[#00AEEF]/40" : "bg-sky-100 text-[#009EDB] border-sky-300 shadow-sm") : (isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-600 border-slate-300 shadow-sm")}`} title="Toggle Full Width">
                  {isFullWidth ? <FoldHorizontal size={14} /> : <UnfoldHorizontal size={14} />}
                </button>
                <button onClick={toggleFullscreen} className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-600 border-slate-300 shadow-sm"}`} title="Toggle Fullscreen">
                  {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                </button>
                <button onClick={() => setIsDark(!isDark)} className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${isDark ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-300 text-slate-700 shadow-sm"}`} title="Toggle Theme">
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button onClick={resetToDefaults} title="Reset Cache" className={`p-1.5 rounded-lg border transition shadow-sm cursor-pointer ${isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-600 hover:text-amber-600 border-slate-300 shadow-sm"}`}>
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </header>

          {/* Conditionally Render Affiliates View or Standard Catalog */}
          {viewMode === "affiliates" ? (
            <div className={`border p-6 md:p-10 rounded-xl shadow-md text-left space-y-6 w-full ${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-sm"}`}>
              <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={28} className="text-[#00AEEF]" />
                  <h2 className="text-2xl font-bold tracking-tight">Affiliate Disclosure</h2>
                </div>
                <button 
                  onClick={() => setViewMode("sets")}
                  className="px-4 py-2 rounded-lg bg-[#00AEEF] text-slate-950 font-bold text-xs hover:bg-[#009EDB] transition cursor-pointer shadow-sm"
                >
                  Return to main
                </button>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  This site is a personal project funded in part by affiliate marketing as well as on-site advertising. When you make a purchase or carry out specific actions as a direct result of clicking on a link on this website, we may receive a small commission.
                </p>
                <p>
                  For example, if you click a link to buy a lighting kit or custom brick set from one of our partners and make a purchase, we will receive a percentage of that sale.
                </p>
                <p>
                  The price you pay is exactly the same whether you use our links or not—there are absolutely no extra costs to you.
                </p>

                <h3 className="text-lg font-bold text-[#00AEEF] pt-3">Why We Use Affiliates</h3>
                <p>
                  It costs money to keep this platform running, from backend server costs and data storage to the personal time invested in building a great user experience. We want to keep this service free for everyone to use, so we depend on affiliate marketing and advertising to help cover these ongoing operational costs. The money earned costs you nothing extra but directly keeps the site online. Thank you for your continued support!
                </p>

                <h3 className="text-lg font-bold text-[#00AEEF] pt-3">Data & Catalog Attribution</h3>
                <p>
                  Our extensive LEGO set lists, part numbers, and catalog relationships are powered entirely by <a href="https://www.rebrickable.com" target="_blank" rel="noreferrer" className="underline text-[#00AEEF]">Rebrickable</a>. This site is an independent project and is not affiliated with, authorized, or endorsed by the LEGO Group.
                </p>

                <h3 className="text-lg font-bold text-[#00AEEF] pt-3">Our Current Affiliate Partners</h3>
                <p>
                  As of 2026, we utilize the following affiliate programs to support the site:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Lumibricks</strong>: We are a participant in the Lumibricks Affiliate Program. Clicking on custom lighting, display, or set links may result in this site earning a commission on qualifying purchases.</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Intro Box or Summary Stats Grid */}
              {!hasActiveSearchOrFilter ? (
                <div className={`border p-6 md:p-8 rounded-xl shadow-md text-left space-y-3 w-full ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                  <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight">Welcome to BrickCollect</h1>
                  </div>
                  <p className={`text-xs md:text-sm leading-relaxed w-full ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Built by an enthusiast, for enthusiasts. BrickCollect is universal site looking to featuring all brick brands as it grows. The goal was simple, make everything easy to find in a few clicks on a clean, fast and easy to read site that with the ability to export my collection. Now, with BrickCollect you can do just that, manage your collection, track your wishlist of sets and minifigures, and dive into franchise timelines for movie inspired themes all in one screen.
                  </p>
                  <div 
                    onClick={() => {
                      const el = document.getElementById('filter-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="pt-2 flex items-center gap-1.5 cursor-pointer group inline-flex"
                    title="Click to jump to filters"
                  >
                    <h3 className="text-sm font-bold text-[#00AEEF] group-hover:underline">To get started Select a brand or theme below</h3>
                    <ChevronDown size={16} className="text-slate-600 dark:text-slate-400 transition-transform group-hover:translate-y-1" />
                  </div>
                </div>
              ) : viewMode !== "timeline" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className={`border p-4 rounded-xl shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {viewMode === "minifigs" ? "Minifigs Progress" : "Complete Sets"}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{ownedCount}</span>
                      <span className="text-xs font-medium text-slate-500">/ {totalCount} ({progressPercent}%)</span>
                    </div>
                    {viewMode === "sets" && incompleteCount > 0 && (
                      <div className="text-[10px] text-amber-500 font-bold mt-0.5">+{incompleteCount} Incomplete</div>
                    )}
                    <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <div className="bg-[#00AEEF] h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>

                  <div className={`border p-4 rounded-xl shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Remaining</div>
                    <div className="mt-1 text-2xl font-bold text-[#00AEEF]">{remainingItems.length}</div>
                    <div className="text-[11px] mt-1 text-slate-500">Needed to finish 100%</div>
                  </div>

                  <div className={`border p-4 rounded-xl shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Needed (Used)</div>
                    <div className={`mt-1 text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                      {currentCurrencyInfo.symbol}{remainingUsedCost.toFixed(2)} <span className="text-xs font-normal">{currentCurrencyInfo.code}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-slate-500">Live Used Avg</div>
                  </div>

                  <div className={`border p-4 rounded-xl shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Needed (New)</div>
                    <div className={`mt-1 text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                      {currentCurrencyInfo.symbol}{remainingNewCost.toFixed(2)} <span className="text-xs font-normal">{currentCurrencyInfo.code}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-slate-500">Live Sealed Avg</div>
                  </div>

                  <div className={`border p-4 rounded-xl shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Value (Used)</div>
                    <div className={`mt-1 text-2xl font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                      {currentCurrencyInfo.symbol}{totalScopeUsedValue.toFixed(2)} <span className="text-xs font-normal">{currentCurrencyInfo.code}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-slate-500">Total Used Portfolio</div>
                  </div>

                  <div className={`border p-4 rounded-xl shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Value (New)</div>
                    <div className={`mt-1 text-2xl font-bold ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>
                      {currentCurrencyInfo.symbol}{totalScopeNewValue.toFixed(2)} <span className="text-xs font-normal">{currentCurrencyInfo.code}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-slate-500">Mint Sealed Total</div>
                  </div>
                </div>
              )}

              {/* Filter Bar */}
              <div id="filter-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end pt-1">
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-700"}`}>Brand</label>
                  <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setSelectedTheme("Please select a theme"); setSelectedSubtheme("Please select a theme"); setSelectedSet("All"); setSelectedYear("All"); }} className={`border text-sm rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#00AEEF] shadow-sm cursor-pointer ${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-300 text-slate-900 shadow-sm"}`}>
                    {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-700"}`}>Theme</label>
                  <select value={selectedTheme} onChange={(e) => { setSelectedTheme(e.target.value); setSelectedSubtheme("Please select a theme"); setSelectedSet("All"); setSelectedYear("All"); }} className={`border text-sm rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#00AEEF] shadow-sm cursor-pointer ${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-300 text-slate-900 shadow-sm"}`}>
                    {availableThemes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-700"}`}>Subtheme</label>
                  <select value={selectedSubtheme} onChange={(e) => { setSelectedSubtheme(e.target.value); setSelectedSet("All"); }} className={`border text-sm rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#00AEEF] shadow-sm cursor-pointer ${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-300 text-slate-900 shadow-sm"}`}>
                    {availableSubthemes.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-700"}`}>Set</label>
                  <select value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)} className={`border text-sm rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#00AEEF] shadow-sm cursor-pointer ${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-300 text-slate-900 shadow-sm"}`}>
                    <option value="All">All Sets</option>
                    {availableSets.filter(s => s !== "All").map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-700"}`}>Year</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={`border text-sm rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-[#00AEEF] shadow-sm cursor-pointer ${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-300 text-slate-900 shadow-sm"}`}>
                    {availableYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={handleResetFilterSelection} className={`w-full flex items-center justify-center px-3 py-2 rounded-lg border transition shadow-sm cursor-pointer h-[38px] ${isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm"}`} title="Reset filters">
                    <RotateCcw size={16} className="text-[#00AEEF]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className={`p-1 rounded-xl border flex items-center shadow-sm self-start ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                  <button onClick={() => setViewMode("minifigs")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "minifigs" ? "bg-[#00AEEF] text-slate-950 shadow-sm" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                    <Users size={14} /> Minifigures ({filteredMinifigs.length})
                  </button>
                  <button onClick={() => setViewMode("sets")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "sets" ? "bg-[#00AEEF] text-slate-950 shadow-sm" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                    <Box size={14} /> Sets ({filteredSets.length})
                  </button>
                  {selectedTheme && THEME_TIMELINES[selectedTheme] && (
                    <button onClick={() => setViewMode("timeline")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "timeline" ? "bg-[#00AEEF] text-slate-950 shadow-sm" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                      <Clock size={14} /> Timeline
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <a
                    href="https://store.bricklink.com/TheArtofBricks#/shop"
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition shadow-sm cursor-pointer ${
                      isDark ? "bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-700" : "bg-white hover:bg-slate-50 text-sky-600 border-slate-300 shadow-sm"
                    }`}
                    title="Visit The Art of Bricks Official BrickLink Store"
                  >
                    <Store size={14} /> BrickLink Store <ExternalLink size={11} />
                  </a>

                  {viewMode !== "timeline" && (
                    <>
                      <button onClick={exportCSV} className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition shadow-sm cursor-pointer ${isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700" : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-sm"}`}>
                        <Download size={14} /> Export CSV
                      </button>
                      <button onClick={syncAllPrices} disabled={isSyncingAll} className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition shadow-sm cursor-pointer ${isSyncingAll ? "bg-[#00AEEF]/20 text-[#00AEEF] border-[#00AEEF]/30 animate-pulse" : (isDark ? "bg-slate-900 hover:bg-slate-800 text-[#00AEEF] border-slate-700" : "bg-white hover:bg-slate-50 text-[#009EDB] border-slate-300 shadow-sm")}`} title="Sync Prices">
                        <Zap size={14} className={isSyncingAll ? "animate-spin" : ""} />
                        <span>{isSyncingAll ? "Syncing..." : `Sync Prices (${currentCurrencyInfo.code})`}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Subtheme Timeline Banner */}
              {hasActiveSearchOrFilter && selectedTheme && selectedSubtheme && THEME_TIMELINES[selectedTheme]?.[selectedSubtheme] && viewMode !== "timeline" && (
                <div className={`p-4 rounded-xl border shadow-md transition-colors ${isDark ? "bg-slate-900 border-[#00AEEF]/40 text-white" : "bg-sky-50 border-sky-200 text-slate-900 shadow-sm"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mb-2 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-[#00AEEF]" />
                      <h3 className="font-bold text-base text-[#00AEEF]">{selectedSubtheme}</h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${THEME_TIMELINES[selectedTheme][selectedSubtheme].status === 'Canon' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                        {THEME_TIMELINES[selectedTheme][selectedSubtheme].status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Era: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{THEME_TIMELINES[selectedTheme][selectedSubtheme].era}</strong></span>
                      <span>•</span>
                      <span>Year: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{THEME_TIMELINES[selectedTheme][selectedSubtheme].year}</strong></span>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {THEME_TIMELINES[selectedTheme][selectedSubtheme].summary}
                  </p>
                </div>
              )}

              {/* Data Display / Table */}
              <div className={`border rounded-xl overflow-hidden shadow-md ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                {!hasActiveSearchOrFilter ? (
                  <div className="text-center py-16 text-slate-400 font-medium">Select a brand, theme or search above to view your collection.</div>
                ) : viewMode === "timeline" ? (
                  <div className="p-6 space-y-6">
                    <div className="border-b pb-4 border-slate-200 dark:border-slate-800">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-[#00AEEF]">
                        <Clock size={20} /> {selectedTheme} Franchise Timeline
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chronological canon and media reference with collection progress tracking.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(THEME_TIMELINES[selectedTheme] || {}).map(([title, data], index) => {
                        const subthemeSets = sets.filter(s => s.subtheme && s.subtheme.toLowerCase() === title.toLowerCase());
                        const totalSubthemeSets = subthemeSets.length;
                        const completedSubthemeSets = subthemeSets.filter(s => s.status === 'complete').length;
                        const progressPct = totalSubthemeSets > 0 ? Math.round((completedSubthemeSets / totalSubthemeSets) * 100) : 0;

                        return (
                          <div key={index} className={`border rounded-xl p-5 space-y-3 flex flex-col justify-between ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200 shadow-sm"}`}>
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-base text-[#00AEEF]">{title}</h3>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${data.status === 'Canon' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                                  {data.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span>Era: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{data.era}</strong></span>
                                <span>•</span>
                                <span>Year: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{data.year}</strong></span>
                              </div>
                              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {data.summary}
                              </p>
                            </div>
                            <div className={`pt-3 mt-3 border-t flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                              <div className="text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Sets Built: </span>
                                <strong className={isDark ? "text-emerald-400 font-bold" : "text-emerald-600 font-bold"}>
                                  {completedSubthemeSets}
                                </strong>
                                <span className="text-slate-500 dark:text-slate-400"> / {totalSubthemeSets} ({progressPct}%)</span>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedSubtheme(title);
                                  setSelectedSet("All");
                                  setViewMode("sets");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00AEEF] hover:bg-[#009EDB] text-slate-950 font-extrabold text-[11px] shadow-sm transition-all hover:scale-105 cursor-pointer"
                                title={`Filter collection to show sets for ${title}`}
                              >
                                <span>View Sets</span> 
                                <ExternalLink size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-16 text-slate-400 font-medium">Loading catalog data...</div>
                    ) : viewMode === "minifigs" ? (
                      <table className="w-full text-left text-sm">
                        <thead className={`border-b text-xs font-semibold uppercase ${isDark ? "bg-slate-950/70 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                          <tr>
                            <th className="py-3 px-3 w-12 text-center">
                              <button onClick={handleToggleSelectAll} className="focus:outline-none cursor-pointer p-0.5" title="Select All">
                                {isAllSelected ? <CheckCircle2 size={18} className="text-[#00AEEF]" /> : <Circle size={18} className={isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-300 hover:text-slate-500"} />}
                              </button>
                            </th>
                            <th className="py-3 px-2 w-14 text-center">Image</th>
                            <th onClick={() => handleSort('name')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Minifigure Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('brand')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Brand {sortConfig.key === 'brand' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('subtheme')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Subtheme {sortConfig.key === 'subtheme' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('figNum')} className="py-3 px-3 text-[#00AEEF] cursor-pointer hover:opacity-80 select-none">
                              Fig ID {sortConfig.key === 'figNum' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="py-3 px-3">Origin Set</th>
                            <th onClick={() => handleSort('year')} className="py-3 px-2 text-center cursor-pointer hover:text-[#00AEEF] select-none">
                              Year {sortConfig.key === 'year' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="py-3 px-3 text-right">Used {currentCurrencyInfo.code}</th>
                            <th className="py-3 px-3 text-right">New {currentCurrencyInfo.code}</th>
                            <th className="py-3 px-2 text-center">Sync</th>
                            <th className="py-3 px-3 text-center">Links</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? "divide-slate-800/60" : "divide-slate-200"}`}>
                          {sortedItems.map((item) => {
                            const figId = item.figNum || item.id;
                            const blCode = item.minifigureCode || item.minifigure_code;

                            return (
                              <tr key={item.id} className={`transition ${isDark ? (item.owned ? "bg-[#00AEEF]/10 hover:bg-[#00AEEF]/15" : "hover:bg-slate-800/40") : (item.owned ? "bg-sky-50/80 hover:bg-sky-100/70" : "hover:bg-slate-50")}`}>
                                <td className="py-3 px-3 text-center">
                                  <button onClick={() => toggleOwnedMinifig(item.id)} className="focus:outline-none cursor-pointer">
                                    {item.owned ? <CheckCircle2 size={20} className="text-[#00AEEF]" /> : <Circle size={20} className={isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-300 hover:text-slate-500"} />}
                                  </button>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <ImageThumbnail id={figId} name={item.name} isSet={false} brand={item.brand} imageUrl={item.imageUrl} onClick={() => setModalItem({ ...item, isSet: false })} isDark={isDark} />
                                </td>
                                <td className={`py-3 px-3 font-medium ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                                  <div className="flex items-center gap-2">
                                    <span>{item.name}</span>
                                    {item.owned && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? "bg-[#00AEEF]/20 text-[#00AEEF]" : "bg-sky-100 text-sky-800"}`}>OWNED</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.brand || "LEGO"}</td>
                                <td className="py-3 px-3 text-xs font-semibold text-[#00AEEF]">{item.subtheme}</td>
                                <td className={`py-3 px-3 font-mono text-xs font-bold ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
                                  <code>{figId}</code>
                                </td>
                                <td className={`py-3 px-3 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.set}</td>
                                <td className={`py-3 px-2 text-center text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.year}</td>
                                <td className={`py-3 px-3 text-right font-mono font-medium ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                                  {item.usedPrice !== null && item.usedPrice !== undefined ? `${currentCurrencyInfo.symbol}${Number(item.usedPrice).toFixed(2)}` : <span className="text-slate-400 text-xs">--</span>}
                                </td>
                                <td className={`py-3 px-3 text-right font-mono font-medium ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                                  {item.newPrice !== null && item.newPrice !== undefined ? `${currentCurrencyInfo.symbol}${Number(item.newPrice).toFixed(2)}` : <span className="text-slate-400 text-xs">--</span>}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <button onClick={() => syncLivePrice(item.id, false, blCode || figId)} disabled={syncingId === item.id} className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-400 hover:text-[#00AEEF] cursor-pointer ${syncingId === item.id ? "animate-spin text-[#00AEEF]" : ""}`}>
                                    <RefreshCw size={14} />
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {blCode ? (
                                    <a href={getBrickLinkUrl(item, false)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00AEEF] hover:bg-[#009EDB] text-white dark:text-black font-extrabold text-[11px] shadow-sm transition-all hover:scale-105">
                                      <span>BrickLink</span> <ExternalLink size={10} className="text-white dark:text-black" />
                                    </a>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className={`border-b text-xs font-semibold uppercase ${isDark ? "bg-slate-950/70 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                          <tr>
                            <th className="py-3 px-3 w-12 text-center">
                              <button onClick={handleToggleSelectAll} className="focus:outline-none cursor-pointer p-0.5" title="Select All">
                                {isAllSelected ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className={isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-300 hover:text-slate-500"} />}
                              </button>
                            </th>
                            <th className="py-3 px-2 w-14 text-center">Image</th>
                            <th onClick={() => handleSort('name')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Set Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('brand')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Brand {sortConfig.key === 'brand' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('subtheme')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Subtheme {sortConfig.key === 'subtheme' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('setNumber')} className="py-3 px-3 cursor-pointer hover:text-[#00AEEF] select-none">
                              Set # {sortConfig.key === 'setNumber' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('year')} className="py-3 px-2 text-center cursor-pointer hover:text-[#00AEEF] select-none">
                              Year {sortConfig.key === 'year' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => handleSort('pieces')} className="py-3 px-2 text-center cursor-pointer hover:text-[#00AEEF] select-none">
                              Pieces {sortConfig.key === 'pieces' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="py-3 px-3 text-right">Used {currentCurrencyInfo.code}</th>
                            <th className="py-3 px-3 text-right">New {currentCurrencyInfo.code}</th>
                            <th className="py-3 px-2 text-center">Sync</th>
                            <th className="py-3 px-3 text-center">Links</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? "divide-slate-800/60" : "divide-slate-200"}`}>
                          {sortedItems.map((item) => {
                            const status = item.status || "none";
                            const isLumibricks = selectedBrand.toLowerCase() === "lumibricks";
                            return (
                              <tr key={item.id} className={`transition ${isDark ? (status === "complete" ? "bg-emerald-500/10 hover:bg-emerald-500/15" : status === "incomplete" ? "bg-amber-500/10 hover:bg-amber-500/15" : "hover:bg-slate-800/40") : (status === "complete" ? "bg-emerald-50/80 hover:bg-emerald-100/70" : status === "incomplete" ? "bg-amber-50/80 hover:bg-amber-100/70" : "hover:bg-slate-50")}`}>
                                <td className="py-3 px-3 text-center">
                                  <button onClick={() => cycleSetStatus(item.id)} className="focus:outline-none cursor-pointer p-1" title="Toggle Status">
                                    {status === "complete" ? <CheckCircle2 size={20} className="text-emerald-500" /> : status === "incomplete" ? <AlertCircle size={20} className="text-amber-500" /> : <Circle size={20} className={isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-300 hover:text-slate-500"} />}
                                  </button>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <ImageThumbnail id={item.id} name={item.name} isSet={true} brand={item.brand} imageUrl={item.imageUrl} onClick={() => setModalItem({ ...item, isSet: true })} isDark={isDark} />
                                </td>
                                <td className={`py-3 px-3 font-medium ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                                  <div className="flex items-center gap-2">
                                    <span>{item.name}</span>
                                    {status === "complete" && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-800"}`}>COMPLETE</span>}
                                    {status === "incomplete" && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-800"}`}>INCOMPLETE</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.brand || "LEGO"}</td>
                                <td className="py-3 px-3 text-xs font-semibold text-[#00AEEF]">{item.subtheme}</td>
                                <td className={`py-3 px-3 font-mono text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.setNumber}</td>
                                <td className={`py-3 px-2 text-center text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.year}</td>
                                <td className={`py-3 px-2 text-center text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.pieces}</td>
                                <td className={`py-3 px-3 text-right font-mono font-medium ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                                  {item.usedPrice !== null && item.usedPrice !== undefined ? `${currentCurrencyInfo.symbol}${Number(item.usedPrice).toFixed(2)}` : <span className="text-slate-400 text-xs">--</span>}
                                </td>
                                <td className={`py-3 px-3 text-right font-mono font-medium ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                                  {item.newPrice !== null && item.newPrice !== undefined ? `${currentCurrencyInfo.symbol}${Number(item.newPrice).toFixed(2)}` : <span className="text-slate-400 text-xs">--</span>}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  {!isLumibricks && (
                                    <button onClick={() => syncLivePrice(item.id, true)} disabled={syncingId === item.id} className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-400 hover:text-[#00AEEF] cursor-pointer ${syncingId === item.id ? "animate-spin text-[#00AEEF]" : ""}`}>
                                      <RefreshCw size={14} />
                                    </button>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isLumibricks ? (
                                    <a 
                                      href={getLumibricksUrl(item)} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] shadow-sm transition-all hover:scale-105"
                                      title="Buy new on Lumibricks (Affiliate)"
                                    >
                                      <span>Lumibricks</span> <ExternalLink size={10} className="text-slate-950" />
                                    </a>
                                  ) : (
                                    <a href={getBrickLinkUrl(item, true)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00AEEF] hover:bg-[#009EDB] text-white dark:text-black font-extrabold text-[11px] shadow-sm transition-all hover:scale-105">
                                      <span>BrickLink</span> <ExternalLink size={10} className="text-white dark:text-black" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {modalItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModalItem(null)}>
              <div className={`border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"}`} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setModalItem(null)} className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}><X size={20} /></button>
                <div className={`w-full h-72 rounded-xl border flex items-center justify-center p-4 bg-white ${isDark ? "border-slate-800" : "border-slate-200 shadow-inner"}`}>
                  <img src={modalItem.imageUrl || (modalItem.isSet ? `https://images.brickset.com/sets/images/${modalItem.id}.jpg` : `https://images.brickset.com/minifigs/large/${modalItem.figNum || modalItem.id}.jpg`)} alt={modalItem.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{modalItem.name}</h3>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <footer className={`w-full border-t py-6 transition-colors ${isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-white text-slate-600 shadow-sm"}`}>
        <div className={`mx-auto w-full px-4 md:px-8 space-y-4 ${isFullWidth ? "max-w-full" : "max-w-6xl"}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span>© 2026 <strong className={isDark ? "text-slate-200" : "text-slate-800"}>BrickCollect</strong>.</span>
              <span>•</span>
              <span>A project by <strong className={isDark ? "text-slate-300" : "text-slate-700"}>The Art of Bricks</strong></span>
              <span>•</span>
              <button 
                onClick={() => setViewMode("affiliates")} 
                className="hover:underline text-[#00AEEF] font-semibold cursor-pointer"
              >
                Affiliate Disclosure
              </button>
            </div>
            <div className="flex items-center gap-5 text-xs font-bold">
              <a href="https://www.youtube.com/@theartofbricks" target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 transition ${isDark ? "text-slate-400 hover:text-red-500" : "text-slate-600 hover:text-red-600"}`}>
                <YouTubeIcon className="w-4 h-4 text-red-500" />
                <span>@theartofbricks</span>
              </a>
              <a href="https://www.instagram.com/the_artofbricks" target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 transition ${isDark ? "text-slate-400 hover:text-pink-500" : "text-slate-600 hover:text-pink-600"}`}>
                <InstagramIcon className="w-4 h-4 text-pink-500" />
                <span>@the_artofbricks</span>
              </a>
            </div>
          </div>
          <div className={`text-[10px] text-center border-t pt-3 space-y-1 ${isDark ? "border-slate-800/80 text-slate-500" : "border-slate-200 text-slate-500"}`}>
            <div>Data source: <a href="https://www.rebrickable.com" target="_blank" rel="noreferrer" className="underline hover:text-[#00AEEF]">Rebrickable</a>. This site is a personal project and is not affiliated with, authorized, or endorsed by the LEGO Group.</div>
            <div>LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}