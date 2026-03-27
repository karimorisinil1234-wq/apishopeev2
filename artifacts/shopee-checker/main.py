#!/usr/bin/env python3
"""
Shopee Phone Checker API - v5.1
Pendekatan:
- Buka login page dulu (buka session), lalu navigasi ke reset page via JS
- Nonaktifkan modal overlay (#modal) agar tidak memblokir klik
- Gunakan fill() + press("Enter") untuk kirim form
- Intercept respons JSON dari /api/v4/account/basic/check_account_exist
- User-Agent Windows/Mac Chrome yang nyata (bukan HeadlessChrome)
- Fallback ke scenario=3 jika scenario=7 gagal memunculkan input
- Multi-selector retry: atribut stabil (name, type, maxlength) + XPath
"""

import asyncio
import os
import time
import random
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from playwright.async_api import async_playwright, Browser, TimeoutError as PWTimeout
from playwright_stealth import Stealth
import uvicorn

# ========================
# LOGGING
# ========================
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("shopee_checker")

# ========================
# CONFIG
# ========================
POOL_SIZE = 2
CHROME_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--mute-audio",
    "--hide-scrollbars",
    "--disable-infobars",
]

# ========================
# USER AGENT PROFILES
# ========================
def build_ua_pool():
    pool = []
    windows_versions = [
        "138.0.0.0", "137.0.0.0", "136.0.0.0", "135.0.0.0", "134.0.0.0",
        "133.0.0.0", "132.0.0.0", "131.0.0.0", "130.0.0.0",
    ]
    mac_versions = [
        "138.0.0.0", "137.0.0.0", "136.0.0.0", "135.0.0.0",
    ]
    viewports_win = [
        {"width": 1366, "height": 768},
        {"width": 1536, "height": 864},
        {"width": 1920, "height": 1080},
        {"width": 1600, "height": 900},
        {"width": 1440, "height": 900},
        {"width": 1280, "height": 720},
    ]
    viewports_mac = [
        {"width": 1440, "height": 900},
        {"width": 1512, "height": 982},
        {"width": 1680, "height": 1050},
    ]
    for ver in windows_versions:
        pool.append({
            "ua": f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{ver} Safari/537.36",
            "platform": "Win32",
            "viewport": random.choice(viewports_win),
        })
    for ver in mac_versions:
        pool.append({
            "ua": f"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{ver} Safari/537.36",
            "platform": "MacIntel",
            "viewport": random.choice(viewports_mac),
        })
    return pool


UA_PROFILES = build_ua_pool()


def pick_profile():
    return random.choice(UA_PROFILES)


# ========================
# BROWSER POOL
# ========================
class BrowserPool:
    def __init__(self, size: int):
        self.size = size
        self._queue: asyncio.Queue = asyncio.Queue()
        self._playwright = None
        self._browsers: list[Browser] = []

    async def start(self):
        self._playwright = await async_playwright().start()
        chromium_path = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
        launch_kwargs = {"headless": True, "args": CHROME_ARGS}
        if chromium_path:
            launch_kwargs["executable_path"] = chromium_path
            log.info(f"Menggunakan system Chromium: {chromium_path}")
        for _ in range(self.size):
            browser = await self._playwright.chromium.launch(**launch_kwargs)
            self._browsers.append(browser)
            await self._queue.put(browser)
        log.info(f"Browser pool started dengan {self.size} instance")

    async def stop(self):
        for browser in self._browsers:
            try:
                await browser.close()
            except Exception:
                pass
        if self._playwright:
            await self._playwright.stop()
        log.info("Browser pool stopped")

    @asynccontextmanager
    async def acquire(self):
        browser = await self._queue.get()
        try:
            yield browser
        finally:
            await self._queue.put(browser)


browser_pool: BrowserPool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global browser_pool
    browser_pool = BrowserPool(POOL_SIZE)
    await browser_pool.start()
    yield
    await browser_pool.stop()


app = FastAPI(
    title="Shopee Phone Checker API",
    description="Validasi nomor HP terdaftar di Shopee",
    version="5.0.0",
    lifespan=lifespan,
)


# ========================
# UTILITIES
# ========================

# Selector stabil berdasarkan atribut yang jarang berubah (name, type, maxlength)
PHONE_INPUT_SELECTORS = [
    "input[name='phoneOrEmail']",
    "input[name='loginKey']",
    "input[type='tel']",
    "input[maxlength='128'][type='text']",
    "input[maxlength='128'][autocomplete='off']",
]

