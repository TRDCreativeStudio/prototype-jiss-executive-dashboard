// Model siklus hidup Kontrak (SPK) per lokasi.
// Dasar PRD: F06 (SPK), F11 (Perpanjangan), F10 (Tugas), aturan 6.3 & 6.5.
// Asumsi sementara (menunggu validasi stakeholder, brief bagian 11):
// - Perhitungan H-x memakai hari kalender.
// - Urutan persetujuan memo: Pemasaran → Keuangan → BOD → kirim.
// - SPK dengan data ✗ tetap boleh disahkan asalkan catatan diisi.
// - Batas verifikasi SPK: 7 hari sejak dikirim.

import { UserAccount, SPK, Site, Project, FPK, ExternalMemo } from '../../types';

/** Tanggal acuan prototipe (selaras dengan data contoh). */
export const TODAY = '2026-11-11';
export const BATAS_VERIFIKASI_HARI = 7;
export const BATAS_PERBAIKAN_HARI = 5;
export const PAGE_SIZE = 25;

export type Tahap =
  | 'belum_ada'
  | 'draf'
  | 'menunggu_verifikasi'
  | 'dikembalikan'
  | 'berlaku'
  | 'persiapan_perpanjangan'
  | 'telaah_memo'
  | 'persetujuan_memo'
  | 'kirim_memo'
  | 'menunggu_tanggapan'
  | 'negosiasi'
  | 'eskalasi'
  | 'menunggu_spk_perpanjangan'
  | 'demobilisasi'
  | 'selesai';

export type Peran = 'Pemasaran' | 'Keuangan' | 'BOD' | 'Operasional';
export type HasilAkhir = 'diperpanjang' | 'berakhir' | 'didemobilisasi';
export type JenisTanggapan = 'setuju' | 'negosiasi' | 'tidak_lanjut';

export interface Langkah {
  oleh: string;
  pada: string; // YYYY-MM-DD
  catatan?: string;
}

export interface Dokumen {
  id: string;
  nama: string;
  jenis: 'SPK' | 'Memo' | 'Bukti Kirim' | 'Surat Tanggapan';
  versi?: number;
  pengunggah: string;
  tanggal: string;
  statusVersi: 'Aktif' | 'Draf' | 'Menunggu Verifikasi' | 'Dikembalikan' | 'Digantikan' | 'Sah';
  /** Simulasi pratinjau gagal dimuat (edge case 22). */
  gagalPratinjau?: boolean;
}

export interface Aktivitas {
  id: string;
  pada: string; // YYYY-MM-DD HH:mm
  oleh: string;
  peran: string;
  teks: string;
}

export interface AlokasiFPK {
  nilai: number;
  kuota: number;
  mulai: string;
  berakhir: string;
}

export interface Kontrak {
  id: string;
  sourceSpkId?: string; // tautan ke SPK di AppContext (bila ada)
  spkNumber?: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  siteId?: string;
  lokasi: string; // nama singkat lokasi
  lokasiDetail: string; // nama lengkap / wilayah
  fpkId?: string;
  fpkNumber?: string;
  fpkAlokasi: AlokasiFPK | null;
  mulai?: string;
  berakhir?: string;
  nilai?: number;
  kuota?: number;
  kebutuhanPetugas: number;
  petugasTerisi: number;
  tahap: Tahap;
  /** Tahap sebelum eskalasi/negosiasi (untuk perpanjang batas). */
  tahapSebelumnya?: Tahap;
  hasil?: HasilAkhir;
  berakhirTanpaKeputusan?: boolean;
  lewatTanpaSpk?: boolean; // edge case 16
  selesaiPada?: string;
  selesaiOleh?: string;
  selesaiCatatan?: string;
  spkPenggantiId?: string;
  spkPendahuluId?: string;
  dikirimVerifikasiPada?: string;
  bertugasSejak?: string;
  bertugasTanpaSpkHari?: number;
  dikembalikanCount: number;
  alasanPengembalian?: string;
  verifikasi?: Langkah & { hasil: 'disahkan' | 'dikembalikan' };
  memo: {
    nomor?: string;
    disusun?: Langkah;
    ditelaah?: Langkah;
    disetujui?: Langkah;
    dikirim?: Langkah & { bukti?: string };
    tanggapan?: Langkah & { jenis: JenisTanggapan; tindakLanjut?: string };
    dilewatiAlasan?: string;
    alasanKembali?: string;
    dikembalikanOleh?: string;
  };
  batasKhusus?: string; // batas baru dari BOD
  delegasiKe?: string; // nama pengguna penerima delegasi
  dokumen: Dokumen[];
  aktivitas: Aktivitas[];
  pengingat: Record<string, number>; // userId -> epoch ms
}

// ---------------------------------------------------------------------------
// Label, pemilik, kelompok tahap
// ---------------------------------------------------------------------------

export const TAHAP_LABEL: Record<Tahap, string> = {
  belum_ada: 'Belum ada SPK',
  draf: 'Draf',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  dikembalikan: 'Dikembalikan',
  berlaku: 'Berlaku',
  persiapan_perpanjangan: 'Persiapan Perpanjangan (H-75)',
  telaah_memo: 'Telaah Memo',
  persetujuan_memo: 'Persetujuan Memo',
  kirim_memo: 'Memo Siap Dikirim (H-60)',
  menunggu_tanggapan: 'Menunggu Tanggapan Klien',
  negosiasi: 'Negosiasi',
  eskalasi: 'Eskalasi BOD',
  menunggu_spk_perpanjangan: 'Menunggu SPK Perpanjangan',
  demobilisasi: 'Demobilisasi',
  selesai: 'Selesai',
};

