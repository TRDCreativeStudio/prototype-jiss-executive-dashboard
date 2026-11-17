import React, { useState } from 'react';
import { AlertTriangle, Pencil, Send, FilePlus2, Ban, Undo2, Timer, Plus, Wallet, Users, CalendarDays, CalendarCheck } from 'lucide-react';
import { useStore } from '../../store/store';
import { Stepper, AttachmentChip, Badge, Btn, Card, Money, PageHeader, Table, Td, cx, toast, Tr, CellMain, CellSub, CellCode, TableEmpty, StatusChip, SummaryCard, ActivityLog } from '../../ui/kit';
import { fpkActivity } from '../../domain/activity';
import { LINK, ProjectLinkCard } from '../project/projectUi';
import { ReasonModal } from '../../ui/ReasonModal';
import { Link, navigate } from '../../router';
import { NotFound } from '../Misc';
import { FPK_TYPE, SOURCE_LABEL, SPK_STATUS } from '../../domain/labels';
import { fpkCoverage, latest, withoutSpkList } from '../../domain/selectors';
import { diffDays, fmtDate, fmtDateTime, TODAY } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import { has, isDeputy } from '../../domain/rbac';
import { FpkActionPanel } from './FpkActionPanel';
import { FpkPeople } from './FpkPeople';
import { DivisionChecks, fpkStepProps, getFpkStatusDisplay } from './FpkList';

