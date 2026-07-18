import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Lock, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/card';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config';
import loginBg from '../../assets/login-page bg.jpg';

const BG_IMAGES = [
  loginBg,
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1400&auto=format&fit=crop&q=80",
];

export function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email, 2 = otp+password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [debugOtp, setDebugOtp] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg(prev => (prev + 1) % BG_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t('Please enter a valid email address.'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/forgot_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json();

      if (data.success) {
        setStep(2);
        // In development mode (local XAMPP), OTP may be in response
        if (data.debug && data.otp) {
          setDebugOtp(data.otp);
          toast.success(`${t('OTP generated')} — ${data.otp}`, { duration: 15000 });
        } else {
          toast.success(t('OTP has been sent to your email address.'));
        }
      } else {
        toast.error(data.message || t('Failed to send OTP.'));
      }
    } catch (error) {
      toast.error(t('An error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = () => {
    if (/\s/.test(newPassword)) {
      toast.error(t('Password must not contain spaces.'));
      return false;
    }
    if (newPassword.length < 8) {
      toast.error(t('Password must be at least 8 characters.'));
      return false;
    }
    if (newPassword.length > 50) {
      toast.error(t('Password must not exceed 50 characters.'));
      return false;
    }
    if (!/^[A-Z]/.test(newPassword)) {
      toast.error(t('Password must start with a capital letter.'));
      return false;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error(t('Password must contain at least one number.'));
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error(t('Password must contain at least one special character.'));
      return false;
    }
    return true;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error(t('OTP must be 6 digits.'));
      return;
    }
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reset_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(t('Password reset successful! Please log in.'));
        navigate('/login/customer');
      } else {
        toast.error(data.message || t('Failed to reset password.'));
      }
    } catch (error) {
      toast.error(t('An error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, padding: '0.875rem 1rem', flexShrink: 0 }}>
        <button
          onClick={() => step === 2 ? setStep(1) : navigate('/login/customer')}
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
          {step === 2 ? t('Back') : t('Back to Login')}
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
              <div style={{
                margin: '0 auto 0.5rem',
                height: '3.25rem', width: '3.25rem',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                flexShrink: 0,
              }}>
                {step === 1
                  ? <KeyRound style={{ width: '1.6rem', height: '1.6rem', color: 'white' }} />
                  : <ShieldCheck style={{ width: '1.6rem', height: '1.6rem', color: 'white' }} />
                }
              </div>
              <CardTitle className="text-2xl">
                {step === 1 ? t('Forgot Password') : t('Reset Password')}
              </CardTitle>
              <CardDescription>
                {step === 1
                  ? t('Enter your email to receive a verification code')
                  : t('Enter the OTP and your new password')
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              {step === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('Email Address')}</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-muted-foreground" style={{ position: 'absolute', insetInlineStart: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="ps-12"
                        style={{ paddingInlineStart: '3rem' }}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('Sending...') : t('Send OTP')}
                  </Button>

                  <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                      {t('Remember your password?')}{' '}
                      <Link to="/login/customer" className="text-primary hover:underline font-medium">
                        {t('Log In')}
                      </Link>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* Show debug OTP (only on localhost when email can't be sent) */}
                  {debugOtp && (
                    <div style={{
                      background: 'rgba(0,0,0,0.05)',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                    }}>
                      <p style={{ color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                        {t('Your OTP (dev mode)')}:
                      </p>
                      <p style={{ fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.3rem', color: 'var(--primary)' }}>
                        {debugOtp}
                      </p>
                    </div>
                  )}

                  {/* Email shown (read-only) */}
                  <div style={{
                    background: 'rgba(0,0,0,0.03)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--muted-foreground)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <Mail style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                    {email}
                  </div>

                  {/* OTP */}
                  <div className="space-y-2">
                    <Label htmlFor="otp">{t('Verification Code')}</Label>
                    <div className="relative">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" style={{ position: 'absolute', insetInlineStart: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        inputMode="numeric"
                        className="ps-12"
                        style={{ paddingInlineStart: '3rem', letterSpacing: '0.3rem', fontWeight: 600, fontSize: '1.1rem' }}
                        required
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('New Password')}</Label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-muted-foreground" style={{ position: 'absolute', insetInlineStart: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('Enter new password')}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value.replace(/\s/g, ''))}
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
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('Resetting...') : t('Reset Password')}
                  </Button>

                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setOtp(''); setNewPassword(''); setDebugOtp(''); }}
                      style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                      {t('Resend OTP')}
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
