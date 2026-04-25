import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';

export function DeliveryLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phone || !password) {
      toast.error('Please enter phone number and password');
      return;
    }
    
    setIsLoading(true);

    try {
      const success = await login(phone, password, 'delivery');
      if (success) {
        toast.success('Welcome back!');
        navigate('/delivery');
      } else {
        toast.error('Invalid credentials. Please check your phone number and password.');
      }
    } catch (error) {
      console.error("Delivery Login Error:", error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-success flex items-center justify-center mb-2">
              <Truck className="h-6 w-6 text-success-foreground" />
            </div>
            <CardTitle className="text-2xl">Delivery Login</CardTitle>
            <CardDescription>
              Enter your phone number and password to access the delivery panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="03XX XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-xs text-center text-muted-foreground mt-4">
                <p>Contact admin if you forgot your password</p>
                <p className="mt-1 text-primary/80">Default password: 123456</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}