export const HASIL_LABEL: Record<HasilAkhir, string> = {
  diperpanjang: 'Diperpanjang',
  berakhir: 'Berakhir',
  didemobilisasi: 'Didemobilisasi',
};

export const TAHAP_PEMILIK: Record<Tahap, Peran | null> = {
  belum_ada: 'Pemasaran',
  draf: 'Pemasaran',
  menunggu_verifikasi: 'Keuangan',
  dikembalikan: 'Pemasaran',
  berlaku: null,
  persiapan_perpanjangan: 'Pemasaran',
  telaah_memo: 'Keuangan',
  persetujuan_memo: 'BOD',
  kirim_memo: 'Pemasaran',
  menunggu_tanggapan: 'Pemasaran',
  negosiasi: 'Pemasaran',
  eskalasi: 'BOD',
  menunggu_spk_perpanjangan: 'Pemasaran',
  demobilisasi: 'Operasional',
  selesai: null,
};

export const TAHAP_TINDAKAN: Record<Tahap, string> = {
  belum_ada: 'Input SPK',
  draf: 'Lengkapi & kirim untuk verifikasi',
  menunggu_verifikasi: 'Sahkan / Kembalikan',
  dikembalikan: 'Perbaiki & kirim ulang',
  berlaku: 'Pemantauan',
  persiapan_perpanjangan: 'Susun memo',
  telaah_memo: 'Telaah memo',
  persetujuan_memo: 'Setujui / Kembalikan memo',
  kirim_memo: 'Kirim + unggah bukti',
  menunggu_tanggapan: 'Catat tanggapan',
  negosiasi: 'Catat hasil negosiasi',
  eskalasi: 'Putuskan / Perpanjang batas / Delegasikan',
  menunggu_spk_perpanjangan: 'Input SPK perpanjangan',
  demobilisasi: 'Selesaikan demobilisasi',
  selesai: '–',
};

export type FilterTahap = 'semua' | 'belum_ada' | 'verifikasi' | 'perpanjangan' | 'eskalasi';

export const FILTER_TAHAP_LABEL: Record<FilterTahap, string> = {
  semua: 'Semua',
  belum_ada: 'Belum ada SPK',
  verifikasi: 'Verifikasi',
  perpanjangan: 'Perpanjangan',
  eskalasi: 'Eskalasi',
};

export const TAHAP_GROUP: Record<Exclude<FilterTahap, 'semua'>, Tahap[]> = {
  belum_ada: ['belum_ada'],
  verifikasi: ['draf', 'menunggu_verifikasi', 'dikembalikan'],
  perpanjangan: [
    'persiapan_perpanjangan', 'telaah_memo', 'persetujuan_memo', 'kirim_memo',
    'menunggu_tanggapan', 'negosiasi', 'menunggu_spk_perpanjangan', 'demobilisasi',
  ],
  eskalasi: ['eskalasi'],
};

export const MEMO_TAHAP: Tahap[] = ['persiapan_perpanjangan', 'telaah_memo', 'persetujuan_memo', 'kirim_memo'];
export const PERPANJANGAN_TAHAP: Tahap[] = [...TAHAP_GROUP.perpanjangan, 'eskalasi'];

// ---------------------------------------------------------------------------
// Tanggal & format
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const toUTC = (d: string) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};

export const addDays = (d: string, n: number): string => {
  const t = new Date(toUTC(d) + n * 86400000);
  return t.toISOString().slice(0, 10);
};

/** Selisih hari kalender b - a. */
export const diffDays = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86400000);

export const fmtDate = (d?: string) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return d;
  return `${day} ${MONTHS[m - 1]} ${y}`;
};

export const fmtRp = (n?: number) => {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} miliar`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} juta`;
  return `Rp ${n.toLocaleString('id-ID')}`;
};

export const nowStamp = () => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${TODAY} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const hMinus = (k: Kontrak, n: number) => (k.berakhir ? addDays(k.berakhir, -n) : undefined);

// ---------------------------------------------------------------------------
// Peran pengguna
// ---------------------------------------------------------------------------

export const userPeran = (u: UserAccount): Peran[] => {
  const set = new Set<Peran>();
  if (u.role === 'Marketing' || u.canCreateFPK) set.add('Pemasaran');
  if (u.role === 'Finance' || u.canVerifyFinance) set.add('Keuangan');
  if (u.role === 'BOD' || u.canApproveBOD) set.add('BOD');
  if (u.role === 'Operations') set.add('Operasional');
  return Array.from(set);
};

export const pemilikTahap = (k: Kontrak): Peran | null => {
  // SPK perpanjangan sudah diinput → menunggu verifikasi SPK baru, tidak ada tindakan di SPK lama
  if (k.tahap === 'menunggu_spk_perpanjangan' && k.spkPenggantiId) return null;
  return TAHAP_PEMILIK[k.tahap];
};

export const isPemilik = (k: Kontrak, u: UserAccount) => {
  const owner = pemilikTahap(k);
  if (!owner) return false;
  if (k.tahap === 'eskalasi' && k.delegasiKe === u.name) return true;
  return userPeran(u).includes(owner);
};

