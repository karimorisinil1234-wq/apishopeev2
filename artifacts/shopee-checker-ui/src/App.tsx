import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────── */
type View = "checker" | "docs";
type Lang = "python" | "nodejs" | "php";
type CheckStatus = "idle" | "loading" | "registered" | "not_registered" | "error";

/* ─── Helpers ────────────────────────────────────────────── */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("62")) return d;
  return "62" + d;
}

async function verifyApiKey(key: string): Promise<boolean> {
  try {
    const r = await fetch(`/api/auth/verify?apikey=${encodeURIComponent(key)}`);
    return (await r.json()).valid === true;
  } catch { return false; }
}

/* ─── Cursor Effect ─────────────────────────────────────── */
function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      if (dotRef.current) { dotRef.current.style.left = x + "px"; dotRef.current.style.top = y + "px"; }
      rx += (x - rx) * 0.12; ry += (y - ry) * 0.12;
      if (ringRef.current) { ringRef.current.style.left = rx + "px"; ringRef.current.style.top = ry + "px"; }
    };
    let raf: number;
    const loop = () => { raf = requestAnimationFrame(loop); };
    loop();
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div ref={dotRef} style={{ position: "fixed", width: 8, height: 8, borderRadius: "50%", background: "#ee4d2d", pointerEvents: "none", transform: "translate(-50%,-50%)", zIndex: 99999, transition: "background .2s" }} />
      <div ref={ringRef} style={{ position: "fixed", width: 32, height: 32, borderRadius: "50%", border: "2px solid #ee4d2d", pointerEvents: "none", transform: "translate(-50%,-50%)", zIndex: 99998, opacity: 0.5, transition: "left .08s,top .08s,opacity .2s" }} />
    </>
  );
}

/* ─── 3D Card Hook ──────────────────────────────────────── */
function use3D() {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -14;
    el.style.transform = `perspective(700px) rotateY(${x}deg) rotateX(${y}deg) scale3d(1.02,1.02,1.02)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "perspective(700px) rotateY(0) rotateX(0) scale3d(1,1,1)";
  }, []);
  return { ref, onMove, onLeave };
}

/* ─── Copy Button ───────────────────────────────────────── */
function CopyBtn({ text, dark }: { text: string; dark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`ml-2 px-3 py-1 text-xs rounded-lg font-medium transition ${dark ? "bg-orange-900 text-orange-300 hover:bg-orange-800" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}>
      {copied ? "✓ Disalin" : "Salin"}
    </button>
  );
}

/* ─── Code Tab ──────────────────────────────────────────── */
const CODE: Record<string, Record<Lang, string>> = {
  check: {
    python: `import requests

api_key = "YOUR_API_KEY"
phone   = "081234567890"

resp = requests.get(
    "https://your-domain/shopee/check",
    params={"phone": phone, "apikey": api_key},
    timeout=30
)
print(resp.json())
# {'registered': True, 'phone': '628...', 'message': '...'}`,
    nodejs: `const apiKey = "YOUR_API_KEY";
const phone  = "081234567890";

const url = \`https://your-domain/shopee/check?phone=\${phone}&apikey=\${apiKey}\`;
const res  = await fetch(url);
const data = await res.json();
console.log(data);
// { registered: true, phone: '628...', message: '...' }`,
    php: `<?php
$apiKey = "YOUR_API_KEY";
$phone  = "081234567890";

$url  = "https://your-domain/shopee/check"
      . "?phone=" . urlencode($phone)
      . "&apikey=" . urlencode($apiKey);

$json = file_get_contents($url);
$data = json_decode($json, true);
print_r($data);
// Array ( [registered] => 1 [phone] => 628... )
?>`,
  },
  health: {
    python: `import requests
resp = requests.get("https://your-domain/shopee/health")
print(resp.json())  # {"status": "ok", "version": "5.0.0"}`,
    nodejs: `const res  = await fetch("https://your-domain/shopee/health");
const data = await res.json();
console.log(data); // { status: 'ok', version: '5.0.0' }`,
    php: `<?php
$json = file_get_contents("https://your-domain/shopee/health");
print_r(json_decode($json, true));
?>`,
  },
  verify: {
    python: `import requests
resp = requests.get(
    "https://your-domain/api/auth/verify",
    params={"apikey": "YOUR_API_KEY"}
)
print(resp.json())  # {"valid": True}`,
    nodejs: `const res  = await fetch("https://your-domain/api/auth/verify?apikey=YOUR_API_KEY");
const data = await res.json();
console.log(data); // { valid: true }`,
    php: `<?php
$url  = "https://your-domain/api/auth/verify?apikey=" . urlencode("YOUR_API_KEY");
print_r(json_decode(file_get_contents($url), true));
?>`,
  },
};

