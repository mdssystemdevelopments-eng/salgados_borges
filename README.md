# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Development

```sh
npm i
npm run dev
```

Site: http://localhost:8080/
Admin CMS: http://localhost:8080/admin (senha em `.env` → `CMS_ADMIN_PASSWORD`)

Localmente o CMS usa `data/cms.json`. Com `DATABASE_URL` (Render) usa PostgreSQL.

## Deploy no Render (Blueprint)

1. Conecte este repositório no [Render](https://dashboard.render.com/)
2. New → Blueprint → selecione o repo (usa `render.yaml`)
3. Defina `CMS_ADMIN_PASSWORD` quando pedido
4. Aguarde o web service + Postgres subirem

Stack no Render:
- Web service Node (front SSR + API/CMS)
- PostgreSQL (conteúdo do CMS)
- Disco persistente em `public/uploads` (imagens)

## Scripts

- `npm run dev` – desenvolvimento
- `npm run build` – build produção
- `npm run start` – sobe o server Nitro (`node .output/server/index.mjs`)
