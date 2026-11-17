import React, { useState } from 'react';
import { CheckSquare, Shuffle, Hand, Eye, CheckCircle2 } from 'lucide-react';
import { Field, Modal, Select, Textarea, ErrorText, DateInput, toast } from '../../ui/kit';
import { MANUAL_KINDS } from '../../store/taskActions';
import { AlertTriangle, ArrowRight, Clock, CornerDownRight, UserCheck } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Empty, PageHeader, Tabs, cx } from '../../ui/kit';
import { fmtDate, diffDays, addWorkdays, TODAY } from '../../domain/time';
import { TASK_KIND_LABEL, escalationHeadRole, waitingOn, BOD_DIRECT_KINDS, type TaskReason, type Escalation } from '../../domain/tasks';
import { has, isDeputy } from '../../domain/rbac';
import type { Task } from '../../domain/types';
import { latest } from '../../domain/selectors';
import { navigate } from '../../router';

export const refLink = (t: Task) =>
  t.refType === 'fpk' ? `/fpk/${t.refId}` : t.refType === 'spk' ? `/spk/${t.refId}` : t.refType === 'memo' ? `/memo/${t.refId}` : t.refType === 'personnel' ? `/security/${t.refId}` : t.refType === 'site' ? `/site/${t.refId}` : '/tugas';

const ACTION_LABEL: Partial<Record<Task['kind'], string>> = {
  cek_fpk: 'Cek FPK',
  survei: 'Isi hasil survei',
  cek_margin: 'Cek margin',
  setujui_fpk: 'Putuskan',
  perbaiki_fpk: 'Perbaiki FPK',
  serah_hr: 'Serahkan ke HR',
  tandai_terdaftar: 'Tandai terdaftar',
  mulai_jaga: 'Konfirmasi mulai jaga',
  lepas_mutasi: 'Pilih personel',
  ubah_penempatan: 'Ubah penempatan',
  verifikasi_spk: 'Verifikasi',
  urus_spk_salah: 'Input revisi SPK',
  kejar_spk: 'Input SPK',
  margin_spk: 'Buka SPK',
  memo: 'Pilih jenis memo',
  kirim_memo: 'Kirim memo',
  catat_jawaban: 'Catat jawaban',
  setujui_memo: 'Putuskan',
  cek_margin_memo: 'Cek margin',
  input_spk_perpanjangan: 'Input SPK perpanjangan',
  spk_berakhir_jaga: 'Input SPK perpanjangan',
  penyesuaian_fpk: 'Buka FPK',
  cari_pengganti: 'Buka',
  demobilisasi: 'Buka',
};

/** Tutup tugas manual langsung dari kartu (satu klik + catatan bila wajib). */
const CompleteModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { actions } = useStore();
  const [note, setNote] = useState('');
  const [choice, setChoice] = useState<'terima' | 'nego' | ''>('');
  const [err, setErr] = useState('');
  const hint: Partial<Record<Task['kind'], string>> = {
    penyesuaian_fpk: 'Konfirmasi divisi Anda sudah menyesuaikan persiapan dengan FPK perubahan (isi SPK yang jadi acuan).',
    cari_pengganti: 'Tulis siapa penggantinya atau rencana pemenuhannya.',
    demobilisasi: task.assigneeRole === 'HR' ? 'Penempatan personel di site ini diakhiri dan personel kembali berstatus standby.' : 'Konfirmasi personel sudah ditarik dari site.',
    margin_spk: 'Margin SPK di bawah minimum. Terima, atau minta Marketing nego ulang lewat addendum.',
  };
  const go = () => {
    const r = actions.completeTask(task.id, note, choice || undefined);
    if (!r.ok) return setErr(r.error);
    toast('Tugas selesai');
    onClose();
  };
  return (
    <Modal open title={task.title} onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={go}>Selesaikan</Btn></>}>
      <p className="text-sm text-slate-600">{hint[task.kind]}</p>
      {task.kind === 'margin_spk' && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={choice === 'terima'} onChange={() => setChoice('terima')} /> Terima margin ini</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={choice === 'nego'} onChange={() => setChoice('nego')} /> Nego ulang lewat addendum</label>
        </div>
      )}
      <Field label="Catatan" required={task.kind === 'cari_pengganti' || task.kind === 'demobilisasi'}><Textarea value={note} onChange={e => setNote(e.target.value)} /></Field>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

