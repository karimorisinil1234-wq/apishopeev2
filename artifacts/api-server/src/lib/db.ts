import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) UNIQUE NOT NULL,
      label VARCHAR(255) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS api_logs (
      id SERIAL PRIMARY KEY,
      token_id INTEGER REFERENCES api_tokens(id) ON DELETE CASCADE,
      phone VARCHAR(30),
      status VARCHAR(20) NOT NULL DEFAULT 'success',
      error_reason TEXT,
      http_status INTEGER,
      ip VARCHAR(60),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_api_logs_token_id ON api_logs(token_id);
    CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
  `);
}

export async function validateToken(token: string): Promise<{ valid: boolean; tokenId?: number; reason?: string }> {
  const result = await pool.query(
    `SELECT id, is_active, expires_at FROM api_tokens WHERE token = $1`,
    [token]
  );

  if (result.rowCount === 0) return { valid: false, reason: "Token tidak ditemukan" };

  const row = result.rows[0];
  if (!row.is_active) return { valid: false, reason: "Token telah dinonaktifkan" };
  if (new Date(row.expires_at) < new Date()) return { valid: false, reason: "Token sudah expired" };

  return { valid: true, tokenId: row.id };
}

export async function logApiCall(
  tokenId: number,
  phone: string | undefined,
  status: "success" | "error",
  errorReason: string | null,
  httpStatus: number,
  ip: string
) {
  await pool.query(
    `INSERT INTO api_logs (token_id, phone, status, error_reason, http_status, ip) VALUES ($1, $2, $3, $4, $5, $6)`,
    [tokenId, phone || null, status, errorReason, httpStatus, ip]
  );
}

export async function createToken(label: string, expiresAt: Date): Promise<string> {
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");

  await pool.query(
    `INSERT INTO api_tokens (token, label, expires_at) VALUES ($1, $2, $3)`,
    [token, label, expiresAt]
  );

  return token;
}

export async function listTokens() {
  const result = await pool.query(
    `SELECT t.id, t.token, t.label, t.created_at, t.expires_at, t.is_active,
      COUNT(l.id) AS total_calls,
      COUNT(l.id) FILTER (WHERE l.status = 'success') AS success_count,
      COUNT(l.id) FILTER (WHERE l.status = 'error') AS error_count
     FROM api_tokens t
     LEFT JOIN api_logs l ON l.token_id = t.id
     GROUP BY t.id
     ORDER BY t.created_at DESC`
  );
  return result.rows;
}

export async function listTokenLogs(tokenId: number, limit = 50) {
  const result = await pool.query(
    `SELECT id, phone, status, error_reason, http_status, ip, created_at
     FROM api_logs WHERE token_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tokenId, limit]
  );
  return result.rows;
}

export async function revokeToken(id: number) {
  await pool.query(`UPDATE api_tokens SET is_active = FALSE WHERE id = $1`, [id]);
}

export async function deleteToken(id: number) {
  await pool.query(`DELETE FROM api_tokens WHERE id = $1`, [id]);
}

export default pool;
