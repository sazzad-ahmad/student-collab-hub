import { pool } from '../../config/database.js';

export async function paginate(sql, params, page = 1, limit = 20) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));
  const safeOffset = (safePage - 1) * safeLimit;
  const dataSql = `${sql} LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;

  const [data, countResult] = await Promise.all([
    pool.execute(dataSql, params),
    pool.execute(countSql, params),
  ]);

  const total = countResult[0][0]?.total ?? 0;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: data[0],
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}

export function buildWhereClause(filters, allowedFields) {
  const conditions = [];
  const values = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && allowedFields.includes(key)) {
      conditions.push(`${key} = ?`);
      values.push(value);
    }
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}