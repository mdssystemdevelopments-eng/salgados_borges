import { createFileRoute } from "@tanstack/react-router";

import { LegalPageShell } from "@/components/LegalPageShell";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Salgados Borges" },
      {
        name: "description",
        content: "Termos de uso do site e serviços da Salgados Borges.",
      },
    ],
  }),
  component: TermosUsoPage,
});

function TermosUsoPage() {
  return (
    <LegalPageShell title="Termos de Uso">
      <p>
        Ao usar o site da Salgados Borges, você concorda com estes termos. Se não concordar, por favor
        não utilize nossos serviços online.
      </p>
      <p>
        O site mostra nosso cardápio, informações da casa e formas de pedir pelo WhatsApp. Preços,
        disponibilidade e prazos podem mudar e serão confirmados no atendimento.
      </p>
      <p>
        Pedidos feitos pelo site ou WhatsApp dependem de confirmação de disponibilidade, quantidade
        mínima e forma de pagamento combinada diretamente com nossa equipe.
      </p>
      <p>
        Textos, imagens e marcas exibidos aqui pertencem à Salgados Borges ou são usados com
        autorização. Não copie nem reproduza sem nossa permissão.
      </p>
      <p>
        Fazemos o possível para manter o site no ar e atualizado, mas não garantimos que ele
        funcione sem interrupção o tempo todo.
      </p>
      <p>
        Estes termos podem ser alterados quando necessário. Vale a pena reler esta página de vez em
        quando.
      </p>
      <p>Última atualização: agosto de 2026.</p>
    </LegalPageShell>
  );
}
