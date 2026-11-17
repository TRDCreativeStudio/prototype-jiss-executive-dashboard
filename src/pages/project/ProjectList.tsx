import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/store';
import { Badge, Card, ExportBtn, PageHeader, SearchBox, Select, Table, Td, exportCsv, StatusChip, Tr, TableEmpty, CellMain } from '../../ui/kit';
import { ProjectSidePanel } from './ProjectSidePanel';
import { latest } from '../../domain/selectors';
import { fmtDate } from '../../domain/time';
import { settingNum } from '../../domain/settings';
import { getFpkStatusDisplay } from '../fpk/FpkList';
import { SPK_STATUS } from '../../domain/labels';

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

const filterCls = (desktopWidth: string) => `min-w-0 px-1.5! text-xs sm:px-3! sm:text-sm ${desktopWidth}`;

export const ProjectListPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { state, lookups, access, me, myTasks } = useStore();
  const minMargin = settingNum(state.settings, 'margin.minimum_pct', 10);
  const mine = new Set(myTasks.filter(x => x.task.refType === 'fpk').map(x => x.task.refId));
  // FPK yang mewakili proyek: yang masih berproses/berjalan, kalau tidak ada pakai yang terbaru
  const projectFpk = (siteId: string) => {
    const list = state.fpks.filter(f => latest(f).siteId === siteId);
    return list.find(f => !['selesai', 'batal', 'ditolak'].includes(f.status)) ?? list[list.length - 1];
  };
  // SPK yang mewakili proyek: yang perlu revisi/diproses lebih dulu, lalu yang aktif, lalu terbaru
  const projectSpk = (siteId: string) => {
    const list = state.spks.filter(sp => sp.siteId === siteId);
    return list.find(sp => sp.status === 'perlu_revisi')
      ?? list.find(sp => sp.status === 'diinput')
      ?? list.find(sp => sp.status === 'aktif')
      ?? list[list.length - 1];
  };
  const fpkLabel = (siteId: string) => {
    const f = projectFpk(siteId);
    return f ? getFpkStatusDisplay(f, state, lookups, me, mine, minMargin).label : 'Tanpa FPK';
  };
  const spkLabel = (siteId: string) => {
    const sp = projectSpk(siteId);
    return sp ? SPK_STATUS[sp.status].label : 'Belum ada SPK';
  };

  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'' | 'aktif' | 'nonaktif'>('');
  const [fpkFilter, setFpkFilter] = useState('');
  const [spkFilter, setSpkFilter] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const getProjectPeriod = (siteId: string) => {
    const spk = state.spks.find(sp => sp.siteId === siteId && sp.status === 'aktif')
      ?? state.spks.find(sp => sp.siteId === siteId);
    if (spk) {
      return `${fmtDate(spk.periodStart)} – ${fmtDate(spk.periodEnd)}`;
    }
    const fpk = state.fpks.find(f => latest(f).siteId === siteId && f.status !== 'batal' && f.status !== 'ditolak');
    if (fpk) {
      const v = latest(fpk);
      return `${fmtDate(v.periodStart)} – ${fmtDate(v.periodEnd)}`;
    }
    return '–';
  };

  // Proyek = site yang punya minimal 1 FPK atau SPK (proyek lahir dari FPK; data awal lewat SPK)
  const projects = state.sites
    .filter(s =>
      state.fpks.some(f => latest(f).siteId === s.id) ||
      state.spks.some(sp => sp.siteId === s.id)
    )
    .filter(s => access.area(s.areaId));
  // Pilihan filter diambil dari status yang benar-benar tampil, supaya selalu sama dengan chip
  const fpkOptions = [...new Set(projects.map(s => fpkLabel(s.id)))].sort();
  const spkOptions = [...new Set(projects.map(s => spkLabel(s.id)))].sort();

  const rows = projects
    .filter(s => !fpkFilter || fpkLabel(s.id) === fpkFilter)
    .filter(s => !spkFilter || spkLabel(s.id) === spkFilter)
    .filter(s => (!area || s.areaId === area))
    .filter(s => {
      if (status === 'aktif') return s.active;
      if (status === 'nonaktif') return !s.active;
      return true;
    })
    .filter(s => {
      const client = lookups.client.get(s.clientId);
      const query = q.toLowerCase();
      const period = getProjectPeriod(s.id);
      return (
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        (client?.name ?? '').toLowerCase().includes(query) ||
        (client?.picEmail ?? '').toLowerCase().includes(query) ||
        period.toLowerCase().includes(query)
      );
    });

  const exportData = () => {
    exportCsv('project.csv', [
      ['Proyek', 'Klien', 'Periode', 'Status', 'Status FPK', 'Status SPK'],
      ...rows.map(s => {
        const client = lookups.client.get(s.clientId);
        const period = getProjectPeriod(s.id);
        return [
          s.name,
          client?.name ?? '',
          period,
          s.active ? 'Aktif' : 'Nonaktif',
          fpkLabel(s.id),
          spkLabel(s.id),
        ];
      }),
    ]);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Project"
        subtitle="Daftar proyek serta status kelengkapan dokumen FPK dan SPK."
        actions={<ExportBtn onClick={exportData} />}
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <SearchBox value={q} onChange={setQ} placeholder={isMobile ? 'Cari proyek / klien' : 'Cari proyek atau klien...'} />
        {/* Mobile: 4 filter sejajar dengan label pendek; desktop: satu baris dengan pencarian */}
        <div className="grid grid-cols-4 gap-2 sm:contents">
          <Select value={area} onChange={e => setArea(e.target.value)} className={filterCls('sm:w-48')} aria-label="Filter area">
            <option value="">Area</option>
            {state.areas.filter(a => access.area(a.id)).map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Select value={status} onChange={e => setStatus(e.target.value as '' | 'aktif' | 'nonaktif')} className={filterCls('sm:w-48')} aria-label="Filter status proyek">
            <option value="">{isMobile ? 'Proyek' : 'Status proyek'}</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
          <Select value={fpkFilter} onChange={e => setFpkFilter(e.target.value)} className={filterCls('sm:w-44')} aria-label="Filter status FPK">
            <option value="">{isMobile ? 'FPK' : 'Status FPK'}</option>
            {fpkOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </Select>
          <Select value={spkFilter} onChange={e => setSpkFilter(e.target.value)} className={filterCls('sm:w-44')} aria-label="Filter status SPK">
            <option value="">{isMobile ? 'SPK' : 'Status SPK'}</option>
            {spkOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
      </div>

      <Card pad={false}>
        <Table head={['Proyek', 'Klien', 'Periode', 'Status', 'Status FPK', 'Status SPK']}>
          {rows.map(s => {
            const client = lookups.client.get(s.clientId);
            const fpk = projectFpk(s.id);
            const fpkStatus = fpk ? getFpkStatusDisplay(fpk, state, lookups, me, mine, minMargin) : null;
            const spk = projectSpk(s.id);
            const period = getProjectPeriod(s.id);

            return (
              <Tr key={s.id} selected={selectedSiteId === s.id} onClick={() => setSelectedSiteId(s.id)}>
                <Td>
                  <CellMain>{s.name}</CellMain>
                </Td>
                <Td>
                  <span className="text-sm font-medium text-slate-800">{client?.name ?? '–'}</span>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="text-slate-700">{period}</span>
                </Td>
                <Td>
                  <Badge tone={s.active ? 'green' : 'slate'}>
                    {s.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                <Td>
                  {fpkStatus ? (
                    <StatusChip tone={fpkStatus.tone} label={fpkStatus.label} hint={fpkStatus.hint} />
                  ) : (
                    <Badge tone="slate">Tanpa FPK</Badge>
                  )}
                </Td>
                <Td>
                  {spk ? (
                    <Badge tone={SPK_STATUS[spk.status].tone}>{SPK_STATUS[spk.status].label}</Badge>
                  ) : (
                    <Badge tone="slate">Belum ada SPK</Badge>
                  )}
                </Td>
              </Tr>
            );
          })}
        </Table>
        {rows.length === 0 && <TableEmpty>Tidak ada proyek yang sesuai pencarian.</TableEmpty>}
      </Card>

      {/* Quick view project: side modal dari kanan */}
      {selectedSiteId && <ProjectSidePanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />}
    </div>
  );
};
