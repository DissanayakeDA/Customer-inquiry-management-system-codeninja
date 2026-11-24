import { MAX_INT_ID, type InquiryStatus, type StatusCounts } from '@inquirydesk/shared';
import { isUniqueViolation, type DbPool } from '../db/pool';
import type { Inquiry, InquiryChanges, NewInquiry } from '../domain/inquiry';
import type {
  CreateInquiryResult,
  InquiryCriteria,
  InquiryPage,
  InquiryPageRequest,
  InquiryRepository,
  UpdateInquiryResult,
} from './inquiry-repository';
import { SqlWhere, escapeLike } from './sql-where';

const DUPLICATE_GUARD_INDEX = 'inquiries_open_duplicate_guard';

interface InquiryRow {
  id: number;
  customer_name: string;
  contact: string;
  subject: string;
  description: string;
  status: InquiryStatus;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  created_by_name: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  updated_by: number;
  updated_by_name: string;
}

/**
 * Selects inquiries with the names of the people involved. `source` is the table or CTE to read
 * from, which lets INSERT/UPDATE ... RETURNING reuse the same projection in a single round trip.
 */
const selectInquiriesFrom = (source: string) => `
  SELECT i.id, i.customer_name, i.contact, i.subject, i.description, i.status, i.version,
         i.created_at, i.updated_at,
         i.created_by,  creator.name  AS created_by_name,
         i.assigned_to, assignee.name AS assigned_to_name,
         i.updated_by,  editor.name   AS updated_by_name
    FROM ${source} i
    JOIN users creator       ON creator.id  = i.created_by
    LEFT JOIN users assignee ON assignee.id = i.assigned_to
    JOIN users editor        ON editor.id   = i.updated_by`;

function toInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    customerName: row.customer_name,
    contact: row.contact,
    subject: row.subject,
    description: row.description,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: { id: row.created_by, name: row.created_by_name },
    assignedTo: row.assigned_to === null ? null : { id: row.assigned_to, name: row.assigned_to_name ?? 'Unknown' },
    updatedBy: { id: row.updated_by, name: row.updated_by_name },
  };
}

/** "INQ-1012", "inq1012" or "1012" → 1012, so staff can search by the reference they were given. */
function parseReference(search: string): number | null {
  const match = /^(?:inq-?)?(\d{1,10})$/i.exec(search);
  if (!match) return null;
  const id = Number(match[1]);
  return id >= 1 && id <= MAX_INT_ID ? id : null;
}

export class PgInquiryRepository implements InquiryRepository {
  constructor(private readonly db: DbPool) {}

  async findById(id: number): Promise<Inquiry | null> {
    const { rows } = await this.db.query<InquiryRow>(`${selectInquiriesFrom('inquiries')} WHERE i.id = $1`, [id]);
    return rows[0] ? toInquiry(rows[0]) : null;
  }

  async findPage(request: InquiryPageRequest): Promise<InquiryPage> {
    const where = this.buildWhere(request);
    const direction = request.order === 'oldest_activity' ? 'ASC' : 'DESC';
    const limit = where.param(request.limit);
    const offset = where.param(request.offset);
    const countParams = where.params.slice(0, -2);

    const [page, count] = await Promise.all([
      this.db.query<InquiryRow>(
        `${selectInquiriesFrom('inquiries')} ${where.toSql()}
          ORDER BY i.updated_at ${direction}, i.id ${direction}
          LIMIT ${limit} OFFSET ${offset}`,
        where.params,
      ),
      this.db.query<{ total: number }>(`SELECT count(*)::int AS total FROM inquiries i ${where.toSql()}`, countParams),
    ]);

    return { items: page.rows.map(toInquiry), total: count.rows[0]?.total ?? 0 };
  }

  async countByStatus(criteria: InquiryCriteria): Promise<StatusCounts> {
    const where = this.buildWhere(criteria);
    const { rows } = await this.db.query<{ status: InquiryStatus; count: number }>(
      `SELECT i.status, count(*)::int AS count FROM inquiries i ${where.toSql()} GROUP BY i.status`,
      where.params,
    );
    const counts: StatusCounts = { new: 0, in_progress: 0, resolved: 0 };
    for (const row of rows) counts[row.status] = row.count;
    return counts;
  }

