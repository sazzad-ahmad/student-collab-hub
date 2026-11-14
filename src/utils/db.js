import { pool } from '../../config/database.js';

export async function paginate(sql, params, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const dataSql = `${sql} LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;

  const [data, countResult] = await Promise.all([
    pool.execute(dataSql, [...params, limit, offset]),
    pool.execute(countSql, params),
  ]);

  const total = countResult[0][0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: data[0],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
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