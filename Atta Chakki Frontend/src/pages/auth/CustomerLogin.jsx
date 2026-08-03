import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Lock, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/common/alert-dialog';
import { useAuth } from '../../store/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=70",
  "https://images.unsplash.com/photo-1565607052745-35f8c6ba59b1?w=800&auto=format&fit=crop&q=70",
];

export function CustomerLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [showPhoneUpdateModal, setShowPhoneUpdateModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();
  const { t } = useTranslation();

  const from = location.state?.from?.pathname || '/';

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    console.log('[Google Login] credentialResponse:', credentialResponse);
    try {
      // credentialResponse.credential is a Google ID token (JWT)
      const loggedUser = await googleLogin(credentialResponse.credential);
      console.log('[Google Login] loggedUser returned:', loggedUser);
      if (loggedUser) {
        toast.success(t('Welcome back!'));
        const phoneVal = loggedUser.phone || '';
        const isPlaceholder = phoneVal.startsWith('G-') || !/^\d{11}$/.test(phoneVal.replace(/\s/g, ''));
        if (isPlaceholder) {
          setShowPhoneUpdateModal(true);
        } else {
          navigate(from, { replace: true });
        }
      } else {
        toast.error(t('Google login failed. Please try again.'));
      }
    } catch (err) {
      console.error('[Google Login] Error:', err);
      toast.error(t('Google login failed.'));
    }
    setIsLoading(false);
  };

  const handleGoogleError = (error) => {
    console.error('[Google Login] OAuth Error:', error);
    toast.error(t('Google Login Failed. Please try again or use phone/password.'));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg(prev => (prev + 1) % BG_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const validate = () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleanPhone)) {
      toast.error(t('Phone number must be exactly 11 digits with no spaces.'));
      return false;
    }
    if (/\s/.test(password)) {
      toast.error(t('Password must not contain spaces.'));
      return false;
    }
    if (password.length < 8) {
      toast.error(t('Password must be at least 8 characters.'));
      return false;
    }
    if (password.length > 50) {
      toast.error(t('Password must not exceed 50 characters.'));
      return false;
    }
    if (!/^[A-Z]/.test(password)) {
      toast.error(t('Password must start with a capital letter.'));
      return false;
    }
    if (!/[0-9]/.test(password)) {
      toast.error(t('Password must contain at least one number.'));
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      toast.error(t('Password must contain at least one special character.'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
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

  const handleContinueAsGuest = () => navigate(from, { replace: true });

  return (
    /* Flex column so Back to Home stays at top, card in middle, dots at bottom */
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Background image slider */}
      {BG_IMAGES.map((img, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: i === currentBg ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out',
          zIndex: 0,
        }} />
      ))}

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 100%)',
        zIndex: 1,
      }} />

      {/* Top bar — never overlaps card */}
      <div style={{ position: 'relative', zIndex: 3, padding: '0.875rem 1rem', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            color: 'white',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '0.5rem',
            padding: '0.45rem 0.875rem',
            fontSize: '0.875rem', fontWeight: 500,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          {t('Back to Home')}
        </button>
      </div>

      {/* Center — card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0.5rem 1rem', position: 'relative', zIndex: 2,
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Card style={{
            background: 'rgba(255,255,255,0.93)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            borderRadius: '1rem',
          }}>
            <CardHeader className="space-y-1 text-center" style={{ paddingBottom: '0.75rem' }}>
              {/* Fixed avatar — uses inline style so no Tailwind class conflicts */}
              <div style={{
                margin: '0 auto 0.5rem',
                height: '3.25rem', width: '3.25rem',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                flexShrink: 0,
              }}>
                <User style={{ width: '1.6rem', height: '1.6rem', color: 'white' }} />
              </div>
              <CardTitle className="text-2xl">{t('Customer Login')}</CardTitle>
              <CardDescription>
                {t('Sign in to track your orders and save your preferences')}
              </CardDescription>
            </CardHeader>

            <CardContent>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('Phone Number')}</Label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-muted-foreground" style={{ position: 'absolute', insetInlineStart: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <Input
                      id="phone"
                      name="username"
                      autoComplete="username"
                      type="tel"
                      placeholder="03001234567"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      maxLength={11}
                      inputMode="numeric"
                      className="ps-12"
                      style={{ paddingInlineStart: '3rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Password with eye toggle */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('Password')}</Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-muted-foreground" style={{ position: 'absolute', insetInlineStart: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <Input
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('Enter your password')}
                      value={password}
                      onChange={e => setPassword(e.target.value.replace(/\s/g, ''))}
                      maxLength={50}
                      className="ps-12 pe-10"
                      style={{ paddingInlineStart: '3rem', paddingInlineEnd: '2.5rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', insetInlineEnd: '0.625rem', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted-foreground)',
                        display: 'flex', alignItems: 'center', padding: '0.125rem',
                      }}
                    >
                      {showPassword
                        ? <Eye style={{ width: '1rem', height: '1rem' }} />
                        : <EyeOff style={{ width: '1rem', height: '1rem' }} />
                      }
                    </button>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                    {t('8–50 chars · starts with capital · must include a number & special character')}
                  </p>
                  <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                    <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {t('Forgot Password?')}
                    </Link>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('Signing in...') : t('Sign In')}
                </Button>

                <Button type="button" variant="outline" className="w-full" onClick={handleContinueAsGuest}>
                  {t('Continue as Guest')}
                </Button>
              </form>

              {/* Divider */}
              <div style={{ position: 'relative', margin: '1rem 0' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '100%', borderTop: '1px solid var(--border)' }} />
                </div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <span style={{ background: 'rgba(255,255,255,0.93)', padding: '0 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                    {t('Or')}
                  </span>
                </div>
              </div>

              {/* Google Login Button - using GoogleLogin component to avoid COOP popup issues */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  width="100%"
                  text="continue_with"
                  shape="rectangular"
                  logo_alignment="left"
                  disabled={isLoading}
                />
              </div>


              <div className="text-center text-sm" style={{ marginTop: '1rem' }}>
                <p className="text-muted-foreground">
                  {t("Don't have an account?")}{' '}
                  <Link to="/signup/customer" className="text-primary hover:underline font-medium">
                    {t('Sign Up')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Slide dots — always at bottom
      <div style={{
        position: 'relative', zIndex: 3,
        padding: '0.875rem',
        display: 'flex', justifyContent: 'center', gap: '0.5rem',
        flexShrink: 0,
      }}>
        {BG_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentBg(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === currentBg ? '1.5rem' : '0.5rem',
              height: '0.5rem',
              borderRadius: '0.25rem',
              background: i === currentBg ? 'white' : 'rgba(255,255,255,0.45)',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.3s ease', padding: 0,
            }}
          />
        ))}
      </div> */}

      {/* Phone Update Modal for Google Login */}
      <AlertDialog open={showPhoneUpdateModal} onOpenChange={setShowPhoneUpdateModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Update Your Phone Number')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Please update your phone number to proceed with orders!')}
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">آرڈرز جاری رکھنے کے لیے، برائے مہربانی اپنا فون نمبر درج کریں۔</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setShowPhoneUpdateModal(false); navigate('/account'); }}>
              {t('Update Now')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}





