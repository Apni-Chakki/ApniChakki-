import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wheat, Lock, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config'; 
import { useAuth } from '../../lib/AuthContext'; // <-- RESTORED THIS

export function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // RESTORED THIS: We need to tell the app globally that you are logged in
  const { setUser } = useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Attempting Login...");
      const response = await fetch(`${API_BASE_URL}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: phone, password: password }),
      });

      const data = await response.json();
      console.log("Login Response:", data);

      if (data.success) {
        // 1. Validate Role (Case Insensitive)
        const userRole = data.user.role ? data.user.role.toLowerCase() : '';
        if (userRole !== 'admin') {
           toast.error(`Access Denied. Role '${data.user.role}' is not 'admin'.`);
           setIsLoading(false);
           return;
        }

        toast.success('Login Successful! Redirecting...');
        
        // UPDATE REACT CONTEXT (AuthContext persists this automatically)
        setUser(data.user);

        // SMOOTH REDIRECT
        navigate('/admin/dashboard');
        
      } else {
        toast.error(data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error('Network Error. Check Console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>
        
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center mb-2">
              <Wheat className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>Enter your credentials</CardDescription>
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
                    placeholder="03001234567"
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}