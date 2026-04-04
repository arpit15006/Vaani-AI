import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "VaaniAI — Voice-Powered AI Assistant",
  description:
    "Real-time voice AI assistant with multi-agent reasoning and real-world integrations. Schedule meetings, send emails, and more — just by speaking.",
  keywords: ["AI", "voice assistant", "multi-agent", "calendar", "gmail", "gemini"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
