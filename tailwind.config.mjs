/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
		  colors: {
			"app-white": "#ffffff",
			"app-navy": "#000525",
			// "app-navy": "#000000",
			"app-green": "#16a34a",
			// "app-navy": "#800000",
			// "app-navy": "#0852A8",
			"app-yellow": "#fbaa00",
			"app-black": "#000000",
			"app-blue": "#2563eb",
			"app-indigo": "#4f46e5",
			"app-orange": "#f97316",
			"app-bg": "#ffffff",
		  },
		},
		fontFamily: {
		  mont: ["Montserrat", "sans-serif"],
		},
	  },
	plugins: [],
}
