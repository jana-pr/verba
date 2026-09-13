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
        verba: {
          indigo: "#5146E5",
          "indigo-dark": "#3730A3",
          teal: "#14A89E",
          ink: "#182033",
          slate: "#667085",
          canvas: "#F7F8FC",
          card: "#FFFFFF",
          mastered: "#16875D",
          review: "#C87912",
          error: "#C83C4A",
          new: "#94A3B8",
          learning: "#5146E5",
        },
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
