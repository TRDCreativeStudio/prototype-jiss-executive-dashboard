import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Paperclip, Info, ChevronDown, Building2, MapPin, Check, AlertCircle, X } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, ErrorText, Field, Input, PageHeader, Select, toast, DateInput, Modal } from '../../ui/kit';
import { navigate } from '../../router';
import { NotFound } from '../Misc';
import { latest } from '../../domain/selectors';
import { rereviewPlan, SHIFTS } from '../../domain/fpk';
import { TODAY, fmtDate, fmtRp, diffDays } from '../../domain/time';
import type { FpkInput } from '../../store/fpkActions';
import type { FpkType, FpkVersion, Shift } from '../../domain/types';

type Line = { id?: string; positionId: string; qty: number; shift: Shift; notes?: string };

const FilePick: React.FC<{ label: string; files: string[]; onAdd: (n: string) => void; onRemove: (i: number) => void; multiple?: boolean }> = ({ label, files, onAdd, onRemove, multiple }) => (
  <div>
    <div className="text-xs font-semibold text-slate-700 mb-1">{label} <span className="text-rose-500">*</span></div>
    <div className="space-y-1.5">
      {files.map((f, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="flex items-center gap-1.5 min-w-0"><Paperclip className="w-3.5 h-3.5 shrink-0 text-slate-400" /><span className="truncate">{f}</span></span>
          <button type="button" onClick={() => onRemove(i)} className="text-slate-400 hover:text-rose-600" aria-label="Hapus lampiran"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      {(multiple || files.length === 0) && (
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 border border-dashed border-indigo-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-indigo-50">
          <Plus className="w-3.5 h-3.5" /> Pilih file (PDF/JPG/PNG, maks 10 MB)
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const n = e.target.files?.[0]?.name; if (n) onAdd(n); e.target.value = ''; }} />
        </label>
      )}
    </div>
  </div>
);

const makeCode = (name: string, prefix = '') => {
  const letters = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return letters ? `${prefix}${letters}` : `${prefix}NEW`;
};

const formatNumberWithCommas = (num: number | string) => {
  if (!num && num !== 0) return '';
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const FpkFormPage: React.FC<{ fpkId?: string }> = ({ fpkId }) => {
  const { state, lookups, me, actions } = useStore();
  const existing = fpkId ? lookups.fpk.get(fpkId) : undefined;
  const mode: 'baru' | 'draf' | 'versi' = !existing ? 'baru' : existing.status === 'draf' ? 'draf' : 'versi';
  const base = existing ? latest(existing) : undefined;

  const myClients = state.clients.filter(c => c.active && (c.accountOwnerId === me.id || c.coOwnerIds.includes(me.id)));
  const [type, setType] = useState<FpkType>(existing?.type ?? 'baru');
  const [parentFpkId, setParent] = useState(existing?.parentFpkId ?? '');

  // Client combobox states
  const [clientId, setClientId] = useState(base?.clientId ?? '');
  const [newClient, setNewClient] = useState<null | { code: string; name: string; billingAddress: string }>(null);
  const [clientInputText, setClientInputText] = useState(base?.clientId ? lookups.client.get(base.clientId)?.name ?? '' : '');
  const [isClientOpen, setIsClientOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Site combobox states
  const [siteId, setSiteId] = useState(base?.siteId ?? '');
  const [newSite, setNewSite] = useState<null | { code: string; name: string; address: string; areaId: string }>(null);
  const [siteInputText, setSiteInputText] = useState(base?.siteId ? lookups.site.get(base.siteId)?.name ?? '' : '');
  const [isSiteOpen, setIsSiteOpen] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);

  // Contract period & value
  const [periodStart, setPS] = useState(base?.periodStart ?? '');
  const [periodEnd, setPE] = useState(base?.periodEnd ?? '');
  const [monthlyValue, setValue] = useState<number>(base?.monthlyValue ?? 0);

  // Line items
  const [lines, setLines] = useState<Line[]>(
    base?.lines.map(l => ({ id: l.id, positionId: l.positionId, qty: l.qty, shift: l.shift, notes: l.notes })) ??
    [{ positionId: '', qty: 1, shift: 'Pagi', notes: '' }]
  );

  // Attachments
  const [boq, setBoq] = useState<string[]>(base?.attachments.filter(a => a.kind === 'BOQ').map(a => a.fileName) ?? []);
  const [deal, setDeal] = useState<string[]>(base?.attachments.filter(a => a.kind === 'Bukti deal').map(a => a.fileName) ?? []);
  const [err, setErr] = useState('');

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientOpen(false);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
        setIsSiteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const input: FpkInput = {
    type,
    parentFpkId: parentFpkId || undefined,
    clientId: newClient ? undefined : clientId,
    newClient: newClient ?? undefined,
    siteId: newSite ? undefined : siteId,
    newSite: newSite ?? undefined,
    periodStart,
    periodEnd,
    plannedStart: periodStart, // Fallback otomatis ke periode mulai
    monthlyValue,
    lines,
    attachments: [
      ...boq.map(fileName => ({ kind: 'BOQ' as const, fileName })),
      ...deal.map(fileName => ({ kind: 'Bukti deal' as const, fileName }))
    ],
  };

  const plan = useMemo(() => {
    if (mode !== 'versi' || !existing || !base) return null;
    const temp: FpkVersion = {
      ...base,
      no: base.no + 1,
      clientId,
      siteId: newSite ? 'baru' : siteId,
      periodStart,
      periodEnd,
      plannedStart: periodStart,
      monthlyValue,
      lines: lines.map((l, i) => ({ id: l.id ?? `tmp-${i}`, positionId: l.positionId, qty: l.qty, shift: l.shift, notes: l.notes, sources: [] })),
      attachments: [...boq, ...deal].map((fileName, i) => ({ id: `t${i}`, kind: 'BOQ', fileName, priced: true, uploadedBy: me.id, uploadedAt: '' })),
    };
    return rereviewPlan(existing, base, temp);
  }, [mode, existing, base, clientId, siteId, newSite, periodStart, periodEnd, monthlyValue, lines, boq, deal, me.id]);

  if (fpkId && (!existing || existing.createdBy !== me.id && !myClients.some(c => c.id === base?.clientId))) return <NotFound what="FPK" />;
  if (existing && !['draf', 'dikembalikan'].includes(existing.status)) return <NotFound what="FPK yang bisa diubah" />;

  const sites = state.sites.filter(s => s.clientId === clientId && s.active);
  const parents = state.fpks.filter(f => f.id !== fpkId && ['disetujui', 'berjalan', 'tertutup_sebagian', 'selesai'].includes(f.status) && (!clientId || latest(f).clientId === clientId));

  // Available unselected positions
  const activePositions = state.positions.filter(p => p.active);

  const saveDraft = (andSubmit: boolean) => {
    const r = actions.saveFpkDraft(input, mode === 'draf' ? fpkId : undefined);
    if (!r.ok) return setErr(r.error);
    if (andSubmit) {
      const r2 = actions.submitFpk(r.id!);
      if (!r2.ok) {
        setErr(`Draf tersimpan, tapi belum bisa dikirim: ${r2.error}`);
        return navigate(`/fpk/${r.id}/ubah`);
      }
      toast('FPK dikirim ke cek Operasional, Recruitment, dan Pengadaan');
    } else {
      toast('Draf FPK disimpan');
    }
    navigate(`/fpk/${r.id}`);
  };

  const submitVersion = () => {
    const r = actions.submitNewVersion(fpkId!, input);
    if (!r.ok) return setErr(r.error);
    toast(`Versi ${base!.no + 1} dikirim`);
    navigate(`/fpk/${fpkId}`);
  };

  // Pre-validate before opening confirm modal
  const handleInitiateSubmit = () => {
    setErr('');
    if (!clientId && !newClient) return setErr('Klien wajib dipilih atau diisi.');
    if (newClient && (!newClient.name.trim() || !newClient.code.trim())) return setErr('Nama dan kode klien baru wajib diisi.');
    if (!siteId && !newSite) return setErr('Site wajib dipilih atau diisi.');
    if (newSite && (!newSite.name.trim() || !newSite.code.trim() || !newSite.areaId)) return setErr('Nama, kode, dan area site baru wajib diisi.');
    if (!periodStart) return setErr('Periode mulai wajib diisi.');
    if (!periodEnd) return setErr('Periode selesai wajib diisi.');
    if (diffDays(periodStart, periodEnd) <= 0) return setErr('Periode selesai harus setelah periode mulai.');
    if (!monthlyValue || monthlyValue <= 0) return setErr('Nilai per bulan wajib diisi.');
    if (!lines.length || lines.some(l => !l.positionId || !(l.qty > 0))) {
      return setErr('Isi minimal satu baris jabatan dengan kuantitas lebih dari 0.');
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    if (mode === 'versi') {
      submitVersion();
    } else {
      saveDraft(true);
    }
  };

  // Filtered clients for combobox
  const filteredClients = myClients.filter(c =>
    c.name.toLowerCase().includes(clientInputText.toLowerCase()) ||
    c.code.toLowerCase().includes(clientInputText.toLowerCase())
  );
  const isExactClientMatch = myClients.some(c => c.name.toLowerCase() === clientInputText.trim().toLowerCase());

  // Filtered sites for combobox
  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(siteInputText.toLowerCase()) ||
    s.code.toLowerCase().includes(siteInputText.toLowerCase())
  );
  const isExactSiteMatch = sites.some(s => s.name.toLowerCase() === siteInputText.trim().toLowerCase());

  const handleSelectClient = (c: typeof myClients[0]) => {
    setClientId(c.id);
    setNewClient(null);
    setClientInputText(c.name);
    setIsClientOpen(false);
    // Reset site when client changes
    setSiteId('');
    setNewSite(null);
    setSiteInputText('');
  };

  const handleCreateNewClient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const generatedCode = makeCode(trimmed, 'CL-');
    setClientId('');
    setNewClient({ code: generatedCode, name: trimmed, billingAddress: 'Alamat kantor pusat' });
    setClientInputText(trimmed);
    setIsClientOpen(false);
    // Reset site
    setSiteId('');
    setNewSite(null);
    setSiteInputText('');
  };

  const handleSelectSite = (s: typeof sites[0]) => {
    setSiteId(s.id);
    setNewSite(null);
    setSiteInputText(s.name);
    setIsSiteOpen(false);
  };

  const handleCreateNewSite = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const generatedCode = makeCode(trimmed, 'ST-');
    setSiteId('');
    const defaultArea = state.areas.find(a => a.active)?.id ?? '';
    setNewSite({ code: generatedCode, name: trimmed, address: 'Lokasi operasional site', areaId: defaultArea });
    setSiteInputText(trimmed);
    setIsSiteOpen(false);
  };

  const handleAddLine = () => {
    // Find first active position that isn't selected yet
    const usedPosIds = new Set(lines.map(l => l.positionId));
    const nextAvailable = activePositions.find(p => !usedPosIds.has(p.id))?.id ?? '';
    setLines([...lines, { positionId: nextAvailable, qty: 1, shift: 'Pagi', notes: '' }]);
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        back={fpkId ? `/fpk/${fpkId}` : '/fpk'}
        title={mode === 'baru' ? 'Buat FPK' : mode === 'draf' ? `Ubah draf ${existing!.number}` : `Versi baru ${existing!.number}`}
        subtitle={mode === 'versi' ? `Dikembalikan: "${existing!.returned?.reason}". Versi ${base!.no} tetap tersimpan dan bisa dibuka.` : 'BOQ dan bukti deal wajib dilampirkan sebelum FPK bisa dikirim ke cek.'}
      />
      <div className="space-y-4">
        <Card title="Kontrak">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Jenis" required>
              <Select value={type} onChange={e => setType(e.target.value as FpkType)} disabled={mode === 'versi'}>
                <option value="baru">Baru</option>
                <option value="perubahan">Perubahan</option>
                <option value="perpanjangan">Perpanjangan</option>
              </Select>
            </Field>
            {type !== 'baru' && (
              <Field label="FPK induk" required>
                <Select value={parentFpkId} onChange={e => setParent(e.target.value)}>
                  <option value="">– pilih –</option>
                  {parents.map(f => <option key={f.id} value={f.id}>{f.number} · {lookups.site.get(latest(f).siteId)?.name}</option>)}
                </Select>
              </Field>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {/* Searchable / Typeable Client Input */}
            <div>
              <Field label="Klien" required hint="Ketik untuk mencari atau ketik nama klien baru yang belum terdaftar.">
                <div className="relative" ref={clientDropdownRef}>
                  <div className="relative flex items-center">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <Input
                      className="pl-9 pr-8"
                      placeholder="Ketik atau pilih klien..."
                      value={clientInputText}
                      disabled={mode === 'versi'}
                      onFocus={() => setIsClientOpen(true)}
                      onChange={e => {
                        setClientInputText(e.target.value);
                        setIsClientOpen(true);
                        if (clientId) setClientId('');
                        if (newClient) setNewClient(null);
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                      onClick={() => setIsClientOpen(!isClientOpen)}
                      tabIndex={-1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown suggestions */}
                  {isClientOpen && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1 text-sm">
                      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Klien Terdaftar ({filteredClients.length})
                      </div>
                      {filteredClients.map(c => (
                        <div
                          key={c.id}
                          className="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-slate-800"
                          onClick={() => handleSelectClient(c)}
                        >
                          <div>
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-xs text-slate-400 ml-2">({c.code})</span>
                          </div>
                          {clientId === c.id && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400">Tidak ada klien terdaftar yang cocok</div>
                      )}

                      {/* Option to create new client by typing */}
                      {clientInputText.trim() && !isExactClientMatch && (
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <div
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-emerald-800 font-medium flex items-center gap-1.5"
                            onClick={() => handleCreateNewClient(clientInputText)}
                          >
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span>Gunakan sebagai klien baru: <strong>"{clientInputText.trim()}"</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Info badge if new client is chosen */}
                {newClient && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Klien baru: {newClient.name} ({newClient.code})
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">Account owner otomatis Anda ({me.name}). Alamat: {newClient.billingAddress}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setNewClient(null); setClientInputText(''); }}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Batalkan klien baru"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </Field>
            </div>

            {/* Searchable / Typeable Site Input */}
            <div>
              <Field label="Site" required hint="Ketik untuk mencari atau ketik nama site baru operasional.">
                <div className="relative" ref={siteDropdownRef}>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <Input
                      className="pl-9 pr-8"
                      placeholder="Ketik atau pilih site..."
                      value={siteInputText}
                      onFocus={() => setIsSiteOpen(true)}
                      onChange={e => {
                        setSiteInputText(e.target.value);
                        setIsSiteOpen(true);
                        if (siteId) setSiteId('');
                        if (newSite) setNewSite(null);
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                      onClick={() => setIsSiteOpen(!isSiteOpen)}
                      tabIndex={-1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown suggestions */}
                  {isSiteOpen && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1 text-sm">
                      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {clientId ? `Site Klien Ini (${filteredSites.length})` : 'Pilih/Ketik Site'}
                      </div>
                      {filteredSites.map(s => (
                        <div
                          key={s.id}
                          className="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-slate-800"
                          onClick={() => handleSelectSite(s)}
                        >
                          <div>
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-xs text-slate-400 ml-2">({lookups.area.get(s.areaId)?.name ?? s.code})</span>
                          </div>
                          {siteId === s.id && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                      ))}
                      {filteredSites.length === 0 && clientId && (
                        <div className="px-3 py-2 text-xs text-slate-400">Belum ada site terdaftar untuk klien ini</div>
                      )}

                      {/* Option to create new site by typing */}
                      {siteInputText.trim() && !isExactSiteMatch && (
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <div
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-emerald-800 font-medium flex items-center gap-1.5"
                            onClick={() => handleCreateNewSite(siteInputText)}
                          >
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span>Gunakan sebagai site baru: <strong>"{siteInputText.trim()}"</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* If new site is chosen, allow picking Area */}
                {newSite && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Site baru: {newSite.name} ({newSite.code})
                      </div>
                      <button
                        type="button"
                        onClick={() => { setNewSite(null); setSiteInputText(''); }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Batalkan site baru"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-0.5">Area yang mengurus:</span>
                        <Select
                          value={newSite.areaId}
                          onChange={e => setNewSite({ ...newSite, areaId: e.target.value })}
                          className="text-xs py-1"
                        >
                          <option value="">– pilih area –</option>
                          {state.areas.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-0.5">Alamat:</span>
                        <Input
                          value={newSite.address}
                          onChange={e => setNewSite({ ...newSite, address: e.target.value })}
                          placeholder="Alamat ringkas site..."
                          className="text-xs py-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Field>
            </div>
          </div>

          {/* Nilai per bulan with Rp prefix & thousands commas */}
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div>
              <Field label="Nilai per bulan, sebelum PPN (Rp)" required hint="Total penawaran per bulan di surat/BOQ, belum termasuk PPN.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none">Rp</span>
                  <Input
                    className="pl-10 font-medium tabular-nums"
                    placeholder="0"
                    value={monthlyValue ? formatNumberWithCommas(monthlyValue) : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setValue(raw ? parseInt(raw, 10) : 0);
                    }}
                  />
                </div>
              </Field>
              {/* Info notice that Finance will recheck this */}
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-md p-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>Nilai per bulan ini akan dicek kembali dan diverifikasi oleh tim <strong>Finance</strong> (analisis biaya & margin).</span>
              </div>
            </div>
          </div>

          {/* Contract Period - No auto 1 year, no backdating, plannedStart removed from form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <Field label="Periode mulai" required hint="Pilih tanggal mulai kontrak (tidak bisa tanggal lampau).">
              <DateInput
                value={periodStart}
                min={TODAY}
                onChange={e => {
                  setPS(e.target.value);
                  // Do not auto-set 1 year; if periodEnd is before new periodStart, clear it
                  if (periodEnd && diffDays(e.target.value, periodEnd) <= 0) {
                    setPE('');
                  }
                }}
              />
            </Field>
            <Field label="Periode selesai" required hint="Pilih tanggal akhir kontrak (harus setelah periode mulai).">
              <DateInput
                value={periodEnd}
                min={periodStart || TODAY}
                onChange={e => setPE(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* Baris Jabatan */}
        <Card title="Baris jabatan">
          {/* Info notice that Ops & Recruitment will recheck */}
          <div className="flex items-start gap-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-900 mb-3">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              Kebutuhan personel, formasi shift, dan kualifikasi khusus pada baris jabatan ini masih akan dicek dan diverifikasi oleh tim <strong>Operasional</strong> dan <strong>Recruitment</strong>.
            </div>
          </div>

          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-5">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Jabatan</span>
                    <Select
                      value={l.positionId}
                      onChange={e => setLines(lines.map((x, j) => j === i ? { ...x, positionId: e.target.value } : x))}
                    >
                      <option value="">– pilih jabatan –</option>
                      {activePositions.map(p => {
                        const isAlreadyChosen = lines.some((other, j) => j !== i && other.positionId === p.id);
                        return (
                          <option key={p.id} value={p.id} disabled={isAlreadyChosen}>
                            {p.name} {isAlreadyChosen ? '(sudah dipilih)' : ''}
                          </option>
                        );
                      })}
                    </Select>
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Jumlah Personel</span>
                    {/* Fixed quantity input: 0 can be deleted cleanly without 020 glitch */}
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="1"
                      className="text-center font-medium"
                      value={l.qty === 0 ? '' : l.qty}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const num = val === '' ? 0 : parseInt(val, 10);
                        setLines(lines.map((x, j) => j === i ? { ...x, qty: num } : x));
                      }}
                      onBlur={() => {
                        if (l.qty === 0) {
                          setLines(lines.map((x, j) => j === i ? { ...x, qty: 1 } : x));
                        }
                      }}
                    />
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Shift Jaga</span>
                    <Select
                      value={l.shift}
                      onChange={e => setLines(lines.map((x, j) => j === i ? { ...x, shift: e.target.value as Shift } : x))}
                    >
                      {SHIFTS.map(s => <option key={s}>{s}</option>)}
                    </Select>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-center pt-4">
                    <button
                      type="button"
                      disabled={lines.length === 1}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      aria-label="Hapus baris"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Specific requirement / notes column per position */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Catatan & Spesifikasi Khusus Jabatan</span>
                  <Input
                    className="text-xs bg-white"
                    placeholder="Contoh: Wajib sertifikat Gada Pratama, tinggi min 170cm, bisa bela diri, memiliki SIM A..."
                    value={l.notes ?? ''}
                    onChange={e => setLines(lines.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Button "+ Tambah baris" located UNDER the latest row */}
          <div className="mt-3 pt-2 flex items-center justify-between">
            <Btn
              type="button"
              size="sm"
              variant="secondary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddLine}
              disabled={lines.length >= activePositions.length}
            >
              Tambah baris jabatan
            </Btn>
            <p className="text-xs text-slate-500">
              Total <strong>{lines.reduce((n, l) => n + (l.qty || 0), 0)}</strong> personel. Sumber personel per baris diisi Recruitment saat cek.
            </p>
          </div>
        </Card>

        {/* Lampiran */}
        <Card title="Lampiran">
          <div className="grid sm:grid-cols-2 gap-4">
            <FilePick label="BOQ yang dikirim ke klien (boleh lebih dari satu)" files={boq} multiple onAdd={n => setBoq([...boq, n])} onRemove={i => setBoq(boq.filter((_, j) => j !== i))} />
            <FilePick label="Bukti deal tertulis (email atau surat)" files={deal} onAdd={n => setDeal([...deal, n])} onRemove={i => setDeal(deal.filter((_, j) => j !== i))} />
          </div>
        </Card>

        {plan && (
          <Card title="Yang akan mereview ulang versi ini">
            <div className="flex items-start gap-2 text-sm">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {plan.toBod ? 'Langsung ke BOD' : [...plan.divisions, ...(plan.finance ? ['Finance (cek margin)'] : [])].join(', ')}
                </p>
                <ul className="text-xs text-slate-600 mt-1 list-disc pl-4">{plan.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            </div>
          </Card>
        )}

        <ErrorText>{err}</ErrorText>

        <div className="flex flex-wrap justify-end gap-2">
          <Btn variant="secondary" onClick={() => navigate(fpkId ? `/fpk/${fpkId}` : '/fpk')}>Batal</Btn>
          {mode === 'versi' ? (
            <Btn onClick={handleInitiateSubmit}>Kirim versi {base!.no + 1}</Btn>
          ) : (
            <>
              <Btn variant="secondary" onClick={() => saveDraft(false)}>Simpan draf</Btn>
              <Btn onClick={handleInitiateSubmit}>Kirim FPK</Btn>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal before Sending FPK */}
      <Modal
        open={showConfirmModal}
        title="Konfirmasi Pengiriman FPK"
        onClose={() => setShowConfirmModal(false)}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setShowConfirmModal(false)}>Batal</Btn>
            <Btn variant="primary" onClick={handleConfirmSubmit}>Yakin, Kirim FPK</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950">
            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-sm mb-1">FPK akan diverifikasi oleh 3 Divisi</p>
              Pengajuan ini akan diteruskan secara paralel ke tim terkait sebelum masuk ke tahap persetujuan BOD:
            </div>
          </div>

          <div className="grid gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-semibold text-slate-800">Tim Operasional</p>
                <p className="text-slate-600">Memeriksa kelayakan site operasional, pos jaga, jadwal shift, dan koordinasi dengan PIC area.</p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-semibold text-slate-800">Tim Recruitment</p>
                <p className="text-slate-600">Memvalidasi ketersediaan kandidat, kebutuhan rekrutmen baru / mutasi / standby, serta kualifikasi khusus.</p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-semibold text-slate-800">Tim Pengadaan & Finance</p>
                <p className="text-slate-600">Menghitung kesiapan perlengkapan kerja dan seragam, serta menganalisis batas margin profit keuangan.</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-100 rounded-lg text-xs space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Klien / Site:</span>
              <span className="font-semibold text-slate-800">{newClient?.name || lookups.client.get(clientId)?.name} / {newSite?.name || lookups.site.get(siteId)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Periode:</span>
              <span className="font-medium">{fmtDate(periodStart)} s/d {fmtDate(periodEnd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Personel:</span>
              <span className="font-medium">{lines.reduce((n, l) => n + (l.qty || 0), 0)} orang</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nilai Penawaran / Bulan:</span>
              <span className="font-semibold text-emerald-700">{fmtRp(monthlyValue)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-medium pt-1">
            Apakah Anda yakin seluruh data di atas sudah benar dan siap diajukan untuk proses verifikasi?
          </p>
        </div>
      </Modal>
    </div>
  );
};
