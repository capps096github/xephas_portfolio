/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
		  colors: {
			"xephas-white": "#ffffff",
			"xephas-navy": "#000525",
			"xephas-yellow": "#fbaa00",
			"xephas-bg": "#ffffff",
		  },
		},
		fontFamily: {
		  mont: ["Montserrat", "sans-serif"],
		},
	  },
	plugins: [],
}
