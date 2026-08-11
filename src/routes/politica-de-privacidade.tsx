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
        A Salgados Borges respeita a privacidade dos visitantes do site e dos clientes que entram em
        contato conosco.
      </p>
      <p>
        <strong className="text-foreground">Dados coletados:</strong> nome, telefone, e-mail e mensagens
        enviadas pelo formulário de contato ou pedidos via WhatsApp. Essas informações são usadas
        exclusivamente para atendimento, orçamentos e comunicação sobre pedidos.
      </p>
      <p>
        <strong className="text-foreground">Armazenamento:</strong> dados de contato enviados pelo site
        são encaminhados ao WhatsApp/e-mail da empresa. Informações administrativas do CMS podem ser
        armazenadas em servidores seguros conforme a infraestrutura de hospedagem.
      </p>
      <p>
        <strong className="text-foreground">Compartilhamento:</strong> não vendemos nem compartilhamos
        seus dados pessoais com terceiros, exceto quando necessário para cumprir obrigações legais.
      </p>
      <p>
        <strong className="text-foreground">Cookies:</strong> utilizamos cookies essenciais para o
        funcionamento do site e da área administrativa. Não utilizamos cookies de rastreamento
        publicitário.
      </p>
      <p>
        <strong className="text-foreground">Seus direitos:</strong> você pode solicitar correção ou
        exclusão dos seus dados entrando em contato pelo WhatsApp ou e-mail disponíveis na página de
        contato.
      </p>
      <p>Última atualização: agosto de 2026.</p>
    </LegalPageShell>
  );
}
