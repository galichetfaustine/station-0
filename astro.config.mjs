// @ts-check
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

// Site publié sur GitHub Pages : https://galichetfaustine.github.io/station-0/
export default defineConfig({
	site: "https://galichetfaustine.github.io",
	base: "/station-0",
	output: "static",
	integrations: [svelte()],
});
