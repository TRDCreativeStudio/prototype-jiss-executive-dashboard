import React, { useState } from 'react';
import { Plus, Pencil, FolderKanban } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, ErrorText, ExportBtn, Field, Input, Modal, PageHeader, SearchBox, Select, Table, Td, Textarea, exportCsv, runAction, Tr, CellMain, CellCode, usePaged, TableEmpty } from '../../ui/kit';
import { InfoCard, InfoRow, LINK } from '../project/projectUi';
import { latest } from '../../domain/selectors';
import { Link, navigate } from '../../router';
import { ActiveBadge, EditIconBtn, FpkMiniTable, QuotaTable, SpkMiniTable, runningIn, useActiveTabs } from './common';
import { NotFound } from '../Misc';
import type { Division, Site } from '../../domain/types';

export const SiteForm: React.FC<{ site: Site | null; onClose: () => void }> = ({ site, onClose }) => {
  const { state, actions } = useStore();
  const [f, setF] = useState<Site>(site ?? { id: '', code: '', name: '', address: '', clientId: '', areaId: '', active: true });
  const [err, setErr] = useState('');
  const save = () => runAction(actions.saveSite(f), site ? 'Site disimpan' : 'Site dibuat', setErr) && onClose();
  return (
    <Modal open title={site ? `Ubah site ${site.code}` : 'Tambah site'} onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Kode" required><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
        <Field label="Nama" required className="col-span-2"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Klien (siapa yang bayar)" required>
          <Select value={f.clientId} onChange={e => setF({ ...f, clientId: e.target.value })}>
            <option value="">– pilih –</option>
            {state.clients.filter(c => c.active || c.id === f.clientId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Area (siapa yang mengurus)" required>
          <Select value={f.areaId} onChange={e => setF({ ...f, areaId: e.target.value })}>
            <option value="">– pilih –</option>
            {state.areas.filter(a => a.active || a.id === f.areaId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Alamat" required><Textarea value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></Field>
      <Field label="Catatan"><Input value={f.note ?? ''} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Aktif</label>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

export const SitesPage: React.FC = () => {
  const { state, lookups, access } = useStore();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [client, setClient] = useState('');
  const [edit, setEdit] = useState<Site | null | 'new'>(null);
  const editable = access.can('master.edit');
  const searched = state.sites
    .filter(s => access.area(s.areaId))
    .filter(s => (!area || s.areaId === area) && (!client || s.clientId === client))
    .filter(s => `${s.code} ${s.name} ${s.address} ${lookups.client.get(s.clientId)?.name}`.toLowerCase().includes(q.toLowerCase()));
  const { tabs, rows } = useActiveTabs(searched);

  const { pageRows, pager } = usePaged(rows);
  return (
    <div>
      <PageHeader
        title="Site"
        subtitle="Lokasi jaga. Setiap site milik satu klien dan diurus satu area."
        actions={<>
          <ExportBtn onClick={() => exportCsv('site.csv', [['Kode', 'Site', 'Alamat', 'Klien', 'Area', 'Status'], ...searched.map(s => [s.code, s.name, s.address, lookups.client.get(s.clientId)?.name ?? '', lookups.area.get(s.areaId)?.name ?? '', s.active ? 'Aktif' : 'Nonaktif'])])} />
          {editable && <Btn size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setEdit('new')}>Tambah site</Btn>}
        </>}
      />
      {tabs}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Cari site, alamat, atau klien" />
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-48" aria-label="Filter area">
          <option value="">Semua area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={client} onChange={e => setClient(e.target.value)} className="sm:w-56" aria-label="Filter klien">
          <option value="">Semua klien</option>
          {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <Card pad={false}>
        <Table head={['Kode', 'Site', 'Klien', 'Area', 'Alamat', '']}>
          {pageRows.map(s => (
            <Tr key={s.id} to={`/site/${s.id}`}>
              <Td><CellCode>{s.code}</CellCode></Td>
              <Td><CellMain>{s.name}</CellMain></Td>
              <Td className="text-sm text-slate-800">{lookups.client.get(s.clientId)?.name}</Td>
              <Td className="text-sm text-slate-800 whitespace-nowrap">{lookups.area.get(s.areaId)?.name}</Td>
              <Td><div className="text-[13px] text-slate-500 max-w-xs truncate" title={s.address}>{s.address}</div></Td>
              <Td className="text-right">{editable && <EditIconBtn onClick={() => setEdit(s)} label={`Ubah ${s.name}`} />}</Td>
            </Tr>
          ))}
        </Table>
        {rows.length === 0 && <TableEmpty>Tidak ada site.</TableEmpty>}
        {pager}
      </Card>
      {edit && <SiteForm site={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
};

const DIVS: Division[] = ['Operasional', 'Recruitment', 'Pengadaan', 'Finance'];

export const SiteDetail: React.FC<{ id: string }> = ({ id }) => {
  const { state, lookups, access } = useStore();
  const [edit, setEdit] = useState(false);
  const s = lookups.site.get(id);
  if (!s || !access.area(s.areaId)) return <NotFound what="Site" />;
  const area = lookups.area.get(s.areaId);
  const client = lookups.client.get(s.clientId);
  const running = runningIn(state, new Set([s.id]));
  const hasProject = state.fpks.some(f => latest(f).siteId === s.id) || state.spks.some(x => x.siteId === s.id);
  const assignee = (d: Division) => {
    const bySite = state.assignments.find(a => a.siteId === s.id && a.division === d);
    const byClient = state.assignments.find(a => a.clientId === s.clientId && !a.siteId && a.division === d);
    const head = state.users.find(u => u.headOf.includes(d));
    if (bySite) return <>{lookups.user.get(bySite.userId)?.name} <span className="text-[13px] text-slate-500">· khusus site ini</span></>;
    if (byClient) return <>{lookups.user.get(byClient.userId)?.name} <span className="text-[13px] text-slate-500">· default klien</span></>;
    return <>{head?.name ?? 'BOD'} <span className="text-[13px] text-slate-500">· kepala divisi (belum diisi)</span></>;
  };
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;

  return (
    <div className="space-y-5">
      <PageHeader
        back="/site"
        title={s.name}
        subtitle={<span className="inline-flex items-center gap-2"><span className="font-mono text-[13px]">{s.code}</span>{!s.active && <ActiveBadge active={false} />}</span>}
        actions={<>
          {hasProject && access.can('fpk.view') && <Btn size="sm" variant="secondary" icon={<FolderKanban className="w-3.5 h-3.5" />} onClick={() => navigate(`/project/${s.id}`)}>Lihat project</Btn>}
          {access.can('master.edit') && <Btn size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEdit(true)}>Ubah</Btn>}
        </>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InfoCard title="Informasi site">
          <InfoRow label="Klien"><Link to={`/klien/${s.clientId}`} className="text-sm text-slate-800 hover:underline underline-offset-2">{client?.name}</Link></InfoRow>
          <InfoRow label="Area"><Link to={`/area/${s.areaId}`} className="text-sm text-slate-800 hover:underline underline-offset-2">{area?.name}</Link></InfoRow>
          <InfoRow label="PIC area">{lookups.user.get(area?.picUserId ?? '')?.name ?? <span className="text-rose-600">Belum ada</span>}</InfoRow>
          <InfoRow label="Alamat">
            <a href={mapUrl} target="_blank" rel="noreferrer" className="group inline-flex flex-wrap items-baseline gap-x-2 hover:underline underline-offset-2">
              {s.address}
              <span className="text-[13px] text-slate-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">Buka peta ↗</span>
            </a>
          </InfoRow>
          {s.note && <InfoRow label="Catatan">{s.note}</InfoRow>}
        </InfoCard>
        <InfoCard title="Divisi terkait">
          <InfoRow label="Marketing">{lookups.user.get(client?.accountOwnerId ?? '')?.name ?? '–'} <span className="text-[13px] text-slate-500">· account owner</span></InfoRow>
          {DIVS.map(d => <InfoRow key={d} label={d}>{assignee(d)}</InfoRow>)}
          <Link to="/admin/divisi-terkait" className={LINK}>Atur divisi terkait</Link>
        </InfoCard>
      </div>
      <QuotaTable areaId={s.areaId} siteId={s.id} />
      {access.can('fpk.view') && <FpkMiniTable fpks={running.fpks} />}
      {access.can('spk.view') && <SpkMiniTable spks={running.spks} title="SPK aktif dan dalam proses" />}
      {edit && <SiteForm site={s} onClose={() => setEdit(false)} />}
    </div>
  );
};
