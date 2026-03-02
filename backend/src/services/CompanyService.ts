import { query } from '../utils/database';
import { sqlNow } from '../utils/sql';

function camelize(obj: any): any {
  if (Array.isArray(obj)) return obj.map(camelize);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        const camelKey = k.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
        return [camelKey, camelize(v)];
      })
    );
  }
  return obj;
}

export class CompanyService {
  static async getLatest() {
    const result = await query('SELECT * FROM company_info ORDER BY id DESC LIMIT 1');
    if (!result || result.length === 0) return null;
    return camelize(result[0]);
  }

  static async upsert(info: any) {
    // simple upsert: insert a new row
    const sql = `INSERT INTO company_info
      (name, legal_name, email, phone, address, city, state, country, postal_code, logo_url, description, terms, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,${sqlNow()},${sqlNow()}) RETURNING *`;
    const values = [
      info.name,
      info.legalName || info.legal_name,
      info.email,
      info.phone,
      info.address,
      info.city,
      info.state,
      info.country,
      info.postalCode || info.postal_code,
      info.logoUrl || info.logo_url,
      info.description,
      info.terms,
    ];
    const res = await query(sql, values);
    return camelize(res[0]);
  }
}

export default CompanyService;
