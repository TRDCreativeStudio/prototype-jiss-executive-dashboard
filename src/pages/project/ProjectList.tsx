import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useStore } from '../../store/store';
import { Card, ExportBtn, PageHeader, SearchBox, Select, Table, Tabs, Td, exportCsv, Tr, TableEmpty, CellMain, usePaged } from '../../ui/kit';
import { ProjectSidePanel } from './ProjectSidePanel';
import { fmtDate } from '../../domain/time';
import { projectStatus, isProjectSite, type ProjectStatus } from '../../domain/project';
import { ProjectActionCell, ProjectChip } from './projectUi';

type TabKey = 'berjalan' | 'perpanjangan' | 'persiapan' | 'selesai';

// Label filter lebih pendek di layar HP
const useIsMobile = () => {
  const query = '(max-width: 639px)';
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
};

/**
 * Project = pekerjaan di satu site. Tab membagi project menurut tahap kerja,
 * bukan menurut status dokumen (status dokumen ada di halaman FPK / SPK / Memo).
 */
export const ProjectListPage: React.FC<{ initialTab?: TabKey }> = ({ initialTab }) => {
  const isMobile = useIsMobile();
  const { state, lookups, access, me } = useStore();
  const isMarketing = me.roles.includes('Marketing');
  const [tab, setTab] = useState<TabKey>(() => {
    const q = new URLSearchParams(window.location.search).get('tab') as TabKey | null;
    const t = initialTab ?? q;
    return t && ['berjalan', 'perpanjangan', 'persiapan', 'selesai'].includes(t) ? t : 'berjalan';
  });
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [owner, setOwner] = useState<'all' | 'mine'>('all');
  const [periodSort, setPeriodSort] = useState<'asc' | 'desc' | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const changeTab = (k: TabKey) => {
    setTab(k);
    const url = new URL(window.location.href);
    if (k === 'berjalan') url.searchParams.delete('tab'); else url.searchParams.set('tab', k);
    window.history.replaceState(null, '', url.pathname + url.search);
  };

  const isMine = (clientId: string) => { const c = lookups.client.get(clientId); return !!c && (c.accountOwnerId === me.id || c.coOwnerIds.includes(me.id)); };

  // Semua project + tahapnya (satu sumber untuk tab, tabel, dan side modal)
  const all: ProjectStatus[] = state.sites
    .filter(s => access.area(s.areaId) && isProjectSite(s, state))
    .map(s => projectStatus(s, state));
  const filtered = all
    .filter(p => !area || p.site.areaId === area)
    .filter(p => owner === 'all' || isMine(p.site.clientId))
    .filter(p => `${p.site.name} ${p.site.address} ${lookups.client.get(p.site.clientId)?.name ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  const inTab: Record<TabKey, (p: ProjectStatus) => boolean> = {
    berjalan: p => p.phase === 'berjalan' || p.phase === 'perpanjangan',
    perpanjangan: p => p.phase === 'perpanjangan',
    persiapan: p => p.phase === 'persiapan',
    selesai: p => p.phase === 'selesai',
  };
  const count = (k: TabKey) => filtered.filter(inTab[k]).length;

  const rows = filtered.filter(inTab[tab]).sort((a, b) => {
    if (!periodSort) return 0;
    if (!a.period || !b.period) return a.period ? -1 : b.period ? 1 : 0;
    const r = a.period.start.localeCompare(b.period.start) || a.period.end.localeCompare(b.period.end);
    return periodSort === 'asc' ? r : -r;
  });
  const { pageRows, pager } = usePaged(rows);

  const periodHeader = (
    <button type="button" onClick={() => setPeriodSort(d => (d === null ? 'asc' : d === 'asc' ? 'desc' : null))}
      title={periodSort === 'asc' ? 'Urut: terlama dulu' : periodSort === 'desc' ? 'Urut: terbaru dulu' : 'Urutkan periode'}
      className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-slate-800 cursor-pointer select-none">
      <span>Periode</span>
      {periodSort === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-700" />
        : periodSort === 'desc' ? <ArrowDown className="w-3 h-3 text-slate-700" />
        : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );

  const exportData = () => exportCsv('project.csv', [
    ['Proyek', 'Klien', 'Area', 'Periode', 'Tahap', 'Perlu tindakan'],
    ...rows.map(p => [
      p.site.name,
      lookups.client.get(p.site.clientId)?.name ?? '',
      lookups.area.get(p.site.areaId)?.name ?? '',
      p.period ? `${fmtDate(p.period.start)} – ${fmtDate(p.period.end)}` : '',
      p.chip.label,
      p.action?.label ?? '',
    ]),
  ]);

  return (
    <div>
      <PageHeader
        title="Project"
        subtitle="Pekerjaan pengamanan per site, dari persiapan, jaga, kontrak, sampai perpanjangan."
        actions={<ExportBtn onClick={exportData} />}
      />

      <Tabs value={tab} onChange={k => changeTab(k as TabKey)} tabs={[
        { key: 'berjalan', label: `Berjalan (${count('berjalan')})` },
        { key: 'perpanjangan', label: `Menjelang berakhir (${count('perpanjangan')})` },
        { key: 'persiapan', label: `Persiapan (${count('persiapan')})` },
        { key: 'selesai', label: `Selesai (${count('selesai')})` },
      ]} />

      {(
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <SearchBox value={q} onChange={setQ} placeholder={isMobile ? 'Cari proyek / klien' : 'Cari proyek atau klien...'} />
            <div className={isMarketing ? 'grid grid-cols-2 gap-2 sm:contents' : 'sm:contents'}>
              <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48" aria-label="Filter area">
                <option value="">Semua area</option>
                {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
              {isMarketing && (
                <Select value={owner} onChange={e => setOwner(e.target.value as 'all' | 'mine')} className="sm:w-48" aria-label="Filter pemilik klien">
                  <option value="all">Semua klien</option>
                  <option value="mine">Klien saya</option>
                </Select>
              )}
            </div>
          </div>

          <Card pad={false}>
            <Table head={['Proyek', 'Klien', periodHeader, 'Tahap', 'Perlu tindakan']} widths={['19%', '20%', '21%', '17%', '23%']} minWidth="720px">
              {pageRows.map(p => (
                <Tr key={p.site.id} selected={selectedSiteId === p.site.id} onClick={() => setSelectedSiteId(p.site.id)}>
                  <Td><CellMain>{p.site.name}</CellMain></Td>
                  <Td className="text-sm text-slate-800">{lookups.client.get(p.site.clientId)?.name ?? '–'}</Td>
                  <Td className="whitespace-nowrap text-sm text-slate-700">{p.period ? `${fmtDate(p.period.start)} – ${fmtDate(p.period.end)}` : '–'}</Td>
                  <Td className="whitespace-nowrap"><ProjectChip ps={p} /></Td>
                  <Td><ProjectActionCell ps={p} /></Td>
                </Tr>
              ))}
            </Table>
            {rows.length === 0 && <TableEmpty>Tidak ada project di tahap ini.</TableEmpty>}
            {pager}
          </Card>
        </>
      )}

      {/* Quick view project: side modal dari kanan */}
      {selectedSiteId && <ProjectSidePanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />}
    </div>
  );
};
