import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
    site: "https://arita-yuto.github.io",
    base: "/video-review",
    integrations: [
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
        }),
    ],
});
