# Ifam Inclusivo

Plataforma acadêmica sem login para professores criarem planos de aula visuais em Libras brasileira, com foco em transposição didática, classificadores e sinais combinados.

## Stack
- Next.js (App Router)
- Tailwind CSS
- TypeScript
- DeepSeek (API compatível OpenAI)

## Funcionalidades
- Plano visual com abordagem mestre, classificadores e recursos.
- Linha do tempo visual (passo a passo).
- Dicas de adaptação por idade (EF1, EF2, EM).
- Histórico local por tema (cache em `localStorage`).
- Exportação para PDF via impressão do navegador.

## Requisitos
- Node.js 18+
- Chave da API DeepSeek

## Configuração
1. Crie o arquivo `.env.local` a partir do `.env.example`.
2. Preencha sua chave:
   - `DEEPSEEK_API_KEY`

## Rodar localmente
```bash
npm install
npm run dev
```

## Deploy (Vercel)
1. Suba o projeto para um repositório no GitHub.
2. Crie um novo projeto no Vercel e conecte o repositório.
3. Adicione as variáveis de ambiente:
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_MODEL` (opcional, padrão `deepseek-chat`)
4. Deploy.

## Observações
- O conteúdo é pedagógico e precisa de validação com a comunidade surda local.
- O cache local evita chamadas repetidas para o mesmo tema.
