// @ts-check
import svelte from "@astrojs/svelte";
import { defineConfig, fontProviders } from "astro/config";

// Vercel sert le site à la racine. Au build, si VERCEL_PROJECT_PRODUCTION_URL
// existe, site vaut https://<cette valeur> ; sinon http://localhost:4321.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
	site: productionHost ? `https://${productionHost}` : "http://localhost:4321",
	base: "/",
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
