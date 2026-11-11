import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { UserRole } from '../types';
import {
  Kontrak, Tahap, Peran, JenisTanggapan, Dokumen,
  buildSeed, terapkanAturanWaktu, pemilikTahap, isPemilik, isActionable, batasTahap, terlambatHari,
  TODAY, addDays, diffDays, fmtDate, fmtRp, nowStamp, userPeran, cocokkan,
  TAHAP_LABEL, TAHAP_TINDAKAN, MEMO_TAHAP, PERPANJANGAN_TAHAP,
} from '../components/contracts/model';

export interface Hasil {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

export interface FileMeta {
  name: string;
  size: number;
}

export interface SpkFormValues {
  projectId: string;
  lokasiKey: string;
  nomor: string;
  mulai: string;
  berakhir: string;
  nilai: string;
  kuota: string;
  file?: FileMeta | null;
}

export type SpkFormMode = 'baru' | 'isi' | 'perpanjangan';

export interface LokasiOption {
  key: string;
  siteId?: string;
  lokasi: string;
  lokasiDetail: string;
  kebutuhan: number;
  terisi: number;
}

interface ContractContextType {
  kontrak: Kontrak[];
  getKontrak: (id: string) => Kontrak | undefined;
  myActionCount: number;
  lokasiOptions: (projectId: string) => LokasiOption[];
  simpanSpk: (mode: SpkFormMode, targetId: string | null, v: SpkFormValues, kirim: boolean) => Hasil;
  sahkan: (id: string, catatan: string) => Hasil;
  kembalikan: (id: string, alasan: string) => Hasil;
  kirimMemoTelaah: (id: string, nomor: string, file: FileMeta | null) => Hasil;
  setujuiTelaah: (id: string, catatan?: string) => Hasil;
  kembalikanMemo: (id: string, alasan: string) => Hasil;
  setujuiMemo: (id: string, catatan?: string) => Hasil;
  tandaiTerkirim: (id: string, tanggal: string, bukti: FileMeta | null) => Hasil;
  catatTanggapan: (id: string, p: { jenis: JenisTanggapan; catatan: string; tindakLanjut?: string; surat?: FileMeta | null; alasanDilewati?: string }) => Hasil;
  putuskanEskalasi: (id: string, keputusan: 'perpanjang' | 'tidak_lanjut', catatan: string) => Hasil;
  perpanjangBatas: (id: string, tanggal: string, alasan: string) => Hasil;
  delegasikan: (id: string, userName: string, catatan: string) => Hasil;
  selesaikanDemobilisasi: (id: string, catatan: string) => Hasil;
  kirimPengingat: (id: string) => Hasil;
  unggahDokumen: (id: string, jenis: Dokumen['jenis'], file: FileMeta) => Hasil;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

const PERAN_KE_ROLE: Record<Peran, UserRole> = {
  Pemasaran: 'Marketing',
  Keuangan: 'Finance',
  BOD: 'BOD',
  Operasional: 'Operations',
};

const AKTIF_TAHAP: Tahap[] = ['berlaku', ...PERPANJANGAN_TAHAP];

const shortSiteName = (name: string) => {
  const keys = ['Bekasi', 'Pulogadung', 'Morowali', 'Thamrin', 'Sudirman', 'Kelapa Gading', 'Serpong', 'Soekarno-Hatta', 'Sangatta', 'Cirata', 'Surabaya Barat', 'Waru', 'Cikarang'];
  if (name.includes('Pelabuhan Khusus')) return 'Pelabuhan Tuban';
  if (name.includes('Pabrik Utama')) return 'Pabrik Tuban';
  if (name.includes('NOC')) return 'NOC Jakarta Selatan';
  return keys.find(k => name.includes(k)) || name;
};

export const ContractProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    spks, sites, projects, fpks, externalMemos, currentUser, users,
    verifySPK, createTask, closeTasksForEntity, notify,
  } = useApp();

  const [list, setList] = useState<Kontrak[]>(() => buildSeed(spks, sites, projects, fpks, externalMemos));
  const listRef = useRef(list);
  listRef.current = list;

  const commit = (next: Kontrak[]) => {
    listRef.current = next;
    setList(next);
  };

  const getKontrak = useCallback((id: string) => listRef.current.find(k => k.id === id), []);

  const peranLabel = useMemo(() => userPeran(currentUser).join(', ') || currentUser.role, [currentUser]);