// ---------------------------------------------------------------------------
// Batas waktu per tahap
// ---------------------------------------------------------------------------

export const batasTahap = (k: Kontrak): string | undefined => {
  switch (k.tahap) {
    case 'belum_ada':
      return k.bertugasSejak ? addDays(k.bertugasSejak, BATAS_VERIFIKASI_HARI) : undefined;
    case 'menunggu_verifikasi':
      return k.dikirimVerifikasiPada ? addDays(k.dikirimVerifikasiPada, BATAS_VERIFIKASI_HARI) : undefined;
    case 'dikembalikan':
      return k.verifikasi ? addDays(k.verifikasi.pada, BATAS_PERBAIKAN_HARI) : undefined;
    case 'persiapan_perpanjangan':
    case 'telaah_memo':
    case 'persetujuan_memo':
    case 'kirim_memo':
      return hMinus(k, 60);
    case 'menunggu_tanggapan':
      return k.batasKhusus || hMinus(k, 30);
    case 'negosiasi':
      return k.memo.tanggapan?.tindakLanjut || k.batasKhusus || hMinus(k, 30);
    case 'eskalasi':
      return k.batasKhusus || k.berakhir;
    case 'menunggu_spk_perpanjangan':
    case 'demobilisasi':
      return k.berakhir;
    default:
      return undefined;
  }
};

export const terlambatHari = (k: Kontrak): number => {
  const b = batasTahap(k);
  if (!b || k.tahap === 'selesai' || k.tahap === 'berlaku') return 0;
  const d = diffDays(b, TODAY);
  return d > 0 ? d : 0;
};

export const sisaHariBerakhir = (k: Kontrak) => (k.berakhir ? diffDays(TODAY, k.berakhir) : undefined);

export const isMerah = (k: Kontrak) => k.tahap === 'eskalasi' || !!k.berakhirTanpaKeputusan || !!k.lewatTanpaSpk;

export const isActionable = (k: Kontrak) => pemilikTahap(k) !== null && k.tahap !== 'selesai';

// ---------------------------------------------------------------------------
// Aturan waktu otomatis (bagian 2.2, edge case 11, 15, 16, 17)
// ---------------------------------------------------------------------------

export interface PerubahanOtomatis {
  kontrak: Kontrak;
  berubah: boolean;
}

export const terapkanAturanWaktu = (k: Kontrak): PerubahanOtomatis => {
  if (!k.berakhir || k.tahap === 'selesai') return { kontrak: k, berubah: false };
  let next = k;
  const log = (teks: string) => {
    next = {
      ...next,
      aktivitas: [{ id: `act-${next.id}-${next.aktivitas.length}-${Math.random().toString(36).slice(2, 6)}`, pada: `${TODAY} 00:00`, oleh: 'Sistem', peran: 'Otomatis', teks }, ...next.aktivitas],
    };
  };
  const h75 = addDays(k.berakhir, -75);
  const h30 = addDays(k.berakhir, -30);
  const lewatBerakhir = diffDays(k.berakhir, TODAY) > 0;

  // H-75: berlaku → persiapan perpanjangan
  if (next.tahap === 'berlaku' && diffDays(h75, TODAY) >= 0) {
    next = { ...next, tahap: 'persiapan_perpanjangan' };
    log(`Memasuki H-75 (${fmtDate(h75)}). Tahap otomatis berubah ke Persiapan Perpanjangan dan tugas dibuat untuk Pemasaran.`);
  }

  // H-30: tanpa tanggapan / negosiasi melewati H-30 → eskalasi
  const batasTanggapan = next.batasKhusus || h30;
  if ((next.tahap === 'menunggu_tanggapan' || next.tahap === 'negosiasi' || MEMO_TAHAP.includes(next.tahap))
    && diffDays(batasTanggapan, TODAY) >= 0 && !lewatBerakhir) {
    const prev = next.tahap;
    next = { ...next, tahap: 'eskalasi', tahapSebelumnya: prev };
    log(prev === 'negosiasi'
      ? `Negosiasi belum selesai hingga ${next.batasKhusus ? 'batas yang diperpanjang' : 'H-30'} (${fmtDate(batasTanggapan)}). Tahap otomatis berubah ke Eskalasi BOD.`
      : `Tidak ada tanggapan klien hingga ${next.batasKhusus ? 'batas yang diperpanjang' : 'H-30'} (${fmtDate(batasTanggapan)}). Tahap otomatis berubah ke Eskalasi BOD.`);
  }

  // Setelah tanggal berakhir
  if (lewatBerakhir) {
    if (next.tahap === 'menunggu_spk_perpanjangan' && !next.spkPenggantiId && !next.lewatTanpaSpk) {
      next = { ...next, lewatTanpaSpk: true };
      log('Tanggal berakhir terlewati tanpa SPK perpanjangan. Lokasi ditandai "Belum ada SPK" (aturan 6.3).');
    } else if (PERPANJANGAN_TAHAP.includes(next.tahap) && next.tahap !== 'menunggu_spk_perpanjangan' && next.tahap !== 'demobilisasi' && !next.berakhirTanpaKeputusan) {
      next = { ...next, tahap: 'eskalasi', berakhirTanpaKeputusan: true };
      log('Tanggal berakhir terlewati tanpa keputusan. Status: Berakhir tanpa keputusan, menunggu tindakan BOD.');
    }
  }

  return { kontrak: next, berubah: next !== k };
};

