import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

export default defineConfig({
    site: "https://arita-yuto.github.io",
    base: "/video-review",
    integrations: [
        mermaid(),
        starlight({
            title: "VideoReview",
            defaultLocale: "root",
            locales: {
                root: { label: "English", lang: "en" },
                ja: { label: "日本語", lang: "ja" },
            },
            social: [{ icon: "github", label: "GitHub", href: "https://github.com/arita-yuto/video-review" }],
            customCss: ["./src/styles/custom.css"],
            editLink: { baseUrl: "https://github.com/arita-yuto/video-review/edit/main/docs/" },
            sidebar: [
                { label: "Install", items: [{ autogenerate: { directory: "install" } }] },
                {
                    label: "Administration",
                    items: [
                        { slug: "admin" },
                        { slug: "admin/general" },
                        { slug: "admin/users" },
                        { slug: "admin/videos" },
                        { label: "Integrations", items: [{ autogenerate: { directory: "admin/integrations" } }] },
                        { slug: "admin/api-token" },
                    ],
                },
                { label: "Features", items: [{ autogenerate: { directory: "features" } }] },
                { label: "Development", items: [{ autogenerate: { directory: "development" } }] },
            ],
        }),
    ],
});