# XPath fallback jika CSS selector tidak ditemukan
PHONE_INPUT_XPATH = [
    "xpath=//input[@name='phoneOrEmail']",
    "xpath=//input[@name='loginKey']",
    "xpath=//input[@type='tel' and not(@readonly) and not(@disabled)]",
    "xpath=//input[@maxlength='128' and not(@readonly) and not(@disabled)]",
    "xpath=//input[@type='text' and not(@readonly) and not(@disabled)]",
]

# URL reset page yang akan dicoba berurutan (scenario=7 lalu fallback ke scenario=3)
RESET_URLS = [
    "https://shopee.co.id/buyer/reset?scenario=7",
    "https://shopee.co.id/buyer/reset?scenario=3",
]

POPUP_SELECTORS = [
    "xpath=//button[contains(.,'Bahasa Indonesia')]",
    "xpath=//li[contains(.,'Bahasa Indonesia')]",
    "xpath=//button[contains(.,'Terima')]",
    "xpath=//button[contains(.,'Accept')]",
    "xpath=//button[@id='onetrust-accept-btn-handler']",
    "xpath=//button[contains(.,'Lanjutkan di Browser')]",
    "xpath=//button[contains(.,'Continue in Browser')]",
    "[aria-label='close']",
    "[aria-label='Close']",
    ".shopee-popup--close-btn",
]


def normalize_phone(raw: str) -> str:
    phone = raw.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace("+", "")
    if phone.startswith("62") and len(phone) > 10:
        phone = phone[2:]
    elif phone.startswith("0"):
        phone = phone[1:]
    return phone


async def debug_save(page, label: str):
    debug_dir = "/tmp/shopee_debug"
    os.makedirs(debug_dir, exist_ok=True)
    ts = int(time.time())
    try:
        await page.screenshot(path=f"{debug_dir}/{label}_{ts}.png", full_page=True)
    except Exception:
        pass
    try:
        body_text = await page.inner_text("body")
        with open(f"{debug_dir}/{label}_{ts}.txt", "w", encoding="utf-8") as f:
            f.write(f"URL: {page.url}\n\n")
            f.write(body_text[:3000])
    except Exception:
        pass


async def dismiss_popups(page) -> None:
    """Coba dismiss popup/banner umum yang mungkin muncul."""
    for sel in POPUP_SELECTORS:
        try:
            btn = await page.query_selector(sel)
            if btn and await btn.is_visible():
                await btn.click()
                await page.wait_for_timeout(400)
        except Exception:
            continue


async def find_phone_input(page):
    """
    Cari input dengan multi-selector (atribut stabil + XPath fallback).
    Mengembalikan elemen pertama yang ditemukan, atau None.
    """
    for sel in PHONE_INPUT_SELECTORS:
        try:
            el = await page.query_selector(sel)
            if el:
                return el
        except Exception:
            continue
    for sel in PHONE_INPUT_XPATH:
        try:
            el = await page.query_selector(sel)
            if el:
                return el
        except Exception:
            continue
    return None


async def wait_for_phone_input(page, timeout_ms: int = 20000):
    """
    Tunggu sampai input muncul via JS condition (efficient), lalu kembalikan elemen.
    """
    js_cond = """
        () => {
            const selectors = [
                "input[name='phoneOrEmail']",
                "input[name='loginKey']",
                "input[type='tel']",
                "input[maxlength='128'][type='text']",
                "input[maxlength='128'][autocomplete='off']",
                "input[type='text']:not([readonly]):not([disabled])"
            ];
            for (const s of selectors) {
                try { if (document.querySelector(s)) return true; } catch(e) {}
            }
            return false;
        }
    """
    try:
        await page.wait_for_function(js_cond, timeout=timeout_ms)
    except Exception:
        return None
    return await find_phone_input(page)


