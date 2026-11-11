import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Search, 
  ChevronRight, 
  Mail, 
  Phone, 
  MapPin,
  X, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  AlertCircle,
  Copy,
  Check,
  FileText,
  ExternalLink,
  History,
  FolderKanban
} from 'lucide-react';
import { Client, Project, SPK } from '../../types';

// Types for Project Issue in Section 1
export interface ProjectIssue {
  tipe: 'spk_belum_terverifikasi' | 'akan_berakhir';
  hari: number;
}

export interface ClientProjectItem {
  id: string;
  kodeProyek: string;
  nama: string;
  isu: ProjectIssue | null;
}

export interface ClientPengajuanItem {
  kodeFpk: string;
  status: string;
  terlambatHari: number;
}

export interface ClientTableRow {
  id: string;
  kode: string;
  nama: string;
  sektor: string;
  alamat: string;
  narahubung: {
    nama: string;
    jabatan: string;
    email: string;
    telepon: string;
  };
  status: 'aktif' | 'calon' | 'tidak_aktif';
  diperbaruiPada: string; // ISO date or "YYYY-MM-DD"
  diperbaruiFormat: string; // "11 Nov 2026"
  proyek: ClientProjectItem[];
  pengajuan: ClientPengajuanItem | null;
  perluPerhatian: boolean;
  tingkatIsu: 'merah' | 'kuning' | 'tidak_ada';
  rawClient: Client;
}

export type SortColumn = 'klien' | 'proyek' | 'diperbarui' | null;
export type SortDirection = 'asc' | 'desc' | null;
export type FilterTab = 'semua' | 'aktif' | 'calon' | 'perhatian';

