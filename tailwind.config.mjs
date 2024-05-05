/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
		  colors: {
			"xephas-white": "#ffffff",
			"xephas-navy": "#000525",
			// "xephas-navy": "#000000",
			"xephas-green": "#16a34a",
			// "xephas-navy": "#800000",
			// "xephas-navy": "#0852A8",
			"xephas-yellow": "#fbaa00",
			"xephas-black": "#000000",
			"xephas-blue": "#2563eb",
			"xephas-bg": "#ffffff",
		  },
		},
		fontFamily: {
		  mont: ["Montserrat", "sans-serif"],
		},
	  },
	plugins: [],
}
