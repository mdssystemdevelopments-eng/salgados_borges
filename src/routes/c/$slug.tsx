import { createFileRoute, notFound } from "@tanstack/react-router";

import { SharedMenuPage } from "@/components/menu/SharedMenuPage";
import { getPublicCms } from "@/lib/cms/public-api";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    const cms = await getPublicCms();
    const menuLink = cms.menuLinks?.find(
      (link) => link.active && link.slug === params.slug.toLowerCase(),
    );
    if (!menuLink) throw notFound();
    return { cms, menuLink };
  },
  head: ({ loaderData }) => {
    const menuLink = loaderData?.menuLink;
    return {
      meta: [{ title: menuLink ? `${menuLink.title} | Cardápio` : "Cardápio" }],
    };
  },
  component: MenuLinkRoutePage,
});

function MenuLinkRoutePage() {
  const { cms, menuLink } = Route.useLoaderData();
  return <SharedMenuPage cms={cms} menuLink={menuLink} />;
}
