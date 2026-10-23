// @ts-check
import svelte from "@astrojs/svelte";
import { defineConfig, fontProviders } from "astro/config";

// Site publié sur GitHub Pages : https://galichetfaustine.github.io/station-0/
export default defineConfig({
	site: "https://galichetfaustine.github.io",
	base: "/station-0",
	output: "static",
	integrations: [svelte()],
	// Polices (D8) téléchargées au build et servies par le site : aucun appel externe côté visiteur.
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: "Barlow Condensed",
			cssVariable: "--font-barlow-condensed",
			weights: ["800"],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.fontsource(),
			name: "Inter",
			cssVariable: "--font-inter",
			weights: ["400", "600", "700"],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["sans-serif"],
		},
	],
});
