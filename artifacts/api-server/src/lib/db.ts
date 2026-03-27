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
  `);
}

export async function validateToken(token: string): Promise<{ valid: boolean; reason?: string }> {
  const result = await pool.query(
    `SELECT id, is_active, expires_at FROM api_tokens WHERE token = $1`,
    [token]
  );

  if (result.rowCount === 0) return { valid: false, reason: "Token tidak ditemukan" };

  const row = result.rows[0];
  if (!row.is_active) return { valid: false, reason: "Token telah dinonaktifkan" };
  if (new Date(row.expires_at) < new Date()) return { valid: false, reason: "Token sudah expired" };

  return { valid: true };
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
    `SELECT id, token, label, created_at, expires_at, is_active FROM api_tokens ORDER BY created_at DESC`
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