  const withActivity = (k: Kontrak, teks: string): Kontrak => ({
    ...k,
    aktivitas: [{ id: `act-${k.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, pada: nowStamp(), oleh: currentUser.name, peran: peranLabel, teks }, ...k.aktivitas],
  });

  /** Simpan perubahan, terapkan aturan waktu, dan sinkronkan tugas F10 bila pemilik berpindah. */
  const simpan = (before: Kontrak | undefined, after: Kontrak, extra: Kontrak[] = []) => {
    const applied = terapkanAturanWaktu(after).kontrak;
    let next = listRef.current.some(k => k.id === applied.id)
      ? listRef.current.map(k => (k.id === applied.id ? applied : k))
      : [applied, ...listRef.current];
    extra.forEach(e => {
      next = next.map(k => (k.id === e.id ? e : k));
    });
    commit(next);

    const ownerBefore = before ? pemilikTahap(before) : null;
    const ownerAfter = pemilikTahap(applied);
    const tahapBerubah = !before || before.tahap !== applied.tahap || before.delegasiKe !== applied.delegasiKe;
    if (tahapBerubah) {
      closeTasksForEntity([applied.id, applied.sourceSpkId || '', applied.spkNumber || '']);
      if (ownerAfter && (ownerAfter !== ownerBefore || before?.tahap !== applied.tahap || before?.delegasiKe !== applied.delegasiKe)) {
        const batas = batasTahap(applied) || addDays(TODAY, 7);
        createTask({
          title: `${TAHAP_TINDAKAN[applied.tahap]} · ${applied.spkNumber || applied.lokasi} (${applied.clientName})`,
          relatedEntity: MEMO_TAHAP.includes(applied.tahap) ? 'Memo' : 'SPK',
          entityId: applied.id,
          entityReference: applied.spkNumber || applied.id,
          assignedRole: PERAN_KE_ROLE[ownerAfter],
          assignedUser: applied.tahap === 'eskalasi' ? applied.delegasiKe : undefined,
          dueDate: batas,
          priority: terlambatHari(applied) > 0 || applied.tahap === 'eskalasi' ? 'Critical' : 'High',
          actionUrl: `/kontrak?spk=${applied.id}`,
        });
      }
    }
    return applied;
  };

  const guardPemilik = (k: Kontrak | undefined, tahap: Tahap[]): Hasil | null => {
    if (!k) return { ok: false, error: 'SPK tidak ditemukan atau Anda tidak memiliki akses.' };
    if (!tahap.includes(k.tahap)) {
      const v = k.verifikasi;
      if (v && (k.tahap === 'berlaku' || k.tahap === 'dikembalikan')) {
        return { ok: false, error: `SPK ini sudah ${v.hasil} oleh ${v.oleh} pada ${fmtDate(v.pada)}.` };
      }
      return { ok: false, error: `Tahap SPK ini sudah berubah menjadi "${TAHAP_LABEL[k.tahap]}". Panel dimuat ulang.` };
    }
    if (!isPemilik(k, currentUser)) return { ok: false, error: 'Anda tidak memiliki kewenangan untuk tindakan ini.' };
    return null;
  };

  // ---------------------------------------------------------------------------
  // Lokasi
  // ---------------------------------------------------------------------------
  const lokasiOptions = useCallback((projectId: string): LokasiOption[] => {
    const fromSites: LokasiOption[] = sites.filter(s => s.projectId === projectId).map(s => ({
      key: s.id, siteId: s.id, lokasi: shortSiteName(s.name), lokasiDetail: `${s.name} · ${s.areaName}`,
      kebutuhan: s.requiredPersonnel, terisi: s.assignedPersonnel,
    }));
    const synthetic: LokasiOption[] = listRef.current
      .filter(k => k.projectId === projectId && !k.siteId)
      .filter((k, i, arr) => arr.findIndex(x => x.lokasi === k.lokasi) === i)
      .map(k => ({ key: `nama:${k.lokasi}`, lokasi: k.lokasi, lokasiDetail: k.lokasiDetail, kebutuhan: k.kebutuhanPetugas, terisi: k.petugasTerisi }));
    return [...fromSites, ...synthetic];
  }, [sites, list]);

  const lokasiKeyOf = (k: Kontrak) => k.siteId || `nama:${k.lokasi}`;

  // ---------------------------------------------------------------------------
  // Input / draf / perbaiki / perpanjangan SPK
  // ---------------------------------------------------------------------------
  const simpanSpk = (mode: SpkFormMode, targetId: string | null, v: SpkFormValues, kirim: boolean): Hasil => {
    const fe: Record<string, string> = {};
    const target = targetId ? getKontrak(targetId) : undefined;
    if (!v.projectId) fe.projectId = 'Pilih proyek.';
    if (!v.lokasiKey) fe.lokasiKey = 'Pilih lokasi.';
    const nomor = v.nomor.trim();
    if (kirim && !nomor) fe.nomor = 'Isi nomor SPK.';
    if (nomor) {
      const dup = listRef.current.find(k => k.spkNumber?.toLowerCase() === nomor.toLowerCase() && k.id !== (mode === 'isi' ? targetId : '__'));
      if (dup) fe.nomor = 'Nomor SPK sudah terdaftar.';
    }
    if (kirim && !v.mulai) fe.mulai = 'Isi tanggal mulai.';
    if (kirim && !v.berakhir) fe.berakhir = 'Isi tanggal berakhir.';
    if (v.mulai && v.berakhir && diffDays(v.mulai, v.berakhir) <= 0) fe.berakhir = 'Tanggal berakhir harus setelah tanggal mulai.';
    const nilai = Number(String(v.nilai).replace(/\D/g, '')) || 0;
    const kuota = Number(v.kuota) || 0;
    if (kirim && nilai <= 0) fe.nilai = 'Isi nilai kontrak.';
    if (kirim && kuota <= 0) fe.kuota = 'Isi kuota petugas.';

    const existingDocs = mode === 'isi' && target ? target.dokumen : [];
    const hasSpkFile = !!v.file || (mode === 'isi' && target?.tahap === 'draf' && existingDocs.some(d => d.jenis === 'SPK' && d.statusVersi === 'Draf'));
    if (kirim && !hasSpkFile) fe.file = 'Unggah file SPK.';

    // Tumpang tindih periode di lokasi yang sama (edge case 4)
    if (v.lokasiKey && v.mulai && v.berakhir && !fe.berakhir) {
      const clash = listRef.current.find(k =>
        k.id !== targetId && k.projectId === v.projectId && lokasiKeyOf(k) === v.lokasiKey &&
        AKTIF_TAHAP.includes(k.tahap) && k.mulai && k.berakhir &&
        diffDays(v.mulai, k.berakhir) >= 0 && diffDays(k.mulai, v.berakhir) >= 0,
      );
      if (clash) fe.lokasiKey = `Lokasi ini sudah memiliki SPK aktif hingga ${fmtDate(clash.berakhir)}.`;
    }

    if (Object.keys(fe).length) return { ok: false, fieldErrors: fe, error: 'Periksa kembali isian formulir.' };

    const proj = projects.find(p => p.id === v.projectId);
    const opt = lokasiOptions(v.projectId).find(o => o.key === v.lokasiKey);
    const fpk = fpks.find(f => f.id === proj?.fpkId);
    const baseDocs = mode === 'isi' && target ? target.dokumen : [];
    const nextVersi = Math.max(0, ...baseDocs.filter(d => d.jenis === 'SPK').map(d => d.versi || 0)) + 1;
    const newDoc: Dokumen | null = v.file ? {
      id: `doc-${Date.now()}`, nama: v.file.name, jenis: 'SPK', versi: nextVersi,
      pengunggah: currentUser.name, tanggal: TODAY, statusVersi: kirim ? 'Menunggu Verifikasi' : 'Draf',
    } : null;
    let dokumen = baseDocs.map(d => (d.jenis === 'SPK' && d.statusVersi === 'Draf' && newDoc ? { ...d, statusVersi: 'Digantikan' as const } : d));
    if (!newDoc && kirim) dokumen = dokumen.map(d => (d.jenis === 'SPK' && d.statusVersi === 'Draf' ? { ...d, statusVersi: 'Menunggu Verifikasi' as const } : d));
    if (newDoc) dokumen = [newDoc, ...dokumen];

    const fields = {
      spkNumber: nomor || undefined,
      projectId: v.projectId,
      projectCode: proj?.projectCode || v.projectId,
      projectName: proj ? (proj.name.includes('—') ? proj.name.split('—')[1].trim() : proj.name) : '',
      clientName: proj?.clientName || '',
      siteId: opt?.siteId,
      lokasi: opt?.lokasi || '',
      lokasiDetail: opt?.lokasiDetail || '',
      mulai: v.mulai || undefined,
      berakhir: v.berakhir || undefined,
      nilai: nilai || undefined,
      kuota: kuota || undefined,
      kebutuhanPetugas: opt?.kebutuhan ?? kuota,
      petugasTerisi: opt?.terisi ?? 0,
    };

    const tahapBaru: Tahap = kirim ? 'menunggu_verifikasi' : (target?.tahap === 'dikembalikan' ? 'dikembalikan' : 'draf');

    if (mode === 'isi' && target) {
      if (!isPemilik(target, currentUser)) return { ok: false, error: 'Anda tidak memiliki kewenangan untuk tindakan ini.' };
      let updated: Kontrak = {
        ...target, ...fields, dokumen, tahap: tahapBaru,
        dikirimVerifikasiPada: kirim ? TODAY : target.dikirimVerifikasiPada,
      };
      updated = withActivity(updated, kirim
        ? `${target.tahap === 'dikembalikan' ? 'Memperbaiki dan mengirim ulang' : 'Mengirim'} SPK${newDoc ? ` versi ${newDoc.versi}` : ''} untuk verifikasi.`
        : 'Menyimpan draf SPK.');
      simpan(target, updated);
      notify(kirim ? 'SPK dikirim untuk verifikasi.' : 'Draf SPK disimpan.', 'success');
      return { ok: true, id: updated.id };
    }

    // Baru / perpanjangan
    const id = `k-new-${Date.now()}`;
    const pendahulu = mode === 'perpanjangan' && target ? target : undefined;
    let created: Kontrak = {
      id, ...fields,
      fpkId: fpk?.id, fpkNumber: fpk?.fpkNumber,
      fpkAlokasi: pendahulu
        ? { nilai: pendahulu.nilai || 0, kuota: pendahulu.kuota || 0, mulai: addDays(pendahulu.berakhir || TODAY, 1), berakhir: addDays(pendahulu.berakhir || TODAY, 365) }
        : (opt ? (listRef.current.find(k => lokasiKeyOf(k) === opt.key)?.fpkAlokasi ?? null) : null),
      tahap: tahapBaru,
      dikirimVerifikasiPada: kirim ? TODAY : undefined,
      bertugasSejak: pendahulu?.bertugasSejak,
      dikembalikanCount: 0,
      memo: {},
      dokumen,
      aktivitas: [],
      pengingat: {},
      spkPendahuluId: pendahulu?.id,
    };
    created = withActivity(created, pendahulu
      ? `Menginput SPK perpanjangan untuk ${pendahulu.spkNumber}${kirim ? ' dan mengirim untuk verifikasi' : ' (draf)'}.`
      : kirim ? 'Menginput SPK dan mengirim untuk verifikasi.' : 'Menyimpan draf SPK baru.');

    const extra: Kontrak[] = [];
    if (pendahulu) {
      const p = withActivity({ ...pendahulu, spkPenggantiId: id }, `SPK perpanjangan ${nomor || '(draf)'} diinput.`);
      extra.push(p);
      closeTasksForEntity([pendahulu.id, pendahulu.sourceSpkId || '', pendahulu.spkNumber || '']);
    }
    simpan(undefined, created, extra);
    notify(kirim ? 'SPK dikirim untuk verifikasi.' : 'Draf SPK disimpan.', 'success');
    return { ok: true, id };
  };

  // ---------------------------------------------------------------------------
  // Verifikasi (Keuangan)
  // ---------------------------------------------------------------------------
  const sahkan = (id: string, catatan: string): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['menunggu_verifikasi']);
    if (g) return g;
    if (!k!.fpkAlokasi) return { ok: false, error: 'FPK untuk lokasi ini belum tersedia. SPK tidak dapat disahkan.' };
    const tidakSesuai = (cocokkan(k!) || []).filter(r => r.status === 'tidak_sesuai').length;
    if (tidakSesuai > 0 && !catatan.trim()) return { ok: false, fieldErrors: { catatan: 'Catatan wajib diisi karena ada data yang tidak sesuai.' } };

    const latestVersi = Math.max(0, ...k!.dokumen.filter(d => d.jenis === 'SPK').map(d => d.versi || 0));
    let updated: Kontrak = {
      ...k!,
      tahap: 'berlaku',
      verifikasi: { oleh: currentUser.name, pada: TODAY, catatan: catatan.trim() || undefined, hasil: 'disahkan' },
      alasanPengembalian: undefined,
      lewatTanpaSpk: false,
      dokumen: k!.dokumen.map(d => (d.jenis !== 'SPK' ? d : d.versi === latestVersi ? { ...d, statusVersi: 'Sah' as const } : d.statusVersi === 'Dikembalikan' ? d : { ...d, statusVersi: 'Digantikan' as const })),
    };
    updated = withActivity(updated, `Mengesahkan SPK${catatan.trim() ? `. Catatan: "${catatan.trim()}"` : '.'}`);

    const extra: Kontrak[] = [];
    if (k!.spkPendahuluId) {
      const p = getKontrak(k!.spkPendahuluId);
      if (p) {
        extra.push(withActivity({
          ...p, tahap: 'selesai', hasil: 'diperpanjang', selesaiPada: TODAY, selesaiOleh: currentUser.name,
          selesaiCatatan: `Diperpanjang dengan ${k!.spkNumber}.`, spkPenggantiId: k!.id, lewatTanpaSpk: false,
          dokumen: p.dokumen.map(d => (d.jenis === 'SPK' && d.statusVersi === 'Sah' ? { ...d, statusVersi: 'Digantikan' as const } : d)),
        }, `SPK perpanjangan ${k!.spkNumber} disahkan. SPK ini berstatus Diperpanjang.`));
        closeTasksForEntity([p.id, p.sourceSpkId || '', p.spkNumber || '']);
      }
    }
    if (k!.sourceSpkId) verifySPK(k!.sourceSpkId, true, catatan.trim() || undefined);
    simpan(k, updated, extra);
    notify('SPK disahkan.', 'success');
    return { ok: true };
  };

  const kembalikan = (id: string, alasan: string): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['menunggu_verifikasi']);
    if (g) return g;
    if (!alasan.trim()) return { ok: false, fieldErrors: { catatan: 'Isi alasan pengembalian.' } };
    const latestVersi = Math.max(0, ...k!.dokumen.filter(d => d.jenis === 'SPK').map(d => d.versi || 0));
    let updated: Kontrak = {
      ...k!,
      tahap: 'dikembalikan',
      dikembalikanCount: k!.dikembalikanCount + 1,
      alasanPengembalian: alasan.trim(),
      verifikasi: { oleh: currentUser.name, pada: TODAY, catatan: alasan.trim(), hasil: 'dikembalikan' },
      dokumen: k!.dokumen.map(d => (d.jenis === 'SPK' && d.versi === latestVersi ? { ...d, statusVersi: 'Dikembalikan' as const } : d)),
    };
    updated = withActivity(updated, `Mengembalikan SPK untuk diperbaiki. Alasan: "${alasan.trim()}"`);
    if (k!.sourceSpkId) verifySPK(k!.sourceSpkId, false, alasan.trim());
    simpan(k, updated);
    notify('SPK dikembalikan ke Pemasaran.', 'success');
    return { ok: true };
  };

  // ---------------------------------------------------------------------------
  // Memo perpanjangan
  // ---------------------------------------------------------------------------
  const kirimMemoTelaah = (id: string, nomor: string, file: FileMeta | null): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['persiapan_perpanjangan']);
    if (g) return g;
    const fe: Record<string, string> = {};
    if (!nomor.trim()) fe.nomor = 'Isi nomor memo.';
    const adaMemo = !!file || k!.dokumen.some(d => d.jenis === 'Memo' && d.statusVersi === 'Aktif');
    if (!adaMemo) fe.file = 'Unggah file memo.';
    if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
    const versi = Math.max(0, ...k!.dokumen.filter(d => d.jenis === 'Memo').map(d => d.versi || 0)) + 1;
    const dokumen = file
      ? [{ id: `doc-${Date.now()}`, nama: file.name, jenis: 'Memo' as const, versi, pengunggah: currentUser.name, tanggal: TODAY, statusVersi: 'Aktif' as const },
         ...k!.dokumen.map(d => (d.jenis === 'Memo' && d.statusVersi === 'Aktif' ? { ...d, statusVersi: 'Digantikan' as const } : d))]
      : k!.dokumen;
    let updated: Kontrak = {
      ...k!, tahap: 'telaah_memo', dokumen,
      memo: { ...k!.memo, nomor: nomor.trim(), disusun: { oleh: currentUser.name, pada: TODAY }, ditelaah: undefined, disetujui: undefined, alasanKembali: undefined, dikembalikanOleh: undefined },
    };
    updated = withActivity(updated, `Menyusun memo ${nomor.trim()} dan mengirim untuk ditelaah Keuangan.`);
    simpan(k, updated);
    notify('Memo dikirim untuk ditelaah.', 'success');
    return { ok: true };
  };

  const setujuiTelaah = (id: string, catatan?: string): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['telaah_memo']);
    if (g) return g;
    let updated: Kontrak = { ...k!, tahap: 'persetujuan_memo', memo: { ...k!.memo, ditelaah: { oleh: currentUser.name, pada: TODAY, catatan: catatan?.trim() || undefined } } };
    updated = withActivity(updated, `Menyetujui telaah memo${catatan?.trim() ? `. Catatan: "${catatan.trim()}"` : '.'}`);
    simpan(k, updated);
    notify('Telaah memo disetujui. Menunggu persetujuan BOD.', 'success');
    return { ok: true };
  };

  const kembalikanMemo = (id: string, alasan: string): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['telaah_memo', 'persetujuan_memo']);
    if (g) return g;
    if (!alasan.trim()) return { ok: false, fieldErrors: { catatan: 'Isi alasan pengembalian.' } };
    const oleh = k!.tahap === 'telaah_memo' ? 'Keuangan' : 'BOD';
    let updated: Kontrak = {
      ...k!, tahap: 'persiapan_perpanjangan',
      memo: { ...k!.memo, ditelaah: oleh === 'BOD' ? k!.memo.ditelaah : undefined, disetujui: undefined, alasanKembali: alasan.trim(), dikembalikanOleh: `${currentUser.name} (${oleh})` },
    };
    updated = withActivity(updated, `Mengembalikan memo ke Pemasaran. Alasan: "${alasan.trim()}". Batas H-60 tetap berlaku.`);
    simpan(k, updated);
    notify('Memo dikembalikan ke Pemasaran.', 'success');
    return { ok: true };
  };

  const setujuiMemo = (id: string, catatan?: string): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['persetujuan_memo']);
    if (g) return g;
    let updated: Kontrak = { ...k!, tahap: 'kirim_memo', memo: { ...k!.memo, disetujui: { oleh: currentUser.name, pada: TODAY, catatan: catatan?.trim() || undefined } } };
    updated = withActivity(updated, 'Menyetujui memo perpanjangan. Memo siap dikirim ke klien.');
    simpan(k, updated);
    notify('Memo disetujui.', 'success');
    return { ok: true };
  };

  const tandaiTerkirim = (id: string, tanggal: string, bukti: FileMeta | null): Hasil => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['kirim_memo']);
    if (g) return g;
    const fe: Record<string, string> = {};
    if (!tanggal) fe.tanggal = 'Isi tanggal kirim.';
    else if (diffDays(TODAY, tanggal) > 0) fe.tanggal = 'Tanggal kirim tidak boleh setelah hari ini.';
    if (!bukti) fe.file = 'Unggah bukti kirim.';
    if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
    let updated: Kontrak = {
      ...k!, tahap: 'menunggu_tanggapan',
      memo: { ...k!.memo, dikirim: { oleh: currentUser.name, pada: tanggal, bukti: bukti!.name } },
      dokumen: [{ id: `doc-${Date.now()}`, nama: bukti!.name, jenis: 'Bukti Kirim', pengunggah: currentUser.name, tanggal: TODAY, statusVersi: 'Aktif' }, ...k!.dokumen],
    };
    updated = withActivity(updated, `Menandai memo terkirim pada ${fmtDate(tanggal)} dan mengunggah bukti kirim.`);
    simpan(k, updated);
    notify('Memo ditandai terkirim.', 'success');
    return { ok: true };
  };

  const JENIS_LABEL: Record<JenisTanggapan, string> = { setuju: 'Setuju', negosiasi: 'Negosiasi', tidak_lanjut: 'Tidak Melanjutkan' };

  const catatTanggapan: ContractContextType['catatTanggapan'] = (id, p) => {
    const k = getKontrak(id);
    const allowed: Tahap[] = [...MEMO_TAHAP, 'menunggu_tanggapan', 'negosiasi', 'menunggu_spk_perpanjangan'];
    const g = guardPemilik(k, allowed);
    if (g && !(k && allowed.includes(k.tahap) && userPeran(currentUser).includes('Pemasaran'))) return g;
    const fe: Record<string, string> = {};
    const memoBelumTerkirim = MEMO_TAHAP.includes(k!.tahap);
    if (memoBelumTerkirim && !p.alasanDilewati?.trim()) fe.alasanDilewati = 'Isi alasan langkah memo dilewati.';
    if ((p.jenis === 'negosiasi' || p.jenis === 'tidak_lanjut') && !p.catatan.trim()) fe.catatan = 'Catatan wajib diisi.';
    if (p.jenis === 'negosiasi') {
      if (!p.tindakLanjut) fe.tindakLanjut = 'Isi tanggal tindak lanjut.';
      else if (diffDays(TODAY, p.tindakLanjut) < 0) fe.tindakLanjut = 'Tanggal tindak lanjut tidak boleh sebelum hari ini.';
    }
    if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };

    const sebelumnya = k!.memo.tanggapan?.jenis;
    const tahapBaru: Tahap = p.jenis === 'setuju' ? 'menunggu_spk_perpanjangan' : p.jenis === 'negosiasi' ? 'negosiasi' : 'demobilisasi';
    const dokumen = p.surat
      ? [{ id: `doc-${Date.now()}`, nama: p.surat.name, jenis: 'Surat Tanggapan' as const, pengunggah: currentUser.name, tanggal: TODAY, statusVersi: 'Aktif' as const }, ...k!.dokumen]
      : k!.dokumen;
    let updated: Kontrak = {
      ...k!, tahap: tahapBaru, dokumen,
      memo: {
        ...k!.memo,
        dilewatiAlasan: memoBelumTerkirim ? p.alasanDilewati!.trim() : k!.memo.dilewatiAlasan,
        tanggapan: { oleh: currentUser.name, pada: TODAY, jenis: p.jenis, catatan: p.catatan.trim() || undefined, tindakLanjut: p.jenis === 'negosiasi' ? p.tindakLanjut : undefined },
      },
    };
    if (memoBelumTerkirim) updated = withActivity(updated, `Langkah memo ditandai "Dilewati". Alasan: "${p.alasanDilewati!.trim()}"`);
    updated = withActivity(updated, sebelumnya && sebelumnya !== p.jenis
      ? `Mengubah tanggapan klien dari ${JENIS_LABEL[sebelumnya]} menjadi ${JENIS_LABEL[p.jenis]}${p.catatan.trim() ? `. Catatan: "${p.catatan.trim()}"` : '.'}`
      : `Mencatat tanggapan klien: ${JENIS_LABEL[p.jenis]}${p.jenis === 'negosiasi' ? ` (tindak lanjut ${fmtDate(p.tindakLanjut)})` : ''}${p.catatan.trim() ? `. Catatan: "${p.catatan.trim()}"` : '.'}`);
    if (p.jenis === 'tidak_lanjut') {
      updated = withActivity(updated, `Tugas demobilisasi dibuat untuk Operasional. SPK berakhir pada ${fmtDate(k!.berakhir)}. Status proyek tidak berubah otomatis.`);
    }
    simpan(k, updated);
    notify(p.jenis === 'setuju' ? 'Tanggapan dicatat. Silakan input SPK perpanjangan.' : p.jenis === 'negosiasi' ? 'Tanggapan negosiasi dicatat.' : 'Tanggapan dicatat. Tugas demobilisasi dibuat untuk Operasional.', 'success');
    return { ok: true };
  };

  // ---------------------------------------------------------------------------
  // Eskalasi (BOD / penerima delegasi)
  // ---------------------------------------------------------------------------
  const putuskanEskalasi: ContractContextType['putuskanEskalasi'] = (id, keputusan, catatan) => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['eskalasi']);
    if (g) return g;
    if (!catatan.trim()) return { ok: false, fieldErrors: { catatan: 'Catatan wajib diisi.' } };
    const tahapBaru: Tahap = keputusan === 'perpanjang' ? 'menunggu_spk_perpanjangan' : 'demobilisasi';
    let updated: Kontrak = {
      ...k!, tahap: tahapBaru, berakhirTanpaKeputusan: false,
      memo: { ...k!.memo, tanggapan: { oleh: currentUser.name, pada: TODAY, jenis: keputusan === 'perpanjang' ? 'setuju' : 'tidak_lanjut', catatan: catatan.trim() } },
    };
    updated = withActivity(updated, `Memutuskan eskalasi: ${keputusan === 'perpanjang' ? 'Perpanjang' : 'Tidak Melanjutkan'}. Catatan: "${catatan.trim()}"`);
    if (keputusan === 'tidak_lanjut') updated = withActivity(updated, 'Tugas demobilisasi dibuat untuk Operasional. Status proyek tidak berubah otomatis.');
    simpan(k, updated);
    notify('Keputusan eskalasi dicatat.', 'success');
    return { ok: true };
  };

  const perpanjangBatas: ContractContextType['perpanjangBatas'] = (id, tanggal, alasan) => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['eskalasi']);
    if (g) return g;
    const fe: Record<string, string> = {};
    if (!tanggal) fe.tanggal = 'Isi tanggal batas baru.';
    else if (diffDays(TODAY, tanggal) <= 0) fe.tanggal = 'Tanggal batas baru harus setelah hari ini.';
    if (!alasan.trim()) fe.catatan = 'Isi alasan perpanjangan batas.';
    if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
    const kembaliKe: Tahap = k!.tahapSebelumnya === 'negosiasi' ? 'negosiasi' : 'menunggu_tanggapan';
    let updated: Kontrak = {
      ...k!, tahap: kembaliKe, batasKhusus: tanggal, berakhirTanpaKeputusan: false,
      memo: k!.memo.tanggapan && kembaliKe === 'negosiasi' ? { ...k!.memo, tanggapan: { ...k!.memo.tanggapan, tindakLanjut: tanggal } } : k!.memo,
    };
    updated = withActivity(updated, `Memperpanjang batas waktu tanggapan hingga ${fmtDate(tanggal)}. Alasan: "${alasan.trim()}"`);
    simpan(k, updated);
    notify(`Batas waktu diperpanjang hingga ${fmtDate(tanggal)}.`, 'success');
    return { ok: true };
  };

  const delegasikan: ContractContextType['delegasikan'] = (id, userName, catatan) => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['eskalasi']);
    if (g) return g;
    const fe: Record<string, string> = {};
    if (!userName) fe.user = 'Pilih pengguna.';
    if (!catatan.trim()) fe.catatan = 'Catatan wajib diisi.';
    if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
    let updated: Kontrak = { ...k!, delegasiKe: userName };
    updated = withActivity(updated, `Mendelegasikan keputusan eskalasi kepada ${userName}. Catatan: "${catatan.trim()}"`);
    simpan(k, updated);
    notify(`Eskalasi didelegasikan kepada ${userName}.`, 'success');
    return { ok: true };
  };

  const selesaikanDemobilisasi: ContractContextType['selesaikanDemobilisasi'] = (id, catatan) => {
    const k = getKontrak(id);
    const g = guardPemilik(k, ['demobilisasi']);
    if (g) return g;
    let updated: Kontrak = {
      ...k!, tahap: 'selesai', hasil: 'didemobilisasi', selesaiPada: TODAY, selesaiOleh: currentUser.name,
      selesaiCatatan: catatan.trim() || `Demobilisasi selesai. SPK berakhir pada ${fmtDate(k!.berakhir)}.`,
    };
    updated = withActivity(updated, `Menyelesaikan demobilisasi${catatan.trim() ? `. Catatan: "${catatan.trim()}"` : '.'} Status proyek tidak berubah otomatis.`);
    simpan(k, updated);
    notify('Demobilisasi diselesaikan.', 'success');
    return { ok: true };
  };

  // ---------------------------------------------------------------------------
  // Pengingat & dokumen
  // ---------------------------------------------------------------------------
  const kirimPengingat = (id: string): Hasil => {
    const k = getKontrak(id);
    if (!k) return { ok: false, error: 'SPK tidak ditemukan atau Anda tidak memiliki akses.' };
    const last = k.pengingat[currentUser.id];
    const now = Date.now();
    if (last && now - last < 24 * 3600 * 1000) {
      const jam = Math.ceil((24 * 3600 * 1000 - (now - last)) / 3600000);
      return { ok: false, error: `Pengingat sudah dikirim. Anda dapat mengirim lagi dalam ${jam} jam.` };
    }
    const owner = pemilikTahap(k);
    let updated: Kontrak = { ...k, pengingat: { ...k.pengingat, [currentUser.id]: now } };
    updated = withActivity(updated, `Mengirim pengingat kepada ${owner || 'pemilik tahap'}.`);
    commit(listRef.current.map(x => (x.id === id ? updated : x)));
    notify(`Pengingat dikirim kepada ${owner || 'pemilik tahap'}.`, 'success');
    return { ok: true };
  };

  const unggahDokumen = (id: string, jenis: Dokumen['jenis'], file: FileMeta): Hasil => {
    const k = getKontrak(id);
    if (!k) return { ok: false, error: 'SPK tidak ditemukan.' };
    if (!isPemilik(k, currentUser)) return { ok: false, error: 'Hanya pemilik tahap yang dapat mengunggah dokumen.' };
    if (jenis === 'SPK' && k.dokumen.some(d => d.jenis === 'SPK' && d.statusVersi === 'Sah')) {
      return { ok: false, error: 'SPK yang sudah disahkan tidak dapat diganti. Perubahan hanya melalui SPK baru.' };
    }
    const versi = Math.max(0, ...k.dokumen.filter(d => d.jenis === jenis).map(d => d.versi || 0)) + 1;
    let updated: Kontrak = {
      ...k,
      dokumen: [{ id: `doc-${Date.now()}`, nama: file.name, jenis, versi: jenis === 'SPK' || jenis === 'Memo' ? versi : undefined, pengunggah: currentUser.name, tanggal: TODAY, statusVersi: jenis === 'SPK' ? 'Draf' : 'Aktif' }, ...k.dokumen],
    };
    updated = withActivity(updated, `Mengunggah dokumen ${jenis}: ${file.name}.`);
    commit(listRef.current.map(x => (x.id === id ? updated : x)));
    notify('Dokumen diunggah.', 'success');
    return { ok: true };
  };

  const myActionCount = useMemo(
    () => list.filter(k => isActionable(k) && isPemilik(k, currentUser)).length,
    [list, currentUser],
  );

  // users dipakai di UI delegasi; disimpan di sini agar dependensi jelas
  void users;

  return (
    <ContractContext.Provider value={{
      kontrak: list, getKontrak, myActionCount, lokasiOptions,
      simpanSpk, sahkan, kembalikan, kirimMemoTelaah, setujuiTelaah, kembalikanMemo, setujuiMemo,
      tandaiTerkirim, catatTanggapan, putuskanEskalasi, perpanjangBatas, delegasikan,
      selesaikanDemobilisasi, kirimPengingat, unggahDokumen,
    }}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContracts = () => {
  const ctx = useContext(ContractContext);
  if (!ctx) throw new Error('useContracts must be used within a ContractProvider');
  return ctx;
};

export { fmtRp };