export const ClientsView: React.FC = () => {
  const { clients, projects, fpks, spks, setSelectedProjectId, setActiveView } = useApp();

  // URL state synchronization helper
  const getUrlParams = useCallback(() => {
    if (typeof window === 'undefined') return { tab: 'semua', q: '', sort: null, detail: null };
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const tab: FilterTab = (tabParam === 'aktif' || tabParam === 'calon' || tabParam === 'perhatian') ? tabParam : 'semua';
    const q = params.get('q') || '';
    const sort = params.get('sort') || null;
    const detail = params.get('detail') || null;
    return { tab, q, sort, detail };
  }, []);

  const initialParams = getUrlParams();
  const [filterTab, setFilterTab] = useState<FilterTab>(initialParams.tab);
  const [searchQuery, setSearchQuery] = useState<string>(initialParams.q);
  const [sortColumn, setSortColumn] = useState<SortColumn>(() => {
    if (initialParams.sort?.startsWith('klien_')) return 'klien';
    if (initialParams.sort?.startsWith('proyek_')) return 'proyek';
    if (initialParams.sort?.startsWith('diperbarui_')) return 'diperbarui';
    return null;
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    if (initialParams.sort?.endsWith('_asc')) return 'asc';
    if (initialParams.sort?.endsWith('_desc')) return 'desc';
    return null;
  });
  const [detailClientCode, setDetailClientCode] = useState<string | null>(initialParams.detail);

  // Document preview modal state
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string } | null>(null);

  // Tooltip & copy feedback states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Popover state for "n proyek"
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popoverCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  // Drawer accessibility ref
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Helper date formatting
  const formatReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${monthNames[month]} ${year}`;
  };

  // Clean project title
  const getCleanProjectName = (p: { name: string; clientName: string }) => {
    let name = p.name;
    if (name.includes('—')) {
      name = name.split('—')[1].trim();
    } else if (name.startsWith(p.clientName)) {
      name = name.replace(p.clientName, '').replace(/^[-–—\s]+/, '').trim();
    }
    return name.replace(/^Aktif\s*·\s*/i, '').trim() || 'Pengamanan Fasilitas Lapangan';
  };

  // Section 1: Process and normalize each client into full data model
  const clientRows: ClientTableRow[] = useMemo(() => {
    return clients.map((c) => {
      const clientProjects = projects.filter(p => p.clientId === c.id);
      const clientSPKs = spks.filter(s => clientProjects.some(p => p.spkIds.includes(s.id)));
      const clientFpk = fpks.find(f => f.clientId === c.id);

      // Normalize client projects with issues
      const normalizedProjects: ClientProjectItem[] = clientProjects.map(p => {
        const pSpks = spks.filter(s => p.spkIds.includes(s.id));
        const expiringSpk = pSpks.find(s => s.isExpiringSoon || (s.daysToExpiration && s.daysToExpiration <= 75));

        let isu: ProjectIssue | null = null;
        if (p.isJalanTanpaSPK) {
          isu = {
            tipe: 'spk_belum_terverifikasi',
            hari: p.daysOperatingWithoutSPK || 13,
          };
        } else if (expiringSpk && typeof expiringSpk.daysToExpiration === 'number') {
          isu = {
            tipe: 'akan_berakhir',
            hari: expiringSpk.daysToExpiration,
          };
        }

        return {
          id: p.id,
          kodeProyek: p.projectCode,
          nama: getCleanProjectName(p),
          isu,
        };
      });

      // Calon klien pengajuan check
      let pengajuan: ClientPengajuanItem | null = null;
      let isCalonKlienOverdue = false;
      if (c.contractStatus !== 'Active' || c.status === 'calon') {
        const isOverdue = clientFpk?.targetStartDate && clientFpk.targetStartDate < '2026-11-11';
        if (clientFpk) {
          pengajuan = {
            kodeFpk: clientFpk.fpkNumber,
            status: clientFpk.status === 'Pending BOD' ? 'Menunggu persetujuan Direksi' : clientFpk.status,
            terlambatHari: isOverdue ? 2 : 0,
          };
          if (isOverdue) isCalonKlienOverdue = true;
        }
      }

      // Check issues level
      const hasRedIssue = normalizedProjects.some(p => p.isu?.tipe === 'spk_belum_terverifikasi');
      const hasYellowIssue = normalizedProjects.some(p => p.isu?.tipe === 'akan_berakhir') || isCalonKlienOverdue;

      let tingkatIsu: 'merah' | 'kuning' | 'tidak_ada' = 'tidak_ada';
      if (hasRedIssue) tingkatIsu = 'merah';
      else if (hasYellowIssue) tingkatIsu = 'kuning';

      const perluPerhatian = tingkatIsu !== 'tidak_ada';

      // Normalized status
      let normalizedStatus: 'aktif' | 'calon' | 'tidak_aktif' = 'aktif';
      if (c.contractStatus !== 'Active' || c.status === 'calon') {
        normalizedStatus = 'calon';
      }

      // Last updated date
      const rawDate = c.updatedAt || '2026-11-10';

      return {
        id: c.id,
        kode: c.code,
        nama: c.name,
        sektor: c.industry,
        alamat: c.address || 'Alamat kantor pusat resmi belum tercatat',
        narahubung: {
          nama: c.contactPerson,
          jabatan: c.contactRole || 'Penanggung Jawab Klien',
          email: c.email,
          telepon: c.phone,
        },
        status: normalizedStatus,
        diperbaruiPada: rawDate,
        diperbaruiFormat: formatReadableDate(rawDate),
        proyek: normalizedProjects,
        pengajuan,
        perluPerhatian,
        tingkatIsu,
        rawClient: c,
      };
    });
  }, [clients, projects, spks, fpks]);

  // Sync URL query string when filter, search, sort, or detail changes
  const updateUrl = useCallback((newTab: FilterTab, newQ: string, newCol: SortColumn, newDir: SortDirection, newDetail: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.pathname = '/klien';

    if (newTab !== 'semua') url.searchParams.set('tab', newTab);
    else url.searchParams.delete('tab');

    if (newQ.trim()) url.searchParams.set('q', newQ.trim());
    else url.searchParams.delete('q');

    if (newCol && newDir) url.searchParams.set('sort', `${newCol}_${newDir}`);
    else url.searchParams.delete('sort');

    if (newDetail) url.searchParams.set('detail', newDetail);
    else url.searchParams.delete('detail');

    window.history.pushState(null, '', url.pathname + (url.search || ''));
  }, []);

  // Handle browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const p = getUrlParams();
      setFilterTab(p.tab);
      setSearchQuery(p.q);
      if (p.sort?.startsWith('klien_')) {
        setSortColumn('klien');
        setSortDirection(p.sort.endsWith('_asc') ? 'asc' : 'desc');
      } else if (p.sort?.startsWith('proyek_')) {
        setSortColumn('proyek');
        setSortDirection(p.sort.endsWith('_asc') ? 'asc' : 'desc');
      } else if (p.sort?.startsWith('diperbarui_')) {
        setSortColumn('diperbarui');
        setSortDirection(p.sort.endsWith('_asc') ? 'asc' : 'desc');
      } else {
        setSortColumn(null);
        setSortDirection(null);
      }
      setDetailClientCode(p.detail);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getUrlParams]);

  // Search filter matching: nama klien, kode, sektor, nama narahubung, nama proyek
  const searchMatches = useCallback((row: ClientTableRow, query: string) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    if (row.nama.toLowerCase().includes(q)) return true;
    if (row.kode.toLowerCase().includes(q)) return true;
    if (row.sektor.toLowerCase().includes(q)) return true;
    if (row.alamat.toLowerCase().includes(q)) return true;
    if (row.narahubung.nama.toLowerCase().includes(q)) return true;
    if (row.narahubung.email.toLowerCase().includes(q)) return true;
    if (row.proyek.some(p => p.nama.toLowerCase().includes(q) || p.kodeProyek.toLowerCase().includes(q))) return true;
    return false;
  }, []);

  // Section 2 & 9: Tab counts update live based on search query!
  const tabCounts = useMemo(() => {
    const matchingSearch = clientRows.filter(r => searchMatches(r, searchQuery));
    return {
      semua: matchingSearch.length,
      aktif: matchingSearch.filter(r => r.status === 'aktif').length,
      calon: matchingSearch.filter(r => r.status === 'calon').length,
      perhatian: matchingSearch.filter(r => r.perluPerhatian).length,
    };
  }, [clientRows, searchQuery, searchMatches]);

  // Apply tab filter & search
  const filteredRows = useMemo(() => {
    return clientRows.filter(row => {
      // Search match
      if (!searchMatches(row, searchQuery)) return false;

      // Tab filter
      if (filterTab === 'aktif') return row.status === 'aktif';
      if (filterTab === 'calon') return row.status === 'calon';
      if (filterTab === 'perhatian') return row.perluPerhatian;

      return true;
    });
  }, [clientRows, filterTab, searchQuery, searchMatches]);

  // Section 3: Sorting logic
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      // 1. Column Sort (if user clicked a sortable header)
      if (sortColumn && sortDirection) {
        if (sortColumn === 'klien') {
          const comp = a.nama.localeCompare(b.nama, 'id');
          return sortDirection === 'asc' ? comp : -comp;
        }
        if (sortColumn === 'proyek') {
          const comp = a.proyek.length - b.proyek.length;
          return sortDirection === 'asc' ? comp : -comp;
        }
        if (sortColumn === 'diperbarui') {
          const comp = a.diperbaruiPada.localeCompare(b.diperbaruiPada);
          return sortDirection === 'asc' ? comp : -comp;
        }
      }

      // 2. Default Order (without column sort):
      // 1. Klien dengan isu merah (hari terbanyak di atas)
      // 2. Klien dengan isu kuning (hari tersisa paling sedikit di atas)
      // 3. Calon klien yang pengajuannya terlambat
      // 4. Sisanya A–Z
      const aIsRed = a.tingkatIsu === 'merah';
      const bIsRed = b.tingkatIsu === 'merah';
      if (aIsRed && !bIsRed) return -1;
      if (!aIsRed && bIsRed) return 1;
      if (aIsRed && bIsRed) {
        const aRedDays = Math.max(...a.proyek.filter(p => p.isu?.tipe === 'spk_belum_terverifikasi').map(p => p.isu!.hari), 0);
        const bRedDays = Math.max(...b.proyek.filter(p => p.isu?.tipe === 'spk_belum_terverifikasi').map(p => p.isu!.hari), 0);
        return bRedDays - aRedDays; // Longest running first
      }

      const aIsYellow = a.tingkatIsu === 'kuning';
      const bIsYellow = b.tingkatIsu === 'kuning';
      if (aIsYellow && !bIsYellow) return -1;
      if (!aIsYellow && bIsYellow) return 1;
      if (aIsYellow && bIsYellow) {
        // Expiring soon projects: soonest remaining days first
        const aExpiring = a.proyek.filter(p => p.isu?.tipe === 'akan_berakhir').map(p => p.isu!.hari);
        const bExpiring = b.proyek.filter(p => p.isu?.tipe === 'akan_berakhir').map(p => p.isu!.hari);
        const aMinDays = aExpiring.length > 0 ? Math.min(...aExpiring) : 999;
        const bMinDays = bExpiring.length > 0 ? Math.min(...bExpiring) : 999;
        if (aMinDays !== bMinDays) return aMinDays - bMinDays;

        // Or overdue calon klien
        if (a.pengajuan?.terlambatHari && !b.pengajuan?.terlambatHari) return -1;
        if (!a.pengajuan?.terlambatHari && b.pengajuan?.terlambatHari) return 1;
      }

      return a.nama.localeCompare(b.nama, 'id');
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Column header click toggler: asc -> desc -> null (default)
  const handleSortClick = (col: SortColumn) => {
    let nextCol: SortColumn = col;
    let nextDir: SortDirection = 'asc';

    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        nextDir = 'desc';
      } else if (sortDirection === 'desc') {
        nextCol = null;
        nextDir = null;
      }
    }

    setSortColumn(nextCol);
    setSortDirection(nextDir);
    updateUrl(filterTab, searchQuery, nextCol, nextDir, detailClientCode);
  };

  // Change tab
  const handleTabChange = (tab: FilterTab) => {
    setFilterTab(tab);
    updateUrl(tab, searchQuery, sortColumn, sortDirection, detailClientCode);
  };

  // Change search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    updateUrl(filterTab, val, sortColumn, sortDirection, detailClientCode);
  };

  // Open detail drawer
  const openDetailDrawer = (code: string) => {
    setDetailClientCode(code);
    updateUrl(filterTab, searchQuery, sortColumn, sortDirection, code);
  };

  // Close detail drawer
  const closeDetailDrawer = () => {
    setDetailClientCode(null);
    updateUrl(filterTab, searchQuery, sortColumn, sortDirection, null);
  };

  // Active detail client
  const activeDetailClient = useMemo(() => {
    if (!detailClientCode) return null;
    return clientRows.find(c => c.kode.toLowerCase() === detailClientCode.toLowerCase() || c.id === detailClientCode) || null;
  }, [detailClientCode, clientRows]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  // Popover handlers
  const handleMouseEnterProject = (clientId: string, el: HTMLElement) => {
    if (popoverCloseTimeoutRef.current) {
      clearTimeout(popoverCloseTimeoutRef.current);
      popoverCloseTimeoutRef.current = null;
    }
    activeTriggerRef.current = el;
    popoverTimeoutRef.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + window.scrollY + 6,
        left: Math.max(12, rect.left + window.scrollX - 40),
      });
      setHoveredClientId(clientId);
    }, 300);
  };

  const handleMouseLeaveProject = () => {
    if (popoverTimeoutRef.current) {
      clearTimeout(popoverTimeoutRef.current);
      popoverTimeoutRef.current = null;
    }
    popoverCloseTimeoutRef.current = setTimeout(() => {
      setHoveredClientId(null);
      setPopoverPosition(null);
    }, 150);
  };

  const handlePopoverMouseEnter = () => {
    if (popoverCloseTimeoutRef.current) {
      clearTimeout(popoverCloseTimeoutRef.current);
      popoverCloseTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    popoverCloseTimeoutRef.current = setTimeout(() => {
      setHoveredClientId(null);
      setPopoverPosition(null);
    }, 150);
  };

  // Keyboard navigation & Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDoc) {
          setPreviewDoc(null);
        } else if (hoveredClientId) {
          setHoveredClientId(null);
          setPopoverPosition(null);
        } else if (detailClientCode) {
          closeDetailDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailClientCode, hoveredClientId, previewDoc]);

  const activeHoveredRow = useMemo(() => {
    if (!hoveredClientId) return null;
    return clientRows.find(r => r.id === hoveredClientId) || null;
  }, [hoveredClientId, clientRows]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 font-sans">
      
      {/* 1. Header Direktori Klien */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Direktori Klien
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Informasi resmi perusahaan, narahubung utama, dan rekapitulasi status proyek kerja sama.
        </p>
      </div>

      {/* 2. Toolbar: Filter Tabs & Search Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => handleTabChange('semua')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'semua'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({tabCounts.semua})
          </button>

          <button
            onClick={() => handleTabChange('aktif')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'aktif'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Klien Aktif ({tabCounts.aktif})
          </button>

          <button
            onClick={() => handleTabChange('calon')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'calon'
                ? 'bg-white text-sky-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Calon Klien ({tabCounts.calon})
          </button>

          <button
            onClick={() => handleTabChange('perhatian')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'perhatian'
                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                : 'text-rose-700/80 hover:text-rose-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>● Perlu Perhatian ({tabCounts.perhatian})</span>
          </button>
        </div>

        {/* Search Box on Right */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari klien, narahubung, atau proyek…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            aria-label="Cari direktori klien"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Result feedback when searching */}
      {searchQuery && (
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span>
            Menampilkan <strong className="text-slate-900 font-bold">{sortedRows.length}</strong> hasil pencarian untuk &ldquo;{searchQuery}&rdquo;
          </span>
          <button
            onClick={() => handleSearchChange('')}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Hapus pencarian
          </button>
        </div>
      )}

      {/* 3. Empty States */}
      {sortedRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            {searchQuery ? <Search className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">
              {searchQuery ? `Tidak ada klien yang cocok dengan "${searchQuery}".` : (
                filterTab === 'perhatian' ? '✓ Seluruh klien dalam kondisi baik.' : 'Tidak ada data klien'
              )}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery 
                ? 'Periksa kembali ejaan kata kunci atau gunakan nama narahubung / proyek lainnya.'
                : (filterTab === 'perhatian' ? 'Tidak ada proyek yang memiliki masalah kontrak atau pengajuan terlambat saat ini.' : '')}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-block"
            >
              Hapus pencarian
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 3. Desktop / Tablet Table View (md:block) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 z-10 text-[11px] font-semibold text-slate-600">
                  <tr>
                    {/* Kolom 1: Klien (Sortable) */}
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none" onClick={() => handleSortClick('klien')}>
                      <div className="flex items-center gap-1.5">
                        <span>Klien</span>
                        {sortColumn === 'klien' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    {/* Kolom 2: Narahubung & Kontak (Tidak sortable) */}
                    <th className="px-4 py-3">
                      Narahubung & Kontak
                    </th>

                    {/* Kolom 3: Proyek (Sortable) */}
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none" onClick={() => handleSortClick('proyek')}>
                      <div className="flex items-center gap-1.5">
                        <span>Proyek</span>
                        {sortColumn === 'proyek' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    {/* Kolom 4: Status (Tidak sortable) */}
                    <th className="px-4 py-3">
                      Status
                    </th>

                    {/* Kolom 5: Diperbarui (Sortable) */}
                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none" onClick={() => handleSortClick('diperbarui')}>
                      <div className="flex items-center gap-1.5">
                        <span>Diperbarui</span>
                        {sortColumn === 'diperbarui' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    {/* Kolom 6: Chevron */}
                    <th className="px-3 py-3 text-right">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sortedRows.map((row) => {
                    const isRed = row.tingkatIsu === 'merah';
                    const isYellow = row.tingkatIsu === 'kuning';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => openDetailDrawer(row.kode)}
                        className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
                      >
                        {/* 1. Klien */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {row.nama}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            <span className="font-mono font-semibold text-slate-700">{row.kode}</span> · {row.sektor}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 max-w-xs truncate" title={row.alamat}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{row.alamat}</span>
                          </div>
                        </td>

                        {/* 2. Narahubung & Kontak: Nama, Email, dan No. Telepon muncul langsung di tabel */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1 min-w-[210px]">
                            {/* Nama Narahubung */}
                            <div className="font-bold text-slate-900 text-xs">
                              {row.narahubung.nama}
                            </div>
                            
                            {/* Email */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <a
                                href={`mailto:${row.narahubung.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-indigo-600 hover:underline truncate"
                                title={`Kirim email ke ${row.narahubung.email}`}
                              >
                                {row.narahubung.email}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(row.narahubung.email, `email-${row.id}`, e)}
                                className="p-0.5 hover:text-slate-900 text-slate-400 rounded transition-colors shrink-0"
                                title="Salin email"
                              >
                                {copiedKey === `email-${row.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>

                            {/* Telepon */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <a
                                href={`tel:${row.narahubung.telepon}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono hover:text-indigo-600 hover:underline"
                                title={`Hubungi ${row.narahubung.telepon}`}
                              >
                                {row.narahubung.telepon}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(row.narahubung.telepon, `phone-${row.id}`, e)}
                                className="p-0.5 hover:text-slate-900 text-slate-400 rounded transition-colors shrink-0"
                                title="Salin telepon"
                              >
                                {copiedKey === `phone-${row.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. Proyek: "n proyek" + titik isu selalu terlihat */}
                        <td className="px-4 py-3.5">
                          {row.proyek.length > 0 ? (
                            <div 
                              className="inline-flex items-center gap-1.5 relative group/proj focus:outline-hidden"
                              tabIndex={0}
                              onMouseEnter={(e) => handleMouseEnterProject(row.id, e.currentTarget)}
                              onMouseLeave={handleMouseLeaveProject}
                              onFocus={(e) => handleMouseEnterProject(row.id, e.currentTarget)}
                              onBlur={handleMouseLeaveProject}
                              onClick={(e) => {
                                // Touch screen tap opens/toggles popover without opening drawer
                                e.stopPropagation();
                                if (hoveredClientId === row.id) {
                                  setHoveredClientId(null);
                                } else {
                                  handleMouseEnterProject(row.id, e.currentTarget);
                                }
                              }}
                            >
                              <span className="font-semibold text-slate-900 hover:underline">
                                {row.proyek.length} proyek
                              </span>

                              {/* Titik Isu WAJIB selalu terlihat */}
                              {isRed && (
                                <span className="flex h-2 w-2 relative" title="Terdapat proyek dengan SPK belum terverifikasi">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                  <span className="sr-only">1 proyek perlu perhatian (SPK belum terverifikasi)</span>
                                </span>
                              )}
                              {!isRed && isYellow && (
                                <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" title="Terdapat proyek dengan kontrak segera berakhir">
                                  <span className="sr-only">1 proyek perlu perhatian (kontrak akan segera berakhir)</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">—</span>
                          )}
                        </td>

                        {/* 4. Status Badge */}
                        <td className="px-4 py-3.5">
                          {row.status === 'aktif' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Klien Aktif
                            </span>
                          ) : row.status === 'calon' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              Calon Klien
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              Tidak Aktif
                            </span>
                          )}
                        </td>

                        {/* 5. Diperbarui */}
                        <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {row.diperbaruiFormat}
                        </td>

                        {/* 6. Chevron */}
                        <td className="px-3 py-3.5 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Mobile View (< 768px): Stacked list without horizontal scroll */}
          <div className="md:hidden space-y-2.5">
            {sortedRows.map((row) => {
              const isRed = row.tingkatIsu === 'merah';
              const isYellow = row.tingkatIsu === 'kuning';

              return (
                <div
                  key={row.id}
                  onClick={() => openDetailDrawer(row.kode)}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5 active:bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {row.nama}
                      </h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-slate-700">{row.kode}</span> · {row.sektor}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate" title={row.alamat}>
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{row.alamat}</span>
                      </div>
                    </div>
                    {row.status === 'aktif' ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                        Klien Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md shrink-0">
                        Calon Klien
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-900">
                      {row.narahubung.nama}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <a 
                        href={`mailto:${row.narahubung.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-indigo-600 hover:underline truncate"
                      >
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{row.narahubung.email}</span>
                      </a>
                      <a 
                        href={`tel:${row.narahubung.telepon}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 font-mono text-slate-700 hover:underline"
                      >
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{row.narahubung.telepon}</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 font-medium">Proyek:</span>
                      {row.proyek.length > 0 ? (
                        <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                          {row.proyek.length} proyek
                          {isRed && <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>}
                          {!isRed && isYellow && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 inline-flex items-center gap-0.5">
                      Rincian <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. Popover Proyek (Floating on hover "n proyek") */}
      {hoveredClientId && activeHoveredRow && popoverPosition && activeHoveredRow.proyek.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: popoverPosition.top,
            left: popoverPosition.left,
          }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="z-40 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 text-xs font-sans"
        >
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>Proyek Berjalan ({activeHoveredRow.proyek.length})</span>
            <span className="text-[10px] font-mono text-slate-400">{activeHoveredRow.kode}</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {activeHoveredRow.proyek.slice(0, 5).map((p) => (
              <div 
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProjectId(p.id);
                  setActiveView('project-detail', p.id);
                }}
                className="p-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors space-y-0.5 group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-indigo-600 text-xs leading-snug">
                  {p.nama}
                </div>
                {p.isu?.tipe === 'spk_belum_terverifikasi' && (
                  <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                    <span>🔴 Belum terverifikasi · {p.isu.hari} hari</span>
                  </div>
                )}
                {p.isu?.tipe === 'akan_berakhir' && (
                  <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Berakhir dalam {p.isu.hari} hari</span>
                  </div>
                )}
              </div>
            ))}
            {activeHoveredRow.proyek.length > 5 && (
              <div className="text-[11px] text-slate-500 font-medium px-1.5 pt-1 italic">
                +{activeHoveredRow.proyek.length - 5} proyek lainnya
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-2 text-right">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to /proyek?klien=KODE
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', `/proyek?klien=${activeHoveredRow.kode}`);
                }
                setActiveView('projects');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
            >
              <span>Lihat di Daftar Proyek</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Panel Detail Klien (Drawer from right, width ±480px) */}
      {activeDetailClient && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in"
          onClick={closeDetailDrawer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-drawer-title"
        >
          <div 
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md md:max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                    {activeDetailClient.kode}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-semibold text-slate-600">{activeDetailClient.sektor}</span>
                </div>
                <h2 id="client-drawer-title" className="text-lg font-bold text-slate-900">
                  {activeDetailClient.nama}
                </h2>
                <div className="pt-1">
                  {activeDetailClient.status === 'aktif' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Klien Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      Calon Klien
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={closeDetailDrawer}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Tutup panel detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-700">
              
              {/* Alamat Kantor Pusat */}
              <div className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    Alamat Kantor Pusat
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(activeDetailClient.alamat, 'drawer-address', e)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 p-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    {copiedKey === 'drawer-address' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600 text-[11px]">Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-medium">
                  {activeDetailClient.alamat}
                </p>
              </div>

              {/* 5.2 Narahubung */}
              <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider text-[11px] text-slate-500">
                  Narahubung Resmi
                </span>
                <div className="space-y-2">
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">
                      {activeDetailClient.narahubung.nama}
                    </strong>
                    <span className="text-xs text-slate-600 font-medium block">
                      {activeDetailClient.narahubung.jabatan}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                      <div className="flex items-center gap-1.5">
                        <a 
                          href={`mailto:${activeDetailClient.narahubung.email}`}
                          className="text-xs font-semibold text-indigo-600 hover:underline truncate"
                        >
                          {activeDetailClient.narahubung.email}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(activeDetailClient.narahubung.email, 'drawer-email', e)}
                          className="p-1 hover:text-slate-900 text-slate-400 rounded transition-colors"
                          title="Salin email"
                        >
                          {copiedKey === 'drawer-email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Telepon</span>
                      <div className="flex items-center gap-1.5">
                        <a 
                          href={`tel:${activeDetailClient.narahubung.telepon}`}
                          className="text-xs font-mono font-semibold text-slate-800 hover:text-indigo-600"
                        >
                          {activeDetailClient.narahubung.telepon}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(activeDetailClient.narahubung.telepon, 'drawer-phone', e)}
                          className="p-1 hover:text-slate-900 text-slate-400 rounded transition-colors"
                          title="Salin telepon"
                        >
                          {copiedKey === 'drawer-phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5.3 Proyek Berjalan (n) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    Proyek Berjalan ({activeDetailClient.proyek.length})
                  </span>
                  {activeDetailClient.proyek.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.history.pushState(null, '', `/proyek?klien=${activeDetailClient.kode}`);
                        }
                        setActiveView('projects');
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                    >
                      <span>Lihat di Daftar Proyek</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {activeDetailClient.proyek.length > 0 ? (
                  <div className="space-y-2">
                    {activeDetailClient.proyek.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setActiveView('project-detail', p.id);
                        }}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {p.kodeProyek}
                            </span>
                            <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {p.nama}
                            </span>
                          </div>
                          {p.isu?.tipe === 'spk_belum_terverifikasi' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                              🔴 Belum terverifikasi · {p.isu.hari} hari
                            </span>
                          )}
                          {p.isu?.tipe === 'akan_berakhir' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Berakhir dalam {p.isu.hari} hari
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-center">
                    Belum ada proyek berjalan untuk klien ini.
                  </div>
                )}
              </div>

              {/* 5.4 Khusus Calon Klien: Kotak Pengajuan */}
              {activeDetailClient.status === 'calon' && activeDetailClient.pengajuan && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Status Pengajuan Kerja Sama</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    Pengajuan <strong className="font-mono">{activeDetailClient.pengajuan.kodeFpk}</strong> sedang {activeDetailClient.pengajuan.status.toLowerCase()}
                    {activeDetailClient.pengajuan.terlambatHari > 0 ? (
                      <span className="text-rose-700 font-bold"> · terlambat {activeDetailClient.pengajuan.terlambatHari} hari</span>
                    ) : ''}.
                  </p>
                  <button
                    onClick={() => setActiveView('fpk')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1"
                  >
                    <span>Lihat Pengajuan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 5.5 Dokumen Klien */}
              <div className="space-y-3">
                <span className="font-bold text-slate-900 text-xs block">
                  Dokumen Legal & Kerja Sama
                </span>
                <div className="space-y-2">
                  {[
                    { name: `Dokumen_KerjaSama_${activeDetailClient.kode}.pdf`, type: 'Perjanjian Induk' },
                    { name: `Profil_Perusahaan_${activeDetailClient.kode}.pdf`, type: 'Profil & Kepatuhan' },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-indigo-600 block text-xs">
                            {doc.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{doc.type}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 5.6 Riwayat Aktivitas Klien */}
              <div className="space-y-3">
                <span className="font-bold text-slate-900 text-xs block">
                  Riwayat Aktivitas Terakhir
                </span>
                <div className="space-y-2.5 border-l-2 border-slate-200 pl-3 ml-1">
                  {[
                    { title: 'Verifikasi status kepatuhan berkas', date: '10 Nov 2026', user: 'Legal & Risk' },
                    { title: 'Pembaruan data narahubung utama', date: '04 Nov 2026', user: 'Dimas Wicaksono (Marketing)' },
                    { title: 'Sinkronisasi proyek dan personel aktif', date: '28 Okt 2026', user: 'Sistem Operasional' },
                    { title: 'Pemeriksaan berkas administrasi berkala', date: '15 Okt 2026', user: 'Siti Rahma (Finance)' },
                    { title: 'Konfirmasi penugasan wilayah operasional', date: '01 Okt 2026', user: 'Hendra Setiawan (PIC Area)' },
                  ].map((hist, idx) => (
                    <div key={idx} className="space-y-0.5 text-[11px]">
                      <div className="font-semibold text-slate-800">{hist.title}</div>
                      <div className="text-slate-400 text-[10px]">{hist.date} · oleh {hist.user}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Terakhir diperbarui: {activeDetailClient.diperbaruiFormat}
              </span>
              <button
                onClick={closeDetailDrawer}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">{previewDoc.name}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Pratinjau Dokumen Resmi JISS</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Dokumen terenkripsi dan diverifikasi sah oleh Divisi Legal & Keuangan PT JISS.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
