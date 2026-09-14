import { Suspense } from 'react';
import { Header } from '../pages/customer/Header';
import { Footer } from '../pages/customer/Footer';
import { PageLoader } from '../components/common/PageLoader';

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <main className="flex-1 pb-20 md:pb-24">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
