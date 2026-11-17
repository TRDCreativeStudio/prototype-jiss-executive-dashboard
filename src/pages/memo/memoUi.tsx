import React, { useEffect } from 'react';
import { CheckCircle2, Handshake, Mail, Pencil, Send, Wallet, CalendarDays, CalendarClock, MessageSquare, XCircle } from 'lucide-react';
import { useStore } from '../../store/store';
import { ActivityLog, AttachmentChip, Btn, Money, PanelTopBar, StatusChip, Stepper, SummaryCard, cx, stepWindow, useAnimatedClose, type StatusHint } from '../../ui/kit';
import { navigate } from '../../router';
import { ProjectLinkCard } from '../project/projectUi';
import { MEMO_STATUS } from '../../domain/labels';
import { TODAY, diffDays, fmtDate, hMinus } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import type { Memo, MemoType, Spk } from '../../domain/types';

/** Jenis memo versi pendek untuk tabel. */
export const MEMO_TYPE_SHORT: Record<MemoType, string> = {
  perpanjangan_sama: 'Perpanjangan · harga sama',
  perpanjangan_ump: 'Perpanjangan · UMP/UMK',
  pengakhiran_perusahaan: 'Pengakhiran · oleh JISS',
  pengakhiran_klien: 'Pengakhiran · dari klien',
};

export const ANSWER_LABEL: Record<NonNullable<Memo['clientAnswer']>, string> = {
  setuju: 'Klien setuju',
  nego: 'Klien nego',
  tidak_lanjut: 'Klien tidak lanjut',
};

/** Tanggal penting memo dari akhir SPK: H-75 tugas, H-60 kirim, H-30 jawaban. */
export const useMemoDeadlines = () => {
  const { state } = useStore();
  const n = (k: string, fb: number) => settingNum(state.settings, k, fb);
  return (end: string) => ({
    start: hMinus(end, n('memo.start_days_before_end', 75)),
    send: hMinus(end, n('memo.send_deadline_days_before_end', 60)),
    answer: hMinus(end, n('memo.answer_deadline_days_before_end', 30)),
  });
};