export const FpkDetailPage: React.FC<{ id: string }> = ({ id }) => {
  const { state, lookups, access, me, actions, myTasks } = useStore();
  const f = lookups.fpk.get(id);
  const [viewNo, setViewNo] = useState<number | null>(null);
  const [modal, setModal] = useState<'batal' | 'batal-draf' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  if (!f) return <NotFound what="FPK" />;
  const cur = latest(f);
  const site = lookups.site.get(cur.siteId);
  if (!site || !access.area(site.areaId)) return <NotFound what="FPK" />;
  const v = f.versions.find(x => x.no === (viewNo ?? cur.no)) ?? cur;
  const isOld = v.no !== cur.no;
  const client = lookups.client.get(v.clientId);
  const area = lookups.area.get(site.areaId);
  const isOwner = !!client && (client.accountOwnerId === me.id || client.coOwnerIds.includes(me.id));
  const cov = fpkCoverage(f, state.spks);
  const spks = state.spks.filter(s => s.fpkId === f.id);
  const pendingSpk = spks.find(x => x.status === 'diinput' || x.status === 'perlu_revisi');
  const ws = withoutSpkList([f], state.spks, state.sites)[0];
  const bodLike = has(me, 'BOD') || isDeputy(me, state.delegations);
  const seeMargin = bodLike || has(me, 'Finance');
  const userName = (uid?: string) => (uid ? lookups.user.get(uid)?.name : undefined) ?? '–';

  // Chip status sama dengan daftar & side modal
  const minMargin = settingNum(state.settings, 'margin.minimum_pct', 10);
  const mine = new Set(myTasks.filter(x => x.task.refType === 'fpk').map(x => x.task.refId));
  const st = getFpkStatusDisplay(f, state, lookups, me, mine, minMargin);

  // Ringkasan
  const totalPeople = v.lines.reduce((n, l) => n + l.qty, 0);
  const shiftCount = new Set(v.lines.map(l => l.shift)).size;
  const days = v.periodStart && v.periodEnd ? diffDays(v.periodStart, v.periodEnd) + 1 : 0;
  const runningDays = f.startedAt ? diffDays(f.startedAt, TODAY) + 1 : 0;

  // Aksi utama (kanan atas)
  const canInputSpk = access.can('spk.input') && isOwner && !pendingSpk && ['disetujui', 'berjalan', 'tertutup_sebagian'].includes(f.status);
  const showSpkCard = access.can('spk.view') && (spks.length > 0 || ['disetujui', 'berjalan', 'tertutup_sebagian', 'selesai'].includes(f.status));
  const hasSources = v.lines.some(l => l.sources.length > 0);

  const coverChip = (covered: number, qty: number) =>
    covered >= qty ? <Badge tone="green">Lengkap</Badge> : covered > 0 ? <Badge tone="amber">{covered} dari {qty}</Badge> : <Badge tone="slate">Belum</Badge>;

  return (
    <div className="space-y-5">
      <PageHeader
        back="/fpk"
        title={f.number}
        subtitle={
          <span className="block">
            <span className="flex flex-wrap items-center gap-2">
              <StatusChip tone={st.tone} label={st.label} hint={st.hint} />
              <span className="text-slate-800">
                {client?.name}<span className="text-slate-300 mx-1.5">·</span>{site.name}
                {area && <span className="text-slate-500"><span className="text-slate-300 mx-1.5">·</span>{area.name}</span>}
              </span>
            </span>
            <span className="block text-[13px] text-slate-500 mt-1">
              {FPK_TYPE[f.type]}
              {f.parentFpkId && <> · induk <Link to={`/fpk/${f.parentFpkId}`} className={LINK}>{lookups.fpk.get(f.parentFpkId)?.number}</Link></>}
              {' '}· v{cur.no} · dibuat {userName(f.createdBy)}, {fmtDate(f.createdAt)}
            </span>
          </span>
        }
        actions={<>
          {f.status === 'draf' && isOwner && <>
            <Btn size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => navigate(`/fpk/${f.id}/ubah`)}>Ubah draf</Btn>
            <Btn size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => { const r = actions.submitFpk(f.id); if (r.ok) toast('Dikirim ke cek 3 divisi'); else toast(r.error, 'err'); }}>Kirim ke cek</Btn>
          </>}
          {f.status === 'dikembalikan' && isOwner && <Btn size="sm" icon={<FilePlus2 className="w-3.5 h-3.5" />} onClick={() => navigate(`/fpk/${f.id}/ubah`)}>Perbaiki → versi {cur.no + 1}</Btn>}
          {f.status === 'draf' && f.createdBy === me.id && <Btn size="sm" variant="ghost" icon={<Ban className="w-3.5 h-3.5" />} onClick={() => setModal('batal-draf')}>Batalkan draf</Btn>}
          {f.status === 'dikembalikan' && f.createdBy === me.id && <Btn size="sm" variant="ghost" icon={<Ban className="w-3.5 h-3.5" />} onClick={() => setModal('batal-draf')}>Batalkan FPK</Btn>}
          {bodLike && !['selesai', 'ditolak', 'batal', 'draf'].includes(f.status) && <Btn size="sm" variant="secondary" icon={<Ban className="w-3.5 h-3.5" />} onClick={() => setModal('batal')}>Batalkan FPK</Btn>}
        </>}
      />

      {/* Posisi alur; dikembalikan tetap tampil dengan tanda kuning */}
      {!['ditolak', 'batal'].includes(f.status) && <Stepper {...fpkStepProps(f)} />}

      {/* Banner hanya untuk tindakan atau masalah */}
      {f.returned && f.status === 'dikembalikan' && (
        <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3">
          <Undo2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Dikembalikan oleh <b>{f.returned.fromDivision}</b> ({userName(f.returned.by)}, {fmtDateTime(f.returned.at)}): {f.returned.reason}</span>
        </div>
      )}
      {f.cancelled && <div className="text-sm bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3">Dibatalkan oleh {userName(f.cancelled.by)}: {f.cancelled.reason}</div>}
      {f.status === 'ditolak' && f.bodDecision && <div className="text-sm bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3">Ditolak BOD{f.bodDecision.note ? `: ${f.bodDecision.note}` : '.'}</div>}
      {f.notFeasible && f.status !== 'menunggu_bod' && <div className="flex items-start gap-2 text-sm bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3"><AlertTriangle className="w-4 h-4 mt-0.5" />Ditandai tidak layak oleh {f.notFeasible.division}: {f.notFeasible.reason}</div>}
      {/* Setelah disetujui, pekerjaan (mulai jaga, SPK, jalan tanpa SPK) berlanjut di Project */}
      {['disetujui', 'berjalan', 'tertutup_sebagian', 'selesai'].includes(f.status) && <ProjectLinkCard siteId={cur.siteId} />}

      {!isOld && <FpkActionPanel f={f} />}

      {/* Versi (hanya bila lebih dari satu) */}
      {f.versions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Versi</span>
          {f.versions.map(x => (
            <button key={x.no} onClick={() => setViewNo(x.no)} className={cx('text-xs font-semibold px-2 py-1 rounded-md border', x.no === v.no ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>v{x.no}</button>
          ))}
          {isOld && <span className="text-[13px] text-amber-700">Versi lama, hanya baca</span>}
        </div>
      )}

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SummaryCard icon={Wallet} label="Nilai / bulan" value={<Money value={v.monthlyValue} clientId={v.clientId} />} sub="sebelum PPN" />
        <SummaryCard icon={Users} label="Personel" value={`${totalPeople} orang`} sub={`${shiftCount} shift`} />
        <SummaryCard icon={CalendarDays} label="Periode kontrak" value={v.periodStart && v.periodEnd ? `${fmtDate(v.periodStart)} – ${fmtDate(v.periodEnd)}` : '–'} sub={days > 0 ? `${days} hari` : undefined} />
        <SummaryCard icon={CalendarCheck} label={f.startedAt ? 'Mulai jaga' : 'Rencana mulai'} value={fmtDate(f.startedAt ?? v.plannedStart)} sub={f.startedAt ? `sudah berjalan ${runningDays} hari` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Card title={`Formasi · ${totalPeople} orang`} pad={false}>
            <Table head={['Jabatan', 'Jumlah', 'Shift', ...(hasSources ? ['Sumber personel'] : []), ...(spks.length ? ['Tertutup SPK'] : [])]}>
              {v.lines.map(l => {
                const c = cov.lines.find(x => x.line.id === l.id);
                return (
                  <Tr key={l.id}>
                    <Td>
                      <CellMain>{lookups.position.get(l.positionId)?.name}</CellMain>
                      {l.notes && <CellSub>Catatan: {l.notes}</CellSub>}
                    </Td>
                    <Td className="tabular-nums">{l.qty}</Td>
                    <Td>{l.shift}</Td>
                    {hasSources && (
                      <Td>
                        {l.sources.length ? l.sources.map((src, i) => (
                          <div key={i}>{src.qty} · {SOURCE_LABEL[src.kind]}{src.kind === 'mutasi' && ` dari ${lookups.area.get(src.fromAreaId ?? '')?.name}${src.fromSiteId ? ` (${lookups.site.get(src.fromSiteId)?.name})` : ''}`}</div>
                        )) : <span className="text-slate-400">–</span>}
                      </Td>
                    )}
                    {spks.length > 0 && <Td>{coverChip(c?.covered ?? 0, l.qty)}</Td>}
                  </Tr>
                );
              })}
            </Table>
          </Card>

          {showSpkCard && (
            <Card title={`SPK terkait (${spks.length})`} pad={false}>
              <Table head={['Nomor', 'Status', 'Periode', 'Orang', 'Nilai/bulan']}>
                {spks.map(s => (
                  <Tr key={s.id} to={`/spk/${s.id}`}>
                    <Td><CellCode>{s.number}</CellCode></Td>
                    <Td className="whitespace-nowrap"><Badge tone={SPK_STATUS[s.status].tone}>{SPK_STATUS[s.status].label}</Badge>{s.invoiceHeld && <Badge tone="red" className="ml-1">invoice ditahan</Badge>}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}</Td>
                    <Td className="tabular-nums">{s.lines.reduce((n, l) => n + l.qty, 0)}</Td>
                    <Td><Money value={s.monthlyValue} clientId={s.clientId} /></Td>
                  </Tr>
                ))}
              </Table>
              {spks.length === 0 && <TableEmpty>Belum ada SPK.</TableEmpty>}
              {spks.length > 0 && <p className="text-[13px] text-slate-500 px-4 py-3 border-t border-slate-100">Tertutup SPK aktif: {cov.done} dari {cov.total} orang.</p>}
              {f.startedAt && spks.filter(s => s.type !== 'perpanjangan' && ['aktif', 'berakhir'].includes(s.status) && diffDays(f.startedAt!, s.periodStart) > 0).map(s => (
                <p key={s.id} className="text-[13px] text-amber-800 bg-amber-50 px-4 py-2 border-t border-amber-100">
                  {s.number}: {diffDays(f.startedAt!, s.periodStart)} hari tidak tertagih (mulai jaga {fmtDate(f.startedAt!)}, periode SPK mulai {fmtDate(s.periodStart)}).
                </p>
              ))}
            </Card>
          )}

          <FpkPeople f={f} />
        </div>

        <div className="space-y-5 min-w-0">
          <Card title="Cek divisi" actions={f.versions.length > 1 && <span className="text-[13px] text-slate-500">versi {v.no}</span>}>
            <DivisionChecks f={f} versionNo={v.no} withNotes showMargin={seeMargin} />
            {f.versions.length > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowHistory(x => !x)} className="text-[13px] font-medium text-slate-600 hover:text-slate-900">
                  {showHistory ? 'Sembunyikan riwayat' : `Lihat riwayat (${f.versions.length - 1} versi sebelumnya)`}
                </button>
                {showHistory && f.versions.filter(x => x.no !== v.no).reverse().map(x => (
                  <div key={x.no} className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Versi {x.no}</div>
                    <DivisionChecks f={f} versionNo={x.no} withNotes showMargin={seeMargin} />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Lampiran">
            <div className="flex flex-col gap-1.5">
              {v.attachments.map(a => <AttachmentChip key={a.id} a={a} clientId={v.clientId} entity="fpk" entityId={f.id} />)}
              {!v.attachments.some(a => a.kind === 'Bukti deal') && <span className="text-xs text-rose-600">Bukti deal belum dilampirkan</span>}
            </div>
          </Card>
          <Card title="Log aktivitas">
            <ActivityLog items={fpkActivity(f, state.spks, state.audit, access.money(v.clientId))} />
          </Card>
        </div>
      </div>

      {modal === 'batal' && (
        <ReasonModal title={`Batalkan ${f.number}`} label="Alasan" confirm="Batalkan FPK" variant="danger"
          hint="Semua tugas terbuka dibatalkan. Bila personel sudah dikerahkan, tugas demobilisasi dibuat untuk Operasional dan HR."
          onClose={() => setModal(null)} onSubmit={t => { const r = actions.cancelFpk(f.id, t); if (r.ok) toast('FPK dibatalkan'); return r; }} />
      )}
      {modal === 'batal-draf' && (
        <ReasonModal title={`Batalkan ${f.number}`} label="Alasan" confirm="Batalkan draf" variant="danger"
          hint="FPK ditandai batal dan tetap tersimpan di riwayat. Tugas perbaikan yang terbuka ikut ditutup."
          onClose={() => setModal(null)} onSubmit={t => { const r = actions.cancelDraft(f.id, t); if (r.ok) toast('FPK dibatalkan'); return r; }} />
      )}
    </div>
  );
};
