import React, { useState } from 'react';
import { Plus, Pencil, Copy, Check } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, DL, ErrorText, ExportBtn, Field, Input, Modal, PageHeader, SearchBox, Select, Table, Td, Textarea, exportCsv, runAction, cx } from '../../ui/kit';
import { Link } from '../../router';
import { ActiveBadge, FpkMiniTable, SpkMiniTable, muted, runningIn } from './common';
import { NotFound } from '../Misc';
import { settingNum } from '../../domain/settings';
import type { Client, Division } from '../../domain/types';

const CopyableItem: React.FC<{ text: string; label: string; isMono?: boolean }> = ({ text, label, isMono }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1.5 group">
      <span className={cx('truncate max-w-[170px] select-all', isMono ? 'font-mono text-[11px] text-slate-600' : 'text-slate-700 text-xs')}>
        {text}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Tersalin!' : `Salin ${label}`}
        className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors shrink-0"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    </div>
  );
};

export const ClientForm: React.FC<{ client: Client | null; onClose: () => void }> = ({ client, onClose }) => {
  const { state, actions } = useStore();
  const marketing = state.users.filter(u => u.active && u.roles.includes('Marketing'));
  const [f, setF] = useState<Client>(client ?? {
    id: '', code: '', name: '', accountOwnerId: '', coOwnerIds: [], billingAddress: '',
    termDays: settingNum(state.settings, 'client.payment_terms_days', 30), active: true,
  });
  const [err, setErr] = useState('');
  const save = () => runAction(actions.saveClient(f), client ? 'Klien disimpan' : 'Klien dibuat', setErr) && onClose();
  return (
    <Modal open title={client ? `Ubah klien ${client.code}` : 'Tambah klien'} onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Kode" required><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
        <Field label="Nama" required className="col-span-2"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      </div>
      <Field label="Account owner (Marketing)" required>
        <Select value={f.accountOwnerId} onChange={e => setF({ ...f, accountOwnerId: e.target.value, coOwnerIds: f.coOwnerIds.filter(x => x !== e.target.value) })}>
          <option value="">– pilih –</option>
          {marketing.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      </Field>
      {client && client.accountOwnerId !== f.accountOwnerId && f.accountOwnerId && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Pergantian account owner tercatat di audit log, langsung mengubah lingkup Marketing lama dan baru, dan keduanya diberi notifikasi.</p>
      )}
      <Field label="Co-owner" hint="Marketing yang ikut memegang klien ini dan boleh melihat nilai uangnya.">
        <div className="flex flex-wrap gap-3">
          {marketing.filter(u => u.id !== f.accountOwnerId).map(u => (
            <label key={u.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={f.coOwnerIds.includes(u.id)} onChange={e => setF({ ...f, coOwnerIds: e.target.checked ? [...f.coOwnerIds, u.id] : f.coOwnerIds.filter(x => x !== u.id) })} />
              {u.name}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Alamat penagihan" required hint="Nama klien di atas dipakai sebagai nama PT di invoice."><Textarea value={f.billingAddress} onChange={e => setF({ ...f, billingAddress: e.target.value })} /></Field>
      <Field label="NPWP klien" hint="Untuk invoice dan faktur pajak. Boleh diisi belakangan."><Input value={f.npwp ?? ''} onChange={e => setF({ ...f, npwp: e.target.value || undefined })} placeholder="00.000.000.0-000.000" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Termin bayar (hari kalender)" required><Input type="number" value={f.termDays} onChange={e => setF({ ...f, termDays: Number(e.target.value) })} /></Field>
        <Field label="Kontak PIC klien"><Input value={f.picContact ?? ''} onChange={e => setF({ ...f, picContact: e.target.value })} placeholder="Contoh: Bp. Andri (GA)" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email PIC"><Input type="email" value={f.picEmail ?? ''} onChange={e => setF({ ...f, picEmail: e.target.value })} placeholder="email@perusahaan.com" /></Field>
        <Field label="No. HP PIC"><Input value={f.picPhone ?? ''} onChange={e => setF({ ...f, picPhone: e.target.value })} placeholder="0812-xxxx-xxxx" /></Field>
      </div>
      <Field label="Catatan"><Textarea value={f.note ?? ''} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Aktif</label>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
};

export const ClientsPage: React.FC = () => {
  const { state, lookups, access } = useStore();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [edit, setEdit] = useState<Client | null | 'new'>(null);
  const editable = access.can('master.edit');
  const visibleSites = state.sites.filter(s => access.area(s.areaId));
  const rows = state.clients
    .filter(c => visibleSites.some(s => s.clientId === c.id) || access.allAreas())
    .filter(c => !area || state.sites.some(s => s.clientId === c.id && s.areaId === area))
    .filter(c => `${c.code} ${c.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Klien"
        subtitle="Perusahaan yang membayar jasa. Satu klien bisa punya site di beberapa area."
        actions={<>
          <ExportBtn onClick={() => exportCsv('klien.csv', [['Kode', 'Nama', 'Kontak PIC', 'Email PIC', 'No. HP PIC', 'Jumlah site', 'Termin', 'Account owner', 'Status'], ...rows.map(c => [c.code, c.name, c.picContact ?? '', c.picEmail ?? '', c.picPhone ?? '', state.sites.filter(s => s.clientId === c.id).length, `${c.termDays} hari`, lookups.user.get(c.accountOwnerId)?.name ?? '', c.active ? 'Aktif' : 'Nonaktif'])])} />
          {editable && <Btn size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setEdit('new')}>Tambah klien</Btn>}
        </>}
      />
      {access.can('fpk.create') && (
        <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2 mb-3">Marketing membuat klien dan site baru langsung dari form FPK. Perubahan berikutnya oleh Admin sistem.</p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Cari kode atau nama klien" />
        <Select value={area} onChange={e => setArea(e.target.value)} className="sm:w-56">
          <option value="">Semua area</option>
          {state.areas.filter(a => access.area(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      <Card pad={false}>
        <Table head={['Kode', 'Nama', 'Kontak PIC', 'Email & No. HP', 'Site per area', 'Termin', 'Account owner', 'Status', '']}>
          {rows.map(c => {
            const sites = state.sites.filter(s => s.clientId === c.id);
            const areas = [...new Set(sites.map(s => s.areaId))];
            const breakdownTooltip = areas.map(aid => `${lookups.area.get(aid)?.name} ${sites.filter(s => s.areaId === aid).length}`).join('\n');

            return (
              <tr key={c.id} className={muted(c.active)}>
                <Td className="font-mono text-xs">{c.code}</Td>
                <Td><Link to={`/klien/${c.id}`} className="font-semibold text-indigo-700 hover:underline">{c.name}</Link></Td>
                <Td>
                  <div className="text-slate-800 text-sm font-medium">{c.picContact || '–'}</div>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1 text-xs">
                    {c.picEmail ? (
                      <CopyableItem text={c.picEmail} label="email" />
                    ) : null}
                    {c.picPhone ? (
                      <CopyableItem text={c.picPhone} label="nomor HP" isMono />
                    ) : null}
                    {!c.picEmail && !c.picPhone && <span className="text-slate-400">–</span>}
                  </div>
                </Td>
                <Td>
                  {sites.length === 0 ? (
                    <span className="text-slate-400 text-sm">0 site</span>
                  ) : (
                    <div
                      className="relative group/site inline-block cursor-help"
                      title={breakdownTooltip}
                    >
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors">
                        {sites.length} site
                      </span>

                      {/* Tooltip Hover Breakdown */}
                      <div className="absolute left-0 top-full mt-1.5 hidden group-hover/site:block z-30 bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl pointer-events-none min-w-[150px]">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-700 pb-0.5">
                          Rincian per Area
                        </div>
                        <div className="space-y-1">
                          {areas.map(aid => (
                            <div key={aid} className="flex items-center justify-between gap-3 text-slate-200">
                              <span>{lookups.area.get(aid)?.name ?? 'Area'}</span>
                              <span className="font-bold text-amber-300">{sites.filter(s => s.areaId === aid).length}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{c.termDays} hari</Td>
                <Td>
                  <div className="font-medium text-slate-800">{lookups.user.get(c.accountOwnerId)?.name ?? '–'}</div>
                  {c.coOwnerIds.length > 0 && <div className="text-xs text-slate-500">Co-owner: {c.coOwnerIds.map(id => lookups.user.get(id)?.name).join(', ')}</div>}
                </Td>
                <Td><ActiveBadge active={c.active} /></Td>
                <Td>{editable && <Btn size="sm" variant="ghost" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEdit(c)}>Ubah</Btn>}</Td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {edit && <ClientForm client={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
};

const DIVS: Division[] = ['Operasional', 'Recruitment', 'Pengadaan', 'Finance'];

export const ClientDetail: React.FC<{ id: string }> = ({ id }) => {
  const { state, lookups, access } = useStore();
  const [edit, setEdit] = useState(false);
  const c = lookups.client.get(id);
  const sites = state.sites.filter(s => s.clientId === id && access.area(s.areaId));
  if (!c || (!sites.length && !access.allAreas())) return <NotFound what="Klien" />;
  const running = runningIn(state, new Set(sites.map(s => s.id)));
  const areas = [...new Set(sites.map(s => s.areaId))];
  const defaults = state.assignments.filter(a => a.clientId === id && !a.siteId);

  return (
    <div className="space-y-5">
      <PageHeader
        back="/klien"
        title={c.name}
        subtitle={<span className="font-mono text-xs">{c.code}</span>}
        actions={access.can('master.edit') && <Btn size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEdit(true)}>Ubah</Btn>}
      />
      <Card>
        <DL items={[
          ['Account owner', lookups.user.get(c.accountOwnerId)?.name],
          ['Co-owner', c.coOwnerIds.map(x => lookups.user.get(x)?.name).join(', ') || '–'],
          ['Termin bayar', `${c.termDays} hari kalender`],
          ['Alamat penagihan', c.billingAddress],
          ['NPWP', c.npwp ?? '–'],
          ['Kontak PIC klien', c.picContact ?? '–'],
          ['Email PIC', c.picEmail ?? '–'],
          ['No. HP PIC', c.picPhone ?? '–'],
          ['Status', <ActiveBadge active={c.active} />],
        ]} />
      </Card>
      <Card title="Divisi terkait (default untuk semua site klien ini)" actions={<Link to="/admin/divisi-terkait" className="text-xs font-semibold text-indigo-600">Atur</Link>}>
        <DL items={DIVS.map(d => [d, lookups.user.get(defaults.find(x => x.division === d)?.userId ?? '')?.name ?? <span className="text-slate-400">Belum diisi, tugas jatuh ke kepala divisi</span>])} />
      </Card>
      <Card title={`Site per area (${sites.length})`} pad={false}>
        <Table head={['Area', 'Site', 'Alamat', 'Status']}>
          {areas.flatMap(aid => sites.filter(s => s.areaId === aid).map((s, i) => (
            <tr key={s.id} className={muted(s.active)}>
              <Td>{i === 0 && <Link to={`/area/${aid}`} className="font-semibold text-indigo-700 hover:underline">{lookups.area.get(aid)?.name}</Link>}</Td>
              <Td><Link to={`/site/${s.id}`} className="font-medium hover:underline">{s.name}</Link></Td>
              <Td className="text-xs text-slate-500">{s.address}</Td>
              <Td><ActiveBadge active={s.active} /></Td>
            </tr>
          )))}
        </Table>
      </Card>
      {access.can('fpk.view') && <FpkMiniTable fpks={running.fpks} />}
      {access.can('spk.view') && <SpkMiniTable spks={running.spks} title="SPK aktif dan dalam proses" />}
      {edit && <ClientForm client={c} onClose={() => setEdit(false)} />}
    </div>
  );
};
