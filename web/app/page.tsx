"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  THEMES,
  TONES,
  buildExportHtml,
  composeBlueprint,
  type LandingBlueprint,
  type ThemeOption,
  type ToneOption,
} from "@/lib/generator";
import { clsx } from "clsx";

const HERO_LAYOUTS: Array<{ id: "split" | "center" | "left"; label: string; description: string }> = [
  {
    id: "split",
    label: "Split",
    description: "Visual stats on the right, story on the left",
  },
  {
    id: "center",
    label: "Centered",
    description: "Big headline centered, stacked call-to-actions",
  },
  {
    id: "left",
    label: "Left",
    description: "All content aligned left for productivity brands",
  },
];

type AgentStep = {
  id: string;
  title: string;
  caption: string;
  status: "pending" | "active" | "done";
};

type FormState = {
  productName: string;
  oneLiner: string;
  audience: string;
  problem: string;
  solution: string;
  differentiator: string;
  cta: string;
  featuresText: string;
  toneId: string;
  themeId: string;
  heroLayout: "split" | "center" | "left";
};

const INITIAL_FORM: FormState = {
  productName: "LaunchPilot",
  oneLiner: "An AI teammate that drafts high-impact landing pages in under 60 seconds.",
  audience: "growth teams and indie founders",
  problem: "Your launches stall while you wrangle copywriters, designers, and approvals.",
  solution: "LaunchPilot assembles narrative, layout, and copy automatically based on a single product brief.",
  differentiator:
    "It reasons about your audience and positioning, producing on-brand pages that convert like your best marketer wrote them.",
  cta: "Generate my launch page",
  featuresText: [
    "Audience-tuned hero copy that sounds like your brand",
    "Feature blocks that explain the value, not just the features",
    "Proof sections with metrics, quotes, and visuals",
    "Exportable HTML, React, and Notion-friendly versions",
  ].join("\n"),
  toneId: TONES[0].id,
  themeId: THEMES[1].id,
  heroLayout: "split",
};

const parseFeatures = (value: string) =>
  value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const getTone = (id: string): ToneOption => TONES.find((tone) => tone.id === id) ?? TONES[0];
const getTheme = (id: string): ThemeOption => THEMES.find((theme) => theme.id === id) ?? THEMES[0];

