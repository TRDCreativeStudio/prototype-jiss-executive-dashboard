import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ChevronDown, Building2, MapPin, Check,
  AlertCircle, X, ChevronUp, Copy, Calendar, Shield, ArrowLeft, Camera, FileCheck
} from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Input, Select, toast, Modal, cx } from '../../ui/kit';
import { navigate, Link } from '../../router';
import { latest } from '../../domain/selectors';
import { TODAY, fmtDate, fmtRp, diffDays } from '../../domain/time';
import type { FpkInput } from '../../store/fpkActions';
import type { FpkType, Shift } from '../../domain/types';

interface FormLine {
  id?: string;
  positionId: string;
  qty: number;
  shift: Shift;
  notes?: string;
  showNote?: boolean;
}

const PT_LIST = [
  'PT Jaga Integritas Sarana Sukses',
  'PT Jaga Nusantara Sentosa',
  'PT Jasa Integritas Solusindo'
];

const PROVINCES_DATA: Record<string, { city: string; areaId: string }[]> = {
  'Jawa Barat': [
    { city: 'Bekasi (Kota / Kab)', areaId: 'a-bks' },
    { city: 'Karawang', areaId: 'a-krw' },
    { city: 'Bogor (Kota / Kab)', areaId: 'a-bgr' },
    { city: 'Depok', areaId: 'a-jks' },
    { city: 'Bandung', areaId: 'a-bks' },
  ],
  'DKI Jakarta': [
    { city: 'Jakarta Selatan', areaId: 'a-jks' },
    { city: 'Jakarta Pusat', areaId: 'a-jkp' },
    { city: 'Jakarta Barat', areaId: 'a-jkp' },
    { city: 'Jakarta Timur', areaId: 'a-jks' },
    { city: 'Jakarta Utara', areaId: 'a-jkp' },
  ],
  'Banten': [
    { city: 'Tangerang (Kota / Kab)', areaId: 'a-tgr' },
    { city: 'Tangerang Selatan', areaId: 'a-tgr' },
    { city: 'Serang', areaId: 'a-tgr' },
    { city: 'Cilegon', areaId: 'a-tgr' },
  ],
  'Jawa Timur': [
    { city: 'Surabaya', areaId: 'a-sby' },
    { city: 'Sidoarjo', areaId: 'a-sby' },
    { city: 'Gresik', areaId: 'a-sby' },
  ],
  'Jawa Tengah': [
    { city: 'Semarang', areaId: 'a-smg' },
    { city: 'Surakarta (Solo)', areaId: 'a-smg' },
  ],
};

const makeCode = (name: string, prefix = '') => {
  const letters = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return letters ? `${prefix}${letters}` : `${prefix}NEW`;
};

// Format ribuan Indonesia memakai titik (50.000.000)
const formatNumberWithDots = (num: number | string) => {
  if (!num && num !== 0) return '';
  const str = num.toString().replace(/[^0-9]/g, '');
  if (!str) return '';
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const calculateEndDate = (startDate: string, months: number): string => {
  if (!startDate) return '';
  const [y, m, d] = startDate.slice(0, 10).split('-').map(Number);
  const targetMonth = m - 1 + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(d, daysInMonth);
  // Kontrak berakhir sehari sebelum tanggal yang sama di bulan ke-N (1 Jan → 31 Des)
  const date = new Date(Date.UTC(targetYear, normalizedMonth, targetDay - 1));
  return date.toISOString().slice(0, 10);
};

// Buka kalender saat area field mana pun diklik, bukan hanya ikonnya
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker(); } catch { /* browser lama: fallback ke perilaku bawaan */ }
};

const DURATION_PRESETS = ['6', '12', '24'] as const;
type DurationPreset = typeof DURATION_PRESETS[number];

const presetFor = (start: string, end: string): DurationPreset | null => {
  if (!start || !end) return null;
  return DURATION_PRESETS.find(m => end === calculateEndDate(start, Number(m))) ?? null;
};