// ---------------------------------------------------------------------------
// Pencocokan FPK vs SPK (per lokasi)
// ---------------------------------------------------------------------------

export type StatusCocok = 'sesuai' | 'berbeda' | 'tidak_sesuai';
export interface BarisCocok {
  komponen: string;
  fpk: string;
  spk: string;
  status: StatusCocok;
  penjelasan?: string;
}

export const cocokkan = (k: Kontrak): BarisCocok[] | null => {
  const a = k.fpkAlokasi;
  if (!a) return null;
  const rows: BarisCocok[] = [];

  // Nilai
  const nilai = k.nilai ?? 0;
  const selisih = nilai - a.nilai;
  const pct = a.nilai ? Math.abs(selisih) / a.nilai : 0;
  rows.push({
    komponen: 'Nilai',
    fpk: fmtRp(a.nilai),
    spk: fmtRp(nilai),
    status: selisih === 0 ? 'sesuai' : pct <= 0.05 ? 'berbeda' : 'tidak_sesuai',
    penjelasan: selisih === 0 ? undefined : `Selisih ${fmtRp(Math.abs(selisih))} (${selisih < 0 ? 'lebih rendah' : 'lebih tinggi'} dari FPK)`,
  });

  // Kuota
  const kuota = k.kuota ?? 0;
  rows.push({
    komponen: 'Kuota petugas',
    fpk: `${a.kuota} petugas`,
    spk: `${kuota} petugas`,
    status: kuota === a.kuota ? 'sesuai' : kuota < a.kuota ? 'berbeda' : 'tidak_sesuai',
    penjelasan: kuota === a.kuota ? undefined : `Selisih ${Math.abs(kuota - a.kuota)} petugas`,
  });

  // Tanggal mulai
  const dMulai = k.mulai ? diffDays(a.mulai, k.mulai) : 0;
  rows.push({
    komponen: 'Tanggal mulai',
    fpk: fmtDate(a.mulai),
    spk: fmtDate(k.mulai),
    status: dMulai === 0 ? 'sesuai' : 'berbeda',
    penjelasan: dMulai === 0 ? undefined : `Mulai ${Math.abs(dMulai)} hari lebih ${dMulai > 0 ? 'lambat' : 'awal'}`,
  });

  // Tanggal berakhir
  const dAkhir = k.berakhir ? diffDays(a.berakhir, k.berakhir) : 0;
  rows.push({
    komponen: 'Tanggal berakhir',
    fpk: fmtDate(a.berakhir),
    spk: fmtDate(k.berakhir),
    status: dAkhir === 0 ? 'sesuai' : dAkhir < 0 ? 'berbeda' : 'tidak_sesuai',
    penjelasan: dAkhir === 0 ? undefined : dAkhir > 0 ? `Melewati periode FPK ${dAkhir} hari` : `Berakhir ${Math.abs(dAkhir)} hari lebih awal`,
  });

  return rows;
};

// ---------------------------------------------------------------------------
// Data awal
// ---------------------------------------------------------------------------

const shortLocation = (site?: Site, fallback?: string) => {
  if (!site) return fallback || 'Lokasi';
  const n = site.name;
  const keys = ['Bekasi', 'Pulogadung', 'Morowali', 'Thamrin', 'Soekarno-Hatta', 'Tuban', 'Sangatta', 'Cirata', 'Surabaya Barat', 'Waru', 'Cikarang'];
  const hit = keys.find(key => n.includes(key));
  if (n.includes('Pelabuhan Khusus')) return 'Pelabuhan Tuban';
  if (n.includes('Pabrik Utama')) return 'Pabrik Tuban';
  if (n.includes('NOC')) return 'NOC Jakarta Selatan';
  return hit || n;
};

const cleanProjectName = (name: string) => (name.includes('—') ? name.split('—')[1].trim() : name);

const act = (id: string, i: number, pada: string, oleh: string, peran: string, teks: string): Aktivitas => ({
  id: `act-${id}-${i}`, pada, oleh, peran, teks,
});

