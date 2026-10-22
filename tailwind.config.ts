import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === PALET WARNA UTAMA: KUNING HANGAT / AMBER ===
        // Ini adalah token warna resmi SafeReport.
        // Kalau klien ingin ganti warna di masa depan, cukup edit di sini saja!
        brand: {
          50:  "#fffbeb",  // Kuning paling terang (background lembut)
          100: "#fef3c7",  // Kuning sangat muda (latar kartu)
          200: "#fde68a",  // Kuning muda
          300: "#fcd34d",  // Kuning cerah
          400: "#fbbf24",  // Amber cerah
          500: "#f59e0b",  // Amber utama (warna tombol & aksen)
          600: "#d97706",  // Amber gelap (hover button)
          700: "#b45309",  // Amber tua (teks penting)
          800: "#92400e",  // Coklat amber (teks judul)
          900: "#78350f",  // Coklat tua (teks peringatan)
        },
      },
      fontFamily: {
        sans: ["Inter", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "pop-in": "pop 0.2s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
