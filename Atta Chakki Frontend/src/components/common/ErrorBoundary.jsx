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
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </Button>
            
            {import.meta.env.DEV && (
              <div className="mt-6 p-4 bg-muted rounded-md text-left overflow-auto max-h-[200px] border border-border">
                <p className="text-xs font-mono text-destructive font-semibold mb-2">Developer Details:</p>
                <p className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children; 
  }
}
