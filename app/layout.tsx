import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Lexend,
  Montserrat,
  Oswald,
  Roboto,
} from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cuộc thi Gia đình Chuyển đổi số — Gameshow Sân khấu",
  description:
    "Ứng dụng trình chiếu sân khấu LED 16:9 và quản trị câu hỏi trực tiếp cho Cuộc thi Gia đình Chuyển đổi số.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${montserrat.variable} ${lexend.variable} ${roboto.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#061326] text-slate-50 font-[var(--font-be-vietnam-pro)] selection:bg-sky-400/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