const buildDefaultBlueprint = () =>
  composeBlueprint({
    productName: INITIAL_FORM.productName,
    oneLiner: INITIAL_FORM.oneLiner,
    audience: INITIAL_FORM.audience,
    problem: INITIAL_FORM.problem,
    solution: INITIAL_FORM.solution,
    features: parseFeatures(INITIAL_FORM.featuresText),
    differentiator: INITIAL_FORM.differentiator,
    cta: INITIAL_FORM.cta,
    tone: getTone(INITIAL_FORM.toneId),
    theme: getTheme(INITIAL_FORM.themeId),
    heroLayout: INITIAL_FORM.heroLayout,
  });

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [blueprint, setBlueprint] = useState<LandingBlueprint>(buildDefaultBlueprint);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const exportHtml = useMemo(() => buildExportHtml(blueprint), [blueprint]);

  const syncStep = (index: number, status: AgentStep["status"], extra?: Partial<AgentStep>) => {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              status,
              ...extra,
            }
          : step,
      ),
    );
  };

  const schedule = (delay: number, callback: () => void) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  const handleGenerate = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    const tone = getTone(form.toneId);
    const theme = getTheme(form.themeId);
    const features = parseFeatures(form.featuresText);

    const freshSteps: AgentStep[] = [
      {
        id: "analyze",
        title: "Decode the brief",
        caption: "Understanding audience, promise, and differentiators",
        status: "active",
      },
      {
        id: "structure",
        title: "Map the narrative",
        caption: "Assembling hero, proof, workflow, and CTA",
        status: "pending",
      },
      {
        id: "polish",
        title: "Polish the layout",
        caption: `Applying ${theme.name} theme with ${tone.name.toLowerCase()} tone`,
        status: "pending",
      },
    ];

    setSteps(freshSteps);
    setLoading(true);

    schedule(650, () => {
      syncStep(0, "done");
      syncStep(1, "active");
    });

    schedule(1200, () => {
      const nextBlueprint = composeBlueprint({
        productName: form.productName,
        oneLiner: form.oneLiner,
        audience: form.audience,
        problem: form.problem,
        solution: form.solution,
        features,
        differentiator: form.differentiator,
        cta: form.cta,
        tone,
        theme,
        heroLayout: form.heroLayout,
      });
      setBlueprint(nextBlueprint);
      syncStep(1, "done");
      syncStep(2, "active");
    });

    schedule(1750, () => {
      syncStep(2, "done", {
        caption: `Ready to export • ${new Date().toLocaleTimeString()}`,
      });
      setLoading(false);
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportHtml);
      setCopied(true);
      schedule(2000, () => setCopied(false));
    } catch (error) {
      console.error("Clipboard copy failed", error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.productName.replace(/\s+/g, "-").toLowerCase()}-landing.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 pb-24 pt-14 lg:px-12">
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.6)]" />
            <span>Agent online • Landing pages in seconds</span>
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            LaunchPilot creates production-ready landing pages from a single brief.
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Describe your product, choose a tone and theme, and our autonomous agent births a narrative-driven landing page complete with hero, feature, proof, and CTA sections. Export responsive HTML in one click.
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[420px,1fr]">
          <aside className="sticky top-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Agent Brief</h2>
              <button
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300 hover:border-white/25 hover:text-white"
                onClick={() => setForm(INITIAL_FORM)}
              >
                Reset
              </button>
            </div>

            <div className="grid gap-3 text-sm">
              <LabeledField label="Product name">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.productName}
                  onChange={(event) => updateField("productName", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="One-liner">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.oneLiner}
                  onChange={(event) => updateField("oneLiner", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="Audience">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.audience}
                  onChange={(event) => updateField("audience", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="Problem">
                <textarea
                  className="min-h-[72px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.problem}
                  onChange={(event) => updateField("problem", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="Solution">
                <textarea
                  className="min-h-[72px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.solution}
                  onChange={(event) => updateField("solution", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="Differentiator">
                <textarea
                  className="min-h-[72px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.differentiator}
                  onChange={(event) => updateField("differentiator", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="Call to action copy">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.cta}
                  onChange={(event) => updateField("cta", event.target.value)}
                />
              </LabeledField>
              <LabeledField label="Features">
                <textarea
                  placeholder="One feature per line"
                  className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  value={form.featuresText}
                  onChange={(event) => updateField("featuresText", event.target.value)}
                />
              </LabeledField>
            </div>

            <div className="grid gap-4">
              <LabeledField label="Tone">
                <div className="grid grid-cols-1 gap-2">
                  {TONES.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => updateField("toneId", tone.id)}
                      className={clsx(
                        "flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60",
                        form.toneId === tone.id
                          ? "border-emerald-400 bg-emerald-400/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-200",
                      )}
                    >
                      <span className="text-sm font-semibold">{tone.name}</span>
                      <span className="text-xs text-slate-300">Headline accent: {tone.headlineModifier}</span>
                    </button>
                  ))}
                </div>
              </LabeledField>

              <LabeledField label="Theme">
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => updateField("themeId", theme.id)}
                      className={clsx(
                        "group relative flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition",
                        form.themeId === theme.id
                          ? "border-emerald-400 bg-white/10"
                          : "border-white/10 bg-white/5",
                      )}
                    >
                      <span className="text-sm font-semibold text-white">{theme.name}</span>
                      <div className="flex gap-1">
                        {Object.entries(theme.palette).slice(0, 4).map(([key, color]) => (
                          <span
                            key={key}
                            className="h-6 w-6 rounded-full border border-white/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </LabeledField>

              <LabeledField label="Hero layout">
                <div className="grid gap-2">
                  {HERO_LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => updateField("heroLayout", layout.id)}
                      className={clsx(
                        "flex flex-col rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5",
                        form.heroLayout === layout.id
                          ? "border-emerald-400 bg-emerald-400/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-200",
                      )}
                    >
                      <span className="text-sm font-semibold">{layout.label}</span>
                      <span className="text-xs text-slate-300">{layout.description}</span>
                    </button>
                  ))}
                </div>
              </LabeledField>
            </div>

            <button
              onClick={handleGenerate}
              className={clsx(
                "group flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-emerald-500/50 transition",
                loading ? "opacity-70" : "hover:-translate-y-0.5 hover:shadow-xl",
              )}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-900" />
                  Generating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-900" />
                  Generate landing page
                </span>
              )}
            </button>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Agent timeline</h3>
              <div className="flex flex-col gap-2">
                {steps.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                    Ready when you are. Hit &quot;Generate&quot; to see the agent work.
                  </div>
                )}
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={clsx(
                      "rounded-2xl border px-4 py-3 text-sm transition",
                      step.status === "done" && "border-emerald-500/60 bg-emerald-500/10 text-emerald-100",
                      step.status === "active" && "border-cyan-400/70 bg-cyan-400/10 text-cyan-100",
                      step.status === "pending" && "border-white/10 bg-white/5 text-slate-300",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{step.title}</span>
                      <span
                        className={clsx(
                          "h-2.5 w-2.5 rounded-full",
                          step.status === "done" && "bg-emerald-400",
                          step.status === "active" && "bg-cyan-300 animate-pulse",
                          step.status === "pending" && "bg-slate-500",
                        )}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-200/80">{step.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex flex-col gap-6">
            <PreviewHeader blueprint={blueprint} onCopy={handleCopy} onDownload={handleDownload} copied={copied} />
            <LandingPreview blueprint={blueprint} />
          </section>
        </div>
      </div>
    </div>
  );
}

type LabeledFieldProps = {
  label: string;
  children: React.ReactNode;
};

const LabeledField = ({ label, children }: LabeledFieldProps) => (
  <label className="grid gap-1 text-left">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
    {children}
  </label>
);

type PreviewHeaderProps = {
  blueprint: LandingBlueprint;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
};

const PreviewHeader = ({ blueprint, onCopy, onDownload, copied }: PreviewHeaderProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Preview</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{blueprint.hero.title}</h2>
        <p className="text-xs text-slate-400">Generated {new Date(blueprint.generatedAt).toLocaleTimeString()}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCopy}
          className={clsx(
            "rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-white",
            copied && "border-emerald-400 bg-emerald-500/10 text-emerald-200",
          )}
        >
          {copied ? "Copied" : "Copy HTML"}
        </button>
        <button
          onClick={onDownload}
          className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-emerald-500/40 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          Download HTML
        </button>
      </div>
    </div>
  );
};

