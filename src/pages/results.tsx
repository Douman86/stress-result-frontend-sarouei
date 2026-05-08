import { useEffect, useState } from "react";

type Fields = Record<string, unknown>;

interface ApiResponse {
  id: string;
  fields: Fields;
}

interface ApiError {
  error: string;
}

const apiBase = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(asString).filter(Boolean).join(", ");
  return String(v);
}

function formatNeed(need: string): string {
  if (!need) return "—";
  const map: Record<string, string> = {
    CONN: "Connection",
    AUTO: "Autonomy / Control",
    COMP: "Competence / Effectiveness",
    RECOG: "Recognition / Value",
    MEAN: "Meaning / Purpose",
    SEC: "Security / Stability",
    GROW: "Growth / Development",
    REC: "Recovery",
    RECOVERY: "Recovery",
    NO_MAJOR_GAP: "No major unmet need",
  };
  return map[need.trim().toUpperCase()] ?? need;
}

function formatPattern(pattern: string): string {
  if (!pattern) return "—";
  if (pattern === "NO_CLEAR_PATTERN") return "No clear stress pattern";
  return pattern
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function patternIntro(pattern: string, need: string) {
  const p = pattern.toUpperCase();
  const n = formatNeed(need) || "rest, recovery, or regulation";
  if (p === "NO_CLEAR_PATTERN") {
    return "Your responses do not indicate a clear stress pattern at this time. You appear to be in a relatively balanced state.";
  }
  if (p.includes("OVERLOAD")) {
    return `Your responses suggest that your stress is currently driven mainly by overload and insufficient recovery. The most important need right now appears to be ${n}.`;
  }
  if (p.includes("CONTROL")) {
    return `Your responses suggest that stress is being shaped mainly by low control, pressure, or unpredictability. The most important need right now appears to be ${n}.`;
  }
  if (p.includes("RELATIONAL") || p.includes("CONNECTION")) {
    return `Your responses suggest that your stress is strongly connected to relationships, emotional support, or interpersonal tension. The most important need right now appears to be ${n}.`;
  }
  if (p.includes("MEANING")) {
    return `Your responses suggest that stress is currently linked less to overload and more to meaning, direction, or alignment with what matters to you. The most important need right now appears to be ${n}.`;
  }
  return `Your responses suggest a meaningful stress pattern. The most important need right now appears to be ${n}.`;
}

function meaningSummary(pattern: string, need: string) {
  const p = pattern.toUpperCase();
  const n = (formatNeed(need) || "rest").toLowerCase();
  if (p === "NO_CLEAR_PATTERN") {
    return `At the moment, your system appears to be functioning in a stable range.

This suggests that your current demands are generally matched by your available resources. Small variations may occur, but they do not indicate a meaningful stress pattern.

This is a maintenance phase rather than a repair phase.`;
  }
  if (p.includes("MEANING")) {
    return `Your current stress seems to come less from overload and more from a lack of direction, emotional engagement, or alignment with what matters to you. Right now, your system appears to need more ${n}.`;
  }
  if (p.includes("OVERLOAD")) {
    return `Your stress currently appears to be driven mainly by sustained demands and insufficient recovery. Right now, your system appears to need more ${n}.`;
  }
  if (p.includes("CONTROL")) {
    return `Your stress currently appears to be shaped mainly by low control, pressure, or unpredictability. Right now, your system appears to need more ${n}.`;
  }
  if (p.includes("RELATIONAL") || p.includes("CONNECTION")) {
    return `Your stress currently appears to be closely tied to relationships, emotional support, or interpersonal strain. Right now, your system appears to need more ${n}.`;
  }
  return `Your result suggests a meaningful stress pattern with a current need for ${n}.`;
}

function patternAnchor(pattern: string) {
  const p = pattern.toUpperCase();
  if (p.includes("MEANING")) {
    return "You may not be overloaded — you may be under-connected to meaning.";
  }
  if (p.includes("OVERLOAD")) {
    return "You may not be failing — your system may simply be overloaded.";
  }
  if (p.includes("CONTROL")) {
    return "You may not be weak — you may be carrying too little control.";
  }
  if (p.includes("RELATIONAL") || p.includes("CONNECTION")) {
    return "You may not be too sensitive — your stress may be relationally driven.";
  }
  return "Your current result reflects a real pattern, not a personal flaw.";
}

function cognitiveIntro(pattern: string) {
  const p = pattern.toUpperCase();
  if (p.includes("MEANING")) {
    return "When stress is linked to low meaning, the mind often becomes less engaged, less focused, and less energized. This does not necessarily mean inability — it often means reduced inner investment.";
  }
  if (p.includes("OVERLOAD")) {
    return "When stress is driven by overload, the mind often becomes tired, saturated, and less flexible. The issue is usually not capability, but reduced cognitive capacity under pressure.";
  }
  if (p.includes("CONTROL")) {
    return "When stress is shaped by low control, mental energy is often redirected toward scanning, anticipating, and trying to manage uncertainty.";
  }
  if (p.includes("RELATIONAL") || p.includes("CONNECTION")) {
    return "When stress is relational, attention and thinking are often pulled toward other people, emotional signals, and unresolved interpersonal tension.";
  }
  return "Stress can affect attention, decisions, memory, and self-regulation in different ways.";
}

function startHereText(pattern: string) {
  const p = pattern.toUpperCase();
  if (p.includes("MEANING")) {
    return "Do not begin with productivity. Begin with reconnection: what feels personally meaningful right now?";
  }
  if (p.includes("OVERLOAD")) {
    return "Do not begin with optimization. Begin with recovery: reduce load before asking more from yourself.";
  }
  if (p.includes("CONTROL")) {
    return "Do not begin with perfection. Begin with control: identify one area where you can influence the next step.";
  }
  if (p.includes("RELATIONAL") || p.includes("CONNECTION")) {
    return "Do not begin with fixing everything. Begin with one honest relational need or one safe supportive contact.";
  }
  return "Begin with the smallest next step that reduces stress and increases clarity.";
}

function reflectionIntro(pattern: string) {
  const p = pattern.toUpperCase();
  if (p.includes("MEANING")) {
    return "This result often appears when a person is still functioning, but no longer feels deeply connected to what they are doing.";
  }
  if (p.includes("OVERLOAD")) {
    return "This result often appears when demands have exceeded restoration for too long.";
  }
  if (p.includes("CONTROL")) {
    return "This result often appears when life feels driven more by pressure than by agency.";
  }
  if (p.includes("RELATIONAL") || p.includes("CONNECTION")) {
    return "This result often appears when emotional or interpersonal strain has become a central stress driver.";
  }
  return "Take a moment to consider what this result may be pointing to in your life.";
}

type ChartItem = { label: string; value: number };

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatOneDecimal(value: number): string {
  return safeNum(value).toFixed(1);
}

function formatReportDate(raw: string): string {
  const value = (raw || "").trim();
  if (!value) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toGapPct(raw: number): number {
  return Math.round(Math.min(Math.max((raw / 4) * 100, 0), 100));
}

function toResourcePct(raw: number): number {
  return Math.round(Math.min(Math.max(((raw - 1) / 4) * 100, 0), 100));
}

function buildNeedGapItems(get: (k: string) => string): ChartItem[] {
  return [
    { label: "Connection", value: toGapPct(safeNum(get("gap_conn"))) },
    { label: "Autonomy", value: toGapPct(safeNum(get("gap_auto"))) },
    { label: "Competence", value: toGapPct(safeNum(get("gap_comp"))) },
    { label: "Recovery", value: toGapPct(safeNum(get("gap_rec"))) },
    { label: "Meaning", value: toGapPct(safeNum(get("gap_mean"))) },
    { label: "Security", value: toGapPct(safeNum(get("gap_sec"))) },
    { label: "Growth", value: toGapPct(safeNum(get("gap_grow"))) },
  ];
}

function buildResourceItems(get: (k: string) => string): ChartItem[] {
  return [
    { label: "Coping capacity", value: toResourcePct(safeNum(get("r_int_score"))) },
    { label: "Physical", value: toResourcePct(safeNum(get("r_phy_score"))) },
    { label: "Social", value: toResourcePct(safeNum(get("r_soc_score"))) },
    { label: "Structural", value: toResourcePct(safeNum(get("r_str_score"))) },
    { label: "Meaning", value: toResourcePct(safeNum(get("r_mean_score"))) },
  ];
}

function getHighestItem(items: ChartItem[]): ChartItem | null {
  if (!items.length) return null;
  return items.reduce((max, item) => (item.value > max.value ? item : max), items[0]!);
}

function getLowestItem(items: ChartItem[]): ChartItem | null {
  if (!items.length) return null;
  return items.reduce((min, item) => (item.value < min.value ? item : min), items[0]!);
}

function balanceSummary(gaps: ChartItem[], resources: ChartItem[]): string {
  const topGap = getHighestItem(gaps);
  const weakestResource = getLowestItem(resources);

  const hasGap = topGap !== null && topGap.value >= 50;
  const hasWeakResource = weakestResource !== null && weakestResource.value <= 50;

  if (hasGap && hasWeakResource) {
    return `At the moment, the clearest imbalance appears around ${topGap!.label.toLowerCase()}, while your weakest current resource appears to be ${weakestResource!.label.toLowerCase()}.`;
  }
  if (hasGap) {
    return `At the moment, the clearest imbalance appears around ${topGap!.label.toLowerCase()}.`;
  }
  if (hasWeakResource) {
    return `At the moment, your weakest current resource appears to be ${weakestResource!.label.toLowerCase()}.`;
  }
  return "Your needs and resources look relatively balanced at the moment.";
}

function InsightChartCard({
  title,
  subtitle,
  items,
  type,
}: {
  title: string;
  subtitle: string;
  items: ChartItem[];
  type: "gap" | "resource";
}) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const emphasisItem =
    type === "gap" ? getHighestItem(items) : getLowestItem(items);

  return (
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-6 shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
      <div className="text-[22px] leading-tight text-[#0f172a] font-bold mb-2 tracking-[-0.01em]">
        {title}
      </div>
      <div className="text-[15px] leading-[1.6] text-slate-600 mb-4">
        {subtitle}
      </div>
      <div className="flex flex-col gap-3.5">
        {items.map((item) => {
          const widthPercent = `${Math.max(item.value, 4)}%`;
          const isEmphasis = emphasisItem?.label === item.label;
          const fillColor = type === "gap" ? "bg-amber-500" : "bg-slate-400";
          const emphasisRing = isEmphasis
            ? "ring-2 ring-inset ring-white/70 saturate-150"
            : "";
          return (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[15px] text-slate-800 font-semibold">
                  {item.label}
                </span>
                <span className="text-[14px] text-slate-500 font-semibold tabular-nums">
                  {item.value}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${fillColor} ${emphasisRing}`}
                  style={{ width: widthPercent }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartHereBox({ pattern }: { pattern: string }) {
  return (
    <div className="bg-[#fef3c7] ring-1 ring-[#fde68a] rounded-2xl p-5 mb-2">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#92400e] mb-2">
        Start here
      </div>
      <div className="text-[16.5px] leading-[1.7] text-[#92400e] font-medium">
        {startHereText(pattern)}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 sm:p-8 mb-8">
      <h2 className="text-[28px] leading-tight text-[#0f172a] font-bold tracking-[-0.01em] m-0 mb-5">
        {title}
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white ring-1 ring-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-2">
        {title}
      </div>
      <div className="text-[16.5px] leading-[1.7] text-slate-800">
        {text || "—"}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  if (!children || (typeof children === "string" && !children.trim()))
    return null;
  return (
    <div className="text-[16.5px] leading-[1.7] text-slate-700">
      • {children}
    </div>
  );
}

function HowToReadToggle() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[12.5px] text-slate-400 hover:text-slate-500 transition-colors cursor-pointer bg-transparent border-none p-0 select-none"
      >
        How to read this
        <span className="text-[10px] leading-none">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <p className="m-0 mt-1.5 text-[12px] leading-[1.65] text-slate-400">
          Gap percentages show how strongly an important need is currently
          unmet. Higher gap = stronger imbalance. Resource percentages show how
          available a support area feels right now. Lower resource = weaker
          current support.
        </p>
      )}
    </div>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[16.5px] leading-[1.7] text-slate-700 m-0 whitespace-pre-line">
      {children}
    </p>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  if (!children || (typeof children === "string" && !children.trim()))
    return null;
  return (
    <div className="relative bg-slate-50/60 ring-1 ring-slate-200 border-l-2 border-blue-400 rounded-r-md px-6 py-5 pl-14">
      <span
        aria-hidden="true"
        className="absolute top-2 left-4 text-[64px] leading-none font-serif font-normal text-slate-300 opacity-30 select-none pointer-events-none"
      >
        “
      </span>
      <div className="text-[18px] leading-[1.7] text-slate-700 italic font-normal">
        {children}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
        <span className="text-sm">Loading your result…</span>
      </div>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          We couldn't load your result
        </h1>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export default function ResultsPage({ rid }: { rid: string | null }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!rid) {
        setLoading(false);
        setError(
          "No result ID was provided. Add ?rid=YOUR_ID to the URL to view a report.",
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/results/${encodeURIComponent(rid)}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiError | null;
          throw new Error(
            body?.error ??
              (res.status === 404
                ? "Result not found."
                : "Something went wrong."),
          );
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rid]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your result link:", url);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;
  if (!data) return <ErrorView message="No data available." />;

  const f = data.fields;
  const get = (key: string) => asString(f[key]);

  const primary = get("primary_pattern");
  const secondary = get("secondary_pattern");
  const need = get("need") || get("main_need");
  const intro = patternIntro(primary, need);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 font-sans py-10 px-5 sm:py-14">
      <div className="max-w-[980px] mx-auto">
        {/* Print-only report header */}
        <div className="print-only print-header">
          Stress Assessment Result · {formatReportDate(get("created_at"))}
        </div>

        {/* Hero */}
        <section className="bg-white ring-1 ring-slate-200 rounded-2xl p-7 sm:p-9 shadow-[0_1px_2px_rgba(0,0,0,0.04)] mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Stress assessment result
            </div>
            <div className="no-print flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center rounded-full bg-white ring-1 ring-slate-300 text-slate-800 text-xs font-medium px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                {copied ? "Link copied" : "Share"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center rounded-full bg-slate-900 text-white text-xs font-medium px-4 py-2 hover:bg-slate-700 transition-colors"
              >
                Save as PDF
              </button>
            </div>
          </div>

          <h1 className="text-[clamp(38px,6vw,56px)] leading-[1.05] m-0 mb-4 text-[#0f172a] font-bold tracking-[-0.02em]">
            {formatPattern(primary)}
          </h1>
          <p className="text-[20px] leading-[1.5] text-[#334155] font-semibold max-w-[760px] m-0 mb-3.5">
            {patternAnchor(primary)}
          </p>
          <p className="text-[16.5px] leading-[1.7] text-slate-600 max-w-[760px] m-0 mb-7">
            {intro}
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <BadgeBox label="Main pattern" value={formatPattern(primary)} accent />
            <BadgeBox
              label="Secondary pattern"
              value={secondary ? formatPattern(secondary) : "None"}
            />
            <BadgeBox label="Main need" value={formatNeed(need)} />
          </div>
        </section>

        <Section title="What this means">
          <div className="bg-slate-50 border-l-4 border-blue-500 rounded-r-md p-5">
            <Paragraph>{meaningSummary(primary, need)}</Paragraph>
          </div>
        </Section>

        {(() => {
          const gaps = buildNeedGapItems(get);
          const resources = buildResourceItems(get);
          const hasAny =
            gaps.some((g) => g.value > 0) ||
            resources.some((r) => r.value > 0);
          if (!hasAny) return null;
          return (
            <Section title="Your current balance at a glance">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <InsightChartCard
                  title="Need gaps"
                  subtitle="Higher values suggest areas where an important need is currently less fulfilled."
                  items={gaps}
                  type="gap"
                />
                <InsightChartCard
                  title="Resources"
                  subtitle="Lower values suggest areas where your current support or resilience base may be weaker."
                  items={resources}
                  type="resource"
                />
              </div>
              <div className="mt-4 bg-slate-100 ring-1 ring-slate-200 rounded-2xl p-5">
                <p className="m-0 text-[16.5px] leading-[1.7] text-slate-700 font-medium">
                  {balanceSummary(gaps, resources)}
                </p>
              </div>
              <HowToReadToggle />
            </Section>
          );
        })()}

        {primary.toUpperCase() !== "NO_CLEAR_PATTERN" && (
          <Section title="Why this result appeared">
            <Bullet>{get("driver_1")}</Bullet>
            <Bullet>{get("driver_2")}</Bullet>
            <Bullet>{get("driver_3")}</Bullet>
          </Section>
        )}

        <Section title="How this may affect your thinking and performance">
          <Paragraph>{cognitiveIntro(primary)}</Paragraph>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            <InfoCard title="Attention & Focus" text={get("cog_attention")} />
            <InfoCard title="Thinking & Decisions" text={get("cog_decision")} />
            <InfoCard
              title="Memory"
              text={
                get("cog_memory") ||
                "Stress may temporarily affect how well information is retained or recalled."
              }
            />
            <InfoCard title="Self-Regulation" text={get("cog_regulation")} />
          </div>
        </Section>

        <Section title="In daily life, this may look like">
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            <InfoCard title="Work" text={get("life_work")} />
            <InfoCard title="Relationships" text={get("life_rel")} />
            <InfoCard title="Daily Life" text={get("life_daily")} />
          </div>
        </Section>

        <Section title="Where stress may currently show up">
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            <InfoCard title="Body" text={get("body")} />
            <InfoCard title="Thoughts" text={get("thoughts")} />
            <InfoCard title="Emotions" text={get("emotions")} />
            <InfoCard title="Behavior" text={get("behavior")} />
          </div>
        </Section>

        <Section title="What to focus on now">
          <StartHereBox pattern={primary} />
          <Bullet>{get("action_1")}</Bullet>
          <Bullet>{get("action_2")}</Bullet>
          <Bullet>{get("action_3")}</Bullet>
        </Section>

        <Section title="Reflection">
          <Paragraph>{reflectionIntro(primary)}</Paragraph>
          <Quote>{get("reflection")}</Quote>
        </Section>

        <div className="print-only print-disclaimer">
          <div className="print-disclaimer-title">About this report</div>
          <p>
            This report reflects your responses on the date the assessment was
            completed and is intended for personal reflection only. It is not a
            clinical diagnosis, medical advice, or a substitute for evaluation
            by a qualified mental health professional. If you are experiencing
            significant distress, please consider speaking with a licensed
            provider.
          </p>
        </div>

        <div className="text-center text-sm text-slate-400 mt-6">
          Result ID: {data.id}
        </div>
      </div>
    </div>
  );
}

function BadgeBox({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 ring-1 ring-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 mb-2.5">
        {label}
      </div>
      <span
        className={`inline-block px-3.5 py-2 rounded-full text-[16.5px] font-semibold ${
          accent
            ? "bg-[#e0f2fe] text-[#0369a1]"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
