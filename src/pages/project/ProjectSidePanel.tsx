// Quick view Project: side modal dari kanan dengan isi ringkas halaman detail Project.
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, DollarSign, Calendar, FileText, FileCheck2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/store';
import { ActivityLog, AttachmentChip, Badge, Btn, Money, StatusChip, Tabs, toast, useAnimatedClose, PanelTopBar, Stepper, stepWindow } from '../../ui/kit';
import { navigate } from '../../router';
import { PERSONNEL_STATUS, SPK_STATUS } from '../../domain/labels';
import type { Attachment } from '../../domain/types';

type TabKey = 'overview' | 'personel' | 'dokumen' | 'lampiran' | 'log';
import { currentPlacement, latest, spkHeadcount, fpkHeadcount } from '../../domain/selectors';
import { diffDays, fmtDate, TODAY } from '../../domain/time';
import { SummaryCard, InfoCard, InfoRow, CopyBtn, ProjectBanner, ProjectChip, ProjectActionCell } from './projectUi';
import { projectStatus, type ProjectStatus } from '../../domain/project';
import { settingNum } from '../../domain/settings';
import { projectActivity } from '../../domain/activity';
import { getFpkStatusDisplay } from '../fpk/FpkList';

/** Baris dokumen yang bisa diklik (bukan <button>, karena chip status di dalamnya juga tombol). */
const DocRow: React.FC<{ onOpen: () => void; children: React.ReactNode }> = ({ onOpen, children }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={e => { if (!(e.target as HTMLElement).closest('button')) onOpen(); }}
    onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
    className="w-full flex items-center justify-between gap-2 py-2 text-left hover:bg-slate-50 rounded px-1 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300"
  >
    {children}
  </div>
);

