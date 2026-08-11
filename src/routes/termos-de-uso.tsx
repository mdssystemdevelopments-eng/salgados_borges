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
        Ao utilizar o site da Salgados Borges, você concorda com estes termos. Se não concordar, por
        favor não utilize nossos serviços online.
      </p>
      <p>
        <strong className="text-foreground">Serviços:</strong> o site apresenta nosso cardápio,
        informações institucionais e canais para pedidos via WhatsApp. Preços, disponibilidade e prazos
        podem variar e serão confirmados no atendimento.
      </p>
      <p>
        <strong className="text-foreground">Pedidos:</strong> pedidos feitos pelo site ou WhatsApp
        dependem de confirmação de disponibilidade, quantidade mínima e forma de pagamento acordada
        diretamente com nossa equipe.
      </p>
      <p>
        <strong className="text-foreground">Conteúdo:</strong> textos, imagens e marcas exibidos no site
        pertencem à Salgados Borges ou são utilizados com autorização. É proibida a reprodução sem
        consentimento prévio.
      </p>
      <p>
        <strong className="text-foreground">Limitação:</strong> empregamos esforços para manter o site
        disponível e atualizado, mas não garantimos funcionamento ininterrupto em todos os momentos.
      </p>
      <p>
        <strong className="text-foreground">Alterações:</strong> estes termos podem ser atualizados a
        qualquer momento. Recomendamos revisá-los periodicamente.
      </p>
      <p>Última atualização: agosto de 2026.</p>
    </LegalPageShell>
  );
}
