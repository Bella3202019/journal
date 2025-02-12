import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { cn } from "@/utils";

export const metadata: Metadata = {
  title: "Dela",
  description: "Your emotional support partner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "flex flex-col min-h-screen"
        )}
      >
        {children}
        <DarkModeToggle />
      </body>
    </html>
  );
}
