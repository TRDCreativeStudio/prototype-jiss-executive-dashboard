// Tahap project = kondisi pekerjaan di satu site (bukan status dokumen).
// FPK, SPK, dan memo adalah dokumen yang menggerakkan project dari satu tahap ke tahap berikutnya.
import type { Fpk, Memo, Site, Spk, Task, Setting, User, Client } from './types';
import type { Tone } from './labels';
import { MEMO_STATUS } from './labels';
import { effectiveSpks, latest, lapsedSpkList, withoutSpkList } from './selectors';
import { TODAY, diffDays, fmtDate, hMinus } from './time';
import { settingNum } from './settings';

export const PROJECT_STEPS = ['Persiapan', 'Mulai jaga', 'Tercakup SPK', 'Masa perpanjangan', 'Lanjut / berakhir'];

export type ProjectPhase = 'persiapan' | 'berjalan' | 'perpanjangan' | 'selesai';

export interface ProjectAction {
  /** Teks tindakan. Tanpa `to` berarti sedang menunggu pihak lain. */
  label: string;
  to?: string;
  due?: string;
  /** Hanya pemilik klien (Marketing) yang menjalankan tindakan ini. */
  ownerOnly?: boolean;
  /** Boleh dijalankan siapa pun yang berperan Marketing (mis. membuat memo). */
  marketingOnly?: boolean;
}

export interface ProjectStatus {
  site: Site;
  phase: ProjectPhase;
  /** Indeks langkah di PROJECT_STEPS (5 = semua selesai). */
  stage: number;
  steps: string[];
  warn: boolean;
  chip: { tone: Tone; label: string; hint?: string };
  action?: ProjectAction;
  /** Banner (hanya tindakan atau masalah). */
  banner?: { tone: 'red' | 'amber' | 'blue' | 'green'; title: string; body?: string; /** tampilkan nilai tertahan */ held?: boolean };
  fpk?: Fpk;
  spk?: Spk;
  pendingSpk?: Spk;
  memo?: Memo;
  gap?: { from: string; days: number; held: number; lapsed: boolean; partial: boolean };
  period?: { start: string; end: string };
}

interface Src {
  fpks: Fpk[];
  spks: Spk[];
  sites: Site[];
  memos: Memo[];
  tasks: Task[];
  settings: Setting[];
  clients: Client[];
}

const days = (n: number) => (n === 1 ? '1 hari' : `${n} hari`);

