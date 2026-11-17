import React, { useState } from 'react';
import { useStore } from '../../store/store';
import { Badge, Card, ExportBtn, PageHeader, SearchBox, Select, Table, Td, exportCsv } from '../../ui/kit';
import { Link } from '../../router';
import { latest } from '../../domain/selectors';
import { fmtDate } from '../../domain/time';

export const ProjectListPage: React.FC = () => {
  const { state, lookups, access } = useStore();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'' | 'aktif' | 'nonaktif'>('');

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

  // Proyek list derived from sites
  const rows = state.sites
    .filter(s => access.area(s.areaId))
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
      ['Nama Proyek', 'Nama Klien', 'Periode', 'Status', 'FPK', 'SPK'],
      ...rows.map(s => {
        const client = lookups.client.get(s.clientId);
        const hasFpk = state.fpks.some(f => latest(f).siteId === s.id && f.status !== 'batal' && f.status !== 'ditolak');
        const hasSpk = state.spks.some(sp => sp.siteId === s.id);
        const period = getProjectPeriod(s.id);
        return [
          s.name,
          client?.name ?? '',
          period,
          s.active ? 'Aktif' : 'Nonaktif',
          hasFpk ? '✓' : '-',
          hasSpk ? '✓' : '-',
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
        <SearchBox value={q} onChange={setQ} placeholder="Cari proyek atau klien..." />
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48">
          <option value="">Semua area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={e => setStatus(e.target.value as '' | 'aktif' | 'nonaktif')} className="sm:w-40">
          <option value="">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </Select>
      </div>

      <Card pad={false}>
        <Table head={['Nama Proyek', 'Nama Klien', 'Periode', 'Status', 'FPK', 'SPK']}>
          {rows.map(s => {
            const client = lookups.client.get(s.clientId);
            const hasFpk = state.fpks.some(f => latest(f).siteId === s.id && f.status !== 'batal' && f.status !== 'ditolak');
            const hasSpk = state.spks.some(sp => sp.siteId === s.id);
            const period = getProjectPeriod(s.id);

            return (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                <Td>
                  <Link to={`/project/${s.id}`} className="font-semibold text-indigo-700 hover:underline">
                    {s.name}
                  </Link>
                </Td>
                <Td>
                  <Link to={`/klien/${s.clientId}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600 hover:underline">
                    {client?.name ?? '–'}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-700">{period}</span>
                </Td>
                <Td>
                  <Badge tone={s.active ? 'green' : 'slate'}>
                    {s.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </Td>
                <Td className="text-center">
                  {hasFpk ? (
                    <span className="inline-flex items-center justify-center text-emerald-600 font-bold text-sm">
                      ✓
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium text-sm">
                      -
                    </span>
                  )}
                </Td>
                <Td className="text-center">
                  {hasSpk ? (
                    <span className="inline-flex items-center justify-center text-emerald-600 font-bold text-sm">
                      ✓
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium text-sm">
                      -
                    </span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
        {rows.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-400">
            Tidak ada proyek yang sesuai pencarian.
          </div>
        )}
      </Card>
    </div>
  );
};
