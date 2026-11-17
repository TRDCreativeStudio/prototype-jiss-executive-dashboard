import React, { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { useStore } from '../../store/store';
import { Btn, Card, ErrorText, ExportBtn, Field, Input, Modal, PageHeader, Table, Td, exportCsv, runAction, Tr, CellCode, CellMain, usePaged, SearchBox, HintIcon, TableEmpty } from '../../ui/kit';
import { quotaByPosition } from '../../domain/selectors';
import { EditIconBtn, useActiveTabs } from './common';
import type { Position } from '../../domain/types';

const EditModal: React.FC<{ row: Position | null; onClose: () => void }> = ({ row, onClose }) => {
  const { actions } = useStore();
  const [f, setF] = useState<Position>(row ?? { id: '', code: '', name: '', active: true });
  const [err, setErr] = useState('');
  const save = () => { if (runAction(actions.savePosition(f), 'Tersimpan', setErr)) onClose(); };
  return (
    <Modal open title={row ? 'Ubah jabatan' : 'Tambah jabatan'} onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Kode" required><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
        <Field label="Nama" required className="col-span-2"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      </div>
      <Field label="Keterangan"><Input value={f.description ?? ''} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Aktif</label>
      <p className="text-[11px] text-slate-500">Jabatan nonaktif tidak muncul di pilihan form baru, tapi tetap tampil di dokumen lama.</p>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

export const PositionsPage: React.FC = () => {
  const { state, access } = useStore();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Position | null | 'new'>(null);
  const editable = access.can('master.edit');
  const searched = state.positions.filter(r => `${r.code} ${r.name} ${r.description ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const { tabs, rows } = useActiveTabs(searched);
  // Pemakaian: kuota di SPK yang berlaku + security aktif (alasan jabatan tidak bisa dihapus)
  const allSites = new Set(state.sites.map(s => s.id));
  const quota = quotaByPosition(state.spks, allSites);
  const actual = new Map<string, number>();
  state.personnel.filter(p => p.status === 'aktif').forEach(p => actual.set(p.positionId, (actual.get(p.positionId) ?? 0) + 1));
  const { pageRows, pager } = usePaged(rows);
  return (
    <div>
      <PageHeader
        title="Jabatan"
        subtitle={<span className="inline-flex items-center gap-1.5">
          Posisi security yang dipakai di formasi FPK dan SPK.
          <HintIcon icon={Info} className="text-slate-400" text="Dibuat master supaya hitungan kuota per jabatan konsisten. Hanya Admin sistem yang bisa mengubah. Jabatan nonaktif tidak muncul di form baru, tapi tetap tampil di dokumen lama." />
        </span>}
        actions={<>
          <ExportBtn onClick={() => exportCsv('jabatan.csv', [['Kode', 'Nama', 'Keterangan', 'Kuota SPK aktif', 'Security aktif', 'Status'], ...searched.map(r => [r.code, r.name, r.description ?? '', quota.get(r.id) ?? 0, actual.get(r.id) ?? 0, r.active ? 'Aktif' : 'Nonaktif'])])} />
          {editable && <Btn size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setEdit('new')}>Tambah jabatan</Btn>}
        </>}
      />
      {tabs}
      <div className="flex flex-col sm:flex-row gap-2 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Cari jabatan" /></div>
      <Card pad={false}>
        <Table head={['Kode', 'Jabatan', 'Keterangan', 'Kuota SPK aktif', 'Security aktif', '']}>
          {pageRows.map(r => (
            <Tr key={r.id} onClick={editable ? () => setEdit(r) : undefined}>
              <Td><CellCode>{r.code}</CellCode></Td>
              <Td><CellMain>{r.name}</CellMain></Td>
              <Td className="text-[13px] text-slate-500">{r.description ?? '–'}</Td>
              <Td className="tabular-nums">{quota.get(r.id) ?? 0}</Td>
              <Td className="tabular-nums">{actual.get(r.id) ?? 0}</Td>
              <Td className="text-right">{editable && <EditIconBtn onClick={() => setEdit(r)} label={`Ubah ${r.name}`} />}</Td>
            </Tr>
          ))}
        </Table>
        {rows.length === 0 && <TableEmpty>Tidak ada jabatan.</TableEmpty>}
        {pager}
      </Card>
      {edit && <EditModal row={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
};