function CodeBlock({ endpointKey, dark }: { endpointKey: string; dark: boolean }) {
  const [lang, setLang] = useState<Lang>("python");
  const code = CODE[endpointKey]?.[lang] ?? "";
  const langs: Lang[] = ["python", "nodejs", "php"];
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {langs.map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-3 py-1 text-xs rounded-t-lg font-mono font-semibold transition ${lang === l ? "bg-gray-900 text-orange-400" : dark ? "bg-gray-700 text-gray-400 hover:text-gray-200" : "bg-gray-200 text-gray-600 hover:text-gray-800"}`}>
            {l === "nodejs" ? "Node.js" : l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 rounded-b-xl rounded-tr-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">Contoh Request</span>
          <CopyBtn text={code} dark={dark} />
        </div>
        <pre className="text-xs text-green-400 font-mono px-4 py-3 overflow-x-auto leading-relaxed">{code}</pre>
      </div>
    </div>
  );
}

/* ─── Attribution Badge ─────────────────────────────────── */
function AttrBadge({ dark }: { dark: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? "bg-orange-900/50 text-orange-400" : "bg-orange-50 text-orange-600 border border-orange-200"}`}>
      ⚡ dibuat oleh injectorapiv7 · khusus cek nomor Shopee terdaftar
    </span>
  );
}