type LandingPreviewProps = {
  blueprint: LandingBlueprint;
};

const LandingPreview = ({ blueprint }: LandingPreviewProps) => {
  const { hero, sections, palette, gradient, heroLayout } = blueprint;
  const heroText = palette.text === "#1c1917" || palette.text === "#064e3b" ? "#0f172a" : "#f8fafc";

  return (
    <div className="overflow-hidden rounded-[40px] border border-white/10 bg-slate-950/60 shadow-[0_40px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div
        className={clsx(
          "relative px-8 py-16 sm:px-12 sm:py-20",
          heroLayout === "center" ? "text-center" : "",
        )}
        style={{ background: gradient, color: heroText }}
      >
        <div
          className={clsx(
            "mx-auto flex max-w-5xl flex-col gap-12",
            heroLayout === "split" && "lg:flex-row lg:items-center lg:justify-between",
            heroLayout === "left" && "items-start text-left",
            heroLayout === "center" && "items-center",
          )}
        >
          <div className={clsx("max-w-xl", heroLayout === "center" && "mx-auto")}
            style={{ color: heroText }}
          >
            <p className={clsx("text-xs font-semibold uppercase tracking-[0.3em]", heroLayout === "center" && "mx-auto max-w-fit")}
              style={{ opacity: 0.8 }}
            >
              {hero.eyebrow}
            </p>
            <h1
              className={clsx(
                "mt-6 font-semibold leading-tight",
                heroLayout === "center" ? "text-4xl sm:text-5xl" : "text-[38px] sm:text-[46px]",
              )}
            >
              {hero.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg" style={{ opacity: 0.92 }}>
              {hero.subtitle}
            </p>
            <div
              className={clsx(
                "mt-8 flex flex-wrap items-center gap-4",
                heroLayout === "center" && "justify-center",
              )}
            >
              <button
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {hero.primaryCta}
              </button>
              <button
                className="rounded-full border border-white/60 bg-transparent px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                style={{ color: heroText }}
              >
                {hero.secondaryCta} →
              </button>
            </div>
          </div>

          <div
            className={clsx(
              "grid gap-4 rounded-3xl border border-white/40 bg-white/15 p-6 text-left shadow-[0_20px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl",
              heroLayout === "split" ? "max-w-xs" : "lg:max-w-xs",
            )}
          >
            {hero.stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="text-sm" style={{ opacity: 0.85 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="space-y-16 px-8 py-16 sm:px-12"
        style={{ backgroundColor: palette.surface, color: palette.text }}
      >
        {sections.map((section) => (
          <div
            key={section.id}
            className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-3xl border border-black/5 bg-white/70 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
            style={{ backgroundColor: heroLayout === "center" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.8)" }}
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{section.label}</p>
              <h3 className="text-2xl font-semibold text-slate-900">{section.headline}</h3>
              <p className="text-sm text-slate-600">{section.body}</p>
            </div>
            {section.items?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {section.items.map((item) => (
                  <div
                    key={item.title + item.description}
                    className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm shadow-slate-900/5"
                  >
                    <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow">
                  {blueprint.hero.primaryCta}
                </button>
                <span className="text-sm font-medium text-slate-500">Need a custom export? Ask the agent in chat.</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
