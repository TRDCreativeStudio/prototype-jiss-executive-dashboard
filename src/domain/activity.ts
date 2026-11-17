// Log aktivitas yang mudah dibaca, disusun dari data FPK/SPK + audit log.
// Dipakai di side modal FPK (log per FPK) dan tab Log Activity di Project (gabungan semua dokumen).
import type { AuditEntry, Fpk, Site, Spk } from './types';

export type ActivityTone = 'slate' | 'blue' | 'green' | 'amber' | 'red';

export interface ActivityItem {
  key: string;
  at: string; // 'YYYY-MM-DD' atau 'YYYY-MM-DD HH:mm'
  actorId?: string;
  text: string;
  note?: string;
  tone: ActivityTone;
  /** Dokumen asal, untuk log gabungan di Project (klik untuk membuka side modal). */
  doc?: { type: 'fpk' | 'spk'; id: string; label: string };
}

const DIV_LABEL: Record<string, string> = { Operasional: 'Ops', Recruitment: 'Recruitment', Pengadaan: 'Pengadaan', Finance: 'Finance' };

const REVIEW: Record<string, { text: string; tone: ActivityTone }> = {
  cocok: { text: 'cek selesai, cocok', tone: 'green' },
  selesai: { text: 'cek selesai', tone: 'green' },
  ada_perubahan: { text: 'cek selesai, ada perubahan', tone: 'blue' },
  perlu_survei: { text: 'minta survei lokasi', tone: 'blue' },
  kembalikan: { text: 'mengembalikan FPK', tone: 'amber' },
  tidak_layak: { text: 'menandai tidak layak', tone: 'red' },
};

const byNewest = (a: ActivityItem, b: ActivityItem) => b.at.localeCompare(a.at);

/** Kejadian SPK (diinput, diverifikasi, perlu revisi). */
export const spkActivity = (s: Spk, withDoc = false): ActivityItem[] => {
  const doc = withDoc ? { type: 'spk' as const, id: s.id, label: s.number } : undefined;
  const items: ActivityItem[] = [
    { key: `${s.id}-in`, at: s.inputAt, actorId: s.inputBy, text: 'SPK diinput, dikirim ke Finance', tone: 'blue', doc },
  ];
  if (s.verifiedAt) {
    if (s.status === 'perlu_revisi') {
      items.push({ key: `${s.id}-rev`, at: s.verifiedAt, actorId: s.verifiedBy, text: 'SPK perlu revisi', note: s.revisionReason, tone: 'amber', doc });
    } else {
      items.push({ key: `${s.id}-ok`, at: s.verifiedAt, actorId: s.verifiedBy, text: 'SPK diverifikasi dan aktif', tone: 'green', doc });
    }
  }
  if (s.status === 'berakhir') items.push({ key: `${s.id}-end`, at: s.periodEnd, text: 'SPK berakhir', tone: 'slate', doc });
  return items;
};

/** Semua kejadian satu FPK, terbaru di atas. */
export const fpkActivity = (
  f: Fpk,
  spks: Spk[],
  audit: AuditEntry[],
  canSeeMoney: boolean,
  withDoc = false,
): ActivityItem[] => {
  const doc = withDoc ? { type: 'fpk' as const, id: f.id, label: f.number } : undefined;
  const items: ActivityItem[] = [];

  f.versions.forEach(v => {
    items.push({
      key: `${f.id}-v${v.no}`,
      at: v.createdAt,
      actorId: v.createdBy,
      text: v.no === 1 ? 'FPK dibuat, dikirim ke cek divisi' : `Versi ${v.no} dibuat dan dikirim ulang`,
      tone: 'slate',
      doc,
    });
  });

  f.reviews.forEach((r, i) => {
    const meta = REVIEW[r.result] ?? { text: r.result, tone: 'slate' as const };
    items.push({
      key: `${f.id}-r${i}`,
      at: r.at,
      actorId: r.actorId,
      text: `${DIV_LABEL[r.division] ?? r.division} ${meta.text}${f.versions.length > 1 ? ` (v${r.versionNo})` : ''}`,
      note: r.note,
      tone: meta.tone,
      doc,
    });
  });

  if (f.bodDecision) {
    const d = f.bodDecision;
    const map = { setujui: ['BOD menyetujui FPK', 'green'], kembalikan: ['BOD mengembalikan FPK', 'amber'], tolak: ['BOD menolak FPK', 'red'] } as const;
    items.push({ key: `${f.id}-bod`, at: d.at, actorId: d.by, text: map[d.decision][0], note: d.note, tone: map[d.decision][1], doc });
  }

  if (f.startedAt) items.push({ key: `${f.id}-start`, at: f.startedAt, text: 'Mulai jaga di site', tone: 'green', doc });
  if (f.cancelled) items.push({ key: `${f.id}-cancel`, at: f.cancelled.at, actorId: f.cancelled.by, text: 'FPK dibatalkan', note: f.cancelled.reason, tone: 'red', doc });

  // Kejadian SPK di log FPK selalu diberi label nomor SPK supaya jelas SPK yang mana
  spks.filter(s => s.fpkId === f.id).forEach(s => items.push(...spkActivity(s, true)));

  // Audit log tambahan (yang belum tercakup kejadian di atas)
  audit
    .filter(a => a.entity === 'fpk' && a.entityId === f.id)
    .filter(a => !(f.bodDecision && a.action.startsWith('Status FPK: menunggu BOD')))
    .forEach(a => items.push({
      key: a.id,
      at: a.at,
      actorId: a.actorId,
      text: a.action,
      note: a.after && (!a.hasMoney || canSeeMoney) ? a.after : undefined,
      tone: 'slate',
      doc,
    }));

  return items.sort(byNewest);
};

/** Log gabungan satu Project: semua FPK, SPK (termasuk data awal), dan perubahan data site. */
export const projectActivity = (
  site: Site,
  fpks: Fpk[],
  spks: Spk[],
  audit: AuditEntry[],
  canSeeMoney: boolean,
): ActivityItem[] => {
  const items: ActivityItem[] = [];
  fpks.forEach(f => items.push(...fpkActivity(f, spks, audit, canSeeMoney, true)));
  // SPK tanpa FPK induk (data awal) tetap masuk log project
  spks.filter(s => s.siteId === site.id && (!s.fpkId || !fpks.some(f => f.id === s.fpkId)))
    .forEach(s => items.push(...spkActivity(s, true)));
  // Perubahan data site (alamat, PIC, dsb.)
  audit
    .filter(a => a.entityId === site.id)
    .forEach(a => items.push({ key: a.id, at: a.at, actorId: a.actorId, text: a.action, note: a.after && (!a.hasMoney || canSeeMoney) ? a.after : undefined, tone: 'slate' }));
  return items.sort(byNewest);
};
