import '@/styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="h-full">
        <main className="h-full bg-white">{children}</main>
      </body>
    </html>
  );
}
