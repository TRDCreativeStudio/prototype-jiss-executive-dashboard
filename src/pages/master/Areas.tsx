import React, { useState } from 'react';
import { Plus, Pencil, UserCheck, MapPin, Users } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, ErrorText, ExportBtn, Field, Input, Modal, PageHeader, SearchBox, Select, Table, Td, Textarea, exportCsv, runAction, Badge, Tr, CellMain, CellCode, usePaged, StatusChip, SummaryCard, TableEmpty } from '../../ui/kit';
import { ActiveBadge, EditIconBtn, FpkMiniTable, QuotaTable, SpkMiniTable, runningIn, useActiveTabs } from './common';
import { NotFound } from '../Misc';
import { activeByPosition, quotaByPosition } from '../../domain/selectors';
import type { Area } from '../../domain/types';

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

export const AreaForm: React.FC<{ area: Area | null; onClose: () => void }> = ({ area, onClose }) => {
  const { state, actions } = useStore();
  const [f, setF] = useState<Area>(area ?? { id: '', code: '', name: '', active: true });
  const [err, setErr] = useState('');
  const pics = state.users.filter(u => u.active && u.roles.includes('PIC Area'));
  const save = () => runAction(actions.saveArea(f), area ? 'Area disimpan' : 'Area dibuat', setErr) && onClose();
  return (
    <Modal open title={area ? `Ubah area ${area.code}` : 'Tambah area'} onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kode" required><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="AR-XXX" /></Field>
        <Field label="Nama" required><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIC area utama">
          <Select value={f.picUserId ?? ''} onChange={e => setF({ ...f, picUserId: e.target.value || undefined })}>
            <option value="">– belum ada –</option>
            {pics.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="PIC area cadangan">
          <Select value={f.backupPicUserId ?? ''} onChange={e => setF({ ...f, backupPicUserId: e.target.value || undefined })}>
            <option value="">– belum ada –</option>
            {pics.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
      </div>
      {area && area.picUserId !== f.picUserId && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Tugas terbuka milik PIC lama di area ini akan pindah ke PIC baru.</p>}
      <Field label="Keterangan"><Textarea value={f.note ?? ''} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Aktif</label>
      <p className="text-[11px] text-slate-500">Data yang sudah dipakai dokumen lain tidak bisa dihapus, hanya dinonaktifkan.</p>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

export const AreasPage: React.FC = () => {
  const { state, lookups, access } = useStore();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Area | null | 'new'>(null);
  const editable = access.can('master.edit');
  const searched = state.areas
    .filter(a => access.area(a.id))
    .filter(a => `${a.code} ${a.name} ${lookups.user.get(a.picUserId ?? '')?.name ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const { tabs, rows } = useActiveTabs(searched);

  const stats = (a: Area) => {
    const siteIds = new Set(state.sites.filter(s => s.areaId === a.id).map(s => s.id));
    const clients = new Set(state.sites.filter(s => s.areaId === a.id).map(s => s.clientId));
    return { sites: siteIds.size, clients: clients.size, quota: sum(quotaByPosition(state.spks, siteIds)), actual: sum(activeByPosition(state.personnel, a.id)) };
  };

  const { pageRows, pager } = usePaged(rows);
  return (
    <div>
      <PageHeader
        title="Area"
        subtitle="Wilayah operasional JISS. Satu area mengurus banyak site dari banyak klien."
        actions={<>
          <ExportBtn onClick={() => exportCsv('area.csv', [['Kode', 'Nama', 'PIC utama', 'PIC cadangan', 'Site', 'Status'], ...searched.map(a => [a.code, a.name, lookups.user.get(a.picUserId ?? '')?.name ?? '', lookups.user.get(a.backupPicUserId ?? '')?.name ?? '', stats(a).sites, a.active ? 'Aktif' : 'Nonaktif'])])} />
          {editable && <Btn size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setEdit('new')}>Tambah area</Btn>}
        </>}
      />
      {tabs}
      <div className="flex flex-col sm:flex-row gap-2 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Cari area atau PIC" /></div>
      <Card pad={false}>
        <Table head={['Kode', 'Area', 'PIC area', 'Site', 'Security aktif / kuota', '']}>
          {pageRows.map(a => {
            const st = stats(a);
            const short = st.quota - st.actual;
            return (
              <Tr key={a.id} to={`/area/${a.id}`}>
                <Td><CellCode>{a.code}</CellCode></Td>
                <Td><CellMain>{a.name}</CellMain></Td>
                <Td>
                  {a.picUserId
                    ? <span className="text-sm text-slate-800">{lookups.user.get(a.picUserId)?.name}{a.backupPicUserId && <span className="text-slate-500"> · cadangan {lookups.user.get(a.backupPicUserId)?.name}</span>}</span>
                    : <StatusChip tone="red" label="Belum ada PIC" hint={{ kind: 'info', text: 'Tugas PIC area jatuh ke kepala Operasional sampai PIC diisi.' }} />}
                </Td>
                <Td className="tabular-nums whitespace-nowrap">{st.sites} site <span className="text-slate-400">·</span> {st.clients} klien</Td>
                <Td className="tabular-nums whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    {st.actual} / {st.quota}
                    {short > 0 ? <Badge tone="red">Kurang {short}</Badge> : short < 0 ? <Badge tone="amber">Lebih {-short}</Badge> : st.quota > 0 ? <Badge tone="green">Pas</Badge> : null}
                  </span>
                </Td>
                <Td className="text-right">{editable && <EditIconBtn onClick={() => setEdit(a)} label={`Ubah area ${a.name}`} />}</Td>
              </Tr>
            );
          })}
        </Table>
        {rows.length === 0 && <TableEmpty>Tidak ada area.</TableEmpty>}
        {pager}
      </Card>
      {edit && <AreaForm area={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
};

export const AreaDetail: React.FC<{ id: string }> = ({ id }) => {
  const { state, lookups, access } = useStore();
  const [edit, setEdit] = useState(false);
  const a = lookups.area.get(id);
  if (!a || !access.area(a.id)) return <NotFound what="Area" />;
  const sites = state.sites.filter(s => s.areaId === a.id);
  const siteIds = new Set(sites.map(s => s.id));
  const running = runningIn(state, siteIds);
  const byClient = [...new Set(sites.map(s => s.clientId))];
  const quota = sum(quotaByPosition(state.spks, siteIds));
  const actual = sum(activeByPosition(state.personnel, a.id));

  return (
    <div className="space-y-5">
      <PageHeader
        back="/area"
        title={`Area ${a.name}`}
        subtitle={<span className="inline-flex items-center gap-2"><span className="font-mono text-[13px]">{a.code}</span>{!a.active && <ActiveBadge active={false} />}</span>}
        actions={access.can('master.edit') && <Btn size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEdit(true)}>Ubah</Btn>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SummaryCard icon={UserCheck} label="PIC area" value={lookups.user.get(a.picUserId ?? '')?.name ?? 'Belum ada'} valueClass="text-base"
          tone={a.picUserId ? undefined : 'red'} sub={a.picUserId ? undefined : 'tugas jatuh ke kepala Operasional'} />
        <SummaryCard icon={UserCheck} label="PIC cadangan" value={lookups.user.get(a.backupPicUserId ?? '')?.name ?? '–'} valueClass="text-base" />
        <SummaryCard icon={MapPin} label="Site" value={`${sites.length} site`} valueClass="text-base" sub={`${byClient.length} klien`} />
        <SummaryCard icon={Users} label="Security aktif / kuota" value={`${actual} / ${quota}`} valueClass="text-base"
          tone={actual < quota ? 'red' : undefined} sub={actual < quota ? `kurang ${quota - actual}` : actual > quota ? `lebih ${actual - quota}` : 'pas'} />
      </div>
      {a.note && <p className="text-sm text-slate-600">{a.note}</p>}
      <QuotaTable areaId={a.id} />
      <Card title={`Site di area ini (${sites.length})`} pad={false}>
        <Table head={['Klien', 'Site', 'Alamat']}>
          {byClient.flatMap(cid =>
            sites.filter(s => s.clientId === cid).map((s, i) => (
              <Tr key={s.id} to={`/site/${s.id}`} muted={!s.active}>
                <Td>{i === 0 && <CellMain>{lookups.client.get(cid)?.name}</CellMain>}</Td>
                <Td className="text-sm text-slate-800">{s.name}{!s.active && <span className="text-slate-500"> · nonaktif</span>}</Td>
                <Td className="text-[13px] text-slate-500">{s.address}</Td>
              </Tr>
            )),
          )}
        </Table>
        {sites.length === 0 && <TableEmpty>Belum ada site.</TableEmpty>}
      </Card>
      {access.can('fpk.view') && <FpkMiniTable fpks={running.fpks} />}
      {access.can('spk.view') && <SpkMiniTable spks={running.spks} title="SPK aktif dan dalam proses" />}
      {edit && <AreaForm area={a} onClose={() => setEdit(false)} />}
    </div>
  );
};
