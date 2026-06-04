import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from "recharts";

// ─────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────
const G = {
  green:  "#00ff88",
  red:    "#ff4455",
  yellow: "#ffd700",
  orange: "#ff9500",
  blue:   "#4da6ff",
  bg:     "#060a0d",
  card:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
};

const gradeColor = (g) =>
  ({ A: G.green, B: "#7fff7f", C: G.yellow, D: G.orange, F: G.red }[g] || "#888");

const outcomeColor = (o) =>
  ({ WIN_T2: G.green, WIN_T1: "#7fff7f", PARTIAL: G.yellow, LOSS: G.red }[o] || "#888");

const outcomeLabel = (o) =>
  ({ WIN_T2: "✅ Win T2", WIN_T1: "✅ Win T1", PARTIAL: "〰 Partial", LOSS: "❌ Loss" }[o] || o);

function compress(base64, maxW = 1200) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width  = img.width  * scale;
      c.height = img.height * scale;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.88).split(",")[1]);
    };
    img.src = "data:image/png;base64," + base64;
  });
}

// ─────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────
function Spinner({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid rgba(0,255,136,0.15)`,
      borderTop: `3px solid ${G.green}`,
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function Tag({ children, color = G.green, small }) {
  return (
    <span style={{
      background: color + "18", border: `1px solid ${color}35`,
      color, borderRadius: 6,
      padding: small ? "2px 7px" : "3px 10px",
      fontSize: small ? 11 : 12,
      fontFamily: "'Space Mono', monospace",
      display: "inline-block", lineHeight: 1.4,
    }}>
      {children}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`,
      borderRadius: 14, padding: 18, ...style,
    }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, color = "#fff" }) {
  return (
    <Card style={{ textAlign: "center", flex: 1, minWidth: 110 }}>
      <div style={{ color: "#555", fontSize: 10, fontFamily: "mono", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 900, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: "#444", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function QualityBadge({ quality }) {
  const map = { CLEAR: [G.green, "📷 CLEAR"], PARTIAL: [G.yellow, "⚠ PARTIAL"], POOR: [G.red, "🔴 POOR"] };
  const [col, label] = map[quality] || ["#888", quality];
  return <Tag color={col} small>{label}</Tag>;
}

function GradeBadge({ grade }) {
  const c = gradeColor(grade);
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: c + "18", border: `2px solid ${c}50`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: c, fontSize: 22, fontWeight: 900, fontFamily: "'Space Mono', monospace",
      flexShrink: 0,
    }}>
      {grade}
    </div>
  );
}

function ConvictionBar({ value }) {
  const c = value >= 8 ? G.green : value >= 6 ? G.yellow : value >= 4 ? G.orange : G.red;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: "#555", fontSize: 11 }}>CONVICTION</span>
        <span style={{ color: c, fontSize: 12, fontWeight: 700 }}>{value}/10</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 5 }}>
        <div style={{
          width: `${value * 10}%`, height: "100%",
          background: `linear-gradient(90deg, ${c}66, ${c})`,
          borderRadius: 4, transition: "width 1.2s ease",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// IMAGE CAPTURE COMPONENT
// ─────────────────────────────────────────────
function ImageCapture({ onImage }) {
  const fileRef   = useRef();
  const cameraRef = useRef();
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const preview = URL.createObjectURL(file);
    const reader  = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target.result.split(",")[1];
      const b64 = await compress(raw);
      onImage({ preview, base64: b64, mediaType: "image/jpeg" });
    };
    reader.readAsDataURL(file);
  }, [onImage]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => fileRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? G.green : "rgba(255,255,255,0.12)"}`,
        borderRadius: 16, padding: "40px 24px", cursor: "pointer",
        textAlign: "center",
        background: dragging ? "rgba(0,255,136,0.04)" : "rgba(255,255,255,0.015)",
        transition: "all 0.25s",
      }}
    >
      <input ref={fileRef} type="file" accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => processFile(e.target.files[0])} />

      {/* Camera capture — opens native camera on mobile */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }}
        onChange={(e) => processFile(e.target.files[0])} />

      <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
      <div style={{ color: "#aaa", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
        Drop chart image or click to upload
      </div>
      <div style={{ color: "#444", fontSize: 12, marginBottom: 20 }}>
        Screenshots, photos of screens, printed charts — any image works
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
        onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            background: G.green, color: "#000", border: "none",
            borderRadius: 8, padding: "9px 18px", fontWeight: 800, fontSize: 13,
          }}>
          📁 Upload File
        </button>
        <button
          onClick={() => cameraRef.current?.click()}
          style={{
            background: "rgba(0,255,136,0.1)", color: G.green,
            border: `1px solid ${G.green}40`, borderRadius: 8,
            padding: "9px 18px", fontWeight: 700, fontSize: 13,
          }}>
          📸 Take Photo
        </button>
      </div>

      <div style={{ color: "#333", fontSize: 11, marginTop: 16 }}>
        PNG · JPG · WebP · HEIC · photos of monitors/phones all supported
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ANALYSIS RESULT DISPLAY
// ─────────────────────────────────────────────
function AnalysisResult({ data }) {
  const biasColor  = data.bias === "LONG" ? G.green : data.bias === "SHORT" ? G.red : G.yellow;
  const trendColor = data.trend === "BULLISH" ? G.green : data.trend === "BEARISH" ? G.red : "#aaa";

  return (
    <div className="fade-up">
      {/* ── Top header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {data.setupGrade && <GradeBadge grade={data.setupGrade} />}
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>
                {data.asset}
              </span>
              <Tag color="#666">{data.timeframe}</Tag>
              <Tag color={trendColor}>{data.trend}</Tag>
              <Tag color="#555">{data.patternType}</Tag>
              {data.imageQuality && <QualityBadge quality={data.imageQuality} />}
            </div>
            <p style={{ color: "#555", fontSize: 12, marginTop: 6, maxWidth: 520, lineHeight: 1.6 }}>
              {data.summary}
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: biasColor, fontFamily: "'Space Mono', monospace" }}>
            {data.bias === "NO TRADE" ? "⛔ NO TRADE" : data.bias === "LONG" ? "📈 LONG" : "📉 SHORT"}
          </div>
          <div style={{
            display: "inline-flex", gap: 6, alignItems: "center", marginTop: 6,
            background: biasColor + "15", border: `1px solid ${biasColor}40`,
            borderRadius: 20, padding: "4px 12px",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: biasColor, animation: "pulse 2s infinite" }} />
            <span style={{ color: biasColor, fontSize: 13, fontWeight: 700 }}>{data.probability}% probability</span>
          </div>
        </div>
      </div>

      {data.imageQualityNote && (
        <div style={{ background: "rgba(255,149,0,0.07)", border: `1px solid ${G.orange}30`, borderRadius: 10, padding: 10, marginBottom: 14 }}>
          <span style={{ color: G.orange, fontSize: 12 }}>📷 {data.imageQualityNote}</span>
        </div>
      )}

      {/* ── NO TRADE ── */}
      {data.bias === "NO TRADE" ? (
        <div style={{ background: "rgba(255,212,0,0.07)", border: `1px solid ${G.yellow}35`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: G.yellow, fontWeight: 700, marginBottom: 6 }}>⚠ Why No Trade</div>
          <p style={{ color: "#bbb", fontSize: 14, lineHeight: 1.6 }}>{data.noTradeReason}</p>
        </div>
      ) : (
        <>
          {/* Trade levels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              { label: "ENTRY",    value: data.entry,    color: "#fff" },
              { label: "STOP",     value: data.stopLoss, color: G.red },
              { label: "TARGET 1", value: data.target1,  color: "#7fff7f" },
              { label: "TARGET 2", value: data.target2,  color: G.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: color + "08", border: `1px solid ${color}22`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "#444", fontSize: 10, marginBottom: 4 }}>{label}</div>
                <div style={{ color, fontWeight: 700, fontSize: 14, fontFamily: "'Space Mono', monospace" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* R:R + conviction */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "rgba(0,255,136,0.05)", border: `1px solid ${G.green}25`, borderRadius: 10, padding: 14 }}>
              <div style={{ color: "#444", fontSize: 10, marginBottom: 4 }}>RISK / REWARD</div>
              <div style={{ color: G.green, fontSize: 26, fontWeight: 900, fontFamily: "'Space Mono', monospace" }}>{data.riskReward}</div>
            </div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: 14 }}>
              <ConvictionBar value={data.conviction} />
            </div>
          </div>

          {/* Scenarios */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Card>
              <div style={{ color: G.green, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🟢 BULL SCENARIO</div>
              <p style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>{data.scenario_bull}</p>
            </Card>
            <Card>
              <div style={{ color: G.red, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🔴 BEAR SCENARIO</div>
              <p style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>{data.scenario_bear}</p>
            </Card>
          </div>

          {/* Invalidation */}
          <div style={{ background: "rgba(255,68,85,0.05)", border: `1px solid ${G.red}25`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ color: G.red, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>🚫 INVALIDATION</div>
            <p style={{ color: "#bbb", fontSize: 13 }}>{data.invalidation}</p>
          </div>
        </>
      )}

      {/* Confluences */}
      {data.confluences?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 1, marginBottom: 7 }}>✅ CONFLUENCES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.confluences.map((c, i) => <Tag key={i} color={G.green}>{c}</Tag>)}
          </div>
        </div>
      )}

      {/* Key levels */}
      {data.keyLevels?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 1, marginBottom: 7 }}>📍 KEY LEVELS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.keyLevels.map((l, i) => <Tag key={i} color="#666">{l}</Tag>)}
          </div>
        </div>
      )}

      {/* Red flags */}
      {data.redFlags?.length > 0 && (
        <div style={{ background: "rgba(255,149,0,0.05)", border: `1px solid ${G.orange}25`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ color: G.orange, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>⚠ RED FLAGS</div>
          {data.redFlags.map((f, i) => (
            <div key={i} style={{ color: "#b87000", fontSize: 12, marginBottom: 3 }}>• {f}</div>
          ))}
        </div>
      )}

      {/* Visual Backtest Results */}
      {data.backtestSampleSize > 0 && (
        <div style={{ background: "rgba(77,166,255,0.05)", border: `1px solid ${G.blue}25`, borderRadius: 12, padding: 16, marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ color: G.blue, fontSize: 13, fontWeight: 700 }}>🔬 VISUAL BACKTEST (from chart history)</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ background: G.blue + "18", border: `1px solid ${G.blue}35`, borderRadius: 20, padding: "3px 10px" }}>
                <span style={{ color: G.blue, fontSize: 12, fontWeight: 700 }}>{data.backtestWinRate}% win rate</span>
              </div>
              <span style={{ color: "#444", fontSize: 11 }}>{data.backtestSampleSize} samples</span>
            </div>
          </div>
          <p style={{ color: "#777", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{data.backtestSummary}</p>
          {data.backtestInstances?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.backtestInstances.map((inst, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: outcomeColor(inst.outcome) + "08",
                  border: `1px solid ${outcomeColor(inst.outcome)}25`,
                  borderRadius: 8, padding: "8px 10px",
                }}>
                  <Tag color={outcomeColor(inst.outcome)} small>{outcomeLabel(inst.outcome)}</Tag>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#888", fontSize: 11 }}>{inst.location}</div>
                    {inst.note && <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>{inst.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BACKTEST DASHBOARD TAB
// ─────────────────────────────────────────────
function BacktestDashboard({ journal }) {
  const trades = journal.filter((j) => j.result && j.result.bias !== "NO TRADE");
  const noTrades = journal.filter((j) => j.result?.bias === "NO TRADE");

  // Outcome distribution from backtest instances across all analyses
  const allInstances = trades.flatMap((t) => t.result?.backtestInstances || []);
  const wins   = allInstances.filter((i) => i.outcome?.startsWith("WIN")).length;
  const losses = allInstances.filter((i) => i.outcome === "LOSS").length;
  const partials = allInstances.filter((i) => i.outcome === "PARTIAL").length;

  // Avg backtest win rate across all analyses
  const avgBTWR = trades.length
    ? Math.round(trades.reduce((s, t) => s + (t.result?.backtestWinRate || 0), 0) / trades.length)
    : 0;

  // Conviction distribution
  const convBuckets = [
    { range: "1-3", count: trades.filter((t) => t.result?.conviction <= 3).length, color: G.red },
    { range: "4-5", count: trades.filter((t) => t.result?.conviction >= 4 && t.result?.conviction <= 5).length, color: G.orange },
    { range: "6-7", count: trades.filter((t) => t.result?.conviction >= 6 && t.result?.conviction <= 7).length, color: G.yellow },
    { range: "8-10", count: trades.filter((t) => t.result?.conviction >= 8).length, color: G.green },
  ];

  // Grade distribution
  const grades = ["A", "B", "C", "D", "F"];
  const gradeDist = grades.map((g) => ({
    grade: g,
    count: trades.filter((t) => t.result?.setupGrade === g).length,
    color: gradeColor(g),
  }));

  // Win rate bar data from backtest instances per analysis
  const winRateHistory = trades.map((t, i) => ({
    name: `#${i + 1}`,
    wr: t.result?.backtestWinRate || 0,
    samples: t.result?.backtestSampleSize || 0,
  }));

  // Pattern type frequency
  const patternMap = {};
  trades.forEach((t) => {
    const p = t.result?.patternType || "Unknown";
    patternMap[p] = (patternMap[p] || 0) + 1;
  });
  const patternData = Object.entries(patternMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (journal.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
        <div style={{ color: "#555", fontSize: 15 }}>No analyses yet.</div>
        <div style={{ color: "#333", fontSize: 13, marginTop: 6 }}>
          Upload and analyze charts — backtest data will aggregate here automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Backtest Dashboard</div>
        <div style={{ color: "#444", fontSize: 13 }}>
          Aggregated visual backtest data from all {journal.length} chart analyses this session.
        </div>
      </div>

      {/* ── Top stat row ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <StatBox label="ANALYSES" value={journal.length} />
        <StatBox label="TRADE SETUPS" value={trades.length} color={G.green} />
        <StatBox label="NO TRADES" value={noTrades.length} color={G.yellow} sub="filtered out" />
        <StatBox label="AVG BT WIN RATE" value={`${avgBTWR}%`} color={avgBTWR >= 60 ? G.green : avgBTWR >= 50 ? G.yellow : G.red} />
        <StatBox label="BT INSTANCES" value={allInstances.length} color={G.blue} sub={`${wins}W ${losses}L ${partials}P`} />
      </div>

      {/* ── Charts row ── */}
      {winRateHistory.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>
            BACKTEST WIN RATE PER ANALYSIS
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={winRateHistory} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0e1416", border: `1px solid ${G.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v, n, p) => [`${v}% (${p.payload.samples} samples)`, "Win Rate"]}
              />
              <ReferenceLine y={50} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                {winRateHistory.map((e, i) => (
                  <Cell key={i} fill={e.wr >= 60 ? G.green : e.wr >= 50 ? G.yellow : G.red} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {/* Conviction distribution */}
        <Card>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>CONVICTION DISTRIBUTION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {convBuckets.map(({ range, count, color }) => (
              <div key={range}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: "#666", fontSize: 12 }}>{range}</span>
                  <span style={{ color, fontSize: 12, fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 3, height: 5 }}>
                  <div style={{
                    width: trades.length ? `${(count / trades.length) * 100}%` : "0%",
                    height: "100%", background: color, borderRadius: 3, transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Grade distribution */}
        <Card>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>SETUP GRADE DISTRIBUTION</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-around", alignItems: "flex-end", height: 90 }}>
            {gradeDist.map(({ grade, count, color }) => (
              <div key={grade} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ color, fontSize: 11, fontWeight: 700 }}>{count}</div>
                <div style={{
                  width: 28,
                  height: trades.length ? Math.max(4, (count / trades.length) * 70) : 4,
                  background: color + "80", border: `1px solid ${color}50`,
                  borderRadius: "4px 4px 0 0", transition: "height 0.8s ease",
                }} />
                <div style={{ color: "#555", fontSize: 12, fontWeight: 700 }}>{grade}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pattern frequency */}
      {patternData.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>MOST COMMON PATTERNS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {patternData.map(({ name, count }) => (
              <div key={name} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#aaa", fontSize: 12 }}>{name}</span>
                    <span style={{ color: G.blue, fontSize: 12, fontWeight: 700 }}>{count}×</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 3, height: 4 }}>
                    <div style={{
                      width: `${(count / Math.max(...patternData.map((p) => p.count))) * 100}%`,
                      height: "100%", background: G.blue + "80", borderRadius: 3,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Individual analyses table */}
      <Card>
        <div style={{ color: "#888", fontSize: 11, marginBottom: 12, letterSpacing: 1 }}>ALL ANALYSES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {journal.map((entry, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "center",
              background: "rgba(255,255,255,0.02)", borderRadius: 8,
              padding: "8px 10px", flexWrap: "wrap",
            }}>
              <img src={entry.preview} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>{entry.result?.asset}</span>
                  <Tag color="#555" small>{entry.result?.timeframe}</Tag>
                  {entry.result?.setupGrade && <Tag color={gradeColor(entry.result.setupGrade)} small>{entry.result.setupGrade}</Tag>}
                </div>
                <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>{entry.time} · {entry.result?.patternType}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {entry.result?.backtestSampleSize > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: G.blue, fontSize: 12, fontWeight: 700 }}>{entry.result?.backtestWinRate}% BT</div>
                    <div style={{ color: "#333", fontSize: 10 }}>{entry.result?.backtestSampleSize} samples</div>
                  </div>
                )}
                <Tag
                  color={entry.result?.bias === "LONG" ? G.green : entry.result?.bias === "SHORT" ? G.red : G.yellow}
                  small
                >
                  {entry.result?.bias}
                </Tag>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// JOURNAL TAB
// ─────────────────────────────────────────────
function Journal({ journal, onOutcome }) {
  if (journal.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📓</div>
        <div style={{ color: "#555", fontSize: 15 }}>Your trade journal is empty.</div>
        <div style={{ color: "#333", fontSize: 13, marginTop: 6 }}>
          Analyses appear here. Log outcomes as trades play out.
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {journal.map((entry, i) => {
        const r = entry.result;
        const biasColor = r?.bias === "LONG" ? G.green : r?.bias === "SHORT" ? G.red : G.yellow;
        return (
          <Card key={i}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <img src={entry.preview} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{r?.asset}</span>
                    <Tag color="#555" small>{r?.timeframe}</Tag>
                    <Tag color={biasColor} small>{r?.bias}</Tag>
                    {r?.setupGrade && <Tag color={gradeColor(r.setupGrade)} small>Grade {r.setupGrade}</Tag>}
                  </div>
                  <span style={{ color: "#333", fontSize: 11 }}>{entry.time}</span>
                </div>

                {r?.bias !== "NO TRADE" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {[
                      ["Entry", r?.entry, "#aaa"],
                      ["Stop", r?.stopLoss, G.red],
                      ["T1", r?.target1, "#7fff7f"],
                      ["T2", r?.target2, G.green],
                      ["R:R", r?.riskReward, G.green],
                    ].map(([label, val, col]) => (
                      <div key={label} style={{ fontSize: 11 }}>
                        <span style={{ color: "#444" }}>{label}: </span>
                        <span style={{ color: col, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {r?.backtestSampleSize > 0 && (
                  <div style={{ color: G.blue, fontSize: 11, marginTop: 6 }}>
                    🔬 BT: {r.backtestWinRate}% win rate ({r.backtestSampleSize} historical instances)
                  </div>
                )}

                {/* Outcome logger */}
                <div style={{ marginTop: 10 }}>
                  {entry.outcome ? (
                    <Tag color={outcomeColor(entry.outcome)}>{outcomeLabel(entry.outcome)}</Tag>
                  ) : r?.bias !== "NO TRADE" ? (
                    <div>
                      <div style={{ color: "#444", fontSize: 11, marginBottom: 6 }}>Log outcome:</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["WIN_T2", "WIN_T1", "PARTIAL", "LOSS"].map((o) => (
                          <button key={o} onClick={() => onOutcome(i, o)} style={{
                            background: outcomeColor(o) + "18", border: `1px solid ${outcomeColor(o)}40`,
                            color: outcomeColor(o), borderRadius: 6, padding: "4px 10px",
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>
                            {outcomeLabel(o)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState("analyze");

  // Image state
  const [imageData, setImageData] = useState(null); // { preview, base64, mediaType }
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);

  // Journal persisted in state (localStorage sync)
  const [journal, setJournal] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tradeai_journal");
      if (saved) setJournal(JSON.parse(saved));
    } catch {}
  }, []);

  const saveJournal = (j) => {
    setJournal(j);
    try { localStorage.setItem("tradeai_journal", JSON.stringify(j)); } catch {}
  };

  const handleImage = useCallback((data) => {
    setImageData(data);
    setResult(null);
    setError(null);
  }, []);

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType:   imageData.mediaType,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      const entry = {
        preview: imageData.preview,
        result:  data,
        time:    new Date().toLocaleString(),
        outcome: null,
      };
      saveJournal([entry, ...journal].slice(0, 50));
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const logOutcome = (idx, outcome) => {
    const updated = journal.map((j, i) => (i === idx ? { ...j, outcome } : j));
    saveJournal(updated);
  };

  const tabs = [
    { id: "analyze",   label: "📊 Analyze" },
    { id: "backtest",  label: "🔬 Backtest" },
    { id: "journal",   label: `📓 Journal (${journal.length})` },
  ];

  return (
    <>
      <Head>
        <title>TradeAI — AI Chart Analyzer</title>
        <meta name="description" content="Upload or photograph any trading chart for instant AI analysis with backtesting." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(6,10,13,0.92)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${G.border}`,
        padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, #00ff88, #00cc6a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 18px rgba(0,255,136,0.25)",
          }}>
            📈
          </div>
          <span style={{ fontWeight: 900, fontSize: 19, fontFamily: "'Space Mono', monospace" }}>
            Trade<span style={{ color: G.green }}>AI</span>
          </span>
          <span style={{
            background: "rgba(0,255,136,0.1)", border: `1px solid ${G.green}35`,
            color: G.green, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
          }}>
            PRO
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "none", "@media (min-width: 500px)": { display: "block" }, color: "#444", fontSize: 12 }}>
            SMC · Backtest · R:R Filter
          </div>
          <div style={{
            display: "flex", gap: 4, alignItems: "center",
            background: "rgba(0,255,136,0.08)", border: `1px solid ${G.green}25`,
            padding: "4px 10px", borderRadius: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.green, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: G.green }}>LIVE</span>
          </div>
        </div>
      </nav>

      {/* ── TABS ── */}
      <div style={{
        display: "flex", gap: 2, padding: "0 24px",
        borderBottom: `1px solid ${G.border}`,
        background: "rgba(6,10,13,0.7)",
      }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: "none", border: "none",
            padding: "12px 16px",
            fontSize: 13, fontWeight: tab === id ? 700 : 500,
            color: tab === id ? G.green : "#555",
            borderBottom: tab === id ? `2px solid ${G.green}` : "2px solid transparent",
            cursor: "pointer", transition: "all 0.2s",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* ═══ ANALYZE TAB ═══ */}
        {tab === "analyze" && (
          <>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontSize: "clamp(24px, 5vw, 44px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>
                AI Chart Analysis<br />
                <span style={{ color: G.green }}>With Visual Backtesting</span>
              </h1>
              <p style={{ color: "#444", fontSize: 14, maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
                Upload a screenshot or <strong style={{ color: "#666" }}>photograph a screen with your phone</strong>.
                AI analyzes the chart, backtests the pattern on visible history, and gives a setup grade.
              </p>
            </div>

            {/* Feature chips */}
            <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", marginBottom: 32 }}>
              {["📸 Camera / Photo Support", "🔬 Visual Backtest", "SMC & Order Blocks", "R:R ≥ 2:1 Filter", "Setup Grade A-F", "Win Rate from Chart History"].map((f) => (
                <span key={f} style={{
                  background: "rgba(0,255,136,0.05)", border: `1px solid ${G.green}20`,
                  color: "#00cc6a", fontSize: 11, padding: "4px 10px", borderRadius: 20,
                }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Upload / Camera */}
            {!imageData ? (
              <ImageCapture onImage={handleImage} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                {/* Preview */}
                <div
                  onClick={() => { setImageData(null); setResult(null); }}
                  style={{
                    position: "relative", cursor: "pointer",
                    border: `2px solid ${G.green}40`, borderRadius: 14,
                    overflow: "hidden", minHeight: 200,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <img src={imageData.preview} alt="chart" style={{ width: "100%", maxHeight: 300, objectFit: "contain" }} />
                  <div style={{
                    position: "absolute", bottom: 8, right: 8,
                    background: "rgba(0,0,0,0.7)", color: "#666", fontSize: 11,
                    padding: "3px 8px", borderRadius: 6,
                  }}>
                    click to change
                  </div>
                </div>

                {/* Actions panel */}
                <div style={{
                  background: G.card, border: `1px solid ${G.border}`,
                  borderRadius: 14, padding: 18,
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ color: G.green, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>✓ CHART READY</div>
                    {[
                      "Market structure & SMC",
                      "Order blocks & FVGs",
                      "Visual backtest from chart history",
                      "Setup grade (A–F)",
                      "Dual scenarios + probabilities",
                      "R:R filter & no-trade enforcement",
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: G.green, flexShrink: 0 }} />
                        <span style={{ color: "#777", fontSize: 13 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={analyze} disabled={loading} style={{
                    marginTop: 16, width: "100%", padding: 14,
                    background: loading ? "rgba(0,255,136,0.08)" : `linear-gradient(135deg, ${G.green}, #00cc6a)`,
                    color: loading ? G.green : "#000",
                    border: loading ? `1px solid ${G.green}30` : "none",
                    borderRadius: 10, fontWeight: 800, fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
                  }}>
                    {loading ? <><Spinner size={22} /> Analyzing + Backtesting…</> : "⚡ Analyze & Backtest"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: "rgba(255,68,85,0.08)", border: `1px solid ${G.red}35`,
                borderRadius: 12, padding: 14, marginBottom: 18, color: "#ff7788", fontSize: 13,
              }}>
                ⚠ {error}
              </div>
            )}

            {result && (
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 22, marginTop: 8 }}>
                <AnalysisResult data={result} />
              </div>
            )}
          </>
        )}

        {/* ═══ BACKTEST TAB ═══ */}
        {tab === "backtest" && <BacktestDashboard journal={journal} />}

        {/* ═══ JOURNAL TAB ═══ */}
        {tab === "journal" && <Journal journal={journal} onOutcome={logOutcome} />}

      </main>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${G.border}`, padding: "16px 24px",
        color: "#2a2a2a", fontSize: 11, textAlign: "center", lineHeight: 1.8,
      }}>
        ⚠ Educational / research purposes only. Not financial advice. Trading involves significant risk of loss.
        Past performance does not guarantee future results. Always do your own research.
      </div>
    </>
  );
}