/** Tugas yang hanya bisa dikerjakan pemiliknya (pembuat dokumen / Marketing pemegang klien). Penerima eskalasi cukup turun tangan. */
const OWNER_ONLY: Task['kind'][] = ['perbaiki_fpk', 'memo', 'kirim_memo', 'catat_jawaban', 'input_spk_perpanjangan', 'kejar_spk', 'urus_spk_salah', 'spk_berakhir_jaga'];

const InterveneModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { state, actions } = useStore();
  const [note, setNote] = useState('');
  const [due, setDue] = useState(addWorkdays(TODAY, 2, state.holidays));
  const [err, setErr] = useState('');
  const go = () => {
    const r = actions.interveneTask(task.id, note, due);
    if (!r.ok) return setErr(r.error);
    toast('Tindakan dicatat, pemilik tugas diberi tahu');
    onClose();
  };
  return (
    <Modal open title="Turun tangan" onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={go}>Simpan</Btn></>}>
      <p className="text-sm text-slate-600">{task.title}</p>
      <Field label="Tindakan yang Anda ambil" required hint="Mis. sudah menelepon klien, minta PIC area konfirmasi hari ini."><Textarea value={note} onChange={e => setNote(e.target.value)} /></Field>
      <Field label="Target tanggal baru" required><DateInput value={due} onChange={e => setDue(e.target.value)} /></Field>
      <p className="text-[11px] text-slate-500">Tugas tetap milik pemilik awal. Hitungan lewat batas dan eskalasi mulai lagi dari target baru. Tercatat di audit log.</p>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

const ReassignModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { state, actions } = useStore();
  const [userId, setUserId] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    const r = actions.reassignTask(task.id, userId);
    if (!r.ok) return setErr(r.error);
    toast('Tugas dialihkan');
    onClose();
  };
  return (
    <Modal open title="Alihkan tugas" onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={go} disabled={!userId}>Alihkan</Btn></>}>
      <p className="text-sm text-slate-600">{task.title}</p>
      <Field label={`Alihkan ke (${task.assigneeRole})`} required>
        <Select value={userId} onChange={e => setUserId(e.target.value)}>
          <option value="">– pilih –</option>
          {state.users.filter(u => u.active && u.roles.includes(task.assigneeRole) && u.id !== task.assigneeUserId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      </Field>
      <p className="text-[11px] text-slate-500">Eskalasi tidak memindahkan tugas; mengalihkan berarti mengganti pemiliknya dan tercatat di audit log.</p>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

const REASON: Record<TaskReason, string | null> = {
  milik: null,
  peran: 'Untuk peran Anda',
  'eskalasi-kepala': 'Eskalasi: Anda kepala divisi',
  'eskalasi-bod': 'Eskalasi ke BOD',
  wakil: 'Sebagai wakil BOD (atas nama BOD)',
};

/** Dokumen yang dirujuk tugas: nomor, klien, site, dan alasan singkat (bila ada). */
const useTaskContext = (task: Task) => {
  const { lookups, state } = useStore();
  let number: string | undefined, clientId: string | undefined, siteId: string | undefined, why: string | undefined;
  if (task.refType === 'fpk') {
    const f = lookups.fpk.get(task.refId);
    if (f) {
      const v = latest(f);
      number = f.number; clientId = v.clientId; siteId = v.siteId;
      if (task.kind === 'perbaiki_fpk' && f.returned) why = `${f.returned.fromDivision ?? 'Pemeriksa'}: ${f.returned.reason}`;
    }
  } else if (task.refType === 'spk') {
    const sp = lookups.spk.get(task.refId);
    if (sp) {
      number = sp.number; clientId = sp.clientId; siteId = sp.siteId;
      if (task.kind === 'urus_spk_salah' && sp.revisionReason) why = `Finance: ${sp.revisionReason}`;
    }
  } else if (task.refType === 'memo') {
    const m = state.memos.find(x => x.id === task.refId);
    const sp = m && lookups.spk.get(m.spkId);
    number = m?.number; if (sp) { clientId = sp.clientId; siteId = sp.siteId; number = number ?? sp.number; }
  } else if (task.refType === 'site') {
    const st = lookups.site.get(task.refId);
    if (st) { siteId = st.id; clientId = st.clientId; }
  }
  const client = clientId ? lookups.client.get(clientId)?.name : undefined;
  const site = siteId ? lookups.site.get(siteId)?.name : undefined;
  return { number, client, site, why };
};

/** Judul kartu = dokumennya; aksinya ada di tombol. */
const headline = (task: Task, number?: string) => {
  if (!number) return task.title;
  if (task.kind === 'perbaiki_fpk') return `${number} dikembalikan`;
  if (task.kind === 'urus_spk_salah') return `${number} perlu revisi`;
  if (task.kind === 'kejar_spk') return `${number} jalan tanpa SPK`;
  return `${TASK_KIND_LABEL[task.kind]} · ${number}`;
};

export const TaskCard: React.FC<{ task: Task; reason: TaskReason; esc: Escalation; waiting?: string | null }> = ({ task, reason, esc, waiting }) => {
  const { lookups, me, taskCtx, state } = useStore();
  const ctx = useTaskContext(task);
  // Kejar SPK: bila SPK sudah diinput dan menunggu Finance, Marketing tidak perlu input lagi
  const pendingSpk = task.kind === 'kejar_spk'
    ? state.spks.find(s => s.fpkId === task.refId && s.status === 'diinput')
    : undefined;
  const [modal, setModal] = useState<'done' | 'move' | 'intervene' | null>(null);
  const escalated = reason === 'eskalasi-kepala' || reason === 'eskalasi-bod';
  const taskArea = taskCtx.areaOf(task);
  const scoped = task.assigneeRole === 'Operasional' || task.assigneeRole === 'PIC Area';
  // Penerima eskalasi yang bukan pelaksana aslinya cukup melihat dokumen lalu turun tangan atau mengalihkan.
  const canAct = !escalated || (me.roles.includes(task.assigneeRole) && !OWNER_ONLY.includes(task.kind) && (!scoped || !taskArea || me.areaIds.includes(taskArea)));
  const startFpk = task.kind === 'mulai_jaga' ? lookups.fpk.get(task.refId) : undefined;
  const notYet = !!startFpk && diffDays(TODAY, latest(startFpk).plannedStart) > 0;
  const daysLeft = diffDays(TODAY, task.dueAt);
  const canMove = task.assigneeRole !== 'BOD' && (reason === 'eskalasi-kepala' || reason === 'eskalasi-bod' || me.headOf.includes(escalationHeadRole(task.assigneeRole)) || me.roles.includes('BOD'));
  const owner = task.assigneeUserId ? lookups.user.get(task.assigneeUserId)?.name : `semua ${task.assigneeRole}`;
  const target = pendingSpk ? `/spk/${pendingSpk.id}`
    : task.kind === 'kejar_spk' ? `/spk/input?fpk=${task.refId}`
    : task.kind === 'urus_spk_salah' ? `/spk/${task.refId}/revisi`
    : task.kind === 'memo' && task.refType === 'spk' ? `/memo/baru?spk=${task.refId}`
    : task.kind === 'input_spk_perpanjangan' || task.kind === 'spk_berakhir_jaga' ? `/spk/input?induk=${task.refId}`
    : refLink(task);
  // Hitung mundur eskalasi: naik sehari setelah batas
  const escTo = BOD_DIRECT_KINDS.includes(task.kind) ? 'BOD' : task.assigneeRole === 'BOD' ? 'wakil BOD' : `kepala ${escalationHeadRole(task.assigneeRole)}`;
  const escIn = daysLeft + 1;
  const sub = [ctx.client, ctx.site].filter(Boolean).join(' · ');
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <>
      <div
        role="button" tabIndex={0}
        onClick={() => navigate(canAct ? target : refLink(task))}
        onKeyDown={e => { if (e.key === 'Enter') navigate(canAct ? target : refLink(task)); }}
        className={cx('bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
          esc.overdue ? 'border-rose-300 hover:border-rose-400' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50',
          waiting && 'opacity-75')}
      >
        <div className="min-w-0 flex-1">
          {(REASON[reason] || esc.label) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {REASON[reason] && <Badge tone={reason === 'wakil' ? 'violet' : 'amber'}><CornerDownRight className="w-3 h-3" />{REASON[reason]}</Badge>}
              {esc.label && <Badge tone="red"><AlertTriangle className="w-3 h-3" />{esc.label}</Badge>}
            </div>
          )}
          <div className="text-sm font-semibold text-slate-900">{headline(task, ctx.number)}</div>
          {sub && <div className="text-[13px] text-slate-500 mt-0.5">{sub}</div>}
          {ctx.why && <div className="text-[13px] text-slate-700 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5 mt-2 line-clamp-2">{ctx.why}</div>}
          {waiting && <div className="text-[13px] text-slate-600 mt-1">{waiting}</div>}
          {task.interventions?.map((x, i) => (
            <div key={i} className="text-xs text-violet-800 bg-violet-50 rounded-md px-2 py-1 mt-1.5">
              Turun tangan {lookups.user.get(x.by)?.name}: {x.note} · target baru {fmtDate(x.newDue)}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            <span className={cx('inline-flex items-center gap-1 font-semibold', esc.overdue ? 'text-rose-600' : daysLeft <= 1 ? 'text-amber-600' : 'text-slate-600')}>
              <Clock className="w-3.5 h-3.5" />
              Batas {fmtDate(task.dueAt)}
              {esc.overdue ? ` · lewat ${esc.daysLate} hari` : daysLeft === 0 ? ' · hari ini' : daysLeft === 1 ? ' · besok' : ''}
            </span>
            {!esc.overdue && !waiting && <span>Eskalasi ke {escTo} {escIn === 1 ? 'besok' : `dalam ${escIn} hari`}</span>}
            {reason !== 'milik' && <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" />Pemilik: {owner}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0 self-start sm:self-center">
          {canMove && <Btn size="sm" variant="ghost" icon={<Shuffle className="w-3.5 h-3.5" />} onClick={stop(() => setModal('move'))}>Alihkan</Btn>}
          {escalated && <Btn size="sm" variant="secondary" icon={<Hand className="w-3.5 h-3.5" />} onClick={stop(() => setModal('intervene'))}>Turun tangan</Btn>}
          {canAct && MANUAL_KINDS.includes(task.kind) && <Btn size="sm" variant="success" icon={<CheckSquare className="w-3.5 h-3.5" />} onClick={stop(() => setModal('done'))}>Selesaikan</Btn>}
          {canAct
            ? <Btn size="sm" variant={MANUAL_KINDS.includes(task.kind) || notYet || pendingSpk ? 'secondary' : 'primary'} onClick={stop(() => navigate(target))} icon={<ArrowRight className="w-3.5 h-3.5" />}>
              {notYet ? `Mulai ${fmtDate(latest(startFpk!).plannedStart)}` : pendingSpk ? 'Lihat SPK' : ACTION_LABEL[task.kind] ?? 'Buka'}
            </Btn>
            : <Btn size="sm" variant="secondary" onClick={stop(() => navigate(refLink(task)))} icon={<Eye className="w-3.5 h-3.5" />}>Lihat dokumen</Btn>}
        </div>
      </div>
      {modal === 'done' && <CompleteModal task={task} onClose={() => setModal(null)} />}
      {modal === 'move' && <ReassignModal task={task} onClose={() => setModal(null)} />}
      {modal === 'intervene' && <InterveneModal task={task} onClose={() => setModal(null)} />}
    </>
  );
};

type Item = { task: Task; reason: TaskReason | null; esc: Escalation };

const Group: React.FC<{ title: string; tone?: 'red'; items: Item[]; waiting?: (t: Task) => string | null }> = ({ title, tone, items, waiting }) => {
  if (!items.length) return null;
  return (
    <section>
      <h2 className={cx('text-xs font-semibold uppercase tracking-wide mb-2', tone === 'red' ? 'text-rose-600' : 'text-slate-500')}>
        {title} <span className="font-normal">({items.length})</span>
      </h2>
      <div className="space-y-2.5">
        {items.map(x => <TaskCard key={x.task.id} task={x.task} reason={x.reason!} esc={x.esc} waiting={waiting?.(x.task)} />)}
      </div>
    </section>
  );
};

export const TasksPage: React.FC = () => {
  const { myTasks, me, state } = useStore();
  const [tab, setTab] = useState('tugas');
  const waiting = (t: Task) => waitingOn(t, state.spks);
  const active = myTasks.filter(x => !waiting(x.task));
  const waitingList = myTasks.filter(x => waiting(x.task));
  const escalated = myTasks.filter(x => x.reason !== 'milik' && x.reason !== 'peran');
  // Tab eskalasi hanya untuk yang bisa menerima eskalasi (kepala divisi, BOD, wakil BOD)
  const receivesEscalation = me.headOf.length > 0 || has(me, 'BOD') || isDeputy(me, state.delegations);
  const done = state.tasks.filter(t => t.status === 'selesai' && t.doneBy === me.id)
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));

  const left = (x: Item) => diffDays(TODAY, x.task.dueAt);
  const groups = [
    { title: 'Lewat batas', tone: 'red' as const, items: active.filter(x => x.esc.overdue) },
    { title: 'Hari ini & besok', items: active.filter(x => !x.esc.overdue && left(x) <= 1) },
    { title: 'Minggu ini', items: active.filter(x => !x.esc.overdue && left(x) > 1 && left(x) <= 7) },
    { title: 'Nanti', items: active.filter(x => !x.esc.overdue && left(x) > 7) },
  ];

  return (
    <div>
      <PageHeader
        title="Tugas Saya"
        subtitle="Pekerjaan yang menunggu tindakan Anda, urut dari batas terdekat."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'tugas', label: `Perlu dikerjakan (${active.length})` },
          ...(receivesEscalation ? [{ key: 'eskalasi', label: `Eskalasi ke saya (${escalated.length})` }] : []),
          { key: 'selesai', label: `Selesai (${done.length})` },
        ]}
      />

      {tab === 'tugas' && (
        <div className="space-y-6">
          {groups.map(g => <Group key={g.title} title={g.title} tone={g.tone} items={g.items} />)}
          {active.length === 0 && (
            <Card><Empty title="Tidak ada tugas yang perlu dikerjakan.">Coba ganti user simulasi di kanan atas untuk melihat tugas peran lain.</Empty></Card>
          )}
          <Group title="Menunggu pihak lain" items={waitingList} waiting={waiting} />
        </div>
      )}

      {tab === 'eskalasi' && (
        <div className="space-y-2.5">
          {escalated.map(x => <TaskCard key={x.task.id} task={x.task} reason={x.reason!} esc={x.esc} waiting={waiting(x.task)} />)}
          {escalated.length === 0 && <Card><Empty title="Tidak ada eskalasi ke Anda." /></Card>}
        </div>
      )}

      {tab === 'selesai' && (
        <Card pad={false}>
          <div className="divide-y divide-slate-100">
            {done.map(t => (
              <div key={t.id} role="button" tabIndex={0} onClick={() => navigate(refLink(t))}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-800 truncate">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{TASK_KIND_LABEL[t.kind]}{t.doneAt && ` · selesai ${fmtDate(t.doneAt)}`}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
          {done.length === 0 && <Empty title="Belum ada tugas yang Anda selesaikan." />}
        </Card>
      )}
    </div>
  );
};
