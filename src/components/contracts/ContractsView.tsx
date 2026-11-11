import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useContracts, SpkFormValues, SpkFormMode, FileMeta } from '../../context/ContractContext';
import {
  Kontrak, Tahap, Peran, JenisTanggapan, Dokumen, BarisCocok,
  TAHAP_LABEL, HASIL_LABEL, TAHAP_PEMILIK, TAHAP_TINDAKAN,
  TODAY, addDays, diffDays, fmtDate, fmtRp, isPemilik, isActionable, batasTahap, terlambatHari, sisaHariBerakhir, isMerah,
  cocokkan, userPeran,
} from './model';
import {
  Search, X, Check, ChevronRight, FileText, ArrowLeft,
  CheckCircle2, AlertCircle, Download, Upload, ExternalLink
} from 'lucide-react';

export const ContractsView: React.FC = () => {
  const { currentUser, users, requestConfirmation, setActiveView, setSelectedProject, projects } = useApp();
  const {
    kontrak, getKontrak, myActionCount, lokasiOptions,
    simpanSpk, sahkan, kembalikan, kirimMemoTelaah, setujuiTelaah, kembalikanMemo, setujuiMemo,
    tandaiTerkirim, catatTanggapan, putuskanEskalasi, perpanjangBatas, delegasikan,
    selesaikanDemobilisasi, kirimPengingat, unggahDokumen,
  } = useContracts();

  // ---------------------------------------------------------------------------
  // URL Query Sync: ?tab=tindakan|semua|riwayat & q=... & spk={id}
  // ---------------------------------------------------------------------------
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { tab: 'tindakan', q: '', spk: '' };
    const p = new URLSearchParams(window.location.search);
    const tabRaw = p.get('tab') || 'tindakan';
    const tab = (['tindakan', 'semua', 'riwayat'].includes(tabRaw) ? tabRaw : 'tindakan') as 'tindakan' | 'semua' | 'riwayat';
    const q = p.get('q') || '';
    const spk = p.get('spk') || '';
    return { tab, q, spk };
  };

  const initialParams = getUrlParams();
  const [activeTab, setActiveTab] = useState<'tindakan' | 'semua' | 'riwayat'>(initialParams.tab);
  const [searchQuery, setSearchQuery] = useState(initialParams.q);
  const [selectedSpkId, setSelectedSpkId] = useState<string>(initialParams.spk);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Form states per stage
  const [radioVerif, setRadioVerif] = useState<'cocok' | 'beda_salah' | 'beda_benar'>('cocok');
  const [catatanVerif, setCatatanVerif] = useState('');
  const [memoJenis, setMemoJenis] = useState<'tetap' | 'tarif' | 'kuota' | 'tidak_lanjut'>('tetap');
  const [boqFile, setBoqFile] = useState<FileMeta | null>(null);
  const [marginCost, setMarginCost] = useState('255000000');
  const [marginPct, setMarginPct] = useState('17.7');
  const [bodMemoRadio, setBodMemoRadio] = useState<'setujui' | 'kembalikan'>('setujui');
  const [bodMemoCatatan, setBodMemoCatatan] = useState('');
  const [tanggalKirimMemo, setTanggalKirimMemo] = useState(TODAY);
  const [buktiKirimFile, setBuktiKirimFile] = useState<FileMeta | null>(null);
  const [tanggapanRadio, setTanggapanRadio] = useState<JenisTanggapan>('setuju');
  const [tanggapanCatatan, setTanggapanCatatan] = useState('');
  const [eskalasiRadio, setEskalasiRadio] = useState<'perpanjang' | 'tidak_lanjut' | 'beri_waktu'>('perpanjang');
  const [eskalasiBatasDate, setEskalasiBatasDate] = useState(addDays(TODAY, 14));
  const [eskalasiCatatan, setEskalasiCatatan] = useState('');
  const [demobilisasiCatatan, setDemobilisasiCatatan] = useState('');

  // Modals & Drawers
  const [formDrawer, setFormDrawer] = useState<{
    open: boolean;
    mode: SpkFormMode;
    targetId: string | null;
  }>({ open: false, mode: 'baru', targetId: null });

  const [docPreviewModal, setDocPreviewModal] = useState<{
    open: boolean;
    doc: Dokumen | null;
    kontrak: Kontrak | null;
  }>({ open: false, doc: null, kontrak: null });

  const [delegasiModal, setDelegasiModal] = useState<{
    open: boolean;
    targetId: string | null;
  }>({ open: false, targetId: null });
  const [delegasiUser, setDelegasiUser] = useState('');
  const [delegasiCatatan, setDelegasiCatatan] = useState('');

  // Sync browser popstate
  useEffect(() => {
    const handlePopState = () => {
      const p = getUrlParams();
      setActiveTab(p.tab);
      setSearchQuery(p.q);
      setSelectedSpkId(p.spk);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateUrl = (tab: string, q: string, spk: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.pathname = '/kontrak';
    if (tab !== 'tindakan') url.searchParams.set('tab', tab); else url.searchParams.delete('tab');
    if (q.trim()) url.searchParams.set('q', q.trim()); else url.searchParams.delete('q');
    if (spk) url.searchParams.set('spk', spk); else url.searchParams.delete('spk');
    window.history.pushState(null, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
  };

  const handleTabChange = (tab: 'tindakan' | 'semua' | 'riwayat') => {
    setActiveTab(tab);
    updateUrl(tab, searchQuery, selectedSpkId);
  };

  const isMarketing = currentUser.role === 'Marketing' || currentUser.canCreateFPK;

  // ---------------------------------------------------------------------------
  // Red item evaluation (terlambat, eskalasi, atau tanpa SPK)
  // ---------------------------------------------------------------------------
  const isItemRed = (k: Kontrak): boolean => {
    return (
      k.tahap === 'eskalasi' ||
      terlambatHari(k) > 0 ||
      k.tahap === 'belum_ada' ||
      !!k.lewatTanpaSpk ||
      (k.bertugasTanpaSpkHari ?? 0) > 0
    );
  };

  // ---------------------------------------------------------------------------
  // Filter & Urutan
  // ---------------------------------------------------------------------------
  const filteredList = useMemo(() => {
    let res = [...kontrak];

    // Filter Tab
    if (activeTab === 'tindakan') {
      res = res.filter(k => isActionable(k) && isPemilik(k, currentUser));
    } else if (activeTab === 'semua') {
      res = res.filter(k => k.tahap !== 'selesai');
    } else if (activeTab === 'riwayat') {
      res = res.filter(k => k.tahap === 'selesai');
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      res = res.filter(k => {
        const owner = pemilikTahap(k) || '';
        const client = k.clientName.toLowerCase();
        const lokasi = (k.lokasi + ' ' + k.lokasiDetail).toLowerCase();
        const spkNum = (k.spkNumber || '').toLowerCase();
        const peran = owner.toLowerCase();
        const peranAlt = peran === 'pemasaran' ? 'marketing' : peran === 'keuangan' ? 'finance' : peran === 'operasional' ? 'operations' : '';
        return (
          client.includes(q) ||
          lokasi.includes(q) ||
          spkNum.includes(q) ||
          peran.includes(q) ||
          peranAlt.includes(q)
        );
      });
    }

    // Sorting
    if (activeTab === 'tindakan') {
      // Urutan Perlu Tindakan: merah dulu (eskalasi → terlambat terlama → tanpa SPK terlama), lalu abu-abu (batas terdekat).
      res.sort((a, b) => {
        const redA = isItemRed(a);
        const redB = isItemRed(b);

        if (redA && !redB) return -1;
        if (!redA && redB) return 1;

        if (redA && redB) {
          // 1. Eskalasi first
          if (a.tahap === 'eskalasi' && b.tahap !== 'eskalasi') return -1;
          if (a.tahap !== 'eskalasi' && b.tahap === 'eskalasi') return 1;

          // 2. Terlambat terlama
          const tA = terlambatHari(a);
          const tB = terlambatHari(b);
          if (tA !== tB) return tB - tA;

          // 3. Tanpa SPK terlama
          const spkA = a.bertugasTanpaSpkHari || 0;
          const spkB = b.bertugasTanpaSpkHari || 0;
          if (spkA !== spkB) return spkB - spkA;
        }

        // Abu-abu: batas terdekat
        const batasA = batasTahap(a);
        const batasB = batasTahap(b);
        const diffA = batasA ? diffDays(TODAY, batasA) : 999;
        const diffB = batasB ? diffDays(TODAY, batasB) : 999;
        return diffA - diffB;
      });
    } else if (activeTab === 'riwayat') {
      res.sort((a, b) => (b.selesaiPada || '').localeCompare(a.selesaiPada || ''));
    } else {
      res.sort((a, b) => {
        const redA = isItemRed(a);
        const redB = isItemRed(b);
        if (redA && !redB) return -1;
        if (!redA && redB) return 1;
        return a.clientName.localeCompare(b.clientName);
      });
    }

    return res;
  }, [kontrak, activeTab, searchQuery, currentUser]);

  // Keep selection valid
  useEffect(() => {
    if (filteredList.length > 0) {
      if (!selectedSpkId || !filteredList.some(k => k.id === selectedSpkId)) {
        setSelectedSpkId(filteredList[0].id);
      }
    } else {
      setSelectedSpkId('');
    }
  }, [filteredList, selectedSpkId]);

  const activeKontrak = useMemo(() => {
    return filteredList.find(k => k.id === selectedSpkId) || (selectedSpkId ? getKontrak(selectedSpkId) : null);
  }, [selectedSpkId, filteredList, getKontrak]);

  // Helper after action saved: select next item
  const advanceToNextItem = () => {
    const curIdx = filteredList.findIndex(k => k.id === selectedSpkId);
    if (filteredList.length > 1) {
      const nextIdx = curIdx + 1 < filteredList.length ? curIdx + 1 : Math.max(0, curIdx - 1);
      const nextItem = filteredList[nextIdx];
      if (nextItem && nextItem.id !== selectedSpkId) {
        setSelectedSpkId(nextItem.id);
        updateUrl(activeTab, searchQuery, nextItem.id);
        return;
      }
    }
    setSelectedSpkId('');
  };

  // ---------------------------------------------------------------------------
  // Kalimat Situasi (Sesuai Template Bagian 5.2)
  // ---------------------------------------------------------------------------
  const renderSituasiText = (k: Kontrak) => {
    const t = terlambatHari(k);
    const owner = pemilikTahap(k);

    // 1. SPK diinput, menunggu verifikasi
    if (k.tahap === 'menunggu_verifikasi') {
      return (
        <span>
          SPK menunggu verifikasi Keuangan.
          {t > 0 && (
            <> Terlambat <span className="text-red-600 font-semibold">{t} hari</span>.</>
          )}
        </span>
      );
    }

    // 2. Perlu revisi (dikembalikan)
    if (k.tahap === 'dikembalikan') {
      const tgl = fmtDate(k.verifikasi?.pada || k.dikirimVerifikasiPada || '2026-10-15');
      return (
        <span>
          SPK perlu direvisi oleh klien. Invoice ditahan sejak {tgl}.
        </span>
      );
    }

    // 3. Jalan tanpa SPK (bukan eskalasi)
    if (k.tahap === 'belum_ada' || (!isItemRed(k) && k.bertugasTanpaSpkHari)) {
      const days = k.bertugasTanpaSpkHari || 7;
      const valJuta = Math.round((k.nilai || 250000000) / 1000000);
      return (
        <span>
          Lokasi ini bertugas <span className="text-red-600 font-semibold">{days} hari</span> tanpa SPK. Rp {valJuta} juta tertahan.
        </span>
      );
    }

    // 4. Berlaku (tidak ada tindakan)
    if (k.tahap === 'berlaku') {
      const tglH75 = fmtDate(addDays(k.berakhir || TODAY, -75));
      return (
        <span>
          Kontrak berlaku. Persiapan perpanjangan dimulai {tglH75}.
        </span>
      );
    }

    // 5. Memo draf (H-75)
    if (k.tahap === 'persiapan_perpanjangan') {
      const sisa = sisaHariBerakhir(k) || 75;
      return (
        <span>
          Kontrak berakhir dalam {sisa} hari. Siapkan memo perpanjangan.
        </span>
      );
    }

    // 6. Memo cek margin
    if (k.tahap === 'telaah_memo') {
      return <span>Memo menunggu cek margin Keuangan.</span>;
    }

    // 7. Memo menunggu BOD
    if (k.tahap === 'persetujuan_memo') {
      const isLowMargin = k.nilai && k.nilai < 280000000;
      return (
        <span>
          Memo menunggu persetujuan Direksi.
          {isLowMargin && (
            <> <span className="text-red-600 font-semibold">Margin di bawah minimum.</span></>
          )}
        </span>
      );
    }

    // 8. Memo disetujui
    if (k.tahap === 'kirim_memo') {
      const tglH60 = fmtDate(addDays(k.berakhir || TODAY, -60));
      return (
        <span>
          Memo disetujui. Kirim ke klien paling lambat {tglH60}.
        </span>
      );
    }

    // 9. Memo terkirim
    if (k.tahap === 'menunggu_tanggapan') {
      const tglKirim = fmtDate(k.memo.dikirim?.pada);
      return (
        <span>
          Memo terkirim {tglKirim}. Catat jawaban klien.
        </span>
      );
    }

    // 10. Eskalasi
    if (k.tahap === 'eskalasi') {
      if (k.bertugasTanpaSpkHari && k.bertugasTanpaSpkHari > 30) {
        const valJuta = Math.round((k.nilai || 250000000) / 1000000);
        return (
          <span>
            Lokasi ini bertugas <span className="text-red-600 font-semibold">{k.bertugasTanpaSpkHari} hari</span> tanpa SPK. Rp {valJuta} juta tertahan. <span className="text-red-600 font-semibold">Keputusan Direksi diperlukan.</span>
          </span>
        );
      }
      if (k.tahapSebelumnya === 'persiapan_perpanjangan' || k.tahapSebelumnya === 'telaah_memo' || k.tahapSebelumnya === 'persetujuan_memo' || k.tahapSebelumnya === 'kirim_memo') {
        return (
          <span>
            Memo belum terkirim hingga H-60. <span className="text-red-600 font-semibold">Keputusan Direksi diperlukan.</span>
          </span>
        );
      }
      return (
        <span>
          Klien belum menjawab memo perpanjangan hingga H-30. <span className="text-red-600 font-semibold">Keputusan Direksi diperlukan.</span>
        </span>
      );
    }

    // 11. Negosiasi
    if (k.tahap === 'negosiasi') {
      return <span>Negosiasi sedang berlangsung dengan klien. Catat hasil kesepakatan.</span>;
    }

    // 12. Demobilisasi
    if (k.tahap === 'demobilisasi') {
      return <span>Kontrak tidak dilanjutkan. Selesaikan proses penarikan personel lapangan.</span>;
    }

    // 13. Selesai
    if (k.tahap === 'selesai') {
      return (
        <span>
          Kontrak telah selesai ({HASIL_LABEL[k.hasil || 'berakhir']}) pada {fmtDate(k.selesaiPada)}.
        </span>
      );
    }

    return <span>Menunggu tindak lanjut dari {owner || 'tim terkait'}.</span>;
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleVerifikasiSave = () => {
    if (!activeKontrak) return;
    if (radioVerif === 'beda_salah') {
      if (!catatanVerif.trim()) {
        alert('Catatan wajib diisi jika SPK salah.');
        return;
      }
      const res = kembalikan(activeKontrak.id, catatanVerif.trim());
      if (res.ok) advanceToNextItem();
    } else if (radioVerif === 'beda_benar') {
      if (!catatanVerif.trim()) {
        alert('Catatan wajib diisi jika SPK memiliki data berbeda.');
        return;
      }
      requestConfirmation({
        title: 'Konfirmasi Pengesahan SPK',
        message: 'SPK memiliki perbedaan data dengan FPK namun akan disahkan. Lanjutkan?',
        confirmLabel: 'Ya, lanjutkan',
        variant: 'primary',
        requiresNotes: false,
        onConfirm: () => {
          const res = sahkan(activeKontrak.id, `Disahkan dengan catatan: ${catatanVerif.trim()}`);
          if (res.ok) advanceToNextItem();
        }
      });
    } else {
      // cocok
      const res = sahkan(activeKontrak.id, catatanVerif.trim() || 'Data sesuai FPK');
      if (res.ok) advanceToNextItem();
    }
  };

  const handleKirimMemoPersetujuan = () => {
    if (!activeKontrak) return;
    const nomor = activeKontrak.memo.nomor || `MEMO/MKT/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;
    const res = kirimMemoTelaah(activeKontrak.id, nomor, boqFile);
    if (res.ok) advanceToNextItem();
  };

  const handleSimpanMargin = () => {
    if (!activeKontrak) return;
    const res = setujuiTelaah(activeKontrak.id, `Margin: ${marginPct}%, Estimasi biaya: ${fmtRp(Number(marginCost) || 0)}`);
    if (res.ok) advanceToNextItem();
  };

  const handleSimpanBODMemo = () => {
    if (!activeKontrak) return;
    if (bodMemoRadio === 'kembalikan') {
      if (!bodMemoCatatan.trim()) {
        alert('Catatan wajib diisi jika mengembalikan memo.');
        return;
      }
      const res = kembalikanMemo(activeKontrak.id, bodMemoCatatan.trim());
      if (res.ok) advanceToNextItem();
    } else {
      requestConfirmation({
        title: 'Setujui Memo Perpanjangan',
        message: 'Apakah Anda yakin ingin menyetujui memo perpanjangan ini?',
        confirmLabel: 'Ya, lanjutkan',
        variant: 'primary',
        requiresNotes: false,
        onConfirm: () => {
          const res = setujuiMemo(activeKontrak.id, bodMemoCatatan.trim() || undefined);
          if (res.ok) advanceToNextItem();
        }
      });
    }
  };

  const handleTandaiTerkirim = () => {
    if (!activeKontrak) return;
    if (!buktiKirimFile) {
      alert('Unggah bukti kirim terlebih dahulu.');
      return;
    }
    const res = tandaiTerkirim(activeKontrak.id, tanggalKirimMemo, buktiKirimFile);
    if (res.ok) advanceToNextItem();
  };

  const handleSimpanJawaban = () => {
    if (!activeKontrak) return;
    if (tanggapanRadio === 'tidak_lanjut') {
      requestConfirmation({
        title: 'Konfirmasi Pengakhiran Kontrak',
        message: 'Klien memutuskan tidak melanjutkan kontrak ini. Proses demobilisasi akan disiapkan. Lanjutkan?',
        confirmLabel: 'Ya, lanjutkan',
        variant: 'warning',
        requiresNotes: false,
        onConfirm: () => {
          const res = catatTanggapan(activeKontrak.id, {
            jenis: 'tidak_lanjut',
            catatan: tanggapanCatatan.trim() || 'Klien tidak melanjutkan kontrak.'
          });
          if (res.ok) advanceToNextItem();
        }
      });
    } else if (tanggapanRadio === 'negosiasi') {
      const res = catatTanggapan(activeKontrak.id, {
        jenis: 'negosiasi',
        catatan: tanggapanCatatan.trim() || 'Negosiasi penyesuaian klausul/tarif.',
        tindakLanjut: addDays(TODAY, 14)
      });
      if (res.ok) advanceToNextItem();
    } else {
      const res = catatTanggapan(activeKontrak.id, {
        jenis: 'setuju',
        catatan: tanggapanCatatan.trim() || 'Klien menyetujui perpanjangan kontrak.'
      });
      if (res.ok) advanceToNextItem();
    }
  };

  const handleSimpanEskalasi = () => {
    if (!activeKontrak) return;
    if (eskalasiRadio === 'tidak_lanjut') {
      requestConfirmation({
        title: 'Hentikan Kontrak & Demobilisasi',
        message: 'Kontrak ini akan dihentikan dan didemobilisasi. Lanjutkan?',
        confirmLabel: 'Ya, lanjutkan',
        variant: 'danger',
        requiresNotes: false,
        onConfirm: () => {
          const res = putuskanEskalasi(activeKontrak.id, 'tidak_lanjut', eskalasiCatatan.trim() || 'Direksi memutuskan pengakhiran kontrak.');
          if (res.ok) advanceToNextItem();
        }
      });
    } else if (eskalasiRadio === 'beri_waktu') {
      const res = perpanjangBatas(activeKontrak.id, eskalasiBatasDate, eskalasiCatatan.trim() || 'Batas waktu diperpanjang oleh BOD.');
      if (res.ok) advanceToNextItem();
    } else {
      const res = putuskanEskalasi(activeKontrak.id, 'perpanjang', eskalasiCatatan.trim() || 'Direksi memutuskan perpanjangan kontrak.');
      if (res.ok) advanceToNextItem();
    }
  };

  const handleDemobilisasiSave = () => {
    if (!activeKontrak) return;
    const res = selesaikanDemobilisasi(activeKontrak.id, demobilisasiCatatan.trim());
    if (res.ok) advanceToNextItem();
  };

  const handleDelegasiSubmit = () => {
    if (!delegasiModal.targetId || !delegasiUser) return;
    const res = delegasikan(delegasiModal.targetId, delegasiUser, delegasiCatatan.trim() || 'Didelegasikan melalui dasbor eksekutif.');
    if (res.ok) {
      setDelegasiModal({ open: false, targetId: null });
      advanceToNextItem();
    }
  };

  const handleKirimPengingat = (id: string) => {
    const res = kirimPengingat(id);
    if (!res.ok && res.error) {
      alert(res.error);
    }
  };

  // Relevant document links in Baris Info (max 3)
  const relatedDocs = useMemo(() => {
    if (!activeKontrak) return [];
    return activeKontrak.dokumen.slice(0, 3);
  }, [activeKontrak]);

  // Comparison table for Verifikasi
  const fpkComparison = useMemo(() => {
    if (!activeKontrak || !activeKontrak.fpkAlokasi) return [];
    const a = activeKontrak.fpkAlokasi;
    return [
      {
        label: 'Nilai Kontrak',
        spk: fmtRp(activeKontrak.nilai),
        fpk: fmtRp(a.nilai),
        isDiff: activeKontrak.nilai !== a.nilai
      },
      {
        label: 'Kuota Petugas',
        spk: `${activeKontrak.kuota || activeKontrak.kebutuhanPetugas} petugas`,
        fpk: `${a.kuota} petugas`,
        isDiff: (activeKontrak.kuota || activeKontrak.kebutuhanPetugas) !== a.kuota
      },
      {
        label: 'Tanggal Mulai',
        spk: fmtDate(activeKontrak.mulai),
        fpk: fmtDate(a.mulai),
        isDiff: activeKontrak.mulai !== a.mulai
      },
      {
        label: 'Tanggal Berakhir',
        spk: fmtDate(activeKontrak.berakhir),
        fpk: fmtDate(a.berakhir),
        isDiff: activeKontrak.berakhir !== a.berakhir
      }
    ];
  }, [activeKontrak]);

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden font-sans">
      
      {/* 2. Header Halaman */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Kontrak (SPK)
        </h1>

        {isMarketing && (
          <button
            type="button"
            onClick={() => setFormDrawer({ open: true, mode: 'baru', targetId: null })}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          >
            + Input SPK
          </button>
        )}
      </div>

      {/* 1. Kontainer Dua Kolom */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        
        {/* Kolom Kiri: Daftar 360px */}
        <div className={`w-full lg:w-[360px] shrink-0 border-r border-slate-200 flex flex-col h-full bg-white ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* 3. Toolbar Daftar (Satu Baris) */}
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
            {/* Tab teks: Perlu Tindakan {n} · Semua · Riwayat */}
            <div className="flex items-center gap-3.5 text-xs">
              <button
                type="button"
                onClick={() => handleTabChange('tindakan')}
                className={`pb-1 transition-colors ${
                  activeTab === 'tindakan'
                    ? 'border-b-2 border-slate-900 font-bold text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Perlu Tindakan {myActionCount}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('semua')}
                className={`pb-1 transition-colors ${
                  activeTab === 'semua'
                    ? 'border-b-2 border-slate-900 font-bold text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('riwayat')}
                className={`pb-1 transition-colors ${
                  activeTab === 'riwayat'
                    ? 'border-b-2 border-slate-900 font-bold text-slate-900'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Riwayat
              </button>
            </div>

            {/* Kolom pencarian */}
            <div className="relative flex-1 max-w-[130px] sm:max-w-[150px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari..."
                title="Cari klien, lokasi, nomor SPK, atau peran"
                className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 4. Daftar Item (Scroll Sendiri) */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {searchQuery ? (
                  <div className="space-y-1.5">
                    <p>Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;.</p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-700 underline font-medium"
                    >
                      Hapus pencarian
                    </button>
                  </div>
                ) : activeTab === 'tindakan' ? (
                  'Tidak ada kontrak yang menunggu tindakan.'
                ) : (
                  'Tidak ada kontrak dalam tab ini.'
                )}
              </div>
            ) : (
              filteredList.map((k) => {
                const isSelected = selectedSpkId === k.id;
                const isRed = isItemRed(k);
                const owner = pemilikTahap(k);
                const terlambat = terlambatHari(k);
                const batas = batasTahap(k);
                const sisaHari = batas ? diffDays(TODAY, batas) : undefined;

                // Baris 2 teks waktu
                let baris2Text = '';
                if (k.tahap === 'belum_ada' || (!isRed && k.bertugasTanpaSpkHari)) {
                  baris2Text = `Belum ada SPK · ${k.bertugasTanpaSpkHari || 7} hari`;
                } else if (terlambat > 0) {
                  baris2Text = `Menunggu ${owner || 'tindakan'} · +${terlambat} hari`;
                } else if (sisaHari !== undefined && sisaHari >= 0) {
                  baris2Text = `Menunggu ${owner || 'tindakan'} · ${sisaHari === 0 ? 'hari ini' : `${sisaHari} hari lagi`}`;
                } else if (k.tahap === 'selesai') {
                  baris2Text = `Selesai · ${fmtDate(k.selesaiPada)}`;
                } else {
                  baris2Text = `${TAHAP_LABEL[k.tahap]}`;
                }

                return (
                  <div
                    key={k.id}
                    onClick={() => {
                      setSelectedSpkId(k.id);
                      updateUrl(activeTab, searchQuery, k.id);
                      setShowMobileDetail(true);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 min-h-[64px] ${
                      isSelected
                        ? 'bg-slate-100'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Titik di kiri: 8px merah atau abu-abu */}
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isRed ? 'bg-red-500' : 'bg-slate-300'
                      }`}
                    />

                    {/* Konten 2 baris */}
                    <div className="flex-1 min-w-0">
                      {/* Baris 1: Klien · Lokasi */}
                      <div className={`text-xs truncate leading-snug ${
                        isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-900'
                      }`}>
                        {k.clientName} · {k.lokasi}
                      </div>

                      {/* Baris 2: Menunggu {peran} · {waktu} */}
                      <div className="text-[11px] text-slate-500 truncate leading-snug mt-0.5">
                        {baris2Text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Detail (Scroll Sendiri, Konten max 720px) */}
        <div className={`flex-1 min-w-0 h-full overflow-y-auto bg-white p-6 sm:p-8 ${
          showMobileDetail ? 'flex flex-col' : 'hidden lg:block'
        }`}>
          
          {/* Tombol kembali di tampilan mobile */}
          <div className="lg:hidden mb-4">
            <button
              type="button"
              onClick={() => setShowMobileDetail(false)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
            </button>
          </div>

          {!activeKontrak ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Pilih kontrak di sebelah kiri.
            </div>
          ) : (
            <div className="max-w-[720px] space-y-6">
              
              {/* 5.1 Identitas (2 Baris) */}
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  {activeKontrak.clientName} · {activeKontrak.lokasi}
                </h2>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-slate-700">
                    {activeKontrak.spkNumber || 'Belum ada SPK'}
                  </span>
                  <span>·</span>
                  <span>
                    {activeKontrak.berakhir
                      ? `berakhir ${fmtDate(activeKontrak.berakhir)}`
                      : activeKontrak.bertugasSejak
                      ? `bertugas sejak ${fmtDate(activeKontrak.bertugasSejak)}`
                      : 'belum ditentukan'}
                  </span>
                  {activeKontrak.sourceSpkId && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400">Data awal</span>
                    </>
                  )}
                </div>
              </div>

              {/* 5.2 Kalimat Situasi */}
              <div className="text-sm text-slate-800 leading-relaxed">
                {renderSituasiText(activeKontrak)}
              </div>

              {/* 5.3 Form Tindakan */}
              <div className="pt-2">
                {!isPemilik(activeKontrak, currentUser) ? (
                  // Non-owner view
                  <div className="text-xs text-slate-500 py-2">
                    Menunggu {pemilikTahap(activeKontrak) || 'tindakan'}
                    {activeKontrak.delegasiKe ? ` (${activeKontrak.delegasiKe})` : ''}.{' '}
                    <button
                      type="button"
                      onClick={() => handleKirimPengingat(activeKontrak.id)}
                      className="text-slate-700 underline hover:text-slate-900 font-medium ml-1"
                    >
                      Kirim pengingat
                    </button>
                  </div>
                ) : (
                  // Owner action forms
                  <div className="space-y-4">
                    
                    {/* Kondisi 1: Verifikasi (Keuangan) */}
                    {activeKontrak.tahap === 'menunggu_verifikasi' && (
                      <div className="space-y-4">
                        {/* Tabel Perbandingan FPK vs SPK */}
                        {fpkComparison.length > 0 && (
                          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                <tr>
                                  <th className="px-3 py-2">Field</th>
                                  <th className="px-3 py-2">Alokasi FPK</th>
                                  <th className="px-3 py-2">Dokumen SPK</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {fpkComparison.map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className={row.isDiff ? 'bg-rose-50/60 font-medium text-rose-950' : 'text-slate-700'}
                                  >
                                    <td className="px-3 py-2">{row.label}</td>
                                    <td className="px-3 py-2">{row.fpk}</td>
                                    <td className="px-3 py-2">{row.spk}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Radio Verifikasi */}
                        <div className="space-y-2 text-xs text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="radioVerif"
                              checked={radioVerif === 'cocok'}
                              onChange={() => setRadioVerif('cocok')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Cocok</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="radioVerif"
                              checked={radioVerif === 'beda_salah'}
                              onChange={() => setRadioVerif('beda_salah')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Beda – SPK salah</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="radioVerif"
                              checked={radioVerif === 'beda_benar'}
                              onChange={() => setRadioVerif('beda_benar')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Beda – SPK benar</span>
                          </label>
                        </div>

                        {/* Catatan (Wajib jika beda) */}
                        {radioVerif !== 'cocok' && (
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600 block">
                              Catatan (wajib diisi):
                            </label>
                            <textarea
                              rows={2}
                              value={catatanVerif}
                              onChange={(e) => setCatatanVerif(e.target.value)}
                              placeholder="Tuliskan catatan perbedaan..."
                              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        )}

                        {/* Tombol Utama & Link Sekunder */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleVerifikasiSave}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Simpan Hasil
                          </button>
                          {activeKontrak.dokumen.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDocPreviewModal({
                                open: true,
                                doc: activeKontrak.dokumen[0],
                                kontrak: activeKontrak
                              })}
                              className="text-xs text-slate-600 underline hover:text-slate-900"
                            >
                              Lihat dokumen SPK
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Kondisi 2: Perlu revisi / Belum ada SPK (Marketing) */}
                    {(activeKontrak.tahap === 'belum_ada' || activeKontrak.tahap === 'dikembalikan' || activeKontrak.tahap === 'draf') && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setFormDrawer({
                            open: true,
                            mode: activeKontrak.tahap === 'belum_ada' ? 'baru' : 'isi',
                            targetId: activeKontrak.id
                          })}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                        >
                          Input SPK
                        </button>
                      </div>
                    )}

                    {/* Kondisi 3: Memo draf (Marketing) */}
                    {activeKontrak.tahap === 'persiapan_perpanjangan' && (
                      <div className="space-y-4">
                        <div className="space-y-2 text-xs text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="memoJenis"
                              checked={memoJenis === 'tetap'}
                              onChange={() => setMemoJenis('tetap')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Perpanjangan Tetap (Syarat &amp; Harga Sama)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="memoJenis"
                              checked={memoJenis === 'tarif'}
                              onChange={() => setMemoJenis('tarif')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Penyesuaian Tarif / Nilai Kontrak</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="memoJenis"
                              checked={memoJenis === 'kuota'}
                              onChange={() => setMemoJenis('kuota')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Penyesuaian Kuota / Ruang Lingkup</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="memoJenis"
                              checked={memoJenis === 'tidak_lanjut'}
                              onChange={() => setMemoJenis('tidak_lanjut')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Pengakhiran / Tidak Melanjutkan Kerja Sama</span>
                          </label>
                        </div>

                        {memoJenis === 'tarif' && (
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600 block">
                              Unggah BOQ / RAB Penyesuaian Tarif (PDF):
                            </label>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setBoqFile({ name: file.name, size: file.size });
                              }}
                              className="text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-slate-50 hover:file:bg-slate-100"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleKirimMemoPersetujuan}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Kirim untuk Persetujuan
                          </button>
                          {activeKontrak.dokumen.some(d => d.jenis === 'Memo') && (
                            <button
                              type="button"
                              onClick={() => {
                                const doc = activeKontrak.dokumen.find(d => d.jenis === 'Memo');
                                if (doc) setDocPreviewModal({ open: true, doc, kontrak: activeKontrak });
                              }}
                              className="text-xs text-slate-600 underline hover:text-slate-900"
                            >
                              Lihat draf memo
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Kondisi 4: Cek margin (Keuangan) */}
                    {activeKontrak.tahap === 'telaah_memo' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600 block">
                              Estimasi Biaya / Bulan (Rp)
                            </label>
                            <input
                              type="text"
                              value={marginCost}
                              onChange={(e) => setMarginCost(e.target.value)}
                              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600 block">
                              Margin (%)
                            </label>
                            <input
                              type="text"
                              value={marginPct}
                              onChange={(e) => setMarginPct(e.target.value)}
                              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleSimpanMargin}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const doc = activeKontrak.dokumen.find(d => d.jenis === 'Memo');
                              if (doc) setDocPreviewModal({ open: true, doc, kontrak: activeKontrak });
                            }}
                            className="text-xs text-slate-600 underline hover:text-slate-900"
                          >
                            Lihat BOQ
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kondisi 5: Menunggu BOD (BOD) */}
                    {activeKontrak.tahap === 'persetujuan_memo' && (
                      <div className="space-y-4">
                        <div className="space-y-2 text-xs text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="bodMemoRadio"
                              checked={bodMemoRadio === 'setujui'}
                              onChange={() => setBodMemoRadio('setujui')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Setujui</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="bodMemoRadio"
                              checked={bodMemoRadio === 'kembalikan'}
                              onChange={() => setBodMemoRadio('kembalikan')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Kembalikan</span>
                          </label>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-slate-600 block">
                            Catatan {bodMemoRadio === 'kembalikan' ? '(wajib diisi):' : '(opsional):'}
                          </label>
                          <textarea
                            rows={2}
                            value={bodMemoCatatan}
                            onChange={(e) => setBodMemoCatatan(e.target.value)}
                            placeholder="Tuliskan arahan Direksi..."
                            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleSimpanBODMemo}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Simpan Keputusan
                          </button>
                          <button
                            type="button"
                            onClick={() => setDelegasiModal({ open: true, targetId: activeKontrak.id })}
                            className="text-xs text-slate-600 underline hover:text-slate-900"
                          >
                            Delegasikan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kondisi 6: Memo disetujui (Marketing) */}
                    {activeKontrak.tahap === 'kirim_memo' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600 block">
                              Tanggal Kirim
                            </label>
                            <input
                              type="date"
                              value={tanggalKirimMemo}
                              onChange={(e) => setTanggalKirimMemo(e.target.value)}
                              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600 block">
                              Unggah Memo + Bukti Kirim (PDF)
                            </label>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setBuktiKirimFile({ name: file.name, size: file.size });
                              }}
                              className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-slate-50 hover:file:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleTandaiTerkirim}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Tandai Terkirim
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kondisi 7: Memo terkirim (Marketing) */}
                    {activeKontrak.tahap === 'menunggu_tanggapan' && (
                      <div className="space-y-4">
                        <div className="space-y-2 text-xs text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="tanggapanRadio"
                              checked={tanggapanRadio === 'setuju'}
                              onChange={() => setTanggapanRadio('setuju')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Setuju</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="tanggapanRadio"
                              checked={tanggapanRadio === 'negosiasi'}
                              onChange={() => setTanggapanRadio('negosiasi')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Negosiasi</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="tanggapanRadio"
                              checked={tanggapanRadio === 'tidak_lanjut'}
                              onChange={() => setTanggapanRadio('tidak_lanjut')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Tidak lanjut</span>
                          </label>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-slate-600 block">
                            Catatan tanggapan:
                          </label>
                          <textarea
                            rows={2}
                            value={tanggapanCatatan}
                            onChange={(e) => setTanggapanCatatan(e.target.value)}
                            placeholder="Tuliskan ringkasan jawaban klien..."
                            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleSimpanJawaban}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Simpan Jawaban
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kondisi 8: Eskalasi (BOD) */}
                    {activeKontrak.tahap === 'eskalasi' && (
                      <div className="space-y-4">
                        <div className="space-y-2 text-xs text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="eskalasiRadio"
                              checked={eskalasiRadio === 'perpanjang'}
                              onChange={() => setEskalasiRadio('perpanjang')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Perpanjang</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="eskalasiRadio"
                              checked={eskalasiRadio === 'tidak_lanjut'}
                              onChange={() => setEskalasiRadio('tidak_lanjut')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Tidak lanjut</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="eskalasiRadio"
                              checked={eskalasiRadio === 'beri_waktu'}
                              onChange={() => setEskalasiRadio('beri_waktu')}
                              className="text-slate-900 focus:ring-slate-400"
                            />
                            <span>Beri waktu hingga [tanggal]</span>
                          </label>
                        </div>

                        {eskalasiRadio === 'beri_waktu' && (
                          <div className="space-y-1 max-w-xs">
                            <label className="text-xs text-slate-600 block">
                              Batas Waktu Baru
                            </label>
                            <input
                              type="date"
                              value={eskalasiBatasDate}
                              onChange={(e) => setEskalasiBatasDate(e.target.value)}
                              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs text-slate-600 block">
                            Catatan arahan Direksi:
                          </label>
                          <textarea
                            rows={2}
                            value={eskalasiCatatan}
                            onChange={(e) => setEskalasiCatatan(e.target.value)}
                            placeholder="Tuliskan keputusan Direksi..."
                            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleSimpanEskalasi}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Simpan Keputusan
                          </button>
                          <button
                            type="button"
                            onClick={() => setDelegasiModal({ open: true, targetId: activeKontrak.id })}
                            className="text-xs text-slate-600 underline hover:text-slate-900"
                          >
                            Delegasikan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kondisi 9: Demobilisasi (Operasional) */}
                    {activeKontrak.tahap === 'demobilisasi' && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600 block">
                            Catatan penyelesaian demobilisasi:
                          </label>
                          <textarea
                            rows={2}
                            value={demobilisasiCatatan}
                            onChange={(e) => setDemobilisasiCatatan(e.target.value)}
                            placeholder="Tuliskan status pengembalian aset, seragam, dan mutasi personel..."
                            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleDemobilisasiSave}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Selesaikan Demobilisasi
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* 5.4 Baris Info (di Bawah Garis Pemisah) */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between gap-4 text-xs text-slate-500 flex-wrap">
                {/* Kiri: Tahap saat ini */}
                <div className="text-slate-700 font-medium">
                  {TAHAP_LABEL[activeKontrak.tahap]}
                </div>

                {/* Tengah: Link Dokumen Terkait (Maks 3) */}
                <div className="flex items-center gap-3 flex-wrap">
                  {relatedDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDocPreviewModal({
                        open: true,
                        doc,
                        kontrak: activeKontrak
                      })}
                      className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>📄</span>
                      <span className="truncate max-w-[140px]">{doc.nama}</span>
                    </button>
                  ))}
                </div>

                {/* Kanan: Lihat Riwayat */}
                <div>
                  <button
                    type="button"
                    onClick={() => setHistoryDrawerOpen(true)}
                    className="text-slate-900 hover:text-slate-700 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    Lihat riwayat ›
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 5.5 Drawer Kanan: "Lihat Riwayat" */}
      {/* --------------------------------------------------------------------- */}
      {historyDrawerOpen && activeKontrak && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setHistoryDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[480px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden"
          >
            {/* Header Drawer */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Riwayat &amp; Rincian Kontrak
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeKontrak.clientName} · {activeKontrak.lokasi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Konten Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-700">
              
              {/* 1. Siklus Hidup */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">1. Siklus Kontrak</div>
                <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">1. Input:</span>
                    <span>{activeKontrak.dokumen[0]?.pengunggah || 'Pemasaran'} ({fmtDate(activeKontrak.dikirimVerifikasiPada || activeKontrak.bertugasSejak)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">2. Verifikasi:</span>
                    <span>{activeKontrak.verifikasi ? `${activeKontrak.verifikasi.oleh} (${fmtDate(activeKontrak.verifikasi.pada)})` : 'Menunggu / Dalam proses'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">3. Berlaku:</span>
                    <span>{activeKontrak.mulai ? `${fmtDate(activeKontrak.mulai)} – ${fmtDate(activeKontrak.berakhir)}` : '–'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">4. Perpanjangan:</span>
                    <span>{activeKontrak.memo.nomor ? `${activeKontrak.memo.nomor} (${activeKontrak.tahap})` : 'Belum dimulai'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">5. Selesai:</span>
                    <span>{activeKontrak.tahap === 'selesai' ? `${HASIL_LABEL[activeKontrak.hasil || 'berakhir']} (${fmtDate(activeKontrak.selesaiPada)})` : 'Masih aktif'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Ringkasan */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">2. Ringkasan Kontrak</div>
                <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/50">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nomor SPK:</span>
                    <span className="font-mono font-medium text-slate-900">{activeKontrak.spkNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Periode:</span>
                    <span className="text-slate-900">{fmtDate(activeKontrak.mulai)} – {fmtDate(activeKontrak.berakhir)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nilai Kontrak:</span>
                    <span className="font-medium text-slate-900">{fmtRp(activeKontrak.nilai)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Petugas Terisi / Kebutuhan:</span>
                    <span className="text-slate-900">{activeKontrak.petugasTerisi} / {activeKontrak.kebutuhanPetugas} petugas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lokasi Penjagaan:</span>
                    <span className="text-slate-900">{activeKontrak.lokasiDetail}</span>
                  </div>
                </div>
              </div>

              {/* 3. Semua Dokumen dan Versinya */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">3. Semua Dokumen ({activeKontrak.dokumen.length})</div>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {activeKontrak.dokumen.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          📄 {doc.nama}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {doc.jenis} {doc.versi ? `v${doc.versi}` : ''} · {doc.statusVersi} · {fmtDate(doc.tanggal)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocPreviewModal({ open: true, doc, kontrak: activeKontrak })}
                        className="text-slate-600 hover:text-slate-900 text-xs font-medium shrink-0"
                      >
                        Buka
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Aktivitas (Terbaru di atas) */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">4. Catatan Aktivitas</div>
                <div className="space-y-2">
                  {activeKontrak.aktivitas.map((act) => (
                    <div key={act.id} className="border-l-2 border-slate-200 pl-3 py-1 space-y-0.5">
                      <div className="text-[11px] text-slate-400">
                        {act.pada} · <strong className="text-slate-700 font-semibold">{act.oleh}</strong> ({act.peran})
                      </div>
                      <div className="text-xs text-slate-800">
                        {act.teks}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Link "Lihat proyek ›" */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const prj = projects.find(p => p.id === activeKontrak.projectId);
                    if (prj) {
                      setSelectedProject(prj);
                      setActiveView('project-detail');
                    } else {
                      setActiveView('projects');
                    }
                  }}
                  className="text-xs text-slate-900 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Lihat proyek {activeKontrak.projectName} ›
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Modal Pratinjau Dokumen */}
      {/* --------------------------------------------------------------------- */}
      {docPreviewModal.open && docPreviewModal.doc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setDocPreviewModal({ open: false, doc: null, kontrak: null })}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {docPreviewModal.doc.nama}
                </div>
                <div className="text-[11px] text-slate-500">
                  {docPreviewModal.doc.jenis} · Diunggah oleh {docPreviewModal.doc.pengunggah} pada {fmtDate(docPreviewModal.doc.tanggal)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocPreviewModal({ open: false, doc: null, kontrak: null })}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-3 bg-slate-100/50">
              {docPreviewModal.doc.gagalPratinjau ? (
                <div className="space-y-2">
                  <div className="text-amber-600 text-xs font-semibold">
                    Pratinjau berkas tidak tersedia langsung.
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Berkas ini dapat diunduh langsung untuk ditinjau pada perangkat Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => alert(`Mengunduh berkas ${docPreviewModal.doc?.nama}...`)}
                    className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Dokumen (PDF)
                  </button>
                </div>
              ) : (
                <div className="space-y-3 w-full max-w-md bg-white p-6 rounded-lg border border-slate-200 shadow-2xs text-left">
                  <div className="text-center pb-3 border-b border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {docPreviewModal.doc.nama}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">Dokumen Resmi PT JISS</div>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div><strong>Klien:</strong> {docPreviewModal.kontrak?.clientName}</div>
                    <div><strong>Lokasi:</strong> {docPreviewModal.kontrak?.lokasiDetail}</div>
                    <div><strong>Nomor SPK:</strong> {docPreviewModal.kontrak?.spkNumber || '—'}</div>
                    <div><strong>Status:</strong> {docPreviewModal.doc.statusVersi}</div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => alert(`Mengunduh berkas ${docPreviewModal.doc?.nama}...`)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Berkas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Modal Delegasi BOD */}
      {/* --------------------------------------------------------------------- */}
      {delegasiModal.open && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4"
          onClick={() => setDelegasiModal({ open: false, targetId: null })}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Delegasikan Tindakan</h3>
              <button
                type="button"
                onClick={() => setDelegasiModal({ open: false, targetId: null })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Pilih Pengguna:</label>
                <select
                  value={delegasiUser}
                  onChange={(e) => setDelegasiUser(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">-- Pilih Rekan --</option>
                  {users.filter(u => u.id !== currentUser.id).map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Catatan Delegasi (Wajib):</label>
                <textarea
                  rows={3}
                  value={delegasiCatatan}
                  onChange={(e) => setDelegasiCatatan(e.target.value)}
                  placeholder="Berikan instruksi atau batasan wewenang..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDelegasiModal({ open: false, targetId: null })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelegasiSubmit}
                disabled={!delegasiUser || !delegasiCatatan.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                Kirim Delegasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Drawer Input SPK (Marketing) */}
      {/* --------------------------------------------------------------------- */}
      {formDrawer.open && (
        <SpkInputDrawer
          open={formDrawer.open}
          mode={formDrawer.mode}
          targetKontrak={formDrawer.targetId ? getKontrak(formDrawer.targetId) : undefined}
          onClose={() => setFormDrawer({ open: false, mode: 'baru', targetId: null })}
          onSuccess={() => {
            setFormDrawer({ open: false, mode: 'baru', targetId: null });
            advanceToNextItem();
          }}
        />
      )}

    </div>
  );
};

// ---------------------------------------------------------------------------
// Drawer Input SPK Terpadu (Validasi PDF, Periode, Duplikasi)
// ---------------------------------------------------------------------------
interface SpkInputDrawerProps {
  open: boolean;
  mode: SpkFormMode;
  targetKontrak?: Kontrak;
  onClose: () => void;
  onSuccess: () => void;
}

const SpkInputDrawer: React.FC<SpkInputDrawerProps> = ({
  open, mode, targetKontrak, onClose, onSuccess
}) => {
  const { projects } = useApp();
  const { simpanSpk, lokasiOptions } = useContracts();

  const [projectId, setProjectId] = useState(targetKontrak?.projectId || projects[0]?.id || '');
  const [lokasiKey, setLokasiKey] = useState(targetKontrak?.siteId || '');
  const [nomor, setNomor] = useState(targetKontrak?.spkNumber || '');
  const [mulai, setMulai] = useState(targetKontrak?.mulai || TODAY);
  const [berakhir, setBerakhir] = useState(targetKontrak?.berakhir || addDays(TODAY, 365));
  const [nilai, setNilai] = useState(targetKontrak?.nilai ? String(targetKontrak.nilai) : '310000000');
  const [kuota, setKuota] = useState(targetKontrak?.kuota ? String(targetKontrak.kuota) : '25');
  const [file, setFile] = useState<FileMeta | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const lokOptions = useMemo(() => {
    return projectId ? lokasiOptions(projectId) : [];
  }, [projectId, lokasiOptions]);

  useEffect(() => {
    if (lokOptions.length > 0 && !lokasiKey) {
      setLokasiKey(lokOptions[0].key);
    }
  }, [lokOptions, lokasiKey]);

  if (!open) return null;

  const handleSubmit = (kirim: boolean) => {
    setErrorMsg('');
    const res = simpanSpk(mode, targetKontrak?.id || null, {
      projectId,
      lokasiKey,
      nomor,
      mulai,
      berakhir,
      nilai,
      kuota,
      file,
    }, kirim);

    if (!res.ok) {
      setErrorMsg(res.error || Object.values(res.fieldErrors || {})[0] || 'Gagal menyimpan SPK.');
      return;
    }

    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[480px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {mode === 'baru' ? 'Input SPK Baru' : mode === 'perpanjangan' ? 'Input SPK Perpanjangan' : 'Lengkapi / Perbaiki SPK'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan data SPK fisik untuk diverifikasi oleh Keuangan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-slate-700 font-medium">Proyek</label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setLokasiKey('');
              }}
              disabled={mode !== 'baru'}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.clientName})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 font-medium">Lokasi Jaga</label>
            <select
              value={lokasiKey}
              onChange={(e) => setLokasiKey(e.target.value)}
              disabled={mode !== 'baru' && !!targetKontrak?.siteId}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              {lokOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.lokasi} ({opt.kebutuhan} petugas)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 font-medium">Nomor Dokumen SPK</label>
            <input
              type="text"
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              placeholder="contoh: SPK/NSL/2026/104"
              className="w-full p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Tanggal Mulai</label>
              <input
                type="date"
                value={mulai}
                onChange={(e) => setMulai(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Tanggal Berakhir</label>
              <input
                type="date"
                value={berakhir}
                onChange={(e) => setBerakhir(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Nilai Kontrak (Rp)</label>
              <input
                type="number"
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Kuota Petugas</label>
              <input
                type="number"
                value={kuota}
                onChange={(e) => setKuota(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 font-medium">Unggah Berkas SPK (PDF, maks 10MB)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile({ name: f.name, size: f.size });
              }}
              className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-300 file:bg-slate-50"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 text-xs font-medium hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 text-xs font-medium hover:bg-slate-100"
          >
            Simpan Draf
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
          >
            Kirim untuk Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
};
