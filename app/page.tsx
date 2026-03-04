"use client";

import { useState } from "react";
import {
  Atom,
  BookOpen,
  FlaskConical,
  Globe,
  Lightbulb,
  HandMetal,
  Image as ImageIcon,
  Landmark,
  Leaf,
  Microscope,
  Sparkles,
  Loader2,
  AlertTriangle,
  Wand2,
  GraduationCap,
} from "lucide-react";

type PlanoAula = {
  tema: string;
  objetivo: string;
  abordagem_visual_mestre: string;
  classificadores: { acao: string; movimento: string }[];
  recursos_visuais: string[];
  sinal_sugerido: string;
};

type ProviderFailure = {
  provider: string;
  status: number;
  message: string;
  details?: string;
};

type CachedPlano = {
  key: string;
  plano: PlanoAula;
  ts: number;
};

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-xl bg-slate-200/70 ${className ?? ""}`}
  />
);

const CACHE_KEY = "ifam_plano_cache_v1";
const MAX_CACHE = 30;

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const loadCache = (): CachedPlano[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? (JSON.parse(raw) as CachedPlano[]) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const saveCache = (items: CachedPlano[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

const getCachedPlano = (tema: string) => {
  const key = normalizeKey(tema);
  const items = loadCache();
  return items.find((item) => item.key === key) ?? null;
};

const setCachedPlano = (tema: string, plano: PlanoAula) => {
  const key = normalizeKey(tema);
  const items = loadCache().filter((item) => item.key !== key);
  const updated: CachedPlano = { key, plano, ts: Date.now() };
  const next = [updated, ...items].slice(0, MAX_CACHE);
  saveCache(next);
};

const buildTimeline = (plano: PlanoAula) => {
  const classificadores = plano.classificadores
    .slice(0, 2)
    .map((item) => `${item.acao}: ${item.movimento}`)
    .join(" • ");

  return [
    {
      title: "Enquadramento visual",
      detail: plano.abordagem_visual_mestre,
    },
    {
      title: "Classificadores em ação",
      detail:
        classificadores ||
        "Demonstre os classificadores com movimentos amplos e claros.",
    },
    {
      title: "Apoio visual",
      detail:
        plano.recursos_visuais.length > 0
          ? plano.recursos_visuais.join(", ")
          : "Use recursos visuais simples para reforçar o conceito.",
    },
    {
      title: "Sinal combinado",
      detail: plano.sinal_sugerido,
    },
  ];
};

const detectArea = (tema: string) => {
  const text = normalizeKey(tema);
  const areas = [
    {
      id: "fisica",
      label: "Física",
      icon: Atom,
      keywords: [
        "fisica",
        "movimento",
        "energia",
        "forca",
        "newton",
        "onda",
        "termodinamica",
        "eletric",
        "mecanica",
        "optica",
      ],
    },
    {
      id: "bio",
      label: "Biologia",
      icon: Leaf,
      keywords: [
        "biologia",
        "celula",
        "mitocondria",
        "dna",
        "genetica",
        "ecossistema",
        "planta",
        "virus",
        "bacteria",
      ],
    },
    {
      id: "quimica",
      label: "Química",
      icon: FlaskConical,
      keywords: ["quimica", "reacao", "molecula", "atomo", "ph", "ligacao"],
    },
    {
      id: "historia",
      label: "História",
      icon: Landmark,
      keywords: [
        "historia",
        "revolucao",
        "imperio",
        "guerra",
        "colonial",
        "independencia",
        "idade",
      ],
    },
    {
      id: "geo",
      label: "Geografia",
      icon: Globe,
      keywords: ["geografia", "clima", "relevo", "territorio", "mapa"],
    },
  ];

  const found = areas.find((area) =>
    area.keywords.some((keyword) => text.includes(keyword))
  );

  if (found) return found;

  return {
    id: "geral",
    label: "Interdisciplinar",
    icon: Microscope,
    keywords: [],
  };
};

export default function Home() {
  const [tema, setTema] = useState("");
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<PlanoAula | null>(null);
  const [erro, setErro] = useState("");
  const [falhas, setFalhas] = useState<ProviderFailure[]>([]);
  const [provider, setProvider] = useState("");
  const [cacheInfo, setCacheInfo] = useState<number | null>(null);

  const gerarPlano = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const temaValue = tema.trim();
    if (!temaValue) return;

    setErro("");
    setPlano(null);
    setFalhas([]);
    setProvider("");
    setCacheInfo(null);

    const cached = getCachedPlano(temaValue);
    if (cached) {
      setPlano(cached.plano);
      setProvider("Cache local");
      setCacheInfo(cached.ts);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema: temaValue }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFalhas(Array.isArray(data?.details) ? data.details : []);
        throw new Error(data?.error ?? "Não foi possível gerar o plano.");
      }

      setPlano(data);
      setCachedPlano(temaValue, data);
      const usedProvider = response.headers.get("x-ai-provider");
      if (usedProvider) setProvider(usedProvider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro inesperado na geração.";
      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  const area = plano ? detectArea(plano.tema) : null;
  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-lime-100 text-slate-900">
      <nav className="print-hidden fixed inset-x-0 top-0 z-40 border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-base font-bold text-white">
              IF
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                IFAM INCLUSIVO
              </p>
              <p className="text-xs text-slate-500">
                Planos de aula com foco em classificadores
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex">
            <span className="rounded-full bg-emerald-50 px-3 py-1 ring-1 ring-emerald-200">
              Sem login
            </span>
            <span className="rounded-full bg-white px-4 py-1 ring-1 ring-emerald-200">
              Beta Test
            </span>
          </div>
        </div>
      </nav>
      <div className="pointer-events-none absolute -top-40 right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-[-8rem] h-[28rem] w-[28rem] rounded-full bg-lime-200/40 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-12 pt-24">
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              MVP
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-emerald-200">
              Projeto Acadêmico
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-emerald-200">
              Libras brasileira
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              IFAM Inclusivo
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              Plataforma tecnológica para professores criarem planos de aula
              visuais em Libras, com foco em classificadores, espaço e sinais
              combinados.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              Histórico local sem login
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <HandMetal className="h-4 w-4 text-emerald-600" />
              Classificadores em destaque
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Linha do tempo visual
            </div>
          </div>
        </header>

        <section className="print-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-lg shadow-emerald-200/50 backdrop-blur">
          <form
            onSubmit={gerarPlano}
            className="flex flex-col gap-4 md:flex-row md:items-end"
          >
            <div className="flex-1 space-y-2">
              <label
                htmlFor="tema"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                Tema da aula
              </label>
              <input
                id="tema"
                type="text"
                value={tema}
                onChange={(event) => setTema(event.target.value)}
                placeholder="Ex: Mitocôndrias, Leis de Newton, Tectônica de Placas"
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-lg text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !tema.trim()}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-300/50 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processando IA
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Gerar plano visual
                </>
              )}
            </button>
          </form>
        </section>

        {erro && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Não foi possível gerar o plano.</p>
                <p className="text-sm text-rose-600">{erro}</p>
                {falhas.length > 0 && (
                  <div className="mt-3 space-y-2 text-xs text-rose-700">
                    <p className="font-semibold uppercase tracking-wide">
                      Detalhes técnicos
                    </p>
                    {falhas.map((falha, index) => (
                      <div
                        key={`${falha.provider}-${index}`}
                        className="rounded-lg bg-rose-100/70 px-3 py-2"
                      >
                        <div>
                          {falha.provider} • {falha.status} • {falha.message}
                        </div>
                        {falha.details && (
                          <div className="mt-1 break-words">
                            {falha.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {loading && !plano && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-200/40">
              <SkeletonBlock className="mb-4 h-5 w-40" />
              <SkeletonBlock className="mb-3 h-4 w-full" />
              <SkeletonBlock className="mb-3 h-4 w-11/12" />
              <SkeletonBlock className="h-4 w-9/12" />
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-200/40">
              <SkeletonBlock className="mb-4 h-5 w-48" />
              <SkeletonBlock className="mb-3 h-4 w-full" />
              <SkeletonBlock className="mb-3 h-4 w-10/12" />
              <SkeletonBlock className="h-4 w-8/12" />
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-200/40 lg:col-span-2">
              <SkeletonBlock className="mb-4 h-5 w-56" />
              <div className="space-y-3">
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            </div>
          </section>
        )}

        {plano && (
          <section className="print-area space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                {plano.tema}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Plano visual final
              </span>
              {area &&
                (() => {
                  const AreaIcon = area.icon;
                  return (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-emerald-200">
                      <AreaIcon className="h-4 w-4" />
                      {area.label}
                    </span>
                  );
                })()}
              {provider && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 ring-1 ring-emerald-200">
                  {provider === "Cache local" ? provider : `IA: ${provider}`}
                </span>
              )}
              {cacheInfo && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 ring-1 ring-emerald-200">
                  Atualizado em {new Date(cacheInfo).toLocaleString("pt-BR")}
                </span>
              )}
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="print-hidden inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Exportar PDF
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/40">
                <div className="mb-4 flex items-center gap-2 text-slate-800">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold">Objetivo central</h3>
                </div>
                <p className="text-base font-medium text-slate-700">
                  {plano.objetivo}
                </p>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-emerald-100 p-5 shadow-lg shadow-emerald-200/40">
                <div className="mb-4 flex items-center gap-2 text-slate-800">
                  <Wand2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold">
                    Abordagem visual mestre
                  </h3>
                </div>
                <p className="text-base font-medium text-slate-700">
                  {plano.abordagem_visual_mestre}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/40">
              <div className="mb-5 flex items-center gap-2 text-slate-800">
                <HandMetal className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold">
                  Guia de classificadores
                </h3>
              </div>
              <div className="grid gap-4">
                {plano.classificadores.map((item, index) => (
                  <div
                    key={`${item.acao}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 md:flex-row md:items-center"
                  >
                    <span className="inline-flex w-fit items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      {item.acao}
                    </span>
                    <p className="text-slate-700">{item.movimento}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/40">
                <div className="mb-4 flex items-center gap-2 text-slate-800">
                  <ImageIcon className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold">Recursos visuais</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plano.recursos_visuais.map((recurso, index) => (
                    <span
                      key={`${recurso}-${index}`}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800"
                    >
                      {recurso}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-emerald-900 p-5 text-white shadow-lg shadow-emerald-300/40">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-200" />
                  <h3 className="text-lg font-bold">
                    Sinal combinado sugerido
                  </h3>
                </div>
                <p className="text-base font-medium text-slate-100">
                  {plano.sinal_sugerido}
                </p>
                <div className="mt-4 rounded-2xl bg-white/10 p-3 text-xs text-emerald-100">
                  Lembrete: valide o sinal com a comunidade surda local.
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-emerald-200/40">
                <div className="mb-4 flex items-center gap-2 text-slate-800">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold">Linha do tempo visual</h3>
                </div>
                <div className="relative ml-3 border-l border-emerald-200 pl-6">
                  {buildTimeline(plano).map((step, index) => (
                    <div key={step.title} className="mb-6 last:mb-0">
                      <div className="absolute -left-3 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        {step.title}
                      </h4>
                      <p className="text-sm text-slate-600">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-emerald-100 p-5 shadow-lg shadow-emerald-200/40">
                <div className="mb-4 flex items-center gap-2 text-slate-800">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold">
                    Dicas de adaptação por idade
                  </h3>
                </div>
                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <p className="font-semibold">EF1 (1º ao 5º)</p>
                    <p>
                      Use objetos concretos, movimentos grandes e pausas curtas.
                      Reforce o tema com imagens simples e repetição.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">EF2 (6º ao 9º)</p>
                    <p>
                      Trabalhe comparações visuais e destaque classificadores.
                      Peça que os alunos reproduzam o movimento em duplas.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">EM (Ensino Médio)</p>
                    <p>
                      Use camadas no espaço, ritmo mais preciso e vocabulário
                      técnico com sinal combinado validado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