export const projectStatus = (site: Site, s: Src): ProjectStatus => {
  const memoStart = settingNum(s.settings, 'memo.start_days_before_end', 75);
  const memoSend = settingNum(s.settings, 'memo.send_deadline_days_before_end', 60);
  const escalateAt = settingNum(s.settings, 'spk.without_spk_escalate_days', 30);

  const fpks = s.fpks.filter(f => latest(f).siteId === site.id);
  const spks = s.spks.filter(x => x.siteId === site.id);
  const effective = effectiveSpks(s.spks).filter(x => x.siteId === site.id);
  const spk = effective[effective.length - 1] ?? spks.filter(x => x.status === 'aktif').pop() ?? spks[spks.length - 1];
  const pendingSpk = spks.find(x => x.status === 'perlu_revisi') ?? spks.find(x => x.status === 'diinput');
  const fpk = fpks.find(f => !['selesai', 'batal', 'ditolak'].includes(f.status)) ?? fpks[fpks.length - 1];
  const memo = spk ? [...s.memos].reverse().find(m => m.spkId === spk.id) : undefined;

  const ws = withoutSpkList(s.fpks, s.spks, s.sites).find(x => x.site?.id === site.id);
  const lapsed = lapsedSpkList(s.spks, s.sites).find(x => x.site?.id === site.id);
  const gap = ws
    ? { from: ws.from, days: ws.days, held: ws.held, lapsed: false, partial: ws.fpk.status === 'tertutup_sebagian' }
    : lapsed ? { from: lapsed.from, days: lapsed.days, held: lapsed.held, lapsed: true, partial: false } : undefined;

  // Periode: SPK yang sedang berlaku; kalau belum ada, periode di FPK; terakhir SPK apa pun
  const cur = effective[effective.length - 1];
  const period = cur ? { start: cur.periodStart, end: cur.periodEnd }
    : fpk && fpk.status !== 'selesai' ? { start: latest(fpk).periodStart, end: latest(fpk).periodEnd }
    : spk ? { start: spk.periodStart, end: spk.periodEnd } : undefined;
  const steps = [...PROJECT_STEPS];
  const base = { site, steps, fpk, spk, pendingSpk, memo, gap, period };

  // 1) Selesai: site nonaktif tanpa SPK berjalan, atau klien tidak lanjut dan SPK sudah lewat
  if (!site.active && effective.length === 0) {
    return { ...base, phase: 'selesai', stage: 5, warn: false, chip: { tone: 'slate', label: 'Selesai' } };
  }

  // 2) Jalan tanpa SPK (kontrak baru belum ber-SPK, atau SPK lama berakhir tapi masih dijaga)
  if (gap) {
    const late = gap.lapsed ? gap.days > 1 : gap.days >= escalateAt;
    const label = gap.partial ? `SPK sebagian · ${days(gap.days)}` : `Tanpa SPK · ${days(gap.days)}`;
    steps[2] = label;
    const action: ProjectAction | undefined =
      pendingSpk?.status === 'perlu_revisi' ? { label: 'Revisi SPK', to: `/spk/${pendingSpk.id}/revisi`, ownerOnly: true }
      : pendingSpk ? { label: 'Menunggu verifikasi Finance' }
      : gap.lapsed && lapsed ? { label: 'Input SPK perpanjangan', to: `/spk/input?induk=${lapsed.spk.id}`, ownerOnly: true }
      : ws ? { label: 'Input SPK', to: `/spk/input?fpk=${ws.fpk.id}`, ownerOnly: true } : undefined;
    return {
      ...base, phase: 'berjalan', stage: 2, warn: true,
      chip: { tone: late ? 'red' : 'amber', label, hint: `Dijaga sejak ${fmtDate(gap.from)}${gap.lapsed ? ' (SPK lama berakhir)' : ''}${late ? ' · sudah eskalasi BOD' : ''}` },
      action,
      // Banner fokus ke satu hal: kalau SPK perlu revisi, itulah yang ditampilkan (alasan dari Finance).
      banner: pendingSpk?.status === 'perlu_revisi'
        ? { tone: 'amber', title: `${pendingSpk.number} perlu revisi`,
            body: [pendingSpk.revisionReason, pendingSpk.invoiceHeld ? 'Invoice ditahan sampai revisi masuk.' : ''].filter(Boolean).join(' ') || undefined }
        // SPK sudah masuk dan sedang dicek Finance: cukup itu yang disorot
        : pendingSpk
        ? (() => {
            const t = s.tasks.find(x => x.kind === 'verifikasi_spk' && x.refId === pendingSpk.id && x.status === 'terbuka');
            return { tone: 'blue' as const, title: `${pendingSpk.number} sedang diverifikasi Finance`, body: t ? `Batas verifikasi ${fmtDate(t.dueAt)}.` : undefined };
          })()
        : {
            tone: late ? 'red' : 'amber', held: true,
            title: `${gap.lapsed ? 'SPK lama berakhir, site masih dijaga' : 'Jalan tanpa SPK'} · ${days(gap.days)} sejak ${fmtDate(gap.from)}`,
          },
    };
  }

  // 3) Belum mulai jaga: FPK masih diajukan atau sudah disetujui
  if (effective.length === 0 && fpk && !fpk.startedAt) {
    if (fpk.status === 'disetujui') {
      steps[1] = `Mulai jaga ${fmtDate(latest(fpk).plannedStart)}`;
      return { ...base, phase: 'persiapan', stage: 1, warn: false,
        chip: { tone: 'blue', label: 'Siap mulai jaga', hint: `Rencana mulai ${fmtDate(latest(fpk).plannedStart)} · dikonfirmasi PIC area` },
        action: { label: 'Menunggu PIC area konfirmasi mulai jaga' } };
    }
    const waitingFor = fpk.status === 'draf' ? 'Lengkapi FPK' : fpk.status === 'dikembalikan' ? 'Perbaiki FPK' : fpk.status === 'menunggu_bod' ? 'Menunggu BOD' : fpk.status === 'cek_margin' ? 'Menunggu Finance' : 'Menunggu cek divisi';
    const own = fpk.status === 'draf' || fpk.status === 'dikembalikan';
    return { ...base, phase: 'persiapan', stage: 0, warn: fpk.status === 'dikembalikan',
      chip: { tone: fpk.status === 'dikembalikan' ? 'amber' : 'slate', label: 'Persiapan', hint: `${fpk.number} · ${waitingFor.toLowerCase()}` },
      action: own ? { label: waitingFor, to: `/fpk/${fpk.id}${fpk.status === 'dikembalikan' ? '/ubah' : ''}`, ownerOnly: true } : { label: waitingFor },
      banner: fpk.status === 'dikembalikan' && fpk.returned ? { tone: 'amber', title: `${fpk.number} dikembalikan oleh ${fpk.returned.fromDivision ?? 'pemeriksa'}`, body: fpk.returned.reason } : undefined };
  }

  // 4) Tercakup SPK; masuk masa perpanjangan di H-75
  if (spk && spk.status === 'aktif') {
    const left = diffDays(TODAY, spk.periodEnd);
    const sendBy = hMinus(spk.periodEnd, memoSend);
    // SPK pengganti (perpanjangan) sedang diproses: tetap tercakup
    const revise = pendingSpk?.status === 'perlu_revisi' ? pendingSpk : undefined;
    if (left > memoStart) {
      return { ...base, phase: 'berjalan', stage: 2, warn: !!revise,
        chip: { tone: 'green', label: 'Berjalan', hint: `${spk.number} berlaku s.d. ${fmtDate(spk.periodEnd)}` },
        action: revise ? { label: 'Revisi SPK', to: `/spk/${revise.id}/revisi`, ownerOnly: true } : undefined,
        banner: revise ? { tone: 'amber', title: `${revise.number} perlu revisi`, body: revise.revisionReason } : undefined };
    }
    // Masa perpanjangan
    if (!memo) {
      const task = s.tasks.find(t => t.kind === 'memo' && t.refId === spk.id && t.status === 'terbuka');
      const due = task?.dueAt ?? sendBy;
      const late = diffDays(due, TODAY) > 0;
      steps[3] = 'Perlu memo';
      return { ...base, phase: 'perpanjangan', stage: 3, warn: true,
        chip: { tone: late ? 'red' : 'amber', label: 'Perlu memo', hint: `SPK berakhir ${fmtDate(spk.periodEnd)} (${left} hari lagi)` },
        action: { label: 'Buat memo', to: `/memo/baru?spk=${spk.id}`, due, marketingOnly: true },
        banner: { tone: late ? 'red' : 'amber', title: `SPK berakhir dalam ${left} hari · memo belum dibuat`, body: `Kirim memo ke klien paling lambat ${fmtDate(due)}.` } };
    }
    const ms = MEMO_STATUS[memo.status].label;
    if (memo.status === 'dijawab') {
      if (memo.clientAnswer === 'setuju') {
        steps[4] = 'Diperpanjang';
        return { ...base, phase: 'perpanjangan', stage: 4, warn: false,
          chip: { tone: 'green', label: 'Diperpanjang', hint: 'Klien setuju. Input SPK perpanjangan begitu diterima.' },
          action: { label: 'Input SPK perpanjangan', to: `/spk/input?induk=${spk.id}`, ownerOnly: true } };
      }
      if (memo.clientAnswer === 'tidak_lanjut') {
        steps[4] = 'Berakhir';
        return { ...base, phase: 'perpanjangan', stage: 4, warn: false,
          chip: { tone: 'slate', label: 'Tidak lanjut', hint: `Kontrak berakhir ${fmtDate(spk.periodEnd)} · demobilisasi` },
          action: { label: 'Demobilisasi oleh Operasional & HR' } };
      }
      steps[3] = 'Nego';
      return { ...base, phase: 'perpanjangan', stage: 3, warn: true,
        chip: { tone: 'amber', label: 'Klien nego', hint: memo.answerNote },
        action: { label: 'Lihat memo nego', to: `/memo/${memo.id}`, ownerOnly: true } };
    }
    steps[3] = `Memo ${ms.toLowerCase()}`;
    const act: ProjectAction =
      memo.status === 'draf' ? { label: 'Lengkapi memo', to: `/memo/${memo.id}`, due: sendBy, ownerOnly: true }
      : memo.status === 'disetujui' ? { label: 'Kirim memo', to: `/memo/${memo.id}`, due: sendBy, ownerOnly: true }
      : memo.status === 'terkirim' ? { label: 'Catat jawaban klien', to: `/memo/${memo.id}`, due: hMinus(spk.periodEnd, settingNum(s.settings, 'memo.answer_deadline_days_before_end', 30)), ownerOnly: true }
      : { label: memo.status === 'cek_margin' ? 'Menunggu Finance' : 'Menunggu BOD' };
    return { ...base, phase: 'perpanjangan', stage: 3, warn: false,
      chip: { tone: 'blue', label: `Memo ${ms.toLowerCase()}`, hint: `SPK berakhir ${fmtDate(spk.periodEnd)} (${left} hari lagi)` },
      action: act };
  }

  // 5) Lainnya: SPK sudah ada tapi belum aktif tanpa jalan (mis. menunggu verifikasi sebelum mulai)
  return { ...base, phase: 'persiapan', stage: 1, warn: false,
    chip: { tone: 'blue', label: 'Persiapan', hint: pendingSpk ? `${pendingSpk.number} sedang diverifikasi` : undefined },
    action: pendingSpk ? { label: 'Menunggu verifikasi Finance' } : undefined };
};

/** Bisakah user ini menjalankan tindakan project (pemilik klien untuk tindakan Marketing). */
export const canRunAction = (a: ProjectAction | undefined, me: User, client?: Client) => {
  if (!a?.to) return false;
  if (a.marketingOnly) return me.roles.includes('Marketing');
  return !a.ownerOnly || (!!client && me.roles.includes('Marketing') && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id)));
};

/** Site yang terhitung sebagai project: punya minimal satu FPK atau SPK. */
export const isProjectSite = (site: Site, s: { fpks: Fpk[]; spks: Spk[] }) =>
  s.fpks.some(f => latest(f).siteId === site.id) || s.spks.some(x => x.siteId === site.id);

