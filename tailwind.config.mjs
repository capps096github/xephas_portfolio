/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
		  colors: {
			"xephas-white": "#ffffff",
			"xephas-navy": "#0852A8",
			"xephas-yellow": "#fbaa00",
			"xephas-black": "#000000",
			"xephas-bg": "#ffffff",
		  },
		},
		fontFamily: {
		  mont: ["Montserrat", "sans-serif"],
		},
	  },
	plugins: [],
}