export const FpkFormPage: React.FC<{ fpkId?: string }> = ({ fpkId }) => {
  const { state, lookups, actions } = useStore();
  const existing = fpkId ? lookups.fpk.get(fpkId) : undefined;
  const mode: 'baru' | 'draf' | 'versi' = !existing ? 'baru' : existing.status === 'draf' ? 'draf' : 'versi';
  const base = existing ? latest(existing) : undefined;
  const type: FpkType = existing?.type ?? 'baru';
  const [parentFpkId] = useState(existing?.parentFpkId ?? '');

  // 1 · Klien & site
  const [clientId, setClientId] = useState(base?.clientId ?? '');
  const [newClient, setNewClient] = useState<null | { code: string; name: string; billingAddress: string }>(null);
  const [clientSearchText, setClientSearchText] = useState(base?.clientId ? lookups.client.get(base.clientId)?.name ?? '' : '');
  const [isClientOpen, setIsClientOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [siteId, setSiteId] = useState(base?.siteId ?? '');
  const [newSite, setNewSite] = useState<null | { code: string; name: string; address: string; areaId: string }>(null);
  const [siteSearchText, setSiteSearchText] = useState(base?.siteId ? lookups.site.get(base.siteId)?.name ?? '' : '');
  const [isSiteOpen, setIsSiteOpen] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);
  const [siteRunningDismissed, setSiteRunningDismissed] = useState(false);

  const [newSiteProvince, setNewSiteProvince] = useState<string>('Jawa Barat');
  const [newSiteCity, setNewSiteCity] = useState<string>('Bekasi (Kota / Kab)');

  const handleProvinceChange = (prov: string) => {
    setNewSiteProvince(prov);
    const cities = PROVINCES_DATA[prov] || [];
    const first = cities[0];
    if (first) {
      setNewSiteCity(first.city);
      if (newSite) setNewSite({ ...newSite, areaId: first.areaId });
    }
  };

  const handleCityChange = (city: string) => {
    setNewSiteCity(city);
    const cities = PROVINCES_DATA[newSiteProvince] || [];
    const matched = cities.find(c =>
      c.city.toLowerCase() === city.toLowerCase() ||
      city.toLowerCase().includes(c.city.toLowerCase()) ||
      c.city.toLowerCase().includes(city.toLowerCase())
    );
    if (matched && newSite) {
      setNewSite({ ...newSite, areaId: matched.areaId });
    }
  };

  // 2 · Nilai & jadwal
  const [monthlyValue, setValue] = useState<number>(base?.monthlyValue ?? 0);
  const [periodStart, setPeriodStart] = useState(base?.periodStart ?? '');
  const [durationPreset, setDurationPreset] = useState<DurationPreset | null>(presetFor(base?.periodStart ?? '', base?.periodEnd ?? ''));
  const [periodEnd, setPeriodEnd] = useState(base?.periodEnd ?? '');
  const companyEntity = PT_LIST[0];

  const applyDurationPreset = (preset: DurationPreset) => {
    setDurationPreset(preset);
    if (periodStart) setPeriodEnd(calculateEndDate(periodStart, Number(preset)));
    if (errors['schedule']) setErrors(prev => ({ ...prev, schedule: '' }));
  };

  const handleStartDateChange = (val: string) => {
    setPeriodStart(val);
    if (durationPreset) setPeriodEnd(calculateEndDate(val, Number(durationPreset)));
    if (errors['schedule']) setErrors(prev => ({ ...prev, schedule: '' }));
  };

  const handleEndDateChange = (val: string) => {
    setPeriodEnd(val);
    setDurationPreset(presetFor(periodStart, val));
    if (errors['schedule']) setErrors(prev => ({ ...prev, schedule: '' }));
  };

  // 3 · Formasi personel
  const [lines, setLines] = useState<FormLine[]>(
    base?.lines.map(l => ({
      id: l.id,
      positionId: l.positionId,
      qty: l.qty,
      shift: l.shift,
      notes: l.notes,
      showNote: Boolean(l.notes)
    })) ?? [{ positionId: '', qty: 1, shift: 'Pagi', notes: '', showNote: false }]
  );
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // 4 · Lampiran
  const [boq, setBoq] = useState<string[]>(base?.attachments.filter(a => a.kind === 'BOQ').map(a => a.fileName) ?? []);
  const [deal, setDeal] = useState<string[]>(base?.attachments.filter(a => a.kind === 'Bukti deal').map(a => a.fileName) ?? []);

  // UI & status: draf tersimpan hanya muncul ketika user klik simpan
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  const [showMobileSummarySheet, setShowMobileSummarySheet] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Deteksi apakah form memiliki perubahan/isian
  const hasUnsavedChanges = Boolean(
    clientSearchText.trim() ||
    siteSearchText.trim() ||
    monthlyValue > 0 ||
    lines.some(l => l.positionId || (l.qty && l.qty > 1) || l.notes) ||
    boq.length > 0 ||
    deal.length > 0
  );

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowBackConfirmModal(true);
    } else {
      navigate(fpkId ? `/fpk/${fpkId}` : '/fpk');
    }
  };

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onPop = () => {
      window.history.pushState(null, '', window.location.pathname);
      setShowBackConfirmModal(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [hasUnsavedChanges]);

  // Outside click handler for comboboxes
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientOpen(false);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
        setIsSiteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Backup data sementara di localStorage secara silent
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerAutosave = useCallback(() => {
    // Hanya form FPK baru yang di-backup; versi/draf sudah punya sumber data sendiri
    if (mode !== 'baru') return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          clientId, newClient, siteId, newSite, monthlyValue, periodStart, periodEnd, companyEntity, lines, boq, deal
        };
        localStorage.setItem('fpk_draft_v3', JSON.stringify(payload));
      } catch {
        // silent fail
      }
    }, 1000);
  }, [mode, clientId, newClient, siteId, newSite, monthlyValue, periodStart, periodEnd, companyEntity, lines, boq, deal]);

  useEffect(() => {
    triggerAutosave();
  }, [triggerAutosave]);

  // Load from autosaved draft if fresh
  useEffect(() => {
    if (!fpkId && !base) {
      try {
        const saved = localStorage.getItem('fpk_draft_v3');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.clientId && !clientId) {
            setClientId(p.clientId);
            setClientSearchText(lookups.client.get(p.clientId)?.name ?? '');
          }
          if (p.siteId && !siteId) {
            setSiteId(p.siteId);
            setSiteSearchText(lookups.site.get(p.siteId)?.name ?? '');
          }
          if (p.monthlyValue && !monthlyValue) setValue(p.monthlyValue);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Check if chosen site already has active SPK or ongoing FPK
  const activeFpkOnSite = useMemo(() => {
    if (!siteId) return null;
    return state.fpks.find(f => latest(f).siteId === siteId && ['disetujui', 'berjalan', 'tertutup_sebagian'].includes(f.status));
  }, [siteId, state.fpks]);

  // Client list & similarity check
  const allActiveClients = state.clients.filter(c => c.active);
  const filteredClients = allActiveClients.filter(c =>
    c.name.toLowerCase().includes(clientSearchText.toLowerCase()) ||
    c.code.toLowerCase().includes(clientSearchText.toLowerCase())
  );
  const isExactClientMatch = allActiveClients.some(c => c.name.toLowerCase() === clientSearchText.trim().toLowerCase());

  const similarClient = useMemo(() => {
    const q = clientSearchText.trim().toLowerCase();
    if (!q || isExactClientMatch || clientId) return null;
    return allActiveClients.find(c => {
      const cn = c.name.toLowerCase();
      return cn.includes(q) || q.includes(cn) || (q.length >= 4 && cn.split(' ').some(w => w.length >= 4 && (q.includes(w) || w.includes(q))));
    });
  }, [clientSearchText, isExactClientMatch, clientId, allActiveClients]);

  // Site list for chosen client
  const clientSites = useMemo(() => {
    if (!clientId) return [];
    return state.sites.filter(s => s.clientId === clientId && s.active);
  }, [clientId, state.sites]);

  const filteredSites = clientSites.filter(s =>
    s.name.toLowerCase().includes(siteSearchText.toLowerCase()) ||
    s.code.toLowerCase().includes(siteSearchText.toLowerCase())
  );

  const activePositions = state.positions.filter(p => p.active);

  // Jabatan disembunyikan HANYA jika sudah dipilih dengan shift = Non-shift di baris lain,
  // atau jika seluruh 3 shift (Pagi, Siang, Malam) sudah terpakai semua
  const isPositionHiddenForLine = (posId: string, currentLineIdx: number) => {
    if (lines[currentLineIdx]?.positionId === posId) return false;

    // Jika jabatan sudah dipilih dengan 'Non-shift' di baris lain, sembunyikan
    const isNonShiftInOtherRow = lines.some(
      (l, idx) => idx !== currentLineIdx && l.positionId === posId && l.shift === 'Non-shift'
    );
    if (isNonShiftInOtherRow) return true;

    // Jika seluruh 3 shift standar sudah terpakai di baris lain, sembunyikan
    const shiftsUsedInOtherRows = lines
      .filter((l, idx) => idx !== currentLineIdx && l.positionId === posId)
      .map(l => l.shift);
    const standardShifts: Shift[] = ['Pagi', 'Siang', 'Malam'];
    const allStandardUsed = standardShifts.every(s => shiftsUsedInOtherRows.includes(s));
    if (allStandardUsed) return true;

    return false;
  };

  // Opsi shift yang tersedia untuk baris tertentu
  const getAvailableShiftsForLine = (currentLineIdx: number): Shift[] => {
    const line = lines[currentLineIdx];
    if (!line?.positionId) return ['Pagi', 'Siang', 'Malam', 'Non-shift'];

    const otherLinesWithSamePos = lines.filter(
      (l, idx) => idx !== currentLineIdx && l.positionId === line.positionId
    );
    if (otherLinesWithSamePos.length === 0) {
      return ['Pagi', 'Siang', 'Malam', 'Non-shift'];
    }

    // Jika jabatan sudah dipakai di baris lain, jabatan ini multi-shift (tidak boleh Non-shift)
    const usedShifts = new Set(otherLinesWithSamePos.map(l => l.shift));
    const standardShifts: Shift[] = ['Pagi', 'Siang', 'Malam'];
    const remaining = standardShifts.filter(s => !usedShifts.has(s) || s === line.shift);
    return remaining.length > 0 ? remaining : [line.shift];
  };

  // Valid lines calculation (only count rows where position is selected and qty >= 1)
  const validLines = lines.filter(l => Boolean(l.positionId) && Number(l.qty) >= 1);
  const totalPersonnel = validLines.reduce((n, l) => n + Number(l.qty), 0);
  const totalShifts = new Set(validLines.map(l => l.shift)).size;

  // Checklist 4 items
  const check1 = Boolean((clientId || newClient) && (siteId || (newSite && newSite.address.trim())));
  const check2 = Boolean(monthlyValue > 0 && periodStart && periodEnd && diffDays(periodStart, periodEnd) > 0);
  const check3 = Boolean(
    validLines.length > 0 &&
    lines.length === validLines.length &&
    new Set(validLines.map(l => `${l.positionId}-${l.shift}`)).size === validLines.length
  );
  const check4 = Boolean(boq.length > 0 && deal.length > 0);

  const checklistItems = [
    { id: 'section-1', num: 1, label: 'Klien & site', done: check1, fieldId: !clientId && !newClient ? 'client-search-input' : 'site-search-input' },
    { id: 'section-2', num: 2, label: 'Nilai & jadwal', done: check2, fieldId: !monthlyValue ? 'monthly-value-input' : 'mulai-kontrak-input' },
    { id: 'section-3', num: 3, label: 'Formasi personel', done: check3, fieldId: 'formasi-section' },
    { id: 'section-4', num: 4, label: 'Lampiran', done: check4, fieldId: boq.length === 0 ? 'boq-upload' : 'deal-upload' },
  ];

  const remainingCount = checklistItems.filter(c => !c.done).length;
  const isReady = remainingCount === 0;

  const scrollToSection = (sectionId: string, fieldId?: string) => {
    const el = (fieldId && document.getElementById(fieldId)) || document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if ('focus' in el && typeof (el as HTMLElement).focus === 'function') {
        (el as HTMLElement).focus();
      }
    }
  };

  const selectedClientObj = clientId ? lookups.client.get(clientId) : null;
  const selectedSiteObj = siteId ? lookups.site.get(siteId) : null;
  const siteAreaObj = selectedSiteObj ? lookups.area.get(selectedSiteObj.areaId) : newSite?.areaId ? lookups.area.get(newSite.areaId) : null;
  const areaPicUser = siteAreaObj?.picUserId ? lookups.user.get(siteAreaObj.picUserId) : null;

  // Client select
  const handleSelectClient = (c: typeof allActiveClients[0]) => {
    setClientId(c.id);
    setNewClient(null);
    setClientSearchText(c.name);
    setIsClientOpen(false);
    setSiteId('');
    setNewSite(null);
    setSiteSearchText('');
    setSiteRunningDismissed(false);
    if (errors['client']) setErrors(prev => ({ ...prev, client: '' }));
  };

  const handleCreateNewClient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const generatedCode = makeCode(trimmed, 'CL-');
    setClientId('');
    setNewClient({ code: generatedCode, name: trimmed, billingAddress: 'Alamat kantor pusat' });
    setClientSearchText(trimmed);
    setIsClientOpen(false);
    setSiteId('');
    const defaultProv = 'Jawa Barat';
    const defaultCity = 'Bekasi (Kota / Kab)';
    const defaultArea = 'a-bks';
    setNewSiteProvince(defaultProv);
    setNewSiteCity(defaultCity);
    setNewSite({
      code: makeCode(trimmed, 'ST-'),
      name: `Site Utama ${trimmed}`,
      address: '',
      areaId: defaultArea
    });
    setSiteSearchText(`Site Utama ${trimmed}`);
    if (errors['client']) setErrors(prev => ({ ...prev, client: '' }));
  };

  // Site select
  const handleSelectSite = (s: typeof clientSites[0]) => {
    setSiteId(s.id);
    setNewSite(null);
    setSiteSearchText(s.name);
    setIsSiteOpen(false);
    setSiteRunningDismissed(false);
    if (errors['site']) setErrors(prev => ({ ...prev, site: '' }));
  };

  const handleCreateNewSite = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const generatedCode = makeCode(trimmed, 'ST-');
    setSiteId('');
    const defaultProv = 'Jawa Barat';
    const defaultCity = 'Bekasi (Kota / Kab)';
    const defaultArea = 'a-bks';
    setNewSiteProvince(defaultProv);
    setNewSiteCity(defaultCity);
    setNewSite({
      code: generatedCode,
      name: trimmed,
      address: '',
      areaId: defaultArea
    });
    setSiteSearchText(trimmed);
    setIsSiteOpen(false);
    if (errors['site']) setErrors(prev => ({ ...prev, site: '' }));
  };

  // Line operations
  const handleAddLine = () => {
    const availablePos = activePositions.find(p => !isPositionHiddenForLine(p.id, lines.length))?.id ?? '';
    const otherWithSamePos = lines.filter(l => l.positionId === availablePos);
    let nextShift: Shift = 'Pagi';
    if (otherWithSamePos.length > 0) {
      const used = new Set(otherWithSamePos.map(l => l.shift));
      const shifts: Shift[] = ['Pagi', 'Siang', 'Malam'];
      nextShift = shifts.find(s => !used.has(s)) ?? 'Pagi';
    }
    setLines([...lines, { positionId: availablePos, qty: 1, shift: nextShift, notes: '', showNote: false }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = <K extends keyof FormLine>(idx: number, key: K, val: FormLine[K]) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [key]: val };

    // Jika ganti jabatan, pastikan shift tidak bentrok dengan baris lain yang memakai jabatan sama
    if (key === 'positionId' && val) {
      const otherLinesWithSamePos = lines.filter((l, i) => i !== idx && l.positionId === val);
      if (otherLinesWithSamePos.length > 0) {
        const usedShifts = new Set(otherLinesWithSamePos.map(l => l.shift));
        if (updated[idx].shift === 'Non-shift' || usedShifts.has(updated[idx].shift)) {
          const availableShifts: Shift[] = ['Pagi', 'Siang', 'Malam'];
          const nextShift = availableShifts.find(s => !usedShifts.has(s));
          if (nextShift) updated[idx].shift = nextShift;
        }
      }
    }

    setLines(updated);
    if (errors['lines']) setErrors(prev => ({ ...prev, lines: '' }));
  };

  const handleCopyFromFpk = (sourceFpkId: string) => {
    const targetFpk = state.fpks.find(f => f.id === sourceFpkId);
    if (!targetFpk) return;
    const v = latest(targetFpk);
    if (v.lines.length) {
      setLines(v.lines.map(l => ({ positionId: l.positionId, qty: l.qty, shift: l.shift, notes: l.notes, showNote: Boolean(l.notes) })));
      toast(`Formasi (${v.lines.length} jabatan) disalin dari ${targetFpk.number}`);
    }
    setIsCopyModalOpen(false);
  };

  // Final FPK input payload
  const input: FpkInput = {
    type,
    parentFpkId: parentFpkId || undefined,
    clientId: newClient ? undefined : clientId,
    newClient: newClient ?? undefined,
    siteId: newSite ? undefined : siteId,
    newSite: newSite ?? undefined,
    periodStart,
    periodEnd,
    plannedStart: periodStart,
    monthlyValue,
    lines: validLines.map(l => ({ positionId: l.positionId, qty: l.qty, shift: l.shift, notes: l.notes })),
    attachments: [
      ...boq.map(fileName => ({ kind: 'BOQ' as const, fileName })),
      ...deal.map(fileName => ({ kind: 'Bukti deal' as const, fileName }))
    ],
  };

  const handleSaveDraft = (navigateAway = false) => {
    const r = actions.saveFpkDraft(input, mode === 'draf' ? fpkId : undefined);
    if (!r.ok) return toast(`Gagal menyimpan draf: ${r.error}`, 'err');
    localStorage.removeItem('fpk_draft_v3');
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setSaveStatus(`Draf tersimpan · ${hh}.${mm}`);
    toast('Draf FPK berhasil disimpan.');
    if (navigateAway) {
      navigate('/fpk');
    }
  };

  const handleAttemptSubmit = () => {
    if (!isReady) {
      const newErrors: Record<string, string> = {};
      if (!check1) {
        if (!clientId && !newClient) newErrors['client'] = 'Pilih klien atau ketik nama klien baru.';
        else if (!siteId && !newSite) newErrors['site'] = 'Pilih site atau ketik nama site baru.';
        else if (newSite && !newSite.address.trim()) newErrors['siteAddress'] = 'Isi alamat lengkap site.';
      }
      if (!monthlyValue) {
        newErrors['monthlyValue'] = 'Isi nilai penawaran per bulan sebelum PPN.';
      }
      if (!periodStart || !periodEnd || diffDays(periodStart, periodEnd) <= 0) {
        newErrors['schedule'] = 'Tentukan tanggal mulai dan periode selesai yang valid.';
      }
      if (lines.length === 0 || validLines.length !== lines.length) {
        newErrors['lines'] = 'Pilih jabatan dan tentukan jumlah minimal 1 untuk semua baris.';
      } else if (new Set(validLines.map(l => `${l.positionId}-${l.shift}`)).size !== validLines.length) {
        newErrors['lines'] = 'Tidak boleh ada kombinasi jabatan dan shift yang sama.';
      }
      if (boq.length === 0) newErrors['boq'] = 'Unggah minimal satu file BOQ.';
      if (deal.length === 0) newErrors['deal'] = 'Unggah minimal satu file bukti deal tertulis.';

      setErrors(newErrors);
      const firstIncomplete = checklistItems.find(c => !c.done);
      if (firstIncomplete) {
        scrollToSection(firstIncomplete.id, firstIncomplete.fieldId);
      }
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = () => {
    setShowConfirmModal(false);
    if (mode === 'versi') {
      const r = actions.submitNewVersion(fpkId!, input);
      if (!r.ok) return toast(`Gagal: ${r.error}`, 'err');
      toast('Versi baru FPK dikirim');
      navigate(`/fpk/${fpkId}`);
    } else {
      const r = actions.saveFpkDraft(input, mode === 'draf' ? fpkId : undefined);
      if (!r.ok) return toast(`Gagal: ${r.error}`, 'err');
      const r2 = actions.submitFpk(r.id!);
      if (!r2.ok) return toast(`Draf tersimpan tapi belum bisa dikirim: ${r2.error}`, 'err');
      localStorage.removeItem('fpk_draft_v3');
      toast('FPK dikirim ke cek divisi');
      navigate(`/fpk/${r.id}`);
    }
  };

  const pageTitle = mode === 'versi'
    ? `Versi baru ${existing!.number}`
    : type === 'perubahan'
    ? `Tambah personel · ${selectedSiteObj?.name ?? 'Site'}`
    : 'Proyek baru';

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-8 pt-4 sm:pt-7 pb-24">
      {/* Header Halaman (Mobile Optimized & Desktop Responsive) */}
      <div className="mb-5 sm:mb-6 space-y-2.5 sm:space-y-0">
        {/* Mobile Top Navigation & Status Bar */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          {saveStatus && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {saveStatus}
            </span>
          )}
        </div>

        {/* Desktop & Mobile Main Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            {/* Desktop Back Arrow */}
            <button
              type="button"
              onClick={handleBackClick}
              className="hidden sm:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {pageTitle}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi data penawaran untuk memproses FPK ke divisi terkait.
              </p>
            </div>
          </div>

          {/* Desktop Right Status */}
          {saveStatus && (
            <div className="hidden sm:flex shrink-0 items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {saveStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Form (1 kartu, kiri) + Sticky Panel (300px, kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        {/* Form = SATU Kartu (padding 24px desktop, 16px mobile) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-xs">
          
          {/* SECTION 1 · Klien & site */}
          <div id="section-1" className="scroll-mt-6">
            <h2 className="text-sm font-medium text-slate-900 mb-3">
              <span className="text-slate-400 font-normal">1 ·</span> Klien & site
            </h2>

            {/* Klien & Site berdampingan, 2 kolom sama besar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field Klien */}
              <div ref={clientDropdownRef} className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Klien
                </label>
                <div
                  id="client-search-input"
                  tabIndex={0}
                  onClick={() => setIsClientOpen(!isClientOpen)}
                  className={cx(
                    'h-10 px-3 rounded-lg border bg-white flex items-center justify-between text-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    errors['client'] ? 'border-rose-400 ring-1 ring-rose-200' : 'border-slate-300 hover:border-slate-400'
                  )}
                >
                  <span className={clientSearchText ? 'text-slate-900 font-medium truncate' : 'text-slate-400'}>
                    {clientSearchText || 'Cari atau ketik nama klien...'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </div>

                {errors['client'] && (
                  <p className="text-xs text-rose-600 mt-1">{errors['client']}</p>
                )}

                {/* Account owner 13px abu di bawah klien tanpa ikon */}
                {selectedClientObj && (
                  <p className="text-[13px] text-slate-500 mt-1">
                    Account owner: {lookups.user.get(selectedClientObj.accountOwnerId)?.name ?? 'Sari Melati'}
                  </p>
                )}

                {/* Dropdown Klien */}
                {isClientOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-72 overflow-y-auto">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ketik untuk mencari atau menambah klien..."
                      value={clientSearchText}
                      onChange={e => {
                        setClientSearchText(e.target.value);
                        if (clientId || newClient) {
                          // Klien berubah → site milik klien lama tidak berlaku lagi
                          setClientId('');
                          setNewClient(null);
                          setSiteId('');
                          setNewSite(null);
                          setSiteSearchText('');
                          setSiteRunningDismissed(false);
                        }
                      }}
                      className="w-full px-3 h-9 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {clientSearchText.trim() && !isExactClientMatch && (
                      <button
                        type="button"
                        onClick={() => handleCreateNewClient(clientSearchText)}
                        className="w-full text-left p-2.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold mb-2 transition-colors"
                      >
                        + Tambah klien baru &ldquo;{clientSearchText.trim()}&rdquo;
                      </button>
                    )}

                    {similarClient && (
                      <div className="p-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                        Mirip: <strong>{similarClient.name}</strong> ({lookups.user.get(similarClient.accountOwnerId)?.name ?? 'Marketing'})
                      </div>
                    )}

                    <div className="space-y-1">
                      {filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectClient(c)}
                          className={cx(
                            'w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 transition-colors',
                            clientId === c.id ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'
                          )}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="text-[11px] text-slate-400 ml-2 shrink-0">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Field Site */}
              <div ref={siteDropdownRef} className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Site
                </label>
                <div
                  id="site-search-input"
                  tabIndex={0}
                  onClick={() => {
                    if (!clientId && !newClient) {
                      toast('Pilih klien terlebih dahulu', 'err');
                      return;
                    }
                    setIsSiteOpen(!isSiteOpen);
                  }}
                  className={cx(
                    'h-10 px-3 rounded-lg border bg-white flex items-center justify-between text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    !clientId && !newClient ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'cursor-pointer hover:border-slate-400 border-slate-300',
                    errors['site'] ? 'border-rose-400 ring-1 ring-rose-200' : ''
                  )}
                >
                  <span className={siteSearchText ? 'text-slate-900 font-medium truncate' : 'text-slate-400'}>
                    {siteSearchText || (!clientId && !newClient ? 'Pilih klien terlebih dahulu' : 'Pilih atau ketik site...')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </div>

                {errors['site'] && (
                  <p className="text-xs text-rose-600 mt-1">{errors['site']}</p>
                )}

                {/* Info Area & PIC otomatis 13px abu di bawah site */}
                {selectedSiteObj && siteAreaObj && (
                  <p className="text-[13px] text-slate-500 mt-1">
                    Area: {siteAreaObj.name} · PIC: {areaPicUser ? areaPicUser.name : '–'}
                  </p>
                )}

                {/* Dropdown Site */}
                {isSiteOpen && (clientId || newClient) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-72 overflow-y-auto">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ketik untuk mencari atau menambah site..."
                      value={siteSearchText}
                      onChange={e => {
                        setSiteSearchText(e.target.value);
                        if (siteId) setSiteId('');
                      }}
                      className="w-full px-3 h-9 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {siteSearchText.trim() && !clientSites.some(s => s.name.toLowerCase() === siteSearchText.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => handleCreateNewSite(siteSearchText)}
                        className="w-full text-left p-2.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold mb-2 transition-colors"
                      >
                        + Tambah site baru &ldquo;{siteSearchText.trim()}&rdquo;
                      </button>
                    )}

                    <div className="space-y-1">
                      {filteredSites.map(s => {
                        const sArea = lookups.area.get(s.areaId);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectSite(s)}
                            className={cx(
                              'w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 transition-colors',
                              siteId === s.id ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'
                            )}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-[11px] text-slate-400 ml-2 shrink-0">{sArea?.name ?? s.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Site Baru: Detail Lokasi (Provinsi, Kota, Alamat) */}
            {newSite && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    Lokasi Site Baru: {newSite.name} ({newSite.code})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSite(null);
                      setSiteSearchText('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus site baru"
                    aria-label="Hapus site baru"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Provinsi</label>
                    <Select
                      value={newSiteProvince}
                      onChange={e => handleProvinceChange(e.target.value)}
                      className="h-10 text-sm"
                    >
                      {Object.keys(PROVINCES_DATA).map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kota / Kabupaten</label>
                    <Input
                      type="text"
                      list="city-options-list"
                      value={newSiteCity}
                      onChange={e => handleCityChange(e.target.value)}
                      placeholder="Pilih atau ketik kota..."
                      className="h-10 text-sm"
                    />
                    <datalist id="city-options-list">
                      {(PROVINCES_DATA[newSiteProvince] || []).map(item => (
                        <option key={item.city} value={item.city} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alamat Lengkap Site
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Jl. Raya Industri No. 10, Kawasan Industri Jababeka, Cikarang..."
                    value={newSite.address}
                    onChange={e => {
                      setNewSite({ ...newSite, address: e.target.value });
                      if (errors['siteAddress']) setErrors(prev => ({ ...prev, siteAddress: '' }));
                    }}
                    className={cx(
                      'w-full text-sm bg-white resize-y border rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                      errors['siteAddress'] ? 'border-red-400' : 'border-slate-300'
                    )}
                  />
                  {errors['siteAddress'] && <p className="text-[13px] text-red-600 mt-1">{errors['siteAddress']}</p>}
                </div>

                <p className="text-[13px] text-slate-500">
                  Area operasional: <strong className="text-slate-800">{siteAreaObj?.name ?? '–'}</strong> (otomatis dari {newSiteCity || newSiteProvince})
                </p>
              </div>
            )}
          </div>

          {/* Garis 1px border dengan jarak 20px atas & bawah */}
          <div className="border-t border-slate-200 pt-5 mt-5" />

          {/* SECTION 2 · Nilai & jadwal */}
          <div id="section-2" className="scroll-mt-6 space-y-4">
            <h2 className="text-sm font-medium text-slate-900 mb-3">
              <span className="text-slate-400 font-normal">2 ·</span> Nilai & jadwal
            </h2>

            {/* Baris 1: Nilai / bulan & Preset durasi kontrak */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Nilai / bulan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nilai / bulan
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none">Rp</span>
                  <Input
                    id="monthly-value-input"
                    type="text"
                    inputMode="numeric"
                    className="h-10 pl-10 font-semibold text-slate-900 tabular-nums w-full"
                    placeholder="0"
                    value={monthlyValue ? formatNumberWithDots(monthlyValue) : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setValue(raw ? parseInt(raw, 10) : 0);
                      if (errors['monthlyValue']) setErrors(prev => ({ ...prev, monthlyValue: '' }));
                    }}
                  />
                </div>
                <p className="text-[13px] text-slate-400 mt-1">sebelum PPN</p>
                {errors['monthlyValue'] && (
                  <p className="text-xs text-rose-600 mt-1">{errors['monthlyValue']}</p>
                )}
              </div>

              {/* Preset durasi kontrak untuk auto set */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Durasi kontrak
                </label>
                <div className="flex items-center gap-2">
                  {DURATION_PRESETS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyDurationPreset(m)}
                      className={cx(
                        'h-10 px-4 text-xs font-medium rounded-lg border transition-colors',
                        durationPreset === m
                          ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {m} bulan
                    </button>
                  ))}
                </div>
                <p className="text-[13px] text-slate-400 mt-1">
                  Tanggal akhir terisi otomatis. Bisa diubah manual.
                </p>
              </div>
            </div>

            {/* Baris 2: Tanggal mulai kontrak & Tanggal akhir kontrak */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
              {/* Tanggal mulai kontrak */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal mulai kontrak
                </label>
                <div className="relative">
                  <div className="h-10 w-full px-3 flex items-center justify-between text-sm bg-white border border-slate-300 rounded-lg pointer-events-none">
                    <span className={periodStart ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      {periodStart ? fmtDate(periodStart) : 'Pilih tanggal mulai'}
                    </span>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="mulai-kontrak-input"
                    type="date"
                    value={periodStart}
                    min={TODAY}
                    onChange={e => handleStartDateChange(e.target.value)}
                    onClick={openPicker}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                {errors['schedule'] && (
                  <p className="text-xs text-rose-600 mt-1">{errors['schedule']}</p>
                )}
              </div>

              {/* Tanggal akhir kontrak */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal akhir kontrak
                </label>
                <div className="relative">
                  <div className="h-10 w-full px-3 flex items-center justify-between text-sm bg-white border border-slate-300 rounded-lg pointer-events-none">
                    <span className={periodEnd ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      {periodEnd ? fmtDate(periodEnd) : 'Pilih tanggal akhir'}
                    </span>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="akhir-kontrak-input"
                    type="date"
                    value={periodEnd}
                    min={periodStart || TODAY}
                    onChange={e => handleEndDateChange(e.target.value)}
                    onClick={openPicker}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <p className="text-[13px] text-slate-400 mt-1">
                  {periodStart && periodEnd && diffDays(periodStart, periodEnd) > 0
                    ? `Durasi: ${Math.round((diffDays(periodStart, periodEnd) + 1) / 30.417)} bulan (${diffDays(periodStart, periodEnd) + 1} hari)`
                    : '–'}
                </p>
              </div>
            </div>
          </div>

          {/* Garis 1px border dengan jarak 20px atas & bawah */}
          <div className="border-t border-slate-200 pt-5 mt-5" />

          {/* SECTION 3 · Formasi personel */}
          <div id="section-3" className="scroll-mt-6 space-y-3">
            <h2 className="text-sm font-medium text-slate-900 mb-3">
              <span className="text-slate-400 font-normal">3 ·</span> Formasi personel
            </h2>

            {/* Header Kolom Desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_100px_120px_32px] gap-3 text-xs font-semibold text-slate-500 mb-1">
              <span>Jabatan</span>
              <span>Jumlah</span>
              <span>Shift</span>
              <span />
            </div>

            {/* Baris-baris Personel tanpa kartu abu */}
            <div id="formasi-section" className="space-y-4">
              {lines.map((l, i) => (
                <div key={i} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_32px] gap-3 items-center">
                    <div>
                      <Select
                        value={l.positionId}
                        onChange={e => handleLineChange(i, 'positionId', e.target.value)}
                        className="h-10 text-sm"
                      >
                        <option value="">– Pilih jabatan –</option>
                        {activePositions
                          .filter(p => !isPositionHiddenForLine(p.id, i))
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </Select>
                    </div>

                    {/* Stepper Jumlah (- qty +) */}
                    <div>
                      <div className="flex items-center h-10 border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => handleLineChange(i, 'qty', Math.max(1, (l.qty || 1) - 1))}
                          className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 border-r border-slate-200 font-bold transition-colors select-none"
                          title="Kurangi"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-8 flex-1 h-full text-sm text-center tabular-nums font-semibold text-slate-800 focus:outline-none"
                          value={l.qty === 0 ? '' : l.qty}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            handleLineChange(i, 'qty', raw ? parseInt(raw, 10) : 0);
                          }}
                          placeholder="1"
                        />
                        <button
                          type="button"
                          onClick={() => handleLineChange(i, 'qty', (l.qty || 0) + 1)}
                          className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 border-l border-slate-200 font-bold transition-colors select-none"
                          title="Tambah"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <Select
                        value={l.shift}
                        onChange={e => handleLineChange(i, 'shift', e.target.value as Shift)}
                        className="h-10 text-sm"
                      >
                        {getAvailableShiftsForLine(i).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex justify-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(i)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Caption kecil: +Tambah Deskripsi -> klik untuk membuka field baru */}
                  {l.notes || l.showNote ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          Catatan &amp; spesifikasi khusus (opsional)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            handleLineChange(i, 'notes', '');
                            handleLineChange(i, 'showNote', false);
                          }}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Batal
                        </button>
                      </div>
                      <Input
                        type="text"
                        placeholder="Contoh: Wajib sertifikat Gada Pratama, min. 170cm, SIM A..."
                        value={l.notes ?? ''}
                        onChange={e => handleLineChange(i, 'notes', e.target.value)}
                        className="h-10 text-xs w-full bg-white border-slate-300"
                      />
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleLineChange(i, 'showNote', true)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                      >
                        +Tambah Deskripsi
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {errors['lines'] && (
              <p className="text-xs text-rose-600 mt-1">{errors['lines']}</p>
            )}

            {/* Baris aksi formasi: Button Tambah Jabatan full 1 section */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddLine}
                className="w-full h-10 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Tambah jabatan</span>
              </button>
            </div>
          </div>

          {/* Garis 1px border dengan jarak 20px atas & bawah */}
          <div className="border-t border-slate-200 pt-5 mt-5" />

          {/* SECTION 4 · Lampiran */}
          <div id="section-4" className="scroll-mt-6 space-y-3">
            <h2 className="text-sm font-medium text-slate-900 mb-3">
              <span className="text-slate-400 font-normal">4 ·</span> Lampiran
            </h2>

            {/* Dua slot sejajar (2 kolom): BOQ · Bukti deal. Tombol dashed lebar penuh, tinggi 40px */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slot BOQ */}
              <div id="boq-upload" className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  BOQ
                </label>
                <label className="h-10 w-full border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-slate-600 cursor-pointer transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pilih file BOQ</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.docx,.jpg,.png"
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []).map(f => f.name);
                      if (files.length) setBoq([...boq, ...files]);
                      if (errors['boq']) setErrors(prev => ({ ...prev, boq: '' }));
                      e.target.value = '';
                    }}
                  />
                </label>
                {errors['boq'] && (
                  <p className="text-xs text-rose-600">{errors['boq']}</p>
                )}
                {boq.map((fn, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="truncate max-w-[200px] text-slate-700 font-medium">{fn}</span>
                    <button
                      type="button"
                      onClick={() => setBoq(boq.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-0.5 ml-2"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Slot Bukti Deal */}
              <div id="deal-upload" className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Bukti deal
                </label>
                <label className="h-10 w-full border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-slate-600 cursor-pointer transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pilih file bukti deal</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []).map(f => f.name);
                      if (files.length) setDeal([...deal, ...files]);
                      if (errors['deal']) setErrors(prev => ({ ...prev, deal: '' }));
                      e.target.value = '';
                    }}
                  />
                </label>
                {errors['deal'] && (
                  <p className="text-xs text-rose-600">{errors['deal']}</p>
                )}
                {deal.map((fn, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="truncate max-w-[200px] text-slate-700 font-medium">{fn}</span>
                    <button
                      type="button"
                      onClick={() => setDeal(deal.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-0.5 ml-2"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Kanan Sticky (300px, top 24px di bawah topbar 64px = 88px) */}
        <aside className="hidden lg:block w-[300px] sticky top-[88px] z-20 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            {/* Judul Siap dikirim? saja tanpa subjudul */}
            <h3 className="text-sm font-bold text-slate-900">
              Siap dikirim?
            </h3>

            {/* Checklist 4 item mengikuti section */}
            <div className="space-y-2">
              {checklistItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id, item.fieldId)}
                  className="w-full flex items-center justify-between text-xs py-1 text-left text-slate-700 hover:text-slate-950 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {item.done ? (
                      <span className="text-slate-900 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-300">○</span>
                    )}
                    <span className={item.done ? 'font-medium text-slate-900' : 'text-slate-500'}>
                      {item.num} · {item.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Ringkasan 3 baris teks biasa tanpa kotak berlatar dan tanpa warna hijau */}
            <div className="text-xs space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Personel:</span>
                <span className="font-medium text-slate-800">{totalPersonnel} orang ({totalShifts} shift)</span>
              </div>
              <div className="flex justify-between">
                <span>Nilai / bln:</span>
                <span className="font-medium text-slate-800">{monthlyValue ? `Rp ${formatNumberWithDots(monthlyValue)}` : '–'}</span>
              </div>
              <div className="flex justify-between">
                <span>Periode:</span>
                <span className="font-medium text-slate-800">{periodStart && periodEnd ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}` : '–'}</span>
              </div>
            </div>

            {/* Tombol Kirim ke cek selalu aktif (warna utama) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Btn
                type="button"
                className="w-full justify-center h-10 text-sm font-bold shadow-xs"
                onClick={handleAttemptSubmit}
              >
                Kirim ke cek
              </Btn>

              <Btn
                type="button"
                variant="secondary"
                className="w-full justify-center h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
                onClick={() => handleSaveDraft(false)}
              >
                Simpan draf
              </Btn>

              {/* {n} hal belum lengkap 13px abu di bawah tombol */}
              {!isReady && (
                <p className="text-[13px] text-center text-slate-400 font-normal">
                  {remainingCount} hal belum lengkap
                </p>
              )}
            </div>

            {/* Satu baris 12px abu alur verifikasi */}
            <p className="text-[12px] text-slate-400 text-center leading-relaxed">
              Dicek Ops, Recruitment, Pengadaan → Finance → BOD
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Bar (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setShowMobileSummarySheet(!showMobileSummarySheet)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
          >
            <span>{isReady ? 'Siap dikirim' : `${remainingCount} hal belum lengkap`}</span>
            <ChevronUp className={cx('w-4 h-4 transition-transform', showMobileSummarySheet && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => handleSaveDraft(false)}
            >
              Simpan draf
            </Btn>
            <Btn
              size="sm"
              onClick={handleAttemptSubmit}
            >
              Kirim ke cek
            </Btn>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Summary */}
      {showMobileSummarySheet && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 flex flex-col justify-end" onClick={() => setShowMobileSummarySheet(false)}>
          <div className="bg-white rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Kelengkapan FPK</h3>
              <button onClick={() => setShowMobileSummarySheet(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {checklistItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToSection(item.id, item.fieldId);
                    setShowMobileSummarySheet(false);
                  }}
                  className="w-full flex items-center justify-between text-xs py-2 border-b border-slate-100"
                >
                  <span className="flex items-center gap-2">
                    {item.done ? <span className="text-slate-900 font-bold">✓</span> : <span className="text-slate-300">○</span>}
                    <span className={item.done ? 'font-semibold text-slate-900' : 'text-slate-500'}>{item.num} · {item.label}</span>
                  </span>
                  <span className="text-indigo-600 font-medium">Buka</span>
                </button>
              ))}
            </div>

            <div className="text-xs space-y-1 text-slate-600 p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between">
                <span>Personel:</span>
                <span className="font-semibold text-slate-800">{totalPersonnel} orang ({totalShifts} shift)</span>
              </div>
              <div className="flex justify-between">
                <span>Nilai / bln:</span>
                <span className="font-semibold text-slate-800">{monthlyValue ? `Rp ${formatNumberWithDots(monthlyValue)}` : '–'}</span>
              </div>
              <div className="flex justify-between">
                <span>Periode:</span>
                <span className="font-semibold text-slate-800">{periodStart && periodEnd ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}` : '–'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Btn
                variant="secondary"
                className="w-1/2 justify-center"
                onClick={() => {
                  setShowMobileSummarySheet(false);
                  handleSaveDraft();
                }}
              >
                Simpan draf
              </Btn>
              <Btn
                className="w-1/2 justify-center"
                onClick={() => {
                  setShowMobileSummarySheet(false);
                  handleAttemptSubmit();
                }}
              >
                Kirim ke cek
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal Salin Formasi dari Proyek Lain */}
      <Modal
        open={isCopyModalOpen}
        title="Salin Formasi dari Proyek Lain"
        onClose={() => setIsCopyModalOpen(false)}
        footer={<Btn variant="secondary" onClick={() => setIsCopyModalOpen(false)}>Batal</Btn>}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Pilih FPK atau proyek yang sudah berjalan untuk menyalin susunan baris jabatannya.
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {state.fpks
              .filter(f => latest(f).lines.length > 0)
              .map(f => {
                const v = latest(f);
                const cl = lookups.client.get(v.clientId);
                const st = lookups.site.get(v.siteId);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleCopyFromFpk(f.id)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors text-xs"
                  >
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{f.number}</span>
                      <span className="text-slate-500">{v.lines.length} jabatan</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {cl?.name} · {st?.name}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Pengiriman FPK */}
      <Modal
        open={showConfirmModal}
        title="Konfirmasi Pengiriman FPK"
        onClose={() => setShowConfirmModal(false)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setShowConfirmModal(false)}>Periksa lagi</Btn>
            <Btn variant="primary" onClick={handleFinalSubmit}>Kirim FPK</Btn>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            FPK akan dikirim ke <strong>3 divisi internal</strong> (Operasional, Recruitment, Pengadaan) secara bersamaan untuk diverifikasi, sebelum margin diperiksa oleh Finance dan disetujui BOD.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Klien / Site:</span>
              <span className="font-semibold text-slate-800">
                {selectedClientObj?.name ?? newClient?.name} · {selectedSiteObj?.name ?? newSite?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Personel:</span>
              <span className="font-semibold text-slate-800">{totalPersonnel} orang ({totalShifts} shift)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nilai / Bulan:</span>
              <span className="font-semibold text-slate-800">Rp {formatNumberWithDots(monthlyValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Periode:</span>
              <span className="font-semibold text-slate-800">{fmtDate(periodStart)} – {fmtDate(periodEnd)}</span>
            </div>
          </div>
          <p className="text-slate-500 text-[11px]">
            Pastikan data dan lampiran BOQ serta bukti deal sudah sesuai. Apakah Anda yakin ingin mengirim FPK ini?
          </p>
        </div>
      </Modal>

      {/* Modal Konfirmasi Kembali dengan Draf Belum Disimpan */}
      <Modal
        open={showBackConfirmModal}
        title="Simpan draf sebelum keluar?"
        onClose={() => setShowBackConfirmModal(false)}
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <button
              type="button"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"
              onClick={() => {
                setShowBackConfirmModal(false);
                localStorage.removeItem('fpk_draft_v3');
                navigate(fpkId ? `/fpk/${fpkId}` : '/fpk');
              }}
            >
              Buang perubahan
            </button>
            <div className="flex items-center gap-2">
              <Btn
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowBackConfirmModal(false)}
              >
                Batal
              </Btn>
              <Btn
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowBackConfirmModal(false);
                  handleSaveDraft(true);
                }}
              >
                Simpan draf
              </Btn>
            </div>
          </div>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Perubahan yang belum disimpan akan hilang jika Anda keluar sekarang tanpa menyimpannya ke draf.
        </p>
      </Modal>
    </div>
  );
};