/* ─── Login View ─────────────────────────────────────────── */
function LoginView({ onLogin, dark }: { onLogin: (k: string) => void; dark: boolean }) {
  const [key, setKey] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const { ref, onMove, onLeave } = use3D();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!key.trim()) return;
    setLoading(true); setErr("");
    const valid = await verifyApiKey(key.trim());
    setLoading(false);
    if (valid) { localStorage.setItem("shopee_apikey", key.trim()); onLogin(key.trim()); }
    else setErr("API Key tidak valid atau sudah expired");
  }
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${dark ? "bg-gray-950" : "bg-gradient-to-br from-orange-50 via-white to-red-50"}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl shadow-orange-500/40 mb-5">
            <svg viewBox="0 0 24 24" className="w-11 h-11 fill-white"><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>
          </div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>Shopee Phone Checker <span className="text-orange-500">ApiV2</span></h1>
          <p className={`mt-1 text-sm font-medium ${dark ? "text-orange-400" : "text-orange-600"}`}>Shopee Checker P3sstar</p>
          <p className={`mt-2 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Masukkan API Key untuk melanjutkan</p>
        </div>
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transition: "transform .15s ease-out" }}>
          <div className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
            <form onSubmit={submit}>
              <label className={`block text-sm font-medium mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>API Key</label>
              <input type="text" value={key} onChange={e => setKey(e.target.value)} disabled={loading}
                placeholder="Masukkan API Key kamu..."
                className={`w-full px-4 py-3 rounded-xl border font-mono text-sm outline-none transition ${dark ? "bg-gray-900 border-gray-600 text-gray-200 focus:border-orange-500 placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"} disabled:opacity-50`} />
              {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
              <button type="submit" disabled={loading || !key.trim()}
                className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30">
                {loading ? <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Memverifikasi...</> : "Masuk →"}
              </button>
            </form>
            <p className={`text-center text-xs mt-4 ${dark ? "text-gray-600" : "text-gray-400"}`}>Hubungi admin untuk mendapatkan API Key</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────── */
function Navbar({ view, setView, dark, setDark, onLogout }: { view: View; setView: (v: View) => void; dark: boolean; setDark: (d: boolean) => void; onLogout: () => void }) {
  return (
    <nav className={`sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center gap-3 border-b backdrop-blur-md ${dark ? "bg-gray-900/90 border-gray-800" : "bg-white/90 border-gray-100"} shadow-sm`}>
      <div className="flex items-center gap-2.5 mr-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/30">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>
        </div>
        <div>
          <div className={`font-extrabold text-sm leading-tight ${dark ? "text-white" : "text-gray-900"}`}>Shopee Checker <span className="text-orange-500">ApiV2</span></div>
          <div className={`text-xs leading-tight font-medium ${dark ? "text-orange-400" : "text-orange-600"}`}>P3sstar</div>
        </div>
      </div>
      {(["checker", "docs"] as View[]).map(v => (
        <button key={v} onClick={() => setView(v)}
          className={`text-sm font-semibold px-4 py-2 rounded-xl transition ${view === v ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
          {v === "checker" ? "Cek Nomor" : "Dokumentasi"}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => { setDark(!dark); localStorage.setItem("dark", String(!dark)); }}
          className={`p-2 rounded-xl transition ${dark ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} title="Toggle dark mode">
          {dark ? "☀️" : "🌙"}
        </button>
        <button onClick={onLogout} className={`text-xs px-3 py-2 rounded-xl transition font-medium ${dark ? "text-gray-500 hover:text-red-400 hover:bg-gray-800" : "text-gray-500 hover:text-red-600 hover:bg-red-50"}`}>Keluar</button>
      </div>
    </nav>
  );
}

/* ─── Checker View ───────────────────────────────────────── */
function CheckerView({ apiKey, dark }: { apiKey: string; dark: boolean }) {
  const [phone, setPhone] = useState(""); const [status, setStatus] = useState<CheckStatus>("idle"); const [errMsg, setErrMsg] = useState("");
  const { ref, onMove, onLeave } = use3D();
  const masked = apiKey.slice(0, 8) + "••••••" + apiKey.slice(-6);
  const [showKey, setShowKey] = useState(false);

  async function check() {
    const norm = formatPhone(phone.trim());
    if (norm.length < 10) { setErrMsg("Nomor HP tidak valid"); setStatus("error"); return; }
    setStatus("loading"); setErrMsg("");
    try {
      const r = await fetch(`/shopee/check?phone=${encodeURIComponent(norm)}&apikey=${encodeURIComponent(apiKey)}`);
      const d = await r.json();
      if (!r.ok || d.error || d.status === "error") {
        setErrMsg("Server error, silahkan hubungi admin");
        setStatus("error");
        return;
      }
      if (typeof d.registered !== "boolean") {
        setErrMsg("Server error, silahkan hubungi admin");
        setStatus("error");
        return;
      }
      setStatus(d.registered ? "registered" : "not_registered");
    } catch { setErrMsg("Server error, silahkan hubungi admin"); setStatus("error"); }
  }

  const c = {
    card: dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100",
    input: dark ? "bg-gray-900 border-gray-600 text-gray-200 placeholder-gray-600 focus:border-orange-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
    prefix: dark ? "bg-gray-900 border-gray-600 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500",
    label: dark ? "text-gray-300" : "text-gray-700",
  };

  return (
    <div className={`min-h-screen pb-16 ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* API Key Card */}
        <div className={`rounded-2xl border shadow-sm p-5 mb-6 ${c.card}`}>
          <div className={`text-xs font-semibold mb-2 uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>API Key Aktif</div>
          <div className="flex items-center gap-2">
            <code className={`flex-1 text-sm font-mono break-all ${dark ? "text-gray-300" : "text-gray-700"}`}>{showKey ? apiKey : masked}</code>
            <button onClick={() => setShowKey(s => !s)} className={`text-xs px-2 py-1 rounded transition ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-700"}`}>{showKey ? "Sembunyikan" : "Lihat"}</button>
            <CopyBtn text={apiKey} dark={dark} />
          </div>
        </div>

        {/* Checker Form */}
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transition: "transform .18s ease-out" }}>
          <div className={`rounded-2xl border shadow-xl p-6 ${c.card}`}>
            <h2 className={`text-lg font-bold mb-5 ${dark ? "text-white" : "text-gray-900"}`}>🔍 Cek Nomor HP</h2>
            <label className={`block text-sm font-medium mb-2 ${c.label}`}>Nomor Telepon</label>
            <div className="flex gap-2">
              <div className={`flex items-center px-3 border rounded-xl text-sm font-bold select-none flex-shrink-0 ${c.prefix}`}>+62</div>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && check()} disabled={status === "loading"}
                placeholder="8xx xxxx xxxx"
                className={`flex-1 px-4 py-3 border rounded-xl text-sm outline-none transition disabled:opacity-50 ${c.input}`} />
            </div>
            <button onClick={check} disabled={status === "loading" || !phone.trim()}
              className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30">
              {status === "loading" ? <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Mengecek (~10 detik)...</> : "Cek Nomor"}
            </button>

            {status === "registered" && (
              <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                </div>
                <div><p className="font-bold text-green-800">✅ Terdaftar di Shopee</p><p className="text-sm text-green-600">Nomor ini memiliki akun Shopee aktif</p></div>
              </div>
            )}
            {status === "not_registered" && (
              <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${dark ? "bg-gray-700 border border-gray-600" : "bg-gray-50 border border-gray-200"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? "bg-gray-600" : "bg-gray-100"}`}>
                  <svg className="w-6 h-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                </div>
                <div><p className={`font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>❌ Tidak Terdaftar</p><p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Nomor ini belum terdaftar di Shopee</p></div>
              </div>
            )}
            {status === "error" && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                </div>
                <div><p className="font-bold text-red-800">⚠️ Terjadi Kesalahan</p><p className="text-sm text-red-600">{errMsg}</p></div>
              </div>
            )}
          </div>
        </div>
        <p className={`text-center text-xs mt-4 ${dark ? "text-gray-700" : "text-gray-400"}`}>Hasil cek biasanya ~10 detik · injectorapiv7</p>
      </div>
    </div>
  );
}

/* ─── Docs View ──────────────────────────────────────────── */
function DocsView({ apiKey, dark }: { apiKey: string; dark: boolean }) {
  const { ref: r1, onMove: m1, onLeave: l1 } = use3D();
  const { ref: r2, onMove: m2, onLeave: l2 } = use3D();
  const { ref: r3, onMove: m3, onLeave: l3 } = use3D();
  const baseUrl = window.location.origin;

  const c = {
    page: dark ? "bg-gray-950" : "bg-gray-50",
    card: dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100",
    text: dark ? "text-gray-300" : "text-gray-600",
    head: dark ? "text-white" : "text-gray-900",
    sub: dark ? "text-gray-500" : "text-gray-400",
    divider: dark ? "border-gray-700" : "border-gray-100",
  };

  const endpointCard = (
    ref: React.RefObject<HTMLDivElement | null>,
    onMove: (e: React.MouseEvent) => void,
    onLeave: () => void,
    method: string,
    path: string,
    auth: boolean,
    desc: string,
    params: { name: string; req: boolean; desc: string }[],
    response: string,
    codeKey: string,
    note?: string
  ) => (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transition: "transform .18s ease-out" }}>
      <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${c.card}`}>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-extrabold rounded-lg">{method}</span>
          <code className={`text-sm font-mono font-bold ${c.head}`}>{path}</code>
          {auth && <span className="px-2.5 py-1 text-xs bg-orange-100 text-orange-700 rounded-full font-semibold">🔑 Auth</span>}
          <div className="ml-auto"><AttrBadge dark={dark} /></div>
        </div>

        <p className={`text-sm mb-4 ${c.text}`}>{desc}</p>

        {note && (
          <div className={`text-xs rounded-xl p-3 mb-4 ${dark ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            ⚠️ {note}
          </div>
        )}

        {params.length > 0 && (
          <div className="mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${c.sub}`}>Parameter</p>
            <div className={`rounded-xl border divide-y ${dark ? "border-gray-700 divide-gray-700" : "border-gray-100 divide-gray-100"}`}>
              {params.map((p, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <code className={`text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${dark ? "bg-gray-700 text-orange-400" : "bg-gray-100 text-orange-600"}`}>{p.name}</code>
                  {p.req && <span className="text-red-500 text-xs flex-shrink-0 mt-0.5">*wajib</span>}
                  <span className={`text-xs ${c.text}`}>{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <CodeBlock endpointKey={codeKey} dark={dark} />

        <div className={`mt-4 bg-gray-900 rounded-xl overflow-hidden`}>
          <div className={`px-4 py-2 border-b border-gray-700 text-xs text-gray-400 font-mono`}>Contoh Respons</div>
          <pre className="text-xs text-blue-300 font-mono px-4 py-3 overflow-x-auto">{response}</pre>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-16 ${c.page}`}>
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <div className="mb-6">
          <h2 className={`text-2xl font-extrabold ${c.head}`}>Dokumentasi API</h2>
          <p className={`text-sm mt-1 ${c.text}`}>Base URL: <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${dark ? "bg-gray-700 text-orange-400" : "bg-gray-100 text-orange-600"}`}>{baseUrl}</code></p>
          <p className={`text-xs mt-1 ${c.sub}`}>API Key: sertakan di query param <code className={`${dark ? "bg-gray-700" : "bg-gray-100"} px-1 rounded`}>apikey</code> atau header <code className={`${dark ? "bg-gray-700" : "bg-gray-100"} px-1 rounded`}>X-Api-Key</code></p>
        </div>

        {endpointCard(r1, m1, l1, "GET", "/shopee/check", true, "Cek apakah nomor HP terdaftar di Shopee. Waktu proses ±10 detik karena inject langsung di server Shopee.",
          [{ name: "phone", req: true, desc: "Nomor HP Indonesia (format: 08xx atau 628xx)" }, { name: "apikey", req: true, desc: "API Key kamu yang masih aktif" }],
          `{ "registered": true, "phone": "628123...", "message": "Nomor terdaftar di Shopee", "elapsed_ms": 8700 }`,
          "check", "Jika terjadi error, harap maklumi — kami inject langsung di server Shopee")}

        {endpointCard(r2, m2, l2, "GET", "/shopee/health", false, "Cek status dan ketersediaan service Shopee Phone Checker.",
          [],
          `{ "status": "ok", "version": "5.0.0", "pool_size": 2 }`,
          "health")}

        {endpointCard(r3, m3, l3, "GET", "/api/auth/verify", false, "Verifikasi apakah API Key valid dan belum expired.",
          [{ name: "apikey", req: true, desc: "API Key yang akan diverifikasi" }],
          `{ "valid": true }`,
          "verify")}

        <div className={`rounded-2xl border p-5 mt-6 ${dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${c.sub}`}>Kode Status HTTP</p>
          <div className="space-y-2">
            {[["200", "Berhasil", "green"], ["401", "API Key tidak valid, tidak ada, atau sudah expired", "yellow"], ["503", "Service Shopee sedang tidak tersedia / sedang dimaintenance", "red"]].map(([code, desc, color]) => (
              <div key={code} className="flex items-start gap-3 text-sm">
                <code className={`text-xs px-2 py-0.5 rounded font-mono font-bold flex-shrink-0 ${color === "green" ? "bg-green-100 text-green-700" : color === "yellow" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{code}</code>
                <span className={c.text}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`text-center text-xs mt-8 ${c.sub}`}>
          Shopee Phone Checker ApiV2 · Shopee Checker P3sstar · dibuat oleh injectorapiv7
        </div>
      </div>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────── */
export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [view, setView] = useState<View>("checker");
  const [dark, setDark] = useState(() => localStorage.getItem("dark") === "true");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("shopee_apikey");
    if (stored) {
      verifyApiKey(stored).then(v => {
        if (v) setApiKey(stored); else localStorage.removeItem("shopee_apikey");
        setChecking(false);
      });
    } else setChecking(false);
  }, []);

  function logout() { localStorage.removeItem("shopee_apikey"); setApiKey(null); setView("checker"); }

  if (checking) return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
      <svg className="animate-spin w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );

  return (
    <div style={{ cursor: "none" }}>
      <Cursor />
      <style>{`* { cursor: none !important; }`}</style>
      {!apiKey
        ? <LoginView onLogin={k => { setApiKey(k); setView("checker"); }} dark={dark} />
        : <>
            <Navbar view={view} setView={setView} dark={dark} setDark={setDark} onLogout={logout} />
            {view === "checker" ? <CheckerView apiKey={apiKey} dark={dark} /> : <DocsView apiKey={apiKey} dark={dark} />}
          </>
      }
    </div>
  );
}
