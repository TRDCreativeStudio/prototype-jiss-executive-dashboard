// Quick view Project: side modal dari kanan dengan isi ringkas halaman detail Project.
import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/store';
import { ActivityLog, AttachmentChip, Badge, Btn, Money, StatusChip, Tabs, toast, useAnimatedClose } from '../../ui/kit';
import { navigate } from '../../router';
import { PERSONNEL_STATUS, SPK_STATUS } from '../../domain/labels';
import type { Attachment } from '../../domain/types';

type TabKey = 'overview' | 'personel' | 'dokumen' | 'lampiran' | 'log';
import { currentPlacement, latest, spkHeadcount, fpkHeadcount } from '../../domain/selectors';
import { diffDays, fmtDate } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import { projectActivity } from '../../domain/activity';
import { getFpkStatusDisplay } from '../fpk/FpkList';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start text-sm">
    <span className="w-[112px] shrink-0 text-[13px] text-slate-500 pt-0.5">{label}</span>
    <div className="min-w-0 flex-1 text-slate-800">{children}</div>
  </div>
);

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
  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</div>
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
  const monthlyValue = activeSpk ? activeSpk.monthlyValue : (mainFpkVer?.monthlyValue ?? 0);
  const periodStart = activeSpk ? activeSpk.periodStart : (mainFpkVer?.periodStart ?? '');
  const periodEnd = activeSpk ? activeSpk.periodEnd : (mainFpkVer?.periodEnd ?? '');
  const days = periodStart && periodEnd ? diffDays(periodStart, periodEnd) + 1 : 0;

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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={`Ringkasan ${site.name}`}>
      <div className="drawer-backdrop fixed inset-0 bg-slate-900/20" data-closing={closing} onClick={close} />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="drawer-panel w-screen sm:w-[520px] lg:w-[40vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10" data-closing={closing}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{site.name}</h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-slate-500">
                <span className="font-mono font-bold text-slate-950 bg-amber-400 px-1.5 py-0.5 rounded text-[11px]">PRJ-{site.code}</span>
                <span>{client?.name}</span>
                <span className="text-slate-300">·</span>
                <span>{area?.name}</span>
              </div>
            </div>
            <button type="button" onClick={close} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" aria-label="Tutup panel">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Ringkasan: sama dengan 4 kartu di halaman detail */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-xs text-slate-500">Nilai / bulan</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{monthlyValue ? <Money value={monthlyValue} clientId={site.clientId} /> : '–'}</div>
              </div>
              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-xs text-slate-500">Periode</div>
                <div className="text-sm font-semibold text-slate-900 mt-1">{periodStart ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}` : '–'}</div>
                {days > 0 && <div className="text-[11px] text-slate-400">{days} hari</div>}
              </div>
              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1.5">Status FPK</div>
                {fpkStatus ? <StatusChip tone={fpkStatus.tone} label={fpkStatus.label} hint={fpkStatus.hint} /> : <Badge tone="slate">Tanpa FPK</Badge>}
              </div>
              <div className="border border-slate-200 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1.5">Status SPK</div>
                {statusSpk ? <Badge tone={SPK_STATUS[statusSpk.status].tone}>{SPK_STATUS[statusSpk.status].label}</Badge> : <Badge tone="slate">Belum ada SPK</Badge>}
              </div>
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
              {/* Lokasi & tim JISS */}
              <Section title="Lokasi & tim JISS">
                <div className="space-y-2.5">
                  <Row label="Alamat">
                    {site.address}
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-xs font-medium text-indigo-600 hover:underline whitespace-nowrap">Buka di peta ↗</a>
                  </Row>
                  <Row label="Kode site"><span className="font-mono text-xs">{site.code}</span></Row>
                  <hr className="border-slate-100" />
                  <Row label="Bertugas">
                    {personnel.length} personel
                    {short > 0 && <span className="text-rose-600 font-medium"> · kurang {short}</span>}
                  </Row>
                  <Row label="Danru">
                    {danrus.length ? danrus.map(d => <div key={d.id}>{d.name}</div>) : <span className="text-slate-400">Belum ada</span>}
                  </Row>
                  <Row label="PIC area">{picArea?.name ?? '–'}</Row>
                  <Row label="Account owner">{owner?.name ?? '–'}</Row>
                </div>
              </Section>

              {/* Klien */}
              <Section title="Klien">
                <div className="space-y-2.5">
                  <Row label="PIC klien">{client?.picContact?.replace(/\s*\(([^)]+)\)/, ' · $1') || <span className="text-slate-400">Belum ada kontak PIC</span>}</Row>
                  <Row label="Telepon">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px]">{client?.picPhone || '–'}</span>
                      {client?.picPhone && <button type="button" onClick={() => copy(client.picPhone!, 'Nomor telepon')} className="text-xs font-medium text-indigo-600 hover:underline">Salin</button>}
                    </div>
                  </Row>
                  <Row label="Email">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px] truncate">{client?.picEmail || '–'}</span>
                      {client?.picEmail && <button type="button" onClick={() => copy(client.picEmail!, 'Email')} className="text-xs font-medium text-indigo-600 hover:underline">Salin</button>}
                    </div>
                  </Row>
                  <Row label="Termin bayar">{client?.termDays ? `${client.termDays} hari` : '30 hari'}</Row>
                </div>
              </Section>

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

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex justify-end">
            <Btn size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />} onClick={() => openFull()}>
              Buka Halaman Penuh
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};
