import { Router } from "express";
import type { Request, Response } from "express";
import { createToken, listTokens, revokeToken, deleteToken } from "../lib/db";

const router = Router();
const ADMIN_PATH = "/admin12345";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Bonekori123@";

function isAdminAuthed(req: Request): boolean {
  return req.session?.adminAuthed === true;
}

function adminLayout(content: string, title = "Admin Panel"): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} – Shopee Checker Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f8f9fa;color:#212529;min-height:100vh}
    .topbar{background:#ee4d2d;color:#fff;padding:14px 24px;display:flex;align-items:center;gap:12px}
    .topbar h1{font-size:18px;font-weight:700}
    .topbar a{color:#fff;text-decoration:none;font-size:13px;margin-left:auto;opacity:.85}
    .topbar a:hover{opacity:1}
    .container{max-width:960px;margin:32px auto;padding:0 20px}
    .card{background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:28px;margin-bottom:24px}
    .card h2{font-size:16px;font-weight:600;margin-bottom:20px;color:#333}
    label{display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:#495057}
    input,select{width:100%;padding:9px 12px;border:1px solid #dee2e6;border-radius:8px;font-size:14px;font-family:inherit;outline:none;transition:.15s}
    input:focus,select:focus{border-color:#ee4d2d;box-shadow:0 0 0 3px rgba(238,77,45,.12)}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .row .col{flex:1;min-width:120px}
    .btn{padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:.15s}
    .btn-primary{background:#ee4d2d;color:#fff}.btn-primary:hover{background:#d63c20}
    .btn-danger{background:#dc3545;color:#fff;font-size:12px;padding:6px 12px}.btn-danger:hover{background:#b02a37}
    .btn-secondary{background:#6c757d;color:#fff;font-size:12px;padding:6px 12px}.btn-secondary:hover{background:#5a6268}
    .alert{padding:12px 16px;border-radius:8px;font-size:14px;margin-bottom:16px}
    .alert-success{background:#d1e7dd;color:#0f5132;border:1px solid #badbcc}
    .alert-error{background:#f8d7da;color:#842029;border:1px solid #f5c2c7}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;background:#f8f9fa;color:#6c757d;font-weight:600;border-bottom:2px solid #dee2e6}
    td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
    tr:last-child td{border-bottom:none}
    .badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-active{background:#d1e7dd;color:#0f5132}
    .badge-expired{background:#fff3cd;color:#664d03}
    .badge-revoked{background:#f8d7da;color:#842029}
    .token-val{font-family:monospace;font-size:12px;max-width:200px;word-break:break-all;color:#495057}
    .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center}
    .login-card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:40px;width:100%;max-width:380px}
    .login-card .logo{width:56px;height:56px;background:#ee4d2d;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
    .login-card h2{text-align:center;margin-bottom:24px;font-size:20px}
    .form-group{margin-bottom:16px}
    .actions{display:flex;gap:8px}
  </style>
</head>
<body>${content}</body>
</html>`;
}

router.get(ADMIN_PATH, (req: Request, res: Response) => {
  if (isAdminAuthed(req)) return res.redirect(`${ADMIN_PATH}/dashboard`);

  const err = req.query.error ? `<div class="alert alert-error">Password salah</div>` : "";
  res.send(adminLayout(`
    <div class="login-wrap">
      <div class="login-card">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
        </div>
        <h2>Admin Login</h2>
        ${err}
        <form method="POST" action="${ADMIN_PATH}/login">
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Masukkan password admin" autofocus required/>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">Masuk</button>
        </form>
      </div>
    </div>
  `, "Login"));
});

router.post(`${ADMIN_PATH}/login`, (req: Request, res: Response) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session!.adminAuthed = true;
    return res.redirect(`${ADMIN_PATH}/dashboard`);
  }
  res.redirect(`${ADMIN_PATH}?error=1`);
});

router.get(`${ADMIN_PATH}/logout`, (req: Request, res: Response) => {
  req.session?.destroy(() => {});
  res.redirect(ADMIN_PATH);
});

router.get(`${ADMIN_PATH}/dashboard`, async (req: Request, res: Response) => {
  if (!isAdminAuthed(req)) return res.redirect(ADMIN_PATH);

  const tokens = await listTokens();
  const now = new Date();

  const msg = req.query.msg
    ? `<div class="alert alert-success">${req.query.msg}</div>`
    : req.query.err
    ? `<div class="alert alert-error">${req.query.err}</div>`
    : "";

  const tokenRows = tokens.map((t) => {
    const expired = new Date(t.expires_at) < now;
    let badgeClass = "badge-active";
    let badgeText = "Aktif";
    if (!t.is_active) { badgeClass = "badge-revoked"; badgeText = "Dicabut"; }
    else if (expired) { badgeClass = "badge-expired"; badgeText = "Expired"; }

    return `<tr>
      <td><span class="token-val">${t.token}</span></td>
      <td>${t.label || "-"}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td>${new Date(t.created_at).toLocaleString("id-ID")}</td>
      <td>${new Date(t.expires_at).toLocaleString("id-ID")}</td>
      <td class="actions">
        ${t.is_active && !expired ? `<form method="POST" action="${ADMIN_PATH}/revoke" style="display:inline"><input type="hidden" name="id" value="${t.id}"/><button type="submit" class="btn btn-secondary">Cabut</button></form>` : ""}
        <form method="POST" action="${ADMIN_PATH}/delete" style="display:inline"><input type="hidden" name="id" value="${t.id}"/><button type="submit" class="btn btn-danger" onclick="return confirm('Hapus token ini?')">Hapus</button></form>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" style="text-align:center;color:#6c757d;padding:24px">Belum ada token</td></tr>`;

  res.send(adminLayout(`
    <div class="topbar">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
      <h1>Shopee Checker Admin</h1>
      <a href="${ADMIN_PATH}/logout">Keluar</a>
    </div>
    <div class="container">
      ${msg}
      <div class="card">
        <h2>Generate Token Baru</h2>
        <form method="POST" action="${ADMIN_PATH}/generate">
          <div class="form-group">
            <label>Label / Keterangan</label>
            <input type="text" name="label" placeholder="Contoh: Token untuk client A"/>
          </div>
          <div class="row" style="margin-bottom:16px">
            <div class="col">
              <label>Nilai</label>
              <input type="number" name="exp_value" value="30" min="1" required/>
            </div>
            <div class="col">
              <label>Satuan</label>
              <select name="exp_unit">
                <option value="hours">Jam</option>
                <option value="days" selected>Hari</option>
                <option value="months">Bulan</option>
                <option value="years">Tahun</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Generate Token</button>
        </form>
      </div>

      <div class="card">
        <h2>Daftar Token (${tokens.length})</h2>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Token</th><th>Label</th><th>Status</th><th>Dibuat</th><th>Expires</th><th>Aksi</th></tr></thead>
            <tbody>${tokenRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `, "Dashboard"));
});

router.post(`${ADMIN_PATH}/generate`, async (req: Request, res: Response) => {
  if (!isAdminAuthed(req)) return res.redirect(ADMIN_PATH);

  const { label, exp_value, exp_unit } = req.body;
  const val = parseInt(exp_value) || 30;

  const expiresAt = new Date();
  if (exp_unit === "hours") expiresAt.setHours(expiresAt.getHours() + val);
  else if (exp_unit === "months") expiresAt.setMonth(expiresAt.getMonth() + val);
  else if (exp_unit === "years") expiresAt.setFullYear(expiresAt.getFullYear() + val);
  else expiresAt.setDate(expiresAt.getDate() + val);

  try {
    const token = await createToken(label || "", expiresAt);
    res.redirect(`${ADMIN_PATH}/dashboard?msg=Token+berhasil+dibuat:+${token}`);
  } catch {
    res.redirect(`${ADMIN_PATH}/dashboard?err=Gagal+membuat+token`);
  }
});

router.post(`${ADMIN_PATH}/revoke`, async (req: Request, res: Response) => {
  if (!isAdminAuthed(req)) return res.redirect(ADMIN_PATH);
  await revokeToken(parseInt(req.body.id));
  res.redirect(`${ADMIN_PATH}/dashboard?msg=Token+berhasil+dicabut`);
});

router.post(`${ADMIN_PATH}/delete`, async (req: Request, res: Response) => {
  if (!isAdminAuthed(req)) return res.redirect(ADMIN_PATH);
  await deleteToken(parseInt(req.body.id));
  res.redirect(`${ADMIN_PATH}/dashboard?msg=Token+berhasil+dihapus`);
});

export default router;
