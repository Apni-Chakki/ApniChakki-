import { Link } from 'react-router-dom';
import React from 'react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Textarea } from '../../../common/textarea';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Lock,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Key,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const ProfileTab = ({
  profile = {},
  tempProfile = {},
  setTempProfile,
  editMode = false,
  isSaving = false,
  handleEdit,
  handleCancel,
  handleSave,
  currentPassword = '',
  setCurrentPassword,
  showCurrentPassword = false,
  setShowCurrentPassword,
  isOldPasswordVerified = false,
  setIsOldPasswordVerified,
  isVerifyingPassword = false,
  handleVerifyCurrentPassword,
  newPassword = '',
  setNewPassword,
  showNewPassword = false,
  setShowNewPassword,
  confirmNewPassword = '',
  setConfirmNewPassword,
  showConfirmNewPassword = false,
  setShowConfirmNewPassword,
  isUpdatingPassword = false,
  handleUpdatePassword,
  t = (s) => s,
}) => {
  return (
    <>
            <Card className="p-6 md:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl text-foreground leading-tight truncate">{profile.name}</h2>
                    <p className="text-sm text-muted-foreground truncate">{profile.phone}</p>
                  </div>
                </div>
                {!editMode && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #8b6f47 0%, #a0845c 100%)' }}
                  >
                    <Edit className="h-4 w-4 mr-2 text-white" />
                    {t('Edit Details')}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FULL NAME */}
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> {t('Full Name')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="name"
                        value={tempProfile.name}
                        onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                        placeholder={t('Enter your full name')}
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.name || t('Not provided')}</p>
                    )}
                  </div>

                  {/* PHONE NUMBER */}
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {t('Phone Number')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        value={tempProfile.phone}
                        onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value.replace(/\D/g, '') })}
                        placeholder="03001234567"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.phone || t('Not provided')}</p>
                    )}
                  </div>

                  {/* EMAIL ADDRESS */}
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> {t('Email Address')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="email"
                        type="email"
                        value={tempProfile.email}
                        onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                        placeholder="example@gmail.com"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.email || t('Not provided')}</p>
                    )}
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {t('Default Address')}
                    </Label>
                    {editMode ? (
                      <Input
                        id="address"
                        value={tempProfile.address}
                        onChange={(e) => setTempProfile({ ...tempProfile, address: e.target.value })}
                        placeholder="House # 123, Street 1, Lahore"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{profile.address || t('Not provided')}</p>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {isSaving ? t('Saving...') : t('Save Changes')}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" /> {t('Cancel')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Management Portals Section */}
              {(() => {
                const role = String(user?.role || '').toLowerCase();
                const canAccessPortals = role === 'admin' || role === 'delivery' || role === 'delivery_boy';
                if (!canAccessPortals) return null;
                return (
                  <div className="mt-8 pt-6 border-t border-border">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      {t('Management Portals')}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {role === 'admin' && (
                        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          <Link to="/admin/dashboard">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            {t('Admin Portal')}
                          </Link>
                        </Button>
                      )}
                      {(role === 'delivery' || role === 'delivery_boy') && (
                        <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                          <Link to="/delivery">
                            <Truck className="h-4 w-4 mr-2" />
                            {t('Delivery Panel')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Security & Password Card */}
            <Card className="p-6 mt-6 border-l-4" style={{ borderLeftColor: '#8b6f47' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {t('Security & Password')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('Change your account password securely')}
                  </p>
                </div>
              </div>

              <div className="space-y-5 max-w-xl">
                {/* Step 1: Verify Current Password */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="currentPassword" className="flex items-center gap-2 text-sm font-semibold">
                      <Lock className="h-4 w-4 text-amber-600" /> {t('Current Password')}
                    </Label>
                    {isOldPasswordVerified && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 dark:bg-green-950/60 dark:text-green-400 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('Verified')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (isOldPasswordVerified) setIsOldPasswordVerified(false);
                        }}
                        disabled={isOldPasswordVerified}
                        placeholder={t('Please enter your current password.')}
                        className={`pr-10 ${isOldPasswordVerified ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {!isOldPasswordVerified && (
                      <Button
                        type="button"
                        onClick={handleVerifyCurrentPassword}
                        disabled={isVerifyingPassword || !currentPassword.trim()}
                        style={{ background: 'linear-gradient(135deg, #8b6f47 0%, #a0845c 100%)' }}
                        className="text-white shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        {isVerifyingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('Verifying...')}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            {t('Verify Current Password')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {!isOldPasswordVerified && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      {t('Please verify your current password first to unlock new password setting.')}
                    </p>
                  )}
                </div>

                {/* Step 2: New Password & Confirm New Password (Locked until verified) */}
                <div className={`space-y-4 transition-all duration-300 ${!isOldPasswordVerified ? 'opacity-50 pointer-events-none select-none filter blur-[0.5px]' : ''}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div>
                      <Label htmlFor="newPassword" className="flex items-center gap-2 mb-1.5 text-sm font-semibold">
                        <Key className="h-4 w-4 text-primary" /> {t('New Password')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value.replace(/\s/g, ''))}
                          disabled={!isOldPasswordVerified}
                          placeholder={t('New Password')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          disabled={!isOldPasswordVerified}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <Label htmlFor="confirmNewPassword" className="flex items-center gap-2 mb-1.5 text-sm font-semibold">
                        <Lock className="h-4 w-4 text-primary" /> {t('Confirm New Password')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmNewPassword"
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value.replace(/\s/g, ''))}
                          disabled={!isOldPasswordVerified}
                          placeholder={t('Confirm New Password')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          disabled={!isOldPasswordVerified}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>• {t('At least 8 characters, 1 uppercase letter')}</p>
                      <p>• {t('At least 1 number and 1 special character')}</p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleUpdatePassword}
                      disabled={!isOldPasswordVerified || isUpdatingPassword || !newPassword || !confirmNewPassword}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm px-6"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('Updating...')}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t('Update Password')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          
    </>
  );
};

export default ProfileTab;
