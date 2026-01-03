// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header'; // Import Header mới tạo
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Header nằm ở đây, nó sẽ xuất hiện ở mọi trang */}
          <Header />

          {/* Nội dung của từng trang sẽ nằm ở dưới header */}
          <main>
            {children}
          </main>

        </AuthProvider>
      </body>
    </html>
  );
}