export function renderAdminAccessDeniedPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Página não encontrada</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #f5f5f5; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; border: 1px solid rgba(212,175,55,.25); border-radius: .75rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #a3a3a3; margin: 0 0 1.5rem; }
      a { padding: 0.5rem 1rem; border-radius: 999px; font: inherit; text-decoration: none; border: 1px solid rgba(212,175,55,.4); color: #d4af37; display: inline-block; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Página não encontrada</h1>
      <p>O endereço solicitado não existe ou não está disponível neste site.</p>
      <a href="/">Voltar ao início</a>
    </div>
  </body>
</html>`;
}
