// «Фамилья» — сервер игры.
// Запуск в домашней сети:    node server.js
// Запуск со ссылкой в интернет: node server.js --internet
// Нужен только Node.js 18+, без установки пакетов.

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { Game, DEFAULT_OPTIONS } = require("./engine");

const PORT = +process.env.PORT || 3001;
const INTERNET = process.argv.includes("--internet");
const PUB = path.join(__dirname, "public");
const IMG = path.join(PUB, "img");

let lobby = [];          // [{id, name}] — кто сядет за стол в следующей партии
let game = null;
let options = { ...DEFAULT_OPTIONS };
let ver = 1;
let publicUrl = "";
let tunnelState = INTERNET ? "starting" : "off";
const waiters = new Set();
const seen = new Map();      // pid -> время последнего запроса
const pending = new Map();   // pid -> сколько запросов ждут ответа

/* ---------------- рассылка состояния ---------------- */
let bumpT = null;
function bump() {
  if (bumpT) return;
  bumpT = setTimeout(() => {
    bumpT = null; ver++;
    for (const w of [...waiters]) w();
  }, 15);
}
function online(id) {
  return (pending.get(id) || 0) > 0 || Date.now() - (seen.get(id) || 0) < 5000;
}
let lastOnlineSig = "";
setInterval(() => {
  const sig = lobby.map(p => p.id + (online(p.id) ? 1 : 0)).join(",");
  if (sig !== lastOnlineSig) { lastOnlineSig = sig; bump(); }
}, 2000);

function lanIps() {
  const rank = ip => (ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if ((a.family === "IPv4" || a.family === 4) && !a.internal && !a.address.startsWith("169.254.")) out.push(a.address);
    }
  }
  return out.sort((a, b) => rank(a) - rank(b));
}

function stateFor(pid) {
  const base = {
    lobby: lobby.map(p => ({ id: p.id, name: p.name, online: online(p.id) })),
    url: publicUrl, tunnel: tunnelState, lan: lanIps(), port: PORT,
    inGame: !!(game && game.P(pid)),
    options,
  };
  if (!game) return { ...base, phase: "lobby" };
  const v = game.view(pid);
  for (const p of v.players) p.online = online(p.id);
  return { ...base, ...v };
}

function newGame() {
  game = new Game(lobby.slice(0, 8), { onChange: bump, options });
  bump();
}

/* ---------------- HTTP ---------------- */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise(resolve => {
    let b = "";
    req.on("data", c => { b += c; if (b.length > 1e5) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch (e) { resolve(null); } });
    req.on("error", () => resolve(null));
  });
}
const okPid = p => typeof p === "string" && /^[a-z0-9]{4,20}$/i.test(p);
const str = (s, n) => String(s == null ? "" : s).trim().slice(0, n);

