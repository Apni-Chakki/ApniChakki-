import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="max-w-md w-full p-6 sm:p-8 text-center shadow-lg border-destructive/20">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Oops, something went wrong!</h1>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              We encountered an unexpected error while loading this page. Our team has been notified.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              <Button 
                onClick={() => {
                  try {
                    localStorage.removeItem('user');
                    sessionStorage.clear();
                    if ('caches' in window) caches.keys().then(names => names.forEach(n => caches.delete(n)));
                  } catch(e) {}
                  window.location.href = '/';
                }} 
                variant="outline"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
              >
                Reset & Go to Home (Fix Glitches)
              </Button>
            </div>
            
            <details className="mt-6 text-left border border-border/60 rounded-lg p-3 bg-muted/40 cursor-pointer group">
              <summary className="text-xs font-semibold text-muted-foreground group-hover:text-foreground select-none flex items-center justify-between">
                <span>View Error Details / ایرر کی تفصیل</span>
                <span className="text-[10px] text-muted-foreground">Click to expand</span>
              </summary>
              <div className="mt-2 text-[10px] font-mono text-destructive whitespace-pre-wrap overflow-x-auto p-2.5 bg-background rounded border border-border/70 max-h-[160px]">
                {this.state.error?.stack || this.state.error?.toString() || 'Unknown error occurred'}
              </div>
            </details>
          </Card>
        </div>
      );
    }

    return this.props.children; 
  }
}
