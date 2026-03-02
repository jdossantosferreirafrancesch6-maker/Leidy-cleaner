export const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL?.startsWith('sqlite') ? 'sqlite' : 'postgres');

export function sqlNow() {
  return DB_TYPE === 'sqlite' ? "CURRENT_TIMESTAMP" : "NOW()";
}

export function sqlAgoHours(hours: number) {
  if (DB_TYPE === 'sqlite') return `datetime('now','-${hours} hours')`;
  return `NOW() - INTERVAL '${hours} hours'`;
}

export function sqlAgoDays(days: number) {
  if (DB_TYPE === 'sqlite') return `datetime('now','-${days} days')`;
  return `NOW() - INTERVAL '${days} days'`;
}

export function sqlMonth(dateExpr = 'created_at') {
  if (DB_TYPE === 'sqlite') return `strftime('%Y-%m', ${dateExpr})`;
  return `to_char(${dateExpr}, 'YYYY-MM')`;
}
