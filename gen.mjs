// Draws assets/terminal.svg and assets/stats.svg with live numbers.
// Data comes from the portfolio's own stats file, which a GitHub Action refreshes every 6 hours.
import { writeFileSync, readFileSync } from "node:fs";
const SRC = "https://princeevans.dev/data/stats.json";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n = (v) => (v || 0).toLocaleString("en-US");
const ago = (iso) => { const d = Math.round((Date.now() - new Date(iso)) / 864e5); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
let s = {};
try { s = await (await fetch(SRC)).json(); } catch { try { s = JSON.parse(readFileSync(process.argv[2] || "stats.json", "utf8")); } catch {} }
if (!s.user) { console.log("No stats available, keeping old images."); process.exit(0); }
const total = Object.values(s.contributions || {}).reduce((a, b) => a + b, 0);
const FONT = 'font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"';
// Every animation starts at 0s and holds its "from" value until its delay, so the element's
// resting state is the final one. If a viewer doesn't play SVG animations, everything still shows.
const late = (attr, from, to, delay, dur) => { const T = delay + dur, k = (delay / T).toFixed(3); return `<animate attributeName="${attr}" values="${from};${from};${to}" keyTimes="0;${k};1" dur="${T.toFixed(2)}s" fill="freeze"/>`; };
const SANS = 'font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif"';

/* ---------- 1. the terminal that types itself ---------- */
{
  const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const lines = [
    ["$ whoami", "#ece8de"], ["  Prince Evans · software engineer · IIT Delhi '26", "#8d93a3"],
    ["$ date", "#ece8de"], [`  ${now} IST · New Delhi`, "#b48cff"],
    ["$ gh stats --all-time", "#ece8de"], [`  ${n(total)} contributions · ${n(s.commits)} commits · ${n(s.lines)} lines · ${s.projects || 18} projects`, "#59d38c"],
    ["$ git log -1 --format=%ar", "#ece8de"], [`  last push ${s.lastPush ? ago(s.lastPush.date) + " to " + s.lastPush.repo : "recently"}`, "#ffb454"],
    ["$ ./engines --live", "#ece8de"], ["  C spreadsheet · Rust spreadsheet · SimpleRISC  →  princeevans.dev", "#7aa2ff"],
    ["$ echo $STATUS", "#ece8de"], ["  open to SDE roles · full-time and internships ✓", "#c8ff3c"],
  ];
  const W = 860, LH = 24, TOP = 54, H = TOP + lines.length * LH + 24;
  let t = 0.4;
  const body = lines.map(([txt, col], i) => {
    const isCmd = txt.startsWith("$"), dur = isCmd ? Math.max(0.5, txt.length * 0.045) : 0.25, y = TOP + i * LH;
    const keys = isCmd ? `calcMode="discrete" keyTimes="${Array.from({ length: txt.length + 1 }, (_, k) => (k / txt.length).toFixed(3)).join(";")}" values="${Array.from({ length: txt.length + 1 }, (_, k) => (k === txt.length ? W - 40 : 6 + k * 8.6).toFixed(1)).join(";")}"` : "";
    const el = `<g><clipPath id="c${i}"><rect x="20" y="${y - 17}" height="${LH}" width="${W - 40}">${isCmd ? `<animate attributeName="width" values="0;0" dur="${t.toFixed(2)}s"/><animate attributeName="width" begin="${t.toFixed(2)}s" dur="${dur.toFixed(2)}s" fill="freeze" ${keys}/>` : late("width", 0, W - 40, t, dur)}</rect></clipPath><text x="24" y="${y}" fill="${col}" clip-path="url(#c${i})">${esc(txt)}</text></g>`;
    t += dur + (isCmd ? 0.15 : 0.35);
    return el;
  }).join("\n");
  writeFileSync("assets/terminal.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${FONT} font-size="14">
<rect width="${W}" height="${H}" rx="14" fill="#0b0c10" stroke="#2e3342"/>
<rect width="${W}" height="34" rx="14" fill="#13151c"/><rect y="20" width="${W}" height="14" fill="#13151c"/>
<circle cx="22" cy="17" r="6" fill="#ff6b6b"/><circle cx="42" cy="17" r="6" fill="#ffb454"/><circle cx="62" cy="17" r="6" fill="#59d38c"/>
<text x="${W / 2}" y="22" fill="#8d93a3" text-anchor="middle" font-size="12">prince@iitd: ~/live, refreshed every 6 hours</text>
${body}
<rect x="24" y="${TOP + lines.length * LH - 15}" width="9" height="17" fill="#7aa2ff"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" begin="${t.toFixed(2)}s"/></rect>
</svg>`);
}

/* ---------- 2. the stats card: big numbers, languages, a year of contributions ----------
   Static on purpose: some viewers pause animations in images below the fold, and a stats card must never look empty. */
{
  const late = () => "";
  const W = 860, P = 28;
  const nums = [[n(total), "contributions", "all time", "#59d38c"], [n(s.commits), "commits", "all repos", "#7aa2ff"], [n(s.lines), "lines of code", "every repo", "#ffb454"], [String(s.projects || 18), "projects", "built", "#b48cff"]];
  const cw = (W - P * 2) / 4;
  const numSvg = nums.map(([v, l, sub, c], i) => {
    const x = P + i * cw, d = (0.15 + i * 0.12).toFixed(2);
    return `<g>${late("opacity", 0, 1, +d, 0.5)}
<text x="${x}" y="92" fill="${c}" ${SANS} font-size="38" font-weight="800" letter-spacing="-1">${v}</text>
<text x="${x}" y="116" fill="#ece8de" font-size="13">${l}</text><text x="${x}" y="134" fill="#8d93a3" font-size="12">${sub}</text></g>`;
  }).join("\n");
  // languages (by bytes), top 6 + other
  const COLORS = { C: "#7aa2ff", "C++": "#f34b7d", Rust: "#ff8a5c", Swift: "#ffb454", Python: "#59d38c", Shell: "#c8ff3c", Java: "#b48cff", Other: "#4a5063" };
  const lb = Object.entries(s.languageBytes || {}).sort((a, b) => b[1] - a[1]);
  const sum = lb.reduce((a, [, v]) => a + v, 0) || 1;
  const top = lb.slice(0, 6), rest = lb.slice(6).reduce((a, [, v]) => a + v, 0);
  if (rest) top.push(["Other", rest]);
  const BY = 186, BW = W - P * 2;
  let x = P;
  const bar = top.map(([k, v], i) => { const w = (v / sum) * BW; const fw = Math.max(w - 2, 1).toFixed(1); const r = `<rect x="${x.toFixed(1)}" y="${BY}" width="${fw}" height="12" fill="${COLORS[k] || COLORS.Other}">${late("width", 0, fw, 0.7 + i * 0.08, 0.6)}</rect>`; x += w; return r; }).join("");
  let lx = P;
  const legend = top.map(([k, v]) => { const pct = ((v / sum) * 100).toFixed(1) + "%"; const g = `<circle cx="${lx + 5}" cy="${BY + 34}" r="5" fill="${COLORS[k] || COLORS.Other}"/><text x="${lx + 15}" y="${BY + 38}" fill="#ece8de" font-size="12">${esc(k)} <tspan fill="#8d93a3">${pct}</tspan></text>`; lx += 30 + (k.length + pct.length) * 7.6; return g; }).join("");
  // heatmap: last 12 months, weeks as columns
  const cal = s.calendar || [];
  const HY = 292, cell = 11, gap = 3;
  const first = cal.length ? new Date(cal[0].d + "T00:00:00Z").getUTCDay() : 0;
  const max = Math.max(1, ...cal.map((c) => c.n));
  const shade = (v) => (v === 0 ? "#161a24" : v / max < 0.25 ? "#1e4a3a" : v / max < 0.5 ? "#2a7a55" : v / max < 0.75 ? "#3fae72" : "#59d38c");
  const weeks = Math.ceil((cal.length + first) / 7);
  const HX = P + Math.max(0, (BW - weeks * (cell + gap)) / 2);
  const cells = cal.map((c, i) => { const k = i + first, wx = Math.floor(k / 7), dy = k % 7; const d = (1.1 + wx * 0.018).toFixed(2); return `<rect x="${HX + wx * (cell + gap)}" y="${HY + dy * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5" fill="${shade(c.n)}">${late("opacity", 0, 1, +d, 0.3)}<title>${c.d}: ${c.n}</title></rect>`; }).join("");
  const months = []; let lastM = -1;
  cal.forEach((c, i) => { const m = +c.d.slice(5, 7), wx = Math.floor((i + first) / 7); if (m !== lastM && (i + first) % 7 === 0 && wx < weeks - 2 && (wx > 0 || +c.d.slice(8) <= 7)) { const lab = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]; if (months.length && wx - months[months.length - 1].wx < 3) months.pop(); months.push({ wx, lab }); lastM = m; } });
  const year = cal.reduce((a, c) => a + c.n, 0);
  const H = HY + 7 * (cell + gap) + 40;
  writeFileSync("assets/stats.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${FONT}>
<defs><radialGradient id="glow" cx="85%" cy="0%" r="70%"><stop offset="0" stop-color="#7aa2ff" stop-opacity=".18"/><stop offset="1" stop-color="#7aa2ff" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" rx="16" fill="#0b0c10" stroke="#2e3342"/><rect width="${W}" height="${H}" rx="16" fill="url(#glow)"/>
<text x="${P}" y="40" fill="#8d93a3" font-size="12" letter-spacing="1.5">LIVE FROM GITHUB</text>
<circle cx="${W - P - 6}" cy="36" r="4" fill="#59d38c"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/></circle>
<text x="${W - P - 16}" y="40" fill="#8d93a3" font-size="12" text-anchor="end">updated ${esc(new Date(s.updated || Date.now()).toISOString().slice(0, 10))}</text>
${numSvg}
<text x="${P}" y="${BY - 12}" fill="#8d93a3" font-size="12" letter-spacing="1.5">LANGUAGES</text>
<rect x="${P}" y="${BY}" width="${BW}" height="12" rx="6" fill="#161a24"/>${bar}
${legend}
<text x="${P}" y="${HY - 26}" fill="#8d93a3" font-size="12" letter-spacing="1.5">LAST 12 MONTHS · ${n(year)} CONTRIBUTIONS</text>
${months.map((o) => `<text x="${HX + o.wx * (cell + gap)}" y="${HY - 8}" fill="#8d93a3" font-size="10">${o.lab}</text>`).join("")}${cells}
</svg>`);
}
console.log("terminal.svg and stats.svg written · contributions", total);
