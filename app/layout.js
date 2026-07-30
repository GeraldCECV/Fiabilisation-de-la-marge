import "./globals.css";

export const metadata = {
  title: "Trame de rentabilité VN",
  description: "Calculateur de marge et suivi des ventes véhicules neufs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-bg text-ink font-sans min-h-screen">{children}</body>
    </html>
  );
}
