import React, { useState, useMemo } from 'react';
import { 
  Site, Project, SPK, Personnel, Area 
} from '../../types';
import { 
  X, MapPin, Shield, Users, FileText, CheckCircle2, 
  AlertCircle, Clock, ChevronRight, Download, Phone, 
  Mail, ShieldCheck, Building2, Eye, Search, Layers, Radio
} from 'lucide-react';

interface SiteDetailDrawerProps {
  site: Site | null;
  project?: Project | null;
  linkedSPKs: SPK[];
  areas: Area[];
  allPersonnel: Personnel[];
  onClose: () => void;
  onPreviewSpk?: (spk: SPK) => void;
}

export const SiteDetailDrawer: React.FC<SiteDetailDrawerProps> = ({
  site,
  project,
  linkedSPKs,
  areas,
  allPersonnel,
  onClose,
  onPreviewSpk
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'documents' | 'posts' | 'sop'>('security');
  const [guardSearch, setGuardSearch] = useState('');
  const [guardFilterRole, setGuardFilterRole] = useState<string>('all');

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!site) return null;

  // Format currency
  const formatCompactRupiah = (amount?: number) => {
    if (!amount) return 'Rp 0';
    if (amount >= 1_000_000_000) {
      const val = amount / 1_000_000_000;
      return `Rp ${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} miliar`;
    }
    if (amount >= 1_000_000) {
      const val = amount / 1_000_000;
      return `Rp ${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} juta`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatReadableDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${monthNames[month]} ${year}`;
  };

  // Find linked SPK for this site
  const siteSpk = linkedSPKs.find(s => s.siteIds.includes(site.id)) || linkedSPKs[0];
  const area = areas.find(a => a.id === site.areaId);

  // Generate full roster of guards (merging actual + synthetic to match assignedPersonnel count)
  const roster = useMemo(() => {
    const actual = allPersonnel.filter(p => p.siteId === site.id || site.assignedPersonnelIds.includes(p.id));
    const targetCount = site.assignedPersonnel || 20;

    const list: (Personnel & { shift: string; post: string })[] = [];
    const positions: Personnel['position'][] = [
      'Danru (Supervisor)',
      'Patrol Guard',
      'Gate Controller',
      'CCTV Operator',
      'Patrol Guard',
      'Gate Controller'
    ];
    const shifts = ['Shift 1 (Pagi: 07.00 - 15.00)', 'Shift 2 (Siang: 15.00 - 23.00)', 'Shift 3 (Malam: 23.00 - 07.00)'];
    const posts = ['Pos Gerbang Utama', 'Pos Jembatan Timbang', 'Pos Perimeter Selatan', 'Ruang Kendali CCTV', 'Pos Dermaga'];

    const firstNames = ['Bambang', 'Agus', 'Hendra', 'Eko', 'Rudi', 'Wahyu', 'Slamet', 'Tri', 'Asep', 'Yayan', 'Budi', 'Firman', 'Bayu', 'Rizky', 'Danang', 'Ilham'];
    const lastNames = ['Prabowo', 'Susanto', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Hermawan', 'Kurniawan', 'Hidayat', 'Nugroho', 'Firmansyah', 'Setiawan'];

    actual.forEach((p, idx) => {
      list.push({
        ...p,
        shift: shifts[idx % shifts.length],
        post: posts[idx % posts.length],
      });
    });

    // Fill remaining up to targetCount
    for (let i = list.length; i < targetCount; i++) {
      const f = firstNames[(i * 3 + 1) % firstNames.length];
      const l = lastNames[(i * 5 + 2) % lastNames.length];
      const pos = positions[i % positions.length];
      const numCode = String(100 + i).padStart(3, '0');
      const prefix = site.siteCode.includes('SUL') ? 'SUL' : site.siteCode.includes('JBR') ? 'JBR' : 'JKT';

      list.push({
        id: `gen-${site.id}-${i}`,
        personnelId: `SEC-${prefix}-${numCode}`,
        fullName: `${f} ${l}`,
        position: pos,
        areaId: site.areaId,
        areaName: site.areaName,
        siteId: site.id,
        siteName: site.name,
        employmentStatus: i % 4 === 0 ? 'PKWTT' : 'PKWT',
        assignmentStatus: 'Active',
        startAssignmentDate: site.startGuardTimestamp ? site.startGuardTimestamp.slice(0, 10) : '2026-09-01',
        uniformSize: (['M', 'L', 'XL', 'XXL'] as const)[i % 4],
        shoeSize: 40 + (i % 5),
        skckValidUntil: '2027-06-30',
        k3Certified: i % 2 === 0,
        shift: shifts[i % shifts.length],
        post: posts[i % posts.length],
      });
    }

    return list;
  }, [site, allPersonnel]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return roster.filter(p => {
      const matchQuery = guardSearch.trim() === '' || 
        p.fullName.toLowerCase().includes(guardSearch.toLowerCase()) ||
        p.personnelId.toLowerCase().includes(guardSearch.toLowerCase()) ||
        p.post.toLowerCase().includes(guardSearch.toLowerCase());
      
      const matchRole = guardFilterRole === 'all' || p.position === guardFilterRole;
      return matchQuery && matchRole;
    });
  }, [roster, guardSearch, guardFilterRole]);

  // Shift counts
  const shiftCounts = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, night: 0 };
    roster.forEach(p => {
      if (p.shift.includes('Pagi')) counts.morning++;
      else if (p.shift.includes('Siang')) counts.afternoon++;
      else counts.night++;
    });
    return counts;
  }, [roster]);

  const isUncontracted = project?.isJalanTanpaSPK && (site.name.toLowerCase().includes('bekasi') || site.name.toLowerCase().includes('cikarang'));
  const fillPercentage = site.requiredPersonnel > 0 ? Math.round((site.assignedPersonnel / site.requiredPersonnel) * 100) : 100;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full md:w-4/5 lg:w-[680px] xl:w-[740px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden font-sans"
      >
        {/* Drawer Header (Sticky) */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-white sticky top-0 z-20 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
              <span className="font-semibold text-slate-700">PT JISS</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-600 truncate">{project?.clientName || 'Proyek'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                {site.siteCode}
              </span>
            </nav>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-start gap-3.5 pt-1">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {site.name}
                </h2>
                {isUncontracted ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                    🔴 Belum ada SPK Sah · {project?.daysOperatingWithoutSPK || 13} hari
                  </span>
                ) : site.operationalStatus === 'Active Guard' ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Penjagaan Aktif
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    🟡 Tahap Mobilisasi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                <span className="font-semibold text-slate-800">{site.areaName}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600">{site.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics (4 Kolom Mini) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Keterisian Petugas</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                {site.assignedPersonnel} / {site.requiredPersonnel} <span className="text-xs font-normal text-slate-500">({fillPercentage}%)</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Status Bertugas</span>
              <span className="font-bold text-slate-900 text-xs mt-0.5 block truncate">
                {site.startGuardConfirmed ? `Sejak ${formatReadableDate(site.startGuardTimestamp)}` : 'Tahap Persiapan'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Alokasi SPK</span>
              <span className="font-bold text-slate-900 text-xs mt-0.5 block font-mono">
                {siteSpk ? siteSpk.spkNumber.replace(/-DRAFT$/i, '') : 'Belum ada SPK'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Nilai Kontrak</span>
              <span className="font-bold text-indigo-700 text-xs mt-0.5 block">
                {siteSpk ? formatCompactRupiah(siteSpk.contractValueRp) : '—'}
              </span>
            </div>
          </div>

          {/* Tab Navigasi */}
          <div className="flex items-center gap-1 border-b border-slate-200 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Petugas Keamanan ({roster.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dokumen &amp; SPK ({linkedSPKs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'posts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Pos Jaga &amp; Shift</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sop')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'sop'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Operasional &amp; SOP</span>
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">

          {/* TAB 1: PETUGAS KEAMANAN (SECURITY) */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              
              {/* Shift distribution bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-slate-600 font-medium">Shift Pagi: <strong>{shiftCounts.morning}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600 font-medium">Shift Siang: <strong>{shiftCounts.afternoon}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-800"></span>
                    <span className="text-slate-600 font-medium">Shift Malam: <strong>{shiftCounts.night}</strong></span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Pengawas: <strong>{site.startGuardConfirmedBy || area?.picAreaName || 'Hendra Setiawan (PIC Area)'}</strong>
                </div>
              </div>

              {/* Toolbar Search & Filter Petugas */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={guardSearch}
                    onChange={(e) => setGuardSearch(e.target.value)}
                    placeholder="Cari nama, NIP, atau pos jaga..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                  {guardSearch && (
                    <button
                      type="button"
                      onClick={() => setGuardSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={guardFilterRole}
                  onChange={(e) => setGuardFilterRole(e.target.value)}
                  className="p-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Semua Posisi</option>
                  <option value="Danru (Supervisor)">Danru (Supervisor)</option>
                  <option value="Patrol Guard">Patrol Guard</option>
                  <option value="Gate Controller">Gate Controller</option>
                  <option value="CCTV Operator">CCTV Operator</option>
                </select>
              </div>

              {/* Daftar Petugas (Tabel Roster) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Petugas Keamanan</th>
                      <th className="px-3.5 py-2.5">Pos &amp; Shift</th>
                      <th className="px-3.5 py-2.5">Status &amp; K3</th>
                      <th className="px-3.5 py-2.5 text-right">Perlengkapan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoster.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                          Tidak ditemukan petugas yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredRoster.map((guard) => (
                        <tr key={guard.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-900">{guard.fullName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded text-[10px]">
                                {guard.personnelId}
                              </span>
                              <span>·</span>
                              <span className="font-medium text-slate-700">{guard.position}</span>
                            </div>
                          </td>

                          <td className="px-3.5 py-3">
                            <div className="font-medium text-slate-800">{guard.post}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{guard.shift}</div>
                          </td>

                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono">
                                {guard.employmentStatus}
                              </span>
                              {guard.k3Certified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  K3
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Mulai: {formatReadableDate(guard.startAssignmentDate)}
                            </div>
                          </td>

                          <td className="px-3.5 py-3 text-right">
                            <div className="text-slate-800 font-medium">
                              PDH/PDL: {guard.uniformSize}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Sepatu: No. {guard.shoeSize}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DOKUMEN & KONTRAK */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              
              {/* Kartu SPK Utama Lokasi Ini */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kontrak Payung Lokasi (SPK)</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {siteSpk ? siteSpk.spkNumber.replace(/-DRAFT$/i, '') : 'Belum Ada SPK'}
                    </h3>
                  </div>

                  {siteSpk && (
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      siteSpk.verificationStatus === 'Verified'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {siteSpk.verificationStatus === 'Verified' ? 'Terverifikasi (Sah)' : 'Menunggu Verifikasi'}
                    </span>
                  )}
                </div>

                {siteSpk ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3 text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Nilai Kontrak:</span>
                        <strong className="text-slate-900 font-semibold">{formatCompactRupiah(siteSpk.contractValueRp)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Masa Berlaku:</span>
                        <strong className="text-slate-900 font-semibold">{formatReadableDate(siteSpk.contractStart)} – {formatReadableDate(siteSpk.contractEnd)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Kuota Personel:</span>
                        <strong className="text-slate-900 font-semibold">{siteSpk.personnelQuota} Petugas</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Verifikator:</span>
                        <strong className="text-slate-900 font-semibold">{siteSpk.verifiedBy || 'Tim Keuangan'}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-mono text-xs text-slate-800 truncate font-semibold">
                          {siteSpk.spkDocumentName}
                        </span>
                      </div>

                      {onPreviewSpk && (
                        <button
                          type="button"
                          onClick={() => onPreviewSpk(siteSpk)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs font-semibold shadow-2xs transition-colors shrink-0 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Pratinjau
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    Lokasi ini belum memiliki dokumen SPK yang terverifikasi. Penjagaan sedang berjalan berdasarkan persetujuan FPK (Aturan 6.3).
                  </div>
                )}
              </div>

              {/* Dokumen Tambahan Lokasi */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Berkas Operasional &amp; Legalitas Tambahan
                </h4>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">Berita Acara Mulai Tugas (BAMT)</div>
                      <div className="text-[11px] text-slate-500">Dikonfirmasi oleh {site.startGuardConfirmedBy || 'Hendra Setiawan'}</div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Ditandatangani
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">SOP Pengamanan Khusus Klien</div>
                      <div className="text-[11px] text-slate-500">Standar operasional gate check, body search &amp; patroli</div>
                    </div>
                    <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      SOP Aktif
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">Daftar Inventaris Alat &amp; K3 Lokasi</div>
                      <div className="text-[11px] text-slate-500">HT, metal detector, rompi, dan APD terverifikasi</div>
                    </div>
                    <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      Lengkap
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: POS JAGA & SHIFT */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pos Jaga Fisik di {site.name}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Pos 1 — Gerbang Utama &amp; Jembatan Timbang</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">24 Jam</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Pemeriksaan truk angkut, verifikasi surat jalan, kartu akses pengunjung, dan pemeriksaan barang bawaan.
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      Peralatan: 2 HT, Metal Detector, Cermin Cek Kolong, Komputer Log.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Pos 2 — Ruang Kendali CCTV &amp; Monitoring</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">24 Jam</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Pengawasan 32 titik kamera CCTV perimeter, pemantauan alarm pintu darurat, dan koordinasi radio satpam.
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      Peralatan: NVR System, Monitor Wall, Radio Base Station, Telepon Darurat.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Pos 3 — Perimeter Belakang &amp; Dermaga</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">24 Jam</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Rute patroli interval 60 menit dengan Guard Tour System, pagar pembatas kawasan, dan pos jaga dermaga.
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      Peralatan: Guard Tour RFID Wand, Senter Patroli 1000lm, Jas Hujan.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Pos 4 — Lobi Kantor &amp; Resepsionis</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">07.00 - 19.00</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Registrasi tamu eksternal, penukaran kartu visitor ID, dan asistensi keselamatan gedung perkantoran.
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      Peralatan: Visitor Pass Scanner, Panic Button, Buku Tamu Digital.
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Shift */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Pola Kerja Shift</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/60">
                    <div className="font-bold text-amber-900">Shift Pagi (Shift 1)</div>
                    <div className="text-slate-600 text-[11px] mt-0.5">07.00 – 15.00 WIB</div>
                    <div className="text-slate-500 text-[10px] mt-1">Fokus: Arus masuk karyawan &amp; truk logistik pagi.</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/60">
                    <div className="font-bold text-blue-900">Shift Siang (Shift 2)</div>
                    <div className="text-slate-600 text-[11px] mt-0.5">15.00 – 23.00 WIB</div>
                    <div className="text-slate-500 text-[10px] mt-1">Fokus: Jam kepulangan staf &amp; penguncian gudang.</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-200/60">
                    <div className="font-bold text-indigo-900">Shift Malam (Shift 3)</div>
                    <div className="text-slate-600 text-[11px] mt-0.5">23.00 – 07.00 WIB</div>
                    <div className="text-slate-500 text-[10px] mt-1">Fokus: Patroli intensif perimeter &amp; sterilisasi area.</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: OPERASIONAL & SOP */}
          {activeTab === 'sop' && (
            <div className="space-y-4">
              
              {/* Kontak Darurat */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Narahubung &amp; Kontak Darurat Lokasi
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Pengawas Wilayah (PIC Area PT JISS)</span>
                    <strong className="text-slate-900 font-bold block">{site.startGuardConfirmedBy || area?.picAreaName || 'Hendra Setiawan'}</strong>
                    <div className="text-slate-600 text-[11px] flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> +62 812-8899-7701
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Narahubung Klien (User PIC)</span>
                    <strong className="text-slate-900 font-bold block">{project?.clientName}</strong>
                    <div className="text-slate-600 text-[11px] flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Kontak darurat sekuriti klien
                    </div>
                  </div>
                </div>
              </div>

              {/* Arahan Pengamanan Klien */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Instruksi Khusus &amp; Prosedur K3
                </h4>

                <ul className="space-y-2 text-slate-600 text-xs list-disc pl-4">
                  <li>Pemeriksaan fisik tas dan ransel berlaku wajib untuk seluruh vendor dan kontraktor harian.</li>
                  <li>Wajib memakai Alat Pelindung Diri (APD: Helm Safety, Rompi Reflektor, Sepatu Safety) di area operasional dermaga dan pabrik.</li>
                  <li>Kawasan steril tanpa rokok berlaku penuh di seluruh area radius 100 meter dari tangki bahan bakar dan gudang bahan kimia.</li>
                  <li>Pelaporan kejadian darurat (insiden, kecelakaan kerja, atau indikasi kehilangan) wajib dilaporkan ke PIC Area dalam waktu maksimal 15 menit.</li>
                </ul>
              </div>

            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Lokasi Jaga ID: <span className="font-mono text-slate-700 font-semibold">{site.id}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Tutup Panel
          </button>
        </div>

      </div>
    </div>
  );
};
