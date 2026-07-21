import { createFileRoute } from "@tanstack/react-router";

import { readCmsUpload } from "@/lib/cms/uploads";

export const Route = createFileRoute("/cms-media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const upload = await readCmsUpload(params.id);
        if (!upload) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(new Uint8Array(upload.buffer), {
          status: 200,
          headers: {
            "Content-Type": upload.mimeType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