const Section: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="border border-slate-200 rounded-xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export const ProjectSidePanel: React.FC<{ siteId: string; onClose: () => void }> = ({ siteId, onClose }) => {
  const { state, lookups, access, me, myTasks } = useStore();
  const { closing, close } = useAnimatedClose(onClose);
  const [tab, setTab] = useState<TabKey>('overview');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const site = lookups.site.get(siteId);
  if (!site) return null;
  const client = lookups.client.get(site.clientId);
  const area = lookups.area.get(site.areaId);
  const picArea = lookups.user.get(area?.picUserId ?? '');
  const owner = lookups.user.get(client?.accountOwnerId ?? '');

  // Dokumen project
  const fpks = state.fpks.filter(f => latest(f).siteId === site.id);
  const spks = state.spks.filter(s => s.siteId === site.id);
  const activeSpk = spks.find(s => s.status === 'aktif') ?? spks[0];
  const mainFpk = fpks.find(f => !['selesai', 'batal', 'ditolak'].includes(f.status)) ?? fpks[fpks.length - 1];
  const mainFpkVer = mainFpk ? latest(mainFpk) : undefined;

  // Nilai & periode: dari SPK aktif, kalau belum ada pakai FPK
  const refSpk = activeSpk?.status === 'aktif' ? activeSpk : undefined;
  const monthlyValue = refSpk ? refSpk.monthlyValue : (mainFpkVer?.monthlyValue ?? 0);
  const periodStart = refSpk ? refSpk.periodStart : (mainFpkVer?.periodStart ?? '');
  const periodEnd = refSpk ? refSpk.periodEnd : (mainFpkVer?.periodEnd ?? '');
  const days = periodStart && periodEnd ? diffDays(periodStart, periodEnd) + 1 : 0;
  const durationMonths = days > 0 ? Math.round(days / 30.4) : 0;
  const daysLeft = periodEnd ? diffDays(TODAY, periodEnd) : 0;
  const endsIn = daysLeft < 0 ? 'sudah berakhir' : daysLeft <= 60 ? `berakhir ${daysLeft} hari lagi` : `berakhir ${Math.round(daysLeft / 30.4)} bulan lagi`;

  // Status FPK sama dengan chip di daftar
  const minMargin = settingNum(state.settings, 'margin.minimum_pct', 10);
  const mine = new Set(myTasks.filter(x => x.task.refType === 'fpk').map(x => x.task.refId));
  const fpkStatus = mainFpk ? getFpkStatusDisplay(mainFpk, state, lookups, me, mine, minMargin) : null;
  const statusSpk = spks.find(s => s.status === 'perlu_revisi') ?? spks.find(s => s.status === 'diinput') ?? activeSpk;

  // Tim di lapangan
  const personnel = state.personnel.filter(p => {
    const pl = currentPlacement(p);
    return pl && pl.siteId === site.id && p.status === 'aktif';
  });
  const isDanru = (posId: string) => {
    const pos = lookups.position.get(posId);
    const t = `${pos?.code ?? ''} ${pos?.name ?? ''}`.toLowerCase();
    return t.includes('danru') || t.includes('komandan') || t.includes('chief');
  };
  const danrus = personnel.filter(p => isDanru(p.positionId));
  const needed = mainFpkVer ? mainFpkVer.lines.reduce((n, l) => n + l.qty, 0) : 0;
  const short = needed > personnel.length ? needed - personnel.length : 0;

  // Lampiran dari semua versi FPK dan PDF SPK
  const attachments: { att: Attachment; source: string }[] = [];
  fpks.forEach(f => f.versions.forEach(v => v.attachments.forEach(a => {
    if (!attachments.some(x => x.att.id === a.id)) attachments.push({ att: a, source: f.number });
  })));
  spks.forEach(x => { if (x.pdf && !attachments.some(y => y.att.id === x.pdf.id)) attachments.push({ att: x.pdf, source: x.number }); });

  const copy = (val: string, label: string) => {
    navigator.clipboard?.writeText(val);
    toast(`${label} disalin`);
  };

  const openFull = (q = '') => navigate(`/project/${site.id}${q}`);
  const ps = projectStatus(site, state);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={`Ringkasan ${site.name}`}>
      <div className="drawer-backdrop fixed inset-0 bg-slate-900/20" data-closing={closing} onClick={close} />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="drawer-panel w-screen sm:w-[520px] lg:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10" data-closing={closing}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 space-y-2">
            <PanelTopBar onClose={close} fullHref={`/project/${site.id}`} />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{site.name}</h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-slate-500">
                <span className="font-mono text-[13px] text-slate-500">PRJ-{site.code}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700">{client?.name}</span>
                <span className="text-slate-300">·</span>
                <span>{area?.name}</span>
                <span className="ml-1"><ProjectChip ps={ps} /></span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Tahap project: 1 sebelumnya, saat ini, 2 berikutnya */}
            {(() => { const w = stepWindow(ps.steps, ps.stage); return <Stepper steps={w.steps} current={w.current} warn={ps.warn} compact />; })()}
            <ProjectBanner ps={ps} />
            {!ps.banner && <PanelAction ps={ps} />}

            {/* Ringkasan: komponen kartu yang sama dengan halaman detail */}
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard icon={DollarSign} label="Nilai kontrak / bulan"
                value={monthlyValue ? <Money value={monthlyValue} clientId={site.clientId} /> : '–'}
                valueClass="text-base"
                sub={durationMonths > 0 ? <>Est. {durationMonths} bln: <Money value={monthlyValue * durationMonths} clientId={site.clientId} /></> : 'Sebelum PPN'}
              />
              <SummaryCard icon={Calendar} label="Periode"
                value={periodStart ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}` : '–'}
                valueClass="text-base"
                sub={days > 0 ? `${days} hari · ${endsIn}` : undefined}
              />
              <SummaryCard icon={FileText} label="Status FPK"
                onClick={mainFpk ? () => openFull(`?doc=${mainFpk.number.replace(/\//g, '-')}`) : undefined}
                value={fpkStatus ? <StatusChip tone={fpkStatus.tone} label={fpkStatus.label} hint={fpkStatus.hint} /> : <Badge tone="slate">Belum ada FPK</Badge>}
                sub={mainFpk ? <span className="font-mono text-slate-700">{mainFpk.number}</span> : undefined}
              />
              <SummaryCard icon={FileCheck2} label="Status SPK"
                onClick={statusSpk ? () => openFull(`?doc=${statusSpk.number.replace(/\//g, '-')}`) : undefined}
                value={statusSpk ? <Badge tone={SPK_STATUS[statusSpk.status].tone}>{SPK_STATUS[statusSpk.status].label}</Badge> : <Badge tone="slate">Belum ada SPK</Badge>}
                sub={statusSpk ? <span className="font-mono text-slate-700">{statusSpk.number}</span> : undefined}
              />
            </div>

            {/* Tab bar tetap menempel di atas saat isi panel di-scroll */}
            <div className="sticky -top-5 z-10 bg-white -mx-5 px-5 pt-3 -mt-1">
              <Tabs
                value={tab}
                onChange={k => setTab(k as TabKey)}
                tabs={[
                  { key: 'overview', label: 'Overview' },
                  { key: 'personel', label: `Personel (${personnel.length})` },
                  { key: 'dokumen', label: `Dokumen (${fpks.length + spks.length})` },
                  { key: 'lampiran', label: `Lampiran (${attachments.length})` },
                  { key: 'log', label: 'Log' },
                ]}
              />
            </div>

            {tab === 'overview' && (
              <div className="space-y-4">
              {/* Sama dengan kartu Overview di halaman detail */}
              <InfoCard title="Lokasi & tim JISS">
                <InfoRow label="Alamat">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`} target="_blank" rel="noopener noreferrer" className="group text-slate-800 hover:text-slate-950 hover:underline underline-offset-2" title="Buka di peta">
                    {site.address}
                    <span className="ml-2 whitespace-nowrap text-[13px] font-medium text-slate-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 transition-opacity">Buka peta ↗</span>
                  </a>
                </InfoRow>
                <hr className="border-slate-100" />
                <InfoRow label="Bertugas">
                  {personnel.length} personel
                  {short > 0 && <span className="text-rose-600 font-medium"> · kurang {short}</span>}
                  <button type="button" onClick={() => setTab('personel')} aria-label="Lihat semua personel" title="Lihat semua personel" className="ml-1.5 inline-flex align-middle p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"><ArrowRight className="w-4 h-4" /></button>
                </InfoRow>
                <InfoRow label="Danru">
                  {danrus.length ? danrus.map(d => <div key={d.id}>{d.name}</div>) : <span className="text-slate-400">Belum ada</span>}
                </InfoRow>
                <InfoRow label="PIC area">{picArea?.name ?? '–'}</InfoRow>
                <InfoRow label="Account owner">{owner?.name ?? '–'}</InfoRow>
              </InfoCard>

              <InfoCard title="Klien">
                <InfoRow label="PIC klien">{client?.picContact?.replace(/\s*\(([^)]+)\)/, ' · $1') || <span className="text-slate-400">Belum ada kontak PIC</span>}</InfoRow>
                <InfoRow label="Telepon">
                  <span className="inline-flex items-center gap-1.5">
                    {client?.picPhone || '–'}
                    {client?.picPhone && <CopyBtn label="Salin nomor telepon" onClick={() => copy(client.picPhone!, 'Nomor telepon')} />}
                  </span>
                </InfoRow>
                <InfoRow label="Email">
                  <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                    <span className="truncate">{client?.picEmail || '–'}</span>
                    {client?.picEmail && <CopyBtn label="Salin email" onClick={() => copy(client.picEmail!, 'Email')} />}
                  </span>
                </InfoRow>
                <InfoRow label="Termin bayar">{client?.termDays ? `${client.termDays} hari` : '30 hari'}</InfoRow>
              </InfoCard>

              </div>
            )}

            {tab === 'personel' && (
              <Section title="Personel bertugas">
                {personnel.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada personel di site ini.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {[...personnel].sort((a, b) => Number(isDanru(b.positionId)) - Number(isDanru(a.positionId))).map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500">{lookups.position.get(p.positionId)?.name} · <span className="font-mono">{p.employeeNo}</span></div>
                        </div>
                        <Badge tone={PERSONNEL_STATUS[p.status].tone}>{PERSONNEL_STATUS[p.status].label}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {tab === 'dokumen' && (
              <>
              {/* Dokumen kontrak */}
              <Section title={`Dokumen kontrak (${fpks.length + spks.length})`}>
                {fpks.length + spks.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada dokumen.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {fpks.map(f => {
                      const st = getFpkStatusDisplay(f, state, lookups, me, mine, minMargin);
                      return (
                        <DocRow key={f.id} onOpen={() => openFull(`?doc=${f.number.replace(/\//g, '-')}`)}>
                          <span>
                            <span className="font-mono text-sm text-slate-900">{f.number}</span>
                            <span className="block text-xs text-slate-500">{fpkHeadcount(f)} orang</span>
                          </span>
                          <StatusChip tone={st.tone} label={st.label} hint={st.hint} />
                        </DocRow>
                      );
                    })}
                    {spks.map(s => (
                      <DocRow key={s.id} onOpen={() => openFull(`?doc=${s.number.replace(/\//g, '-')}`)}>
                        <span>
                          <span className="font-mono text-sm text-slate-900">{s.number}</span>
                          <span className="block text-xs text-slate-500">{spkHeadcount(s)} orang · s/d {fmtDate(s.periodEnd)}</span>
                        </span>
                        <Badge tone={SPK_STATUS[s.status].tone}>{SPK_STATUS[s.status].label}</Badge>
                      </DocRow>
                    ))}
                  </div>
                )}
              </Section>

              </>
            )}

            {tab === 'lampiran' && (
              <Section title="Lampiran FPK & SPK">
                {attachments.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada lampiran.</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map(x => (
                      <div key={x.att.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <AttachmentChip a={x.att} clientId={site.clientId} />
                        <span className="text-[11px] text-slate-500 shrink-0">{x.source}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {tab === 'log' && (
              <>
              {/* Log aktivitas (paling bawah) */}
              <Section title="Log aktivitas">
                <ActivityLog
                  items={projectActivity(site, fpks, state.spks, state.audit, access.money(site.clientId))}
                  onOpenDoc={doc => {
                    const num = doc.type === 'fpk' ? lookups.fpk.get(doc.id)?.number : lookups.spk.get(doc.id)?.number;
                    openFull(num ? `?doc=${num.replace(/\//g, '-')}` : '');
                  }}
                  empty="Belum ada aktivitas di project ini."
                />
              </Section>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

/** Tindakan berikutnya tanpa banner (tidak ada masalah): satu baris ringkas. */
const PanelAction: React.FC<{ ps: ProjectStatus }> = ({ ps }) => {
  if (!ps.action) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5">
      <span className="text-[13px] text-slate-500">Berikutnya</span>
      <ProjectActionCell ps={ps} />
    </div>
  );
};
