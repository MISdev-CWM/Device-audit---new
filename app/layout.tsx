import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fielddrop | Image upload",
  description: "Send image files to a Google Drive folder.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