  async create(data: NewInquiry): Promise<CreateInquiryResult> {
    try {
      const { rows } = await this.db.query<InquiryRow>(
        `WITH inserted AS (
           INSERT INTO inquiries (customer_name, contact, subject, description, assigned_to, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $6)
           RETURNING *
         )
         ${selectInquiriesFrom('inserted')}`,
        [data.customerName, data.contact, data.subject, data.description, data.assignedToId, data.createdById],
      );
      return { kind: 'created', inquiry: toInquiry(rows[0]!) };
    } catch (error) {
      if (!isUniqueViolation(error, DUPLICATE_GUARD_INDEX)) throw error;
      return { kind: 'duplicate', existing: await this.findOpenDuplicate(data.contact, data.subject) };
    }
  }

  async update(id: number, expectedVersion: number, changes: InquiryChanges): Promise<UpdateInquiryResult> {
    const params: unknown[] = [id, expectedVersion, changes.updatedById];
    const assignments = ['version = version + 1', 'updated_at = now()', 'updated_by = $3'];
    if (changes.status !== undefined) assignments.push(`status = $${params.push(changes.status)}`);
    if (changes.assignedToId !== undefined) assignments.push(`assigned_to = $${params.push(changes.assignedToId)}`);

    try {
      // Compare-and-set: the WHERE on version makes "check the version, then write" one atomic step,
      // so two concurrent updates of the same version cannot both succeed.
      const { rows } = await this.db.query<InquiryRow>(
        `WITH updated AS (
           UPDATE inquiries SET ${assignments.join(', ')}
            WHERE id = $1 AND version = $2
            RETURNING *
         )
         ${selectInquiriesFrom('updated')}`,
        params,
      );
      return rows[0] ? { kind: 'updated', inquiry: toInquiry(rows[0]) } : { kind: 'stale' };
    } catch (error) {
      if (!isUniqueViolation(error, DUPLICATE_GUARD_INDEX)) throw error;
      const target = await this.findById(id);
      const existing = target ? await this.findOpenDuplicate(target.contact, target.subject, id) : null;
      return { kind: 'duplicate', existing };
    }
  }

  /** The open inquiry that the duplicate guard index matched, using the same normalisation functions. */
  private async findOpenDuplicate(contact: string, subject: string, excludeId?: number): Promise<Inquiry | null> {
    const { rows } = await this.db.query<InquiryRow>(
      `${selectInquiriesFrom('inquiries')}
        WHERE normalize_contact(i.contact) = normalize_contact($1)
          AND normalize_subject(i.subject) = normalize_subject($2)
          AND i.status <> 'resolved'
          AND ($3::int IS NULL OR i.id <> $3)
        LIMIT 1`,
      [contact, subject, excludeId ?? null],
    );
    return rows[0] ? toInquiry(rows[0]) : null;
  }

  private buildWhere(criteria: InquiryCriteria): SqlWhere {
    const where = new SqlWhere();

    // Access control first: every list/count query is restricted to what the user may see.
    if (criteria.scope.kind === 'involving') {
      const me = where.param(criteria.scope.userId);
      where.and(`(i.created_by = ${me} OR i.assigned_to = ${me})`);
    }

    if (criteria.statuses && criteria.statuses.length > 0) {
      where.and(`i.status = ANY(${where.param(criteria.statuses)}::inquiry_status[])`);
    }

    if (criteria.assignee?.kind === 'none') where.and('i.assigned_to IS NULL');
    if (criteria.assignee?.kind === 'user') where.and(`i.assigned_to = ${where.param(criteria.assignee.userId)}`);

    if (criteria.search) {
      const pattern = where.param(`%${escapeLike(criteria.search)}%`);
      const textMatch = `i.customer_name ILIKE ${pattern} OR i.contact ILIKE ${pattern} OR i.subject ILIKE ${pattern}`;
      const referenceId = parseReference(criteria.search);
      where.and(referenceId ? `(${textMatch} OR i.id = ${where.param(referenceId)})` : `(${textMatch})`);
    }

    return where;
  }
}
