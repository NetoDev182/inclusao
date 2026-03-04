import { NextResponse } from "next/server";

type Classificador = {
  acao: string;
  movimento: string;
};

type PlanoAula = {
  tema: string;
  objetivo: string;
  abordagem_visual_mestre: string;
  classificadores: Classificador[];
  recursos_visuais: string[];
  sinal_sugerido: string;
};

const SYSTEM_PROMPT = `Você é um pedagogo bilíngue (Libras brasileira – Português do Brasil) especialista em tecnologia assistiva para surdez.
O usuário informará um tema de aula. Você deve criar um plano didático que priorize a transposição visual:
descreva como o professor deve usar o espaço, as mãos e os classificadores para representar o conceito físico/químico/biológico.
Não traduza termos. Explique como ENSINAR visualmente, com foco em movimento, direção, tamanho, ritmo e localização no espaço.
Garanta que a descrição siga convenções de Libras brasileira e evite referências a outras línguas de sinais.
Quando não houver sinal técnico oficial, proponha um sinal combinado e deixe claro que precisa de validação comunitária.

Responda ESTRITAMENTE em JSON válido (sem markdown, sem \`\`\`) com esta estrutura exata:
{
  "tema": "Nome do tema",
  "objetivo": "Objetivo direto da aula",
  "abordagem_visual_mestre": "Descrição da estratégia visual principal",
  "classificadores": [
    { "acao": "Nome da ação", "movimento": "Como executar o movimento com as mãos e o espaço" }
  ],
  "recursos_visuais": ["Item 1", "Item 2"],
  "sinal_sugerido": "Dica de sinal combinado para o tema"
}`;

class ProviderError extends Error {
  status: number;
  provider: string;
  details?: string;

  constructor(message: string, status: number, provider: string, details?: string) {
    super(message);
    this.status = status;
    this.provider = provider;
    this.details = details;
  }
}

function tryParseJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    }
    throw new Error("JSON inválido");
  }
}

function isPlanoAula(value: unknown): value is PlanoAula {
  if (!value || typeof value !== "object") return false;
  const obj = value as PlanoAula;
  return (
    typeof obj.tema === "string" &&
    typeof obj.objetivo === "string" &&
    typeof obj.abordagem_visual_mestre === "string" &&
    Array.isArray(obj.classificadores) &&
    obj.classificadores.every(
      (item) =>
        item &&
        typeof item.acao === "string" &&
        typeof item.movimento === "string"
    ) &&
    Array.isArray(obj.recursos_visuais) &&
    obj.recursos_visuais.every((item) => typeof item === "string") &&
    typeof obj.sinal_sugerido === "string"
  );
}

function parsePlano(text: string, provider: string): PlanoAula {
  const parsed = tryParseJson(text);
  if (!isPlanoAula(parsed)) {
    throw new ProviderError("Resposta fora do contrato JSON", 500, provider);
  }
  return parsed;
}

async function callOpenAILike(params: {
  tema: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  provider: string;
}): Promise<PlanoAula> {
  const response = await fetch(params.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Tema: ${params.tema}` },
      ],
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 2000);
    throw new ProviderError(
      "Falha na API",
      response.status,
      params.provider,
      detail
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new ProviderError("Resposta sem conteúdo", 500, params.provider);
  }

  return parsePlano(content, params.provider);
}

export async function POST(req: Request) {
  let body: { tema?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido na requisição." },
      { status: 400 }
    );
  }

  const tema = body.tema?.trim();
  if (!tema) {
    return NextResponse.json(
      { error: "Informe um tema válido." },
      { status: 400 }
    );
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY não configurada no .env.local." },
      { status: 500 }
    );
  }

  try {
    const plano = await callOpenAILike({
      tema,
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      provider: "DeepSeek",
    });
    return NextResponse.json(plano, {
      headers: { "x-ai-provider": "DeepSeek" },
    });
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError("Falha inesperada", 500, "DeepSeek");

    return NextResponse.json(
      {
        error: providerError.message,
        details: [
          {
            provider: "DeepSeek",
            status: providerError.status,
            message: providerError.message,
            details: providerError.details,
          },
        ],
      },
      { status: providerError.status }
    );
  }
}
