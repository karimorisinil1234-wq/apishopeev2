import { useState, useEffect } from "react";

type View = "login" | "dashboard" | "checker";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

const API_BASE = "";

async function verifyApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify?apikey=${encodeURIComponent(key)}`);
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="ml-2 px-3 py-1 text-xs rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition font-medium"
    >
      {copied ? "✓ Disalin" : "Salin"}
    </button>
  );
}

function LoginView({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    const valid = await verifyApiKey(key.trim());
    setLoading(false);
    if (valid) {
      localStorage.setItem("shopee_apikey", key.trim());
      onLogin(key.trim());
    } else {
      setError("API Key tidak valid atau sudah expired");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 shadow-lg mb-4">
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Shopee Phone Checker</h1>
          <p className="text-gray-500 mt-1 text-sm">Masukkan API Key untuk melanjutkan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <input
              type="text"
              placeholder="Masukkan API Key kamu..."
              value={key}
              onChange={e => setKey(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent font-mono text-sm disabled:bg-gray-50 disabled:text-gray-400 transition"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="mt-4 w-full py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Memverifikasi...
                </>
              ) : "Masuk"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            Hubungi admin untuk mendapatkan API Key
          </p>
        </div>
      </div>
    </div>
  );
}

function Navbar({ view, setView, apiKey, onLogout }: {
  view: View;
  setView: (v: View) => void;
  apiKey: string;
  onLogout: () => void;
}) {
  return (
    <nav className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z"/>
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-sm">Shopee Checker</span>
      </div>
      <button
        onClick={() => setView("dashboard")}
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${view === "dashboard" ? "bg-orange-100 text-orange-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
      >
        Dashboard
      </button>
      <button
        onClick={() => setView("checker")}
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${view === "checker" ? "bg-orange-100 text-orange-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
      >
        Cek Nomor
      </button>
      <button
        onClick={onLogout}
        className="ml-auto text-xs text-gray-500 hover:text-red-600 transition"
      >
        Keluar
      </button>
    </nav>
  );
}

function DashboardView({ apiKey }: { apiKey: string }) {
  const masked = apiKey.slice(0, 8) + "••••••••••••••••" + apiKey.slice(-6);
  const [show, setShow] = useState(false);
  const baseUrl = window.location.origin;

  const docs = [
    {
      method: "GET",
      path: "/shopee/health",
      auth: false,
      desc: "Cek status service",
      example: `curl "${baseUrl}/shopee/health"`,
      response: `{ "status": "ok", "version": "5.0.0", "pool_size": 2 }`,
    },
    {
      method: "GET",
      path: "/shopee/check",
      auth: true,
      desc: "Cek apakah nomor HP terdaftar di Shopee",
      params: [
        { name: "phone", required: true, desc: "Nomor HP Indonesia (format: 08xx atau 628xx)" },
        { name: "apikey", required: true, desc: "API Key kamu" },
      ],
      example: `curl "${baseUrl}/shopee/check?phone=081234567890&apikey=${apiKey.slice(0, 8)}..."`,
      response: `{ "phone": "628123...", "registered": true, "message": "Nomor terdaftar di Shopee" }`,
    },
    {
      method: "GET",
      path: "/api/auth/verify",
      auth: false,
      desc: "Verifikasi apakah API Key valid",
      params: [
        { name: "apikey", required: true, desc: "API Key yang akan diverifikasi" },
      ],
      example: `curl "${baseUrl}/api/auth/verify?apikey=${apiKey.slice(0, 8)}..."`,
      response: `{ "valid": true }`,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">API Key Kamu</h2>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <code className="flex-1 text-sm font-mono text-gray-700 break-all">
            {show ? apiKey : masked}
          </code>
          <button
            onClick={() => setShow(s => !s)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
          >
            {show ? "Sembunyikan" : "Tampilkan"}
          </button>
          <CopyBtn text={apiKey} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Jangan bagikan API Key ini ke siapapun. Gunakan di header <code className="bg-gray-100 px-1 rounded">X-Api-Key</code> atau query param <code className="bg-gray-100 px-1 rounded">apikey</code>.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Dokumentasi API</h2>

        {docs.map((doc, i) => (
          <div key={i} className={`mb-6 ${i < docs.length - 1 ? "pb-6 border-b border-gray-100" : ""}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg">{doc.method}</span>
              <code className="text-sm font-mono text-gray-800">{doc.path}</code>
              {doc.auth && (
                <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  🔑 Auth required
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{doc.desc}</p>

            {doc.params && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parameter</p>
                <div className="space-y-1">
                  {doc.params.map((p, j) => (
                    <div key={j} className="flex items-start gap-2 text-sm">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 mt-0.5">{p.name}</code>
                      {p.required && <span className="text-red-500 text-xs mt-0.5">*</span>}
                      <span className="text-gray-600 text-xs">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">Contoh Request</span>
                <CopyBtn text={doc.example} />
              </div>
              <pre className="text-xs text-green-400 font-mono px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all">{doc.example}</pre>
            </div>
            <div className="bg-gray-900 rounded-xl overflow-hidden mt-2">
              <div className="px-4 py-2 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">Contoh Respons</span>
              </div>
              <pre className="text-xs text-blue-300 font-mono px-4 py-3 overflow-x-auto">{doc.response}</pre>
            </div>
          </div>
        ))}

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-800 mb-1">Kode Status HTTP</p>
          <div className="space-y-1 text-xs text-amber-700">
            <div><code className="bg-amber-100 px-1 rounded">200</code> — Berhasil</div>
            <div><code className="bg-amber-100 px-1 rounded">401</code> — API Key tidak valid / expired</div>
            <div><code className="bg-amber-100 px-1 rounded">503</code> — Service sedang tidak tersedia</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckerView({ apiKey }: { apiKey: string }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "registered" | "not_registered" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCheck() {
    const normalized = formatPhone(phone.trim());
    if (normalized.length < 10) {
      setErrorMsg("Masukkan nomor telepon yang valid");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/shopee/check?phone=${encodeURIComponent(normalized)}&apikey=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || data.detail || "Terjadi kesalahan");
        setStatus("error");
        return;
      }
      setStatus(data.registered ? "registered" : "not_registered");
    } catch {
      setErrorMsg("Tidak dapat terhubung ke server");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Cek Nomor HP</h2>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon</label>
        <div className="flex gap-2">
          <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium select-none">
            +62
          </div>
          <input
            type="tel"
            placeholder="8xx xxxx xxxx"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCheck()}
            disabled={status === "loading"}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400 transition"
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={status === "loading" || !phone.trim()}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Mengecek...
            </>
          ) : "Cek Nomor"}
        </button>

        {status === "registered" && (
          <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-800">Terdaftar</p>
              <p className="text-sm text-green-600">Nomor ini sudah terdaftar di Shopee</p>
            </div>
          </div>
        )}
        {status === "not_registered" && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Tidak Terdaftar</p>
              <p className="text-sm text-gray-500">Nomor ini belum terdaftar di Shopee</p>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">Hasil cek biasanya memakan waktu ~10 detik</p>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("shopee_apikey");
    if (stored) {
      verifyApiKey(stored).then(valid => {
        if (valid) setApiKey(stored);
        else localStorage.removeItem("shopee_apikey");
        setChecking(false);
      });
    } else {
      setChecking(false);
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("shopee_apikey");
    setApiKey(null);
    setView("dashboard");
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-orange-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  if (!apiKey) return <LoginView onLogin={key => { setApiKey(key); setView("dashboard"); }} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar view={view} setView={setView} apiKey={apiKey} onLogout={handleLogout} />
      {view === "dashboard" ? <DashboardView apiKey={apiKey} /> : <CheckerView apiKey={apiKey} />}
    </div>
  );
}