/** "4 hari lagi" / "hari ini" / "lewat 3 hari". */
export const countdown = (date: string) => {
  const d = diffDays(TODAY, date);
  return { late: d < 0, text: d < 0 ? `lewat ${-d} hari` : d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`, days: d };
};

/** Tahap berikutnya per status memo (dipakai di tabel dan side modal). */
export const memoNextStep = (m: Memo, s: Spk, dl: { send: string; answer: string }): { text: string; due?: string } => {
  switch (m.status) {
    case 'draf': return { text: 'Lengkapi draf', due: dl.send };
    case 'cek_margin': return { text: 'Menunggu Finance' };
    case 'menunggu_bod': return { text: 'Menunggu BOD' };
    case 'disetujui': return { text: 'Kirim ke klien', due: dl.send };
    case 'terkirim': return { text: 'Tunggu jawaban', due: dl.answer };
    case 'dijawab': return { text: m.clientAnswer ? ANSWER_LABEL[m.clientAnswer] : 'Dijawab' };
    default: return { text: '–' };
  }
};

/** Chip status memo; jawaban klien jadi tooltip. */
export const memoStatusChip = (m: Memo) => {
  const st = MEMO_STATUS[m.status];
  const hint: StatusHint | null = m.clientAnswer
    ? { kind: 'info', text: `${ANSWER_LABEL[m.clientAnswer]}${m.answeredAt ? ` · ${fmtDate(m.answeredAt)}` : ''}${m.answerNote ? ` · ${m.answerNote}` : ''}` }
    : null;
  return <StatusChip tone={st.tone} label={st.label} hint={hint} />;
};

/** Langkah memo: cek margin hanya untuk penyesuaian UMP/UMK. */
export const memoSteps = (m: Memo) => {
  const keys = (['draf', 'cek_margin', 'menunggu_bod', 'disetujui', 'terkirim', 'dijawab'] as Memo['status'][])
    .filter(x => m.type === 'perpanjangan_ump' || x !== 'cek_margin');
  const idx = keys.indexOf(m.status);
  return { steps: keys.map(k => MEMO_STATUS[k].label), current: m.status === 'dijawab' ? keys.length : idx };
};

const PanelSection: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <section className="pt-5 border-t border-slate-100">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {right && <span className="text-[13px] text-slate-500">{right}</span>}
    </div>
    {children}
  </section>
);

const NEXT_TONE = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  red: 'bg-rose-50 border-rose-200 text-rose-900',
  slate: 'bg-slate-50 border-slate-200 text-slate-800',
} as const;

/** Side modal memo: identitas, stepper, tindakan (bila ada), ringkasan, dokumen, log. */
export const MemoSidePanel: React.FC<{ memoId: string; onClose: () => void }> = ({ memoId, onClose }) => {
  const { closing, close } = useAnimatedClose(onClose);
  const { state, lookups, access, me } = useStore();
  const deadlines = useMemoDeadlines();
  const m = lookups.memo.get(memoId);
  const s = m ? lookups.spk.get(m.spkId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!m || !s) return null;
  const client = lookups.client.get(s.clientId);
  const site = lookups.site.get(s.siteId);
  const area = site?.areaId ? lookups.area.get(site.areaId) : undefined;
  const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
  const canAct = isOwner && me.roles.includes('Marketing');
  const v = m.versions[m.versions.length - 1];
  const extend = m.type.startsWith('perpanjangan');
  const dl = deadlines(s.periodEnd);
  const parent = m.parentMemoId ? lookups.memo.get(m.parentMemoId) : undefined;
  const children = state.memos.filter(x => x.parentMemoId === m.id);
  const userName = (id?: string) => (id ? lookups.user.get(id)?.name : undefined) ?? '–';
  const open = (to: string) => navigate(to);

  // Tindakan: hanya bila ada yang harus dikerjakan atau ada masalah (status saja cukup dari stepper)
  const sendC = countdown(dl.send);
  const answerC = countdown(dl.answer);
  const next: { tone: keyof typeof NEXT_TONE; icon: React.ReactNode; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode } | null = (() => {
    switch (m.status) {
      case 'draf':
        return { tone: sendC.late ? 'red' : 'slate', icon: <Pencil className="w-4 h-4" />, title: `Draf belum diajukan · kirim paling lambat ${fmtDate(dl.send)}`,
          action: canAct ? <Btn size="sm" variant="secondary" onClick={() => open(`/memo/${m.id}`)}>Lanjutkan draf</Btn> : undefined };
      case 'disetujui':
        return { tone: sendC.late ? 'red' : 'amber', icon: <Send className="w-4 h-4" />, title: `Kirim ke klien · batas ${fmtDate(dl.send)} (${sendC.text})`,
          body: 'Tanda tangani PDF, kirim ke klien, lalu unggah bukti kirim.',
          action: canAct ? <Btn size="sm" onClick={() => open(`/memo/${m.id}`)}>Unggah bukti kirim</Btn> : undefined };
      case 'terkirim':
        return { tone: answerC.late ? 'red' : 'blue', icon: <MessageSquare className="w-4 h-4" />, title: `Tunggu jawaban klien · batas ${fmtDate(dl.answer)} (${answerC.text})`,
          action: canAct ? <Btn size="sm" variant="secondary" onClick={() => open(`/memo/${m.id}`)}>Catat jawaban</Btn> : undefined };
      case 'dijawab':
        if (m.clientAnswer === 'setuju') return { tone: 'green', icon: <CheckCircle2 className="w-4 h-4" />, title: 'Klien setuju diperpanjang', body: m.answerNote,
          action: canAct ? <Btn size="sm" onClick={() => open(`/spk/input?induk=${s.id}`)}>Input SPK perpanjangan</Btn> : undefined };
        if (m.clientAnswer === 'nego') return { tone: 'amber', icon: <Handshake className="w-4 h-4" />, title: 'Klien nego', body: m.answerNote,
          action: children[0] ? <Btn size="sm" variant="secondary" onClick={() => open(`/memo/${children[0].id}`)}>Lihat memo nego</Btn> : undefined };
        return { tone: 'red', icon: <XCircle className="w-4 h-4" />, title: 'Klien tidak lanjut · demobilisasi berjalan', body: m.answerNote };
      default:
        return null;
    }
  })();

  const st = memoSteps(m);
  const win = stepWindow(st.steps, st.current);

  // Log: dari data memo
  const log = [
    { key: 'c', at: m.createdAt, actorId: m.createdBy, text: 'Memo dibuat', tone: 'slate' },
    ...m.versions.filter(x => x.bodDecision).map(x => ({
      key: `b${x.no}`, at: x.bodDecision!.at, actorId: x.bodDecision!.by,
      text: x.bodDecision!.decision === 'setujui' ? `Disetujui BOD (v${x.no})` : `Dikembalikan BOD (v${x.no})`,
      note: x.bodDecision!.note, tone: x.bodDecision!.decision === 'setujui' ? 'green' : 'amber',
    })),
    ...(m.sentAt ? [{ key: 's', at: m.sentAt, text: 'Terkirim ke klien, bukti kirim diunggah', tone: 'blue' }] : []),
    ...(m.answeredAt && m.clientAnswer ? [{ key: 'a', at: m.answeredAt, text: ANSWER_LABEL[m.clientAnswer], note: m.answerNote, tone: m.clientAnswer === 'setuju' ? 'green' : m.clientAnswer === 'nego' ? 'amber' : 'red' }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={`Memo ${m.number ?? 'draf'}`}>
      <div className="drawer-backdrop fixed inset-0 bg-slate-900/20" data-closing={closing} onClick={close} />
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="drawer-panel w-screen sm:w-[520px] lg:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10" data-closing={closing}>
          <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-2">
            <PanelTopBar onClose={close} fullHref={`/memo/${m.id}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={cx('text-base font-semibold text-slate-900', m.number && 'font-mono')}>{m.number ?? 'Draf memo'}</h2>
                {memoStatusChip(m)}
              </div>
              <p className="text-sm text-slate-800 mt-1">
                {client?.name}<span className="text-slate-300 mx-1.5">·</span>{site?.name}
                {area && <span className="text-slate-500"><span className="text-slate-300 mx-1.5">·</span>{area.name}</span>}
              </p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {MEMO_TYPE_SHORT[m.type]}{parent && <> · nego atas {parent.number}</>} · dibuat {userName(m.createdBy)}, {fmtDate(m.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <Stepper steps={win.steps} current={win.current} compact />
            <ProjectLinkCard siteId={s.siteId} />

            {next && (
              <div className={cx('rounded-xl border px-4 py-3', NEXT_TONE[next.tone])}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 opacity-80">{next.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{next.title}</div>
                    {next.body && <div className="text-[13px] mt-0.5 opacity-90">{next.body}</div>}
                  </div>
                  {next.action && <div className="shrink-0">{next.action}</div>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <SummaryCard icon={Wallet} label="Nilai baru / bulan" valueClass="text-base"
                value={!extend ? '–' : m.type === 'perpanjangan_sama' ? 'Sama' : <Money value={v.newValue} clientId={s.clientId} />}
                sub={extend ? <>berjalan <Money value={s.monthlyValue} clientId={s.clientId} /></> : 'tidak diperpanjang'} />
              <SummaryCard icon={CalendarDays} label="Periode baru" valueClass="text-base"
                value={extend ? `${fmtDate(v.periodStart)} – ${fmtDate(v.periodEnd)}` : '–'}
                sub={`SPK berakhir ${fmtDate(s.periodEnd)}`} />
              <SummaryCard icon={Mail} label="Batas kirim (H-60)" valueClass="text-base" value={fmtDate(dl.send)}
                sub={m.sentAt ? `terkirim ${fmtDate(m.sentAt)}` : sendC.text} tone={!m.sentAt && sendC.late ? 'red' : undefined} />
              <SummaryCard icon={CalendarClock} label="Batas jawaban (H-30)" valueClass="text-base" value={fmtDate(dl.answer)}
                sub={m.answeredAt ? `dijawab ${fmtDate(m.answeredAt)}` : answerC.text} tone={m.status === 'terkirim' && answerC.late ? 'red' : undefined} />
            </div>

            <PanelSection title="Dokumen">
              <ul className="divide-y divide-slate-100">
                <li className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-500">SPK</span>
                  <button type="button" onClick={() => open(`/spk/${s.id}`)} className="font-mono text-slate-800 hover:underline">{s.number}</button>
                </li>
                {parent && (
                  <li className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-slate-500">Nego atas memo</span>
                    <button type="button" onClick={() => open(`/memo/${parent.id}`)} className="font-mono text-slate-800 hover:underline">{parent.number}</button>
                  </li>
                )}
              </ul>
              <div className="flex flex-col gap-1.5 mt-2">
                {m.draftPdf && <AttachmentChip a={m.draftPdf} clientId={s.clientId} entity="memo" entityId={m.id} />}
                {m.signedPdf && <AttachmentChip a={m.signedPdf} clientId={s.clientId} entity="memo" entityId={m.id} />}
                {m.proof && <AttachmentChip a={m.proof} clientId={s.clientId} entity="memo" entityId={m.id} />}
                {v.boq && access.money(s.clientId) && <AttachmentChip a={v.boq} clientId={s.clientId} entity="memo" entityId={m.id} />}
                {!m.draftPdf && <span className="text-[13px] text-slate-500">PDF memo dibuat setelah BOD menyetujui.</span>}
              </div>
            </PanelSection>

            <PanelSection title="Log aktivitas">
              <ActivityLog items={log} />
            </PanelSection>
          </div>
        </div>
      </div>
    </div>
  );
};
