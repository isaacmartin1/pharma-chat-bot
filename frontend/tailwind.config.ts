import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'brand-purple': '#8C4799',
        'brand-blue': '#59CBE8',
        'brand-navy': '#002855',
        'brand-lime': '#97D700',
        'brand-yellow': '#FFC72C',
      },
    },
  },
  plugins: [],
};
export default config;