# ========================
# MAIN CHECK LOGIC
# ========================
async def check_phone_async(phone_number: str) -> dict:
    raw_input = phone_number.strip()
    local_number = normalize_phone(raw_input)
    display_number = "62" + local_number

    if not local_number.isdigit():
        return {"status": "error", "message": "Nomor harus berupa angka", "phone": display_number}
    if len(local_number) < 7 or len(local_number) > 13:
        return {"status": "error", "message": "Format nomor tidak valid (panjang 7-13 digit)", "phone": display_number}

    profile = pick_profile()
    ua = profile["ua"]
    platform = profile["platform"]

    async with browser_pool.acquire() as browser:
        context = await browser.new_context(
            user_agent=ua,
            locale="id-ID",
            timezone_id="Asia/Jakarta",
            viewport=profile["viewport"],
            is_mobile=False,
            has_touch=False,
        )
        page = await context.new_page()

        # Stealth dengan UA override agar cocok dengan context UA
        await Stealth(
            navigator_user_agent_override=ua,
            navigator_platform_override=platform,
            navigator_languages_override=("id-ID", "id", "en-US", "en"),
        ).apply_stealth_async(page)

        api_result = None
        api_event = asyncio.Event()

        async def handle_response(resp):
            nonlocal api_result
            if "check_account_exist" in resp.url:
                try:
                    api_result = await resp.json()
                    api_event.set()
                    log.info(f"[{display_number}] API response: {api_result}")
                except Exception as e:
                    log.warning(f"[{display_number}] Gagal parse API response: {e}")

        page.on("response", handle_response)

        try:
            # ---- Langkah 1: Buka login page untuk setup session/cookies ----
            log.info(f"[{display_number}] Navigasi ke login page...")
            try:
                await page.goto(
                    "https://shopee.co.id/buyer/login",
                    wait_until="domcontentloaded",
                    timeout=30000,
                )
            except Exception as e:
                log.error(f"[{display_number}] Gagal buka login page: {e}")
                return {"status": "error", "message": "Tidak dapat terhubung ke Shopee", "phone": display_number}

            await page.wait_for_timeout(random.randint(2500, 4000))

            # ---- Langkah 2: Navigasi ke reset page via JS + fallback scenario=3 ----
            phone_input = None
            used_reset_url = None

            for reset_url in RESET_URLS:
                log.info(f"[{display_number}] Mencoba navigasi ke {reset_url}...")
                await page.evaluate(f"window.location.href = '{reset_url}'")

                # Langkah 3: Tunggu input muncul (multi-selector via JS condition)
                phone_input = await wait_for_phone_input(page, timeout_ms=20000)

                if phone_input:
                    used_reset_url = reset_url
                    log.info(f"[{display_number}] Input ditemukan di {reset_url}")
                    break

                # Input tidak ditemukan — dismiss popup lalu coba scroll + scan ulang
                log.warning(f"[{display_number}] Input tidak ditemukan di {reset_url}, mencoba dismiss popup...")
                await dismiss_popups(page)
                await page.wait_for_timeout(800)
                try:
                    await page.evaluate("window.scrollTo(0, 200)")
                except Exception:
                    pass
                await page.wait_for_timeout(500)
                phone_input = await find_phone_input(page)
                if phone_input:
                    used_reset_url = reset_url
                    log.info(f"[{display_number}] Input ditemukan setelah scroll di {reset_url}")
                    break

                # Sekali reload — fallback terakhir sebelum ganti URL
                log.warning(f"[{display_number}] Mencoba reload di {reset_url}...")
                try:
                    await page.reload(wait_until="domcontentloaded", timeout=20000)
                except Exception:
                    pass
                await page.wait_for_timeout(1200)
                phone_input = await find_phone_input(page)
                if phone_input:
                    used_reset_url = reset_url
                    log.info(f"[{display_number}] Input ditemukan setelah reload di {reset_url}")
                    break

                log.warning(f"[{display_number}] Gagal di {reset_url}, coba URL berikutnya...")
                await debug_save(page, f"input_not_found_{reset_url.split('=')[-1]}")

            if not phone_input:
                await debug_save(page, "input_not_found_all")
                return {
                    "status": "error",
                    "message": "Form input tidak ditemukan setelah mencoba semua URL (scenario=7 dan scenario=3)",
                    "phone": display_number,
                }

            await page.wait_for_timeout(random.randint(700, 1200))

            # ---- Langkah 4: Nonaktifkan modal overlay (#modal) ----
            # Modal world-map memblokir klik — cukup disable pointer events, jangan dihapus
            await page.evaluate(
                "document.querySelectorAll('#modal *').forEach(el => el.style.pointerEvents = 'none')"
            )
            await page.wait_for_timeout(300)

            # ---- Langkah 5: Isi nomor HP ----
            # Refresh referensi elemen setelah dismiss popup / scroll
            phone_input = await find_phone_input(page)
            if not phone_input:
                return {
                    "status": "error",
                    "message": "Elemen input hilang setelah dismiss popup",
                    "phone": display_number,
                }

            # fill() memicu React state update dan phone formatter Shopee
            await phone_input.fill(display_number)
            await page.wait_for_timeout(random.randint(800, 1300))

            filled_val = await page.evaluate("el => el.value", phone_input)
            log.info(f"[{display_number}] Input value setelah fill: '{filled_val}'")

            if not filled_val:
                return {
                    "status": "error",
                    "message": "Gagal mengisi input nomor HP",
                    "phone": display_number,
                }

            # ---- Langkah 6: Tekan Enter untuk submit (trigger check_account_exist API) ----
            api_event.clear()
            await phone_input.press("Enter")
            log.info(f"[{display_number}] Enter ditekan, menunggu respons API...")

            # ---- Langkah 7: Tunggu respons API (maks 12 detik) ----
            try:
                await asyncio.wait_for(api_event.wait(), timeout=12.0)
            except asyncio.TimeoutError:
                log.warning(f"[{display_number}] Tidak ada respons API dalam 12 detik")

            # Cek apakah halaman di-redirect ke traffic/error (bot detected)
            current_url = page.url
            if "verify/traffic" in current_url or "traffic/error" in current_url:
                await debug_save(page, "bot_detected")
                return {
                    "status": "blocked",
                    "message": "Shopee mendeteksi trafik tidak wajar, coba lagi",
                    "phone": display_number,
                }

            # ---- Langkah 8: Interpretasi respons API ----
            if api_result is not None:
                error_code = api_result.get("error")
                if error_code == 0:
                    data = api_result.get("data") or {}
                    exist = data.get("exist", False)
                    if exist:
                        return {
                            "status": "registered",
                            "message": "Nomor terdaftar di Shopee",
                            "phone": display_number,
                            "registered": True,
                        }
                    else:
                        return {
                            "status": "not_registered",
                            "message": "Nomor tidak terdaftar di Shopee",
                            "phone": display_number,
                            "registered": False,
                        }
                elif error_code == 90309999:
                    await debug_save(page, "bot_detected_api")
                    return {
                        "status": "blocked",
                        "message": "Shopee mendeteksi bot, coba lagi nanti",
                        "phone": display_number,
                    }
                else:
                    log.warning(f"[{display_number}] Error code tidak dikenali: {error_code}")
                    return {
                        "status": "error",
                        "message": f"Error dari Shopee: kode {error_code}",
                        "phone": display_number,
                    }

            # Tidak ada respons API sama sekali — fallback tidak diketahui
            await debug_save(page, "no_api_response")
            return {
                "status": "unknown",
                "message": "Tidak ada respons dari Shopee, coba lagi",
                "phone": display_number,
                "registered": None,
            }

        except Exception as e:
            log.error(f"[{display_number}] Exception: {e}", exc_info=True)
            try:
                await debug_save(page, "exception")
            except Exception:
                pass
            return {"status": "error", "message": str(e), "phone": display_number}

        finally:
            try:
                await page.close()
            except Exception:
                pass
            try:
                await context.close()
            except Exception:
                pass


# ========================
# FASTAPI ROUTES
# ========================
@app.get("/")
async def root():
    return {
        "name": "Shopee Phone Checker API",
        "version": "5.0.0",
        "usage": "GET /check?phone=6281234567890",
        "endpoints": {
            "check": "GET /check?phone=<nomor>",
            "health": "GET /health",
        },
    }


@app.get("/check")
async def check(phone: str = Query(..., description="Nomor HP, contoh: 6281234567890 atau 0812xxxxxxx")):
    start = time.time()
    try:
        result = await asyncio.wait_for(check_phone_async(phone), timeout=75)
    except asyncio.TimeoutError:
        display = "62" + normalize_phone(phone)
        result = {
            "status": "timeout",
            "message": "Permintaan melebihi batas waktu (75 detik), coba lagi",
            "phone": display,
        }
    result["elapsed_ms"] = round((time.time() - start) * 1000)
    return JSONResponse(content=result)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "5.0.0",
        "pool_size": POOL_SIZE,
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
