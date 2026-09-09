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
        roomly: {
          sky: "#78D0F0",
          mint: "#7DDEC8",
          lavender: "#B8A8E0",
          peach: "#F0B89A",
          charcoal: "#3D3D3D",
          navy: "#1F3A5F",
        },
        sidebar: {
          bg: "#0F1F35",
          hover: "#1A3050",
          active: "#1F3A5F",
          border: "#1E3248",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover":
          "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