// Картинка карты по ключу: подходит любой формат, который лежит в папке img
const imgCache = new Map();
function findImg(key) {
  if (!/^[a-z0-9-]{1,40}$/.test(key)) return null;
  for (const ext of [".webp", ".png", ".jpg", ".jpeg"]) {
    const f = path.join(IMG, key + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;

  if (p === "/api/poll") {
    const pid = url.searchParams.get("pid") || "";
    const v = +url.searchParams.get("v") || 0;
    seen.set(pid, Date.now());
    pending.set(pid, (pending.get(pid) || 0) + 1);
    let done = false;
    const send = () => {
      if (done) return; done = true;
      waiters.delete(send); clearTimeout(t);
      pending.set(pid, Math.max(0, (pending.get(pid) || 1) - 1));
      seen.set(pid, Date.now());
      try { json(res, 200, { v: ver, s: stateFor(pid) }); } catch (e) {}
    };
    const t = setTimeout(send, 25000);
    req.on("close", () => { if (!done) { done = true; waiters.delete(send); clearTimeout(t); pending.set(pid, Math.max(0, (pending.get(pid) || 1) - 1)); } });
    if (v !== ver) return send();
    waiters.add(send);
    return;
  }

  if (req.method === "POST" && p.startsWith("/api/")) {
    const b = await body(req);
    if (!b) return json(res, 400, { error: "Неверный запрос" });
    try {
      switch (p) {
        case "/api/join": {
          if (!okPid(b.pid)) throw new Error("Неверный игрок");
          const name = str(b.name, 20);
          if (!name) throw new Error("Введите имя");
          const ex = lobby.find(x => x.id === b.pid);
          if (ex) ex.name = name;
          else {
            if (lobby.length >= 8) throw new Error("За столом уже 8 человек");
            lobby.push({ id: b.pid, name });
          }
          if (game) { const gp = game.P(b.pid); if (gp) gp.name = name; }
          seen.set(b.pid, Date.now());
          bump();
          return json(res, 200, { ok: true });
        }
        case "/api/kick": {
          lobby = lobby.filter(x => x.id !== b.pid);
          bump();
          return json(res, 200, { ok: true });
        }
        case "/api/move": {
          const i = lobby.findIndex(x => x.id === b.pid), j = i + (b.dir > 0 ? 1 : -1);
          if (i >= 0 && j >= 0 && j < lobby.length) [lobby[i], lobby[j]] = [lobby[j], lobby[i]];
          bump();
          return json(res, 200, { ok: true });
        }
        case "/api/start": {
          if (game && game.phase !== "over") throw new Error("Партия уже идёт");
          if (lobby.length < 4) throw new Error("Нужно минимум 4 игрока");
          newGame();
          return json(res, 200, { ok: true });
        }
        case "/api/options": {
          for (const k of Object.keys(DEFAULT_OPTIONS)) if (k in (b.options || {})) options[k] = !!b.options[k];
          bump();
          return json(res, 200, { ok: true });
        }
        case "/api/reset": { game = null; bump(); return json(res, 200, { ok: true }); }
        case "/api/force": { if (game) game.force(); bump(); return json(res, 200, { ok: true }); }
        case "/api/act": {
          if (!game) throw new Error("Игра ещё не началась");
          game.act(b.pid, b.a || {});
          bump();
          return json(res, 200, { ok: true });
        }
      }
    } catch (e) {
      return json(res, 400, { error: e.message || "Ошибка" });
    }
    return json(res, 404, { error: "Нет такого действия" });
  }

  if (p.startsWith("/card/")) {
    const key = p.slice(6);
    let f = imgCache.get(key);
    if (f === undefined) { f = findImg(key); imgCache.set(key, f); setTimeout(() => imgCache.delete(key), 30000); }
    if (!f) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "public, max-age=3600" });
    return fs.createReadStream(f).pipe(res);
  }

  const file = p === "/" ? "/index.html" : p === "/table" ? "/table.html" : p;
  const full = path.normalize(path.join(PUB, file));
  if (!full.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
});

/* ---------------- ссылка в интернет через Cloudflare ---------------- */
async function download(url, to) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  fs.writeFileSync(to, Buffer.from(await r.arrayBuffer()));
}
async function startTunnel() {
  const win = process.platform === "win32";
  let exe = win ? path.join(__dirname, "cloudflared.exe") : "cloudflared";
  if (win && !fs.existsSync(exe)) {
    console.log("  Скачиваем cloudflared (один раз, около 60 МБ)…");
    try {
      await download("https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe", exe + ".part");
      fs.renameSync(exe + ".part", exe);
    } catch (e) {
      tunnelState = "error"; bump();
      console.log("  Не удалось скачать cloudflared: " + e.message);
      console.log("  Проверьте интернет на ноутбуке. Игра всё равно работает в домашней сети.");
      return;
    }
  }
  console.log("  Получаем ссылку в интернет…");
  const cp = spawn(exe, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`], { windowsHide: true });
  const onData = d => {
    const m = String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !publicUrl) {
      publicUrl = m[0]; tunnelState = "on"; bump();
      console.log("\n  ✅ Ссылка для игроков (с любого интернета):  " + publicUrl + "\n");
    }
  };
  cp.stdout.on("data", onData);
  cp.stderr.on("data", onData);
  cp.on("error", e => { tunnelState = "error"; bump(); console.log("  Не удалось запустить cloudflared: " + e.message); });
  cp.on("exit", () => { if (tunnelState !== "error") { tunnelState = "error"; publicUrl = ""; bump(); console.log("  Ссылка в интернет отключилась."); } });
  process.on("exit", () => { try { cp.kill(); } catch (e) {} });
  process.on("SIGINT", () => process.exit());
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n  «Фамилья» запущена!\n");
  console.log(`  Стол (на этом ноутбуке):  http://localhost:${PORT}/table`);
  for (const ip of lanIps()) console.log(`  Игроки в той же Wi-Fi сети:  http://${ip}:${PORT}`);
  console.log("\n  Остановить: Ctrl+C или закройте это окно\n");
  if (INTERNET) startTunnel();
});
