import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "БрифМастер AI — генератор брифа на разработку сайта",
  description:
    "AI-помощник для преобразования сообщений клиента в структурированный бриф на разработку сайта",
};

const THEME_BOOTSTRAP = `(function(){try{var raw=localStorage.getItem("briefmaster-ui-settings");if(!raw)return;var s=JSON.parse(raw);if(s.theme==="dark"||s.theme==="light"){document.documentElement.setAttribute("data-theme",s.theme);}var accents=["purple","blue","cyan","teal","green","olive","orange","red","pink","sand"];if(accents.indexOf(s.accentColor)!==-1){document.documentElement.setAttribute("data-accent",s.accentColor);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      data-theme="light"
      data-accent="purple"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-page text-ink"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