export const buildSeed = (
  spks: SPK[], sites: Site[], projects: Project[], fpks: FPK[], memos: ExternalMemo[],
): Kontrak[] => {
  const projectOf = (id: string) => projects.find(p => p.id === id);
  const fpkOf = (id?: string) => fpks.find(f => f.id === id);

  const base = (spk: SPK): Kontrak => {
    const site = sites.find(s => s.id === spk.siteIds[0]);
    const extra = spk.siteIds.length - 1;
    const proj = projectOf(spk.projectId);
    const fpk = fpkOf(spk.fpkReferenceId);
    const kebutuhan = sites.filter(s => spk.siteIds.includes(s.id)).reduce((a, s) => a + s.requiredPersonnel, 0) || spk.personnelQuota;
    const terisi = sites.filter(s => spk.siteIds.includes(s.id)).reduce((a, s) => a + s.assignedPersonnel, 0);
    const verified = spk.verificationStatus === 'Verified';
    const lokasi = shortLocation(site) + (extra > 0 ? ` (+${extra} lokasi)` : '');
    return {
      id: `k-${spk.id}`,
      sourceSpkId: spk.id,
      spkNumber: spk.spkNumber.replace(/-DRAFT$/i, ''),
      projectId: spk.projectId,
      projectCode: proj?.projectCode || spk.projectId,
      projectName: cleanProjectName(spk.projectName),
      clientName: spk.clientName,
      siteId: site?.id,
      lokasi,
      lokasiDetail: site ? `${site.name} · ${site.areaName}` : lokasi,
      fpkId: fpk?.id,
      fpkNumber: fpk?.fpkNumber,
      fpkAlokasi: { nilai: spk.contractValueRp, kuota: spk.personnelQuota, mulai: spk.contractStart, berakhir: spk.contractEnd },
      mulai: spk.contractStart,
      berakhir: spk.contractEnd,
      nilai: spk.contractValueRp,
      kuota: spk.personnelQuota,
      kebutuhanPetugas: kebutuhan,
      petugasTerisi: terisi,
      tahap: verified ? 'berlaku' : 'menunggu_verifikasi',
      dikembalikanCount: 0,
      bertugasSejak: site?.startGuardTimestamp?.slice(0, 10),
      verifikasi: verified && spk.verifiedAt
        ? { oleh: (spk.verifiedBy || 'Siti Rahma').replace(/\s*\(.*\)$/, ''), pada: spk.verifiedAt.slice(0, 10), catatan: spk.verificationNotes, hasil: 'disahkan' }
        : undefined,
      memo: {},
      dokumen: [{
        id: `doc-${spk.id}-1`, nama: spk.spkDocumentName, jenis: 'SPK', versi: 1,
        pengunggah: 'Dimas Wicaksono', tanggal: addDays(spk.contractStart, -10),
        statusVersi: verified ? 'Sah' : 'Menunggu Verifikasi',
      }],
      aktivitas: verified && spk.verifiedAt ? [
        act(spk.id, 2, spk.verifiedAt.slice(0, 16), (spk.verifiedBy || 'Siti Rahma').replace(/\s*\(.*\)$/, ''), 'Keuangan', 'Mengesahkan SPK.'),
        act(spk.id, 1, `${addDays(spk.contractStart, -10)} 10:00`, 'Dimas Wicaksono', 'Pemasaran', 'Mengirim SPK untuk verifikasi.'),
      ] : [
        act(spk.id, 1, `${addDays(TODAY, -10)} 10:00`, 'Dimas Wicaksono', 'Pemasaran', 'Mengirim SPK untuk verifikasi.'),
      ],
      pengingat: {},
    };
  };

  const list: Kontrak[] = [];

  spks.forEach(spk => {
    if (spk.id === 'spk-12') return; // versi lama SPK Bekasi (dipindah ke riwayat versi spk-2)
    let k = base(spk);

    if (spk.id === 'spk-2') {
      // Bekasi: menunggu verifikasi, terlambat 3 hari, sudah bertugas 13 hari tanpa SPK sah, dikembalikan 1x sebelumnya
      k = {
        ...k,
        dikirimVerifikasiPada: '2026-11-01',
        bertugasTanpaSpkHari: 13,
        dikembalikanCount: 1,
        dokumen: [
          { id: 'doc-spk-2-2', nama: 'SPK_Draft_Bekasi_Expansion_v2.pdf', jenis: 'SPK', versi: 2, pengunggah: 'Dimas Wicaksono', tanggal: '2026-11-01', statusVersi: 'Menunggu Verifikasi' },
          { id: 'doc-spk-2-1', nama: 'SPK_Revisi_Klausul_Asuransi_v1.pdf', jenis: 'SPK', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2026-10-10', statusVersi: 'Dikembalikan', gagalPratinjau: true },
        ],
        aktivitas: [
          act('spk-2', 4, '2026-11-01 09:15', 'Dimas Wicaksono', 'Pemasaran', 'Mengirim ulang SPK versi 2 untuk verifikasi.'),
          act('spk-2', 3, '2026-10-25 08:30', 'Hendra Setiawan', 'PIC Area', 'Mengonfirmasi mulai bertugas di lokasi Bekasi (20 petugas).'),
          act('spk-2', 2, '2026-10-15 14:30', 'Siti Rahma', 'Keuangan', 'Mengembalikan SPK versi 1: klausul pertanggungan asuransi K3 tidak sesuai FPK pasal 4 ayat 2.'),
          act('spk-2', 1, '2026-10-10 10:00', 'Dimas Wicaksono', 'Pemasaran', 'Mengirim SPK versi 1 untuk verifikasi.'),
        ],
      };
    }

    if (spk.id === 'spk-8') {
      // Medika Farma: ada data berbeda (nilai) dan tidak sesuai (tanggal berakhir)
      k = {
        ...k,
        dikirimVerifikasiPada: '2026-11-09',
        fpkAlokasi: { nilai: 300_000_000, kuota: 22, mulai: '2026-11-04', berakhir: '2027-10-31' },
        aktivitas: [act('spk-8', 1, '2026-11-09 11:20', 'Dimas Wicaksono', 'Pemasaran', 'Mengirim SPK untuk verifikasi.')],
      };
    }

    if (spk.id === 'spk-3') {
      // Mineral Indo: memo terkirim 1 Nov, menunggu tanggapan klien (H-30 = 1 Des)
      const memo = memos.find(m => m.spkId === 'spk-3');
      k = {
        ...k,
        tahap: 'menunggu_tanggapan',
        memo: {
          nomor: memo?.memoNumber || 'MEMO/MKT/2026/102',
          disusun: { oleh: 'Dimas Wicaksono', pada: '2026-10-17' },
          ditelaah: { oleh: 'Siti Rahma', pada: '2026-10-22' },
          disetujui: { oleh: 'Bambang Sutrisno', pada: '2026-10-28' },
          dikirim: { oleh: 'Dimas Wicaksono', pada: memo?.dispatchDate || '2026-11-01', bukti: memo?.proofOfDeliveryName },
        },
        dokumen: [
          { id: 'doc-memo-1-b', nama: memo?.proofOfDeliveryName || 'Tanda_Terima_Kurir_MineralIndo.pdf', jenis: 'Bukti Kirim', pengunggah: 'Dimas Wicaksono', tanggal: '2026-11-01', statusVersi: 'Aktif' },
          { id: 'doc-memo-1', nama: 'Memo_Perpanjangan_MineralIndo_2027.pdf', jenis: 'Memo', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2026-10-17', statusVersi: 'Aktif' },
          ...k.dokumen,
        ],
        aktivitas: [
          act('spk-3', 8, '2026-11-01 15:00', 'Dimas Wicaksono', 'Pemasaran', 'Menandai memo terkirim dan mengunggah bukti kirim.'),
          act('spk-3', 7, '2026-10-28 10:10', 'Bambang Sutrisno', 'BOD', 'Menyetujui memo perpanjangan.'),
          act('spk-3', 6, '2026-10-22 13:40', 'Siti Rahma', 'Keuangan', 'Menyetujui telaah memo.'),
          act('spk-3', 5, '2026-10-17 09:00', 'Dimas Wicaksono', 'Pemasaran', 'Menyusun memo perpanjangan dan mengirim untuk ditelaah.'),
          act('spk-3', 4, '2026-10-17 00:00', 'Sistem', 'Otomatis', 'Memasuki H-75. Tahap berubah ke Persiapan Perpanjangan.'),
          ...k.aktivitas,
        ],
      };
    }

    if (spk.id === 'spk-6') {
      // Telko Infra: negosiasi belum selesai hingga H-30 (8 Nov) → eskalasi otomatis
      k = {
        ...k,
        tahap: 'negosiasi',
        memo: {
          nomor: 'MEMO/MKT/2026/105',
          disusun: { oleh: 'Dimas Wicaksono', pada: '2026-09-24' },
          ditelaah: { oleh: 'Siti Rahma', pada: '2026-09-29' },
          disetujui: { oleh: 'Bambang Sutrisno', pada: '2026-10-02' },
          dikirim: { oleh: 'Dimas Wicaksono', pada: '2026-10-05', bukti: 'Surat_Kirim_Eksternal_Telko.pdf' },
          tanggapan: { oleh: 'Dimas Wicaksono', pada: '2026-10-20', jenis: 'negosiasi', catatan: 'Klien meminta penyesuaian tarif 8% dan pengurangan 2 petugas shift malam.', tindakLanjut: '2026-11-05' },
        },
        dokumen: [
          { id: 'doc-memo-2-t', nama: 'Surat_Tanggapan_Telko_Negosiasi.pdf', jenis: 'Surat Tanggapan', pengunggah: 'Dimas Wicaksono', tanggal: '2026-10-20', statusVersi: 'Aktif' },
          { id: 'doc-memo-2-b', nama: 'Surat_Kirim_Eksternal_Telko.pdf', jenis: 'Bukti Kirim', pengunggah: 'Dimas Wicaksono', tanggal: '2026-10-05', statusVersi: 'Aktif' },
          { id: 'doc-memo-2', nama: 'Memo_Perpanjangan_Telko_2027.pdf', jenis: 'Memo', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2026-09-24', statusVersi: 'Aktif' },
          ...k.dokumen,
        ],
        aktivitas: [
          act('spk-6', 7, '2026-10-20 16:00', 'Dimas Wicaksono', 'Pemasaran', 'Mencatat tanggapan klien: Negosiasi (tindak lanjut 5 Nov 2026).'),
          act('spk-6', 6, '2026-10-05 11:00', 'Dimas Wicaksono', 'Pemasaran', 'Menandai memo terkirim dan mengunggah bukti kirim.'),
          act('spk-6', 5, '2026-10-02 09:30', 'Bambang Sutrisno', 'BOD', 'Menyetujui memo perpanjangan.'),
          act('spk-6', 4, '2026-09-29 14:00', 'Siti Rahma', 'Keuangan', 'Menyetujui telaah memo.'),
          act('spk-6', 3, '2026-09-24 10:00', 'Dimas Wicaksono', 'Pemasaran', 'Menyusun memo perpanjangan.'),
          ...k.aktivitas,
        ],
      };
    }

    if (spk.id === 'spk-7') {
      // Semen Merah: memo menunggu persetujuan BOD, batas H-60 (10 Nov) terlewati 1 hari
      k = {
        ...k,
        siteId: 'site-11',
        lokasi: 'Pabrik Tuban',
        lokasiDetail: 'Pabrik Utama Semen Tuban · Kawasan Industri Tuban Jawa Timur',
        tahap: 'persetujuan_memo',
        memo: {
          nomor: 'MEMO/MKT/2026/118',
          disusun: { oleh: 'Dimas Wicaksono', pada: '2026-10-27' },
          ditelaah: { oleh: 'Siti Rahma', pada: '2026-11-03', catatan: 'Kenaikan tarif 6% sesuai UMK 2027 Tuban.' },
        },
        dokumen: [
          { id: 'doc-memo-3', nama: 'Memo_Perpanjangan_SemenMerah_2027.pdf', jenis: 'Memo', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2026-10-27', statusVersi: 'Aktif' },
          ...k.dokumen,
        ],
        aktivitas: [
          act('spk-7', 6, '2026-11-03 15:20', 'Siti Rahma', 'Keuangan', 'Menyetujui telaah memo: kenaikan tarif 6% sesuai UMK 2027 Tuban.'),
          act('spk-7', 5, '2026-10-27 10:00', 'Dimas Wicaksono', 'Pemasaran', 'Menyusun memo perpanjangan dan mengirim untuk ditelaah.'),
          act('spk-7', 4, '2026-10-26 00:00', 'Sistem', 'Otomatis', 'Memasuki H-75. Tahap berubah ke Persiapan Perpanjangan.'),
          ...k.aktivitas,
        ],
      };
    }

    if (spk.id === 'spk-9') {
      // Ritel Mega: SPK ini untuk Surabaya Barat; Waru memiliki SPK sendiri (lihat di bawah)
      k = { ...k, siteId: 'site-14', lokasi: 'Surabaya Barat', lokasiDetail: 'Mega Hypermarket Surabaya Barat · Kawasan Komersial Surabaya', kebutuhanPetugas: 14, petugasTerisi: 14 };
    }

    list.push(k);
  });

  // --- Lokasi tambahan (sintetis) untuk menunjukkan tahap lain ---------------

  // Belum ada SPK: klien NSL diizinkan beroperasi tanpa SPK (aturan 6.3)
  list.push({
    id: 'k-nsl-marunda',
    projectId: 'proj-1', projectCode: 'PRJ-NSL-001',
    projectName: 'Operasi Pengamanan Multi-Fasilitas', clientName: 'PT Nusantara Security Logistics',
    lokasi: 'Marunda', lokasiDetail: 'Gudang Transit Marunda · Kawasan Industri Jabodetabek',
    fpkId: 'fpk-1', fpkNumber: 'FPK-2026-001',
    fpkAlokasi: { nilai: 120_000_000, kuota: 10, mulai: '2026-11-04', berakhir: '2027-11-03' },
    kebutuhanPetugas: 10, petugasTerisi: 8,
    tahap: 'belum_ada', bertugasSejak: '2026-11-04', bertugasTanpaSpkHari: 7,
    dikembalikanCount: 0, memo: {}, dokumen: [],
    aktivitas: [act('marunda', 1, '2026-11-04 08:00', 'Hendra Setiawan', 'PIC Area', 'Mengonfirmasi mulai bertugas di Gudang Transit Marunda (8 petugas) tanpa SPK.')],
    pengingat: {},
  });

  // Draf: Medika Farma lokasi kedua
  list.push({
    id: 'k-mfn-karawang',
    spkNumber: 'SPK/MFN/2026/101',
    projectId: 'proj-7', projectCode: 'PRJ-MFN-007',
    projectName: 'Pengamanan Pabrik Obat Terpadu', clientName: 'PT Medika Farma Nusantara',
    lokasi: 'Karawang', lokasiDetail: 'Gudang Bahan Baku Karawang · Kawasan Industri KIIC',
    fpkId: 'fpk-8', fpkNumber: 'FPK-2026-008',
    fpkAlokasi: { nilai: 95_000_000, kuota: 8, mulai: '2026-12-01', berakhir: '2027-11-30' },
    mulai: '2026-12-01', berakhir: '2027-11-30', nilai: 95_000_000, kuota: 8,
    kebutuhanPetugas: 8, petugasTerisi: 0,
    tahap: 'draf', dikembalikanCount: 0, memo: {},
    dokumen: [],
    aktivitas: [act('karawang', 1, '2026-11-10 16:45', 'Dimas Wicaksono', 'Pemasaran', 'Menyimpan draf SPK (file belum diunggah).')],
    pengingat: {},
  });

  // Dikembalikan 2x: Ritel Mega lokasi Waru
  list.push({
    id: 'k-rms-waru',
    spkNumber: 'SPK/RMS/2026/041',
    projectId: 'proj-8', projectCode: 'PRJ-RMS-008',
    projectName: 'Pengamanan Jaringan Ritel', clientName: 'PT Ritel Mega Swalayan',
    siteId: 'site-15',
    lokasi: 'Waru', lokasiDetail: 'Pusat Distribusi Logistik Waru · Kawasan Pergudangan Sidoarjo',
    fpkId: 'fpk-9', fpkNumber: 'FPK-2026-009',
    fpkAlokasi: { nilai: 180_000_000, kuota: 12, mulai: '2026-11-15', berakhir: '2027-11-14' },
    mulai: '2026-11-15', berakhir: '2027-12-14', nilai: 210_000_000, kuota: 14,
    kebutuhanPetugas: 12, petugasTerisi: 12,
    tahap: 'dikembalikan', dikembalikanCount: 2,
    alasanPengembalian: 'Nilai SPK Rp 210 juta melebihi FPK Rp 180 juta dan periode melewati FPK 30 hari. Mohon konfirmasi ulang dengan klien.',
    verifikasi: { oleh: 'Siti Rahma', pada: '2026-11-08', hasil: 'dikembalikan', catatan: 'Nilai SPK Rp 210 juta melebihi FPK Rp 180 juta dan periode melewati FPK 30 hari. Mohon konfirmasi ulang dengan klien.' },
    memo: {},
    dokumen: [
      { id: 'doc-waru-2', nama: 'SPK_Ritel_Waru_v2.pdf', jenis: 'SPK', versi: 2, pengunggah: 'Dimas Wicaksono', tanggal: '2026-11-05', statusVersi: 'Dikembalikan' },
      { id: 'doc-waru-1', nama: 'SPK_Ritel_Waru_v1.pdf', jenis: 'SPK', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2026-10-28', statusVersi: 'Dikembalikan' },
    ],
    aktivitas: [
      act('waru', 4, '2026-11-08 10:30', 'Siti Rahma', 'Keuangan', 'Mengembalikan SPK versi 2: nilai dan periode tidak sesuai FPK.'),
      act('waru', 3, '2026-11-05 13:00', 'Dimas Wicaksono', 'Pemasaran', 'Mengirim ulang SPK versi 2 untuk verifikasi.'),
      act('waru', 2, '2026-10-31 09:45', 'Siti Rahma', 'Keuangan', 'Mengembalikan SPK versi 1: lampiran tarif tidak ditandatangani klien.'),
      act('waru', 1, '2026-10-28 11:00', 'Dimas Wicaksono', 'Pemasaran', 'Mengirim SPK versi 1 untuk verifikasi.'),
    ],
    pengingat: {},
  });

  // Riwayat (selesai)
  list.push({
    id: 'k-tlk-2024',
    spkNumber: 'SPK/TLK/2024/051',
    projectId: 'proj-5', projectCode: 'PRJ-TLK-005',
    projectName: 'Pengamanan Infrastruktur Jaringan', clientName: 'PT Telko Infra Solusindo',
    siteId: 'site-10', lokasi: 'NOC Jakarta Selatan', lokasiDetail: 'Hub Fiber Optik & NOC Jakarta Selatan · Kawasan Komersial TB Simatupang',
    fpkId: 'fpk-6', fpkNumber: 'FPK-2026-006', fpkAlokasi: null,
    mulai: '2024-12-08', berakhir: '2025-12-07', nilai: 290_000_000, kuota: 16,
    kebutuhanPetugas: 16, petugasTerisi: 16,
    tahap: 'selesai', hasil: 'diperpanjang', selesaiPada: '2025-12-05', selesaiOleh: 'Siti Rahma',
    selesaiCatatan: 'Diperpanjang dengan SPK/TLK/2025/088 (kenaikan nilai 7%).', spkPenggantiId: 'k-spk-6',
    dikembalikanCount: 0, memo: { nomor: 'MEMO/MKT/2025/061', tanggapan: { oleh: 'Dimas Wicaksono', pada: '2025-10-30', jenis: 'setuju' } },
    dokumen: [{ id: 'doc-tlk24', nama: 'SPK_Telko_Infra_2024.pdf', jenis: 'SPK', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2024-12-01', statusVersi: 'Digantikan' }],
    aktivitas: [act('tlk24', 1, '2025-12-05 09:30', 'Siti Rahma', 'Keuangan', 'Mengesahkan SPK perpanjangan SPK/TLK/2025/088. SPK ini berstatus Diperpanjang.')],
    pengingat: {},
  });

  list.push({
    id: 'k-kpc-2025',
    spkNumber: 'SPK/KPC/2025/007',
    projectId: 'proj-9', projectCode: 'PRJ-KPC-009',
    projectName: 'Pengamanan Konsesi Batubara', clientName: 'PT Kencana Perkasa Coal',
    lokasi: 'Jetty Bengalon', lokasiDetail: 'Jetty Bengalon · Wilayah Tambang Kalimantan Timur',
    fpkId: 'fpk-10', fpkNumber: 'FPK-2026-010', fpkAlokasi: null,
    mulai: '2025-03-01', berakhir: '2026-02-28', nilai: 210_000_000, kuota: 12,
    kebutuhanPetugas: 12, petugasTerisi: 0,
    tahap: 'selesai', hasil: 'didemobilisasi', selesaiPada: '2026-02-28', selesaiOleh: 'Aris Wijaya',
    selesaiCatatan: 'Klien tidak melanjutkan karena jetty dialihkan ke operator lain. 12 petugas dimutasi ke Main Pit Sangatta.',
    dikembalikanCount: 0, memo: { nomor: 'MEMO/MKT/2025/090', tanggapan: { oleh: 'Dimas Wicaksono', pada: '2026-01-12', jenis: 'tidak_lanjut' } },
    dokumen: [{ id: 'doc-kpc25', nama: 'SPK_Kencana_Jetty_2025.pdf', jenis: 'SPK', versi: 1, pengunggah: 'Dimas Wicaksono', tanggal: '2025-02-20', statusVersi: 'Aktif' }],
    aktivitas: [act('kpc25', 1, '2026-02-28 17:00', 'Aris Wijaya', 'Operasional', 'Menyelesaikan demobilisasi Jetty Bengalon.')],
    pengingat: {},
  });

  return list.map(k => terapkanAturanWaktu(k).kontrak);
};
