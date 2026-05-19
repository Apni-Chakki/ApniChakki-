import { Suspense } from 'react';
import { Header } from '../pages/customer/Header';
import { Footer } from '../pages/customer/Footer';
import { Loader2 } from 'lucide-react';

function PageLoader() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
    </div>
  );
}

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Header />
      <main className="flex-1 pb-20 md:pb-24" style={{ marginTop: '100px' }}>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}





