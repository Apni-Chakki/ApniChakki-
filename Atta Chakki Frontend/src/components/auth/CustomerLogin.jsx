import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Lock, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function CustomerLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(phone, password, 'customer');
      if (success) {
        toast.success(t('Welcome back!'));
        navigate(from, { replace: true });
      } else {
        toast.error(t('Invalid credentials. Please try again.'));
      }
    } catch (error) {
      toast.error(t('An error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    navigate(from, { replace: true });
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
          {t('Back to Home')}
        </Button>
        
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center mb-2">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{t('Customer Login')}</CardTitle>
            <CardDescription>
              {t('Sign in to track your orders and save your preferences')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('Phone Number')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('Password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('Enter your password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('Signing in...') : t('Sign In')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleContinueAsGuest}
              >
                {t('Continue as Guest')}
              </Button>
              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  {t("Don't have an account?")}{' '}
                  <Link to="/signup/customer" className="text-primary hover:underline">
                    {t('Sign Up')}
                  </Link>
                </p>
              </div>
              
              <div className="text-xs text-center text-muted-foreground mt-4">
                <p>Demo credentials:</p>
                <p>Phone: 0300-1234567</p>
                <p>Password: customer123</p>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}