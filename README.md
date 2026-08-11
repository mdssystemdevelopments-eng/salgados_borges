# Salgados Borges

Site + CMS admin (TanStack Start, React, Tailwind).

## Desenvolvimento local

```sh
npm i
npm run dev
```

- Site: http://localhost:8080/
- Admin: http://localhost:8080/admin (senha em `.env` → `CMS_ADMIN_PASSWORD`)

Localmente o CMS usa `data/cms.json`. Com `DATABASE_URL` usa PostgreSQL (Neon).

## Deploy na Vercel (recomendado)

Este projeto **nao e site estatico puro**: usa SSR, server functions, admin CMS, banco e upload de imagens. A Vercel hospeda tudo isso via TanStack Start + Nitro (preset `vercel`).

### Importante (plano Hobby da Vercel)

Repositorios **privados em organizacao GitHub** (ex.: `mdssystemdevelopments-eng`) **nao funcionam** no plano gratuito da Vercel. Opcoes:

1. Repo **publico** no GitHub (configurado assim para deploy gratuito)
2. Upgrade para **Vercel Pro**
3. Deploy manual com CLI: `npx vercel --prod` (sem conectar Git)

### Pre-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Banco **Neon Postgres** (pode reutilizar o mesmo do Render)
3. Variaveis de ambiente (ver abaixo)

### Passo a passo (migrando do Render)

#### 1. Anote o que voce usa hoje no Render

No painel do Render, copie:

| Variavel | Onde usar |
|----------|-----------|
| `DATABASE_URL` | Neon (mesma URL, preferir **pooler**) |
| `CMS_ADMIN_PASSWORD` | Mesma senha do admin |
| `CMS_SESSION_SECRET` | Gere um novo ou copie do Render |

#### 2. Importe o repositorio na Vercel

1. Acesse https://vercel.com/new
2. Importe o repo `salgados_borges` (GitHub)
3. Framework: **TanStack Start** (detectado automaticamente)
4. Build Command: `npm run build`
5. Install Command: `npm ci`
6. Nao altere Output Directory (Nitro cuida disso)

#### 3. Configure as variaveis de ambiente

Em **Project → Settings → Environment Variables**, adicione para **Production** (e Preview se quiser):

```
NODE_ENV=production
DATABASE_URL=postgresql://...   (URL pooler do Neon)
CMS_ADMIN_PASSWORD=sua_senha_forte
CMS_SESSION_SECRET=segredo_longo_aleatorio_24chars+
```

Importante:

- **Sem `DATABASE_URL` na Vercel o CMS nao persiste** (filesystem e efemero).
- Uploads de imagens vao para a tabela `cms_uploads` no Postgres quando `DATABASE_URL` esta definida.
- Use a connection string **com pooler** do Neon para evitar limite de conexoes em serverless.

#### 4. Faca o primeiro deploy

Clique em **Deploy**. O build gera `.vercel/output/` com funcoes serverless + assets estaticos em `public/cms/`.

#### 5. Teste antes de desligar o Render

Checklist:

- [ ] Home carrega com hero, cardapio e secoes
- [ ] `/admin/login` abre e login funciona
- [ ] Salvar texto/imagem no CMS persiste apos refresh
- [ ] Upload de imagem retorna URL `/cms-media/...` e abre no navegador
- [ ] Carrinho e WhatsApp funcionam

#### 6. Aponte o dominio (opcional)

Em **Settings → Domains**, adicione seu dominio. Atualize DNS conforme a Vercel indicar.

#### 7. Desative o Render (quando estiver tudo ok)

1. Render → servico `salgados-borges` → **Suspend** ou delete
2. Mantenha o Neon ativo (e o mesmo `DATABASE_URL` na Vercel)

### Deploy via CLI (opcional)

```sh
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
npm run build
vercel deploy --prebuilt
```

## Deploy no Render (Blueprint)

Ainda suportado via `render.yaml` (preset `node-server` quando `VERCEL` nao esta definido).

1. New → Blueprint → repo com `render.yaml`
2. Defina `CMS_ADMIN_PASSWORD` e `DATABASE_URL`
3. `CMS_SESSION_SECRET` pode ser gerado pelo Blueprint

## Scripts

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build (Vercel ou Render conforme ambiente) |
| `npm run start` | Servidor Node (Render / preview local pos-build) |

## Arquitetura resumida

| Parte | Tecnologia |
|-------|------------|
| Front + SSR | TanStack Start, React 19 |
| Estilo | Tailwind CSS 4 |
| CMS | Server functions + painel `/admin` |
| Dados | `data/cms.json` (local) ou Postgres `cms_store` |
| Imagens enviadas | Postgres `cms_uploads` ou `public/uploads` (local) |
| Imagens fixas | `public/cms/*` |
| Auth admin | Cookie + `CMS_ADMIN_PASSWORD` |
