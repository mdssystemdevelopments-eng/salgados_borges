import { createFileRoute } from "@tanstack/react-router";

import { LegalPageShell } from "@/components/LegalPageShell";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Salgados Borges" },
      {
        name: "description",
        content: "Política de privacidade e tratamento de dados da Salgados Borges.",
      },
    ],
  }),
  component: PoliticaPrivacidadePage,
});

function PoliticaPrivacidadePage() {
  return (
    <LegalPageShell title="Política de Privacidade">
      <p>
        A Salgados Borges respeita a privacidade de quem visita o site e de quem entra em contato
        conosco.
      </p>
      <p>
        Coletamos nome, telefone, e-mail e mensagens enviadas pelo formulário de contato ou por
        pedidos via WhatsApp. Usamos essas informações só para atendimento, orçamentos e comunicação
        sobre pedidos.
      </p>
      <p>
        Os dados enviados pelo site vão para o WhatsApp ou e-mail da empresa. Informações do painel
        administrativo ficam nos servidores de hospedagem que utilizamos.
      </p>
      <p>
        Não vendemos nem repassamos dados pessoais a terceiros, salvo quando a lei exigir.
      </p>
      <p>
        Usamos cookies essenciais para o site e para a área administrativa funcionarem. Não usamos
        cookies de rastreamento publicitário.
      </p>
      <p>
        Você pode pedir correção ou exclusão dos seus dados pelo WhatsApp ou e-mail informados na
        página de contato.
      </p>
      <p>Última atualização: agosto de 2026.</p>
    </LegalPageShell>
  );
}
