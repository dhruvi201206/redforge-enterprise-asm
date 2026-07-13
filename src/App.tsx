import React, { useState } from 'react';
import { useRedforgeState } from './context/RedforgeStateContext';
import { UserRole, FindingStatus, AssessmentStatus } from './types';
import DashboardOverview from './components/DashboardOverview';
import AssetInventory from './components/AssetInventory';
import FindingsLab from './components/FindingsLab';
import Assessments from './components/Assessments';
import ReportingEngine from './components/ReportingEngine';
import ArchitectureDocs from './components/ArchitectureDocs';
import LogsAndSettings from './components/LogsAndSettings';
import ProjectWorkspace from './components/ProjectWorkspace';
import AttackSurfaceDiscovery from './components/AttackSurfaceDiscovery';
import ThreatIntelligence from './components/ThreatIntelligence';
import { API } from './lib/api';

// Icons
import {
  Shield, Layers, Terminal, Calendar, FileText, User as UserIcon,
  Bell, Search, CheckCircle, HelpCircle, TrendingUp, Cpu, Globe,
  Database, Network, Folder, ShieldAlert, Sparkles, LogOut, Key, Eye, EyeOff
} from 'lucide-react';

export default function App() {
  const {
    currentUser,
    isAuthenticated,
    login,
    logout,
    switchRole,
    rbacEnabled,
    setRbacEnabled,
    checkPermission,

    assets,
    findings,
    assessments,
    logs,
    users,
    projects,
    notifications,

    isScanning,
    scanProgress,
    triggerScan,

    addAsset,
    bulkAddAssets,
    deleteAsset,
    bulkDeleteAssets,

    updateFindingStatus,
    updateFindingCVSS,
    addFindingComment,
    uploadFindingAttachment,

    addAssessment,
    updateAssessmentStatus,

    addProject,
    updateProjectNotes,

    addUser,
    updateUserRole,
    updateUserStatus,

    clearNotifications,
    resetAllData
  } = useRedforgeState();

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'projects'
    | 'discovery'
    | 'assets'
    | 'findings'
    | 'assessments'
    | 'reports'
    | 'threat-intel'
    | 'arch'
    | 'logs-settings'
  >('dashboard');

  const [showNotifications, setShowNotifications] = useState(false);
  
  // Login & Session Security State
  const [loginEmail, setLoginEmail] = useState('admin@redforge.local');
  const [loginRole, setLoginRole] = useState<UserRole>('Administrator');
  const [loginPassword, setLoginPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Auth view flows: 'login' | 'mfa' | 'forgot' | 'reset' | 'verify' | 'locked'
  const [authSubView, setAuthSubView] = useState<'login' | 'mfa' | 'forgot' | 'reset' | 'verify' | 'locked'>('login');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [mfaPin, setMfaPin] = useState('');
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [sessionTimeoutAlert, setSessionTimeoutAlert] = useState(false);
  const [mfaBackupSecret] = useState('REDF-ORGI-N7X9-W3PL-K2S9');

  // Real Multi-Factor / Recovery Feedback States
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [developerFallbackOtp, setDeveloperFallbackOtp] = useState('');
  
  // JWT & Token metadata (Visible in diagnostics/info panels)
  const [jwtAccessToken, setJwtAccessToken] = useState('');
  const [jwtRefreshToken, setJwtRefreshToken] = useState('');

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setAuthSubView('login');
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTimer]);

  // Resend OTP countdown timer
  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Sync access and refresh tokens to local state for security panels
  React.useEffect(() => {
    const acc = localStorage.getItem('redforge_access_token') || 'No active session token';
    const ref = localStorage.getItem('redforge_refresh_token') || 'No active refresh token';
    setJwtAccessToken(acc);
    setJwtRefreshToken(ref);
  }, [isAuthenticated, authSubView]);

  // Session timeout simulation (notifies after 5 minutes, but we can simulate a button/toggle in UI)
  React.useEffect(() => {
    // Set a subtle timer to trigger session alert for demo after 3 minutes
    const alertTimer = setTimeout(() => {
      if (isAuthenticated) {
        setSessionTimeoutAlert(true);
      }
    }, 180000); // 3 minutes
    return () => clearTimeout(alertTimer);
  }, [isAuthenticated]);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    setDeveloperFallbackOtp('');
    setIsLoggingIn(true);
    try {
      const res = await API.auth.loginInitiate(loginEmail, loginPassword, loginRole);
      
      // Demo Mode: Direct JWT Login (No MFA Required)
      if (res.mfaRequired === false && res.user && res.accessToken) {
        await login(res.user);
        setAuthSubView('login');
        setLoginPassword('');
        setOtpSuccess('');
        setMfaPin('');
        return;
      }
      
      // Legacy Flow: MFA Required (if needed in future)
      if (res.success && res.mfaRequired) {
        setAuthSubView('mfa');
        if (res.mfaType === 'EMAIL') {
          const otpRes = await API.auth.sendOtp(loginEmail);
          setOtpSuccess(otpRes.message);
          if (otpRes.developer_fallback_otp) {
            setDeveloperFallbackOtp(otpRes.developer_fallback_otp);
          }
          setOtpCountdown(60);
        } else {
          setOtpSuccess('Google Authenticator (TOTP) authorization required.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'Access Denied: Invalid credentials.');
      if (err.message && err.message.toLowerCase().includes('lockout')) {
        setLockoutTimer(900); // 15 mins
        setAuthSubView('locked');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaPin.trim().length !== 6) {
      setOtpError('Invalid pin: verification code must be exactly 6 digits.');
      return;
    }
    setOtpError('');
    setOtpSuccess('');
    setIsLoggingIn(true);
    try {
      const res = await API.auth.verifyOtp(loginEmail, mfaPin, rememberMe);
      await login(res.user);
      setAuthSubView('login'); // Reset
      setMfaPin('');
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'MFA PIN verification failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setOtpError('');
    setOtpSuccess('');
    setDeveloperFallbackOtp('');
    try {
      const res = await API.auth.sendOtp(loginEmail);
      setOtpSuccess(res.message);
      if (res.developer_fallback_otp) {
        setDeveloperFallbackOtp(res.developer_fallback_otp);
      }
      setOtpCountdown(60);
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'Failed to dispatch verification PIN.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    setDeveloperFallbackOtp('');
    setIsLoggingIn(true);
    try {
      const res = await API.auth.forgotPassword(loginEmail);
      setOtpSuccess(res.message);
      if (res.developer_fallback_otp) {
        setDeveloperFallbackOtp(res.developer_fallback_otp);
      }
      setAuthSubView('verify');
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'Failed to dispatch recovery code.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    setIsLoggingIn(true);
    try {
      const res = await API.auth.verifyResetCode(loginEmail, emailVerifyCode);
      setOtpSuccess(res.message);
      setAuthSubView('reset');
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'Verification of recovery PIN failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getPasswordStrength(loginPassword) < 3) {
      alert('Security failure: New password must be at least high-strength.');
      return;
    }
    setOtpError('');
    setOtpSuccess('');
    setIsLoggingIn(true);
    try {
      const res = await API.auth.resetPassword(loginEmail, loginPassword);
      alert(res.message);
      setAuthSubView('login');
      setLoginPassword('');
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || 'Failed to update credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'add-asset') {
      setActiveTab('assets');
    } else if (action === 'import-assets') {
      setActiveTab('assets');
    } else if (action === 'generate-report') {
      setActiveTab('reports');
    }
  };

  const handleDashboardSearchQuery = (query: string) => {
    if (query.toLowerCase().includes('cve') || query.toLowerCase().includes('cwe')) {
      setActiveTab('findings');
    } else if (query.toLowerCase().includes('.') || query.toLowerCase().includes('ip')) {
      setActiveTab('assets');
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Command Center';
      case 'projects':
        return 'Projects Management Workspace';
      case 'discovery':
        return 'Active Attack Surface Discovery';
      case 'assets':
        return 'Asset Inventory Database';
      case 'findings':
        return 'Vulnerability Findings Lab';
      case 'assessments':
        return 'Security Offense Campaigns';
      case 'reports':
        return 'Security Reporting Engine';
      case 'threat-intel':
        return 'Tactical Threat Intelligence';
      case 'arch':
        return 'Platform Architecture & Blueprints';
      case 'logs-settings':
        return 'System Controls & Auditing';
    }
  };

  // If not logged in, render the beautiful multi-screen authentication interface
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0B0D] p-4 text-[#E6EDF3] relative overflow-hidden font-sans" id="login-viewport">
        {/* Subtle background nodes simulation */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

        <div className="w-full max-w-md bg-[#161B22] border border-[#30363d] rounded-2xl p-8 shadow-2xl relative overflow-hidden" id="login-card">
          {/* Header Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white text-xl mb-3 shadow-[0_0_20px_rgba(225,29,72,0.5)]">
              RF
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display">REDFORGE Command</h1>
            <p className="text-xs text-[#8b949e] mt-1 uppercase tracking-wider font-semibold">Enterprise ASM Security Gateway</p>
          </div>

          {/* Error and Success Alerts */}
          {otpError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-400 font-mono flex items-start space-x-2 animate-pulse" id="auth-error-alert">
              <span className="font-bold flex-shrink-0">⚠️ SECURITY ERROR:</span>
              <span>{otpError}</span>
            </div>
          )}
          {otpSuccess && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-400 font-mono flex items-start space-x-2" id="auth-success-alert">
              <span className="font-bold flex-shrink-0">ℹ️ SYSTEM INFO:</span>
              <span>{otpSuccess}</span>
            </div>
          )}
          {developerFallbackOtp && (
            <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs text-orange-400 font-mono flex flex-col space-y-1" id="auth-fallback-alert">
              <span className="font-bold">🖥️ DEV SMTP OFFLINE BYPASS:</span>
              <p className="text-[10px]">OTP was logged to backend console. Input PIN below:</p>
              <div className="text-center bg-[#0d1117] py-1 rounded text-white font-extrabold tracking-widest text-sm mt-1">
                {developerFallbackOtp}
              </div>
            </div>
          )}

          {/* VIEW 1: Account Lockout */}
          {authSubView === 'locked' && (
            <div className="space-y-5 text-center py-4" id="auth-locked-screen">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-md font-bold text-red-500 font-display uppercase tracking-wider">Access Blocked: Intrusion Lockout</h2>
                <p className="text-xs text-[#8b949e] leading-relaxed">
                  Too many consecutive failed login attempts detected. Your session origin has been locked out to mitigate brute-force attacks.
                </p>
              </div>
              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-lg font-mono text-center">
                <div className="text-[10px] text-[#8b949e] uppercase font-bold mb-1">LOCKOUT RECOVERY TIME</div>
                <div className="text-3xl font-extrabold text-white">{lockoutTimer}s</div>
              </div>
              <div className="text-[10px] text-[#8b949e] font-mono leading-relaxed">
                Cryptographic hardware tokens and session brokers are frozen. System will auto-unlock shortly.
              </div>
            </div>
          )}

          {/* VIEW 2: Login Screen */}
          {authSubView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" id="auth-login-screen">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Operator Identity E-Mail</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono transition-colors"
                  placeholder="admin@redforge.local"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Security Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpError('');
                      setOtpSuccess('');
                      setDeveloperFallbackOtp('');
                      setAuthSubView('forgot');
                    }}
                    className="text-[10px] text-red-500 hover:text-red-400 font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono transition-colors"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8b949e] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Live password strength indicator while typing */}
                {loginPassword && loginPassword !== 'AdminSecurePass123!' && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-[#8b949e]">
                      <span>PASSWORD STRENGTH</span>
                      <span className={
                        getPasswordStrength(loginPassword) === 4 ? 'text-green-400 font-bold' :
                        getPasswordStrength(loginPassword) >= 2 ? 'text-yellow-400' : 'text-red-400'
                      }>
                        {['VERY WEAK', 'WEAK', 'MODERATE', 'STRONG', 'ENTERPRISE READY'][getPasswordStrength(loginPassword)]}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1 bg-[#0d1117] rounded-full overflow-hidden">
                      <div className={`h-full ${getPasswordStrength(loginPassword) >= 1 ? 'bg-red-500' : ''}`} />
                      <div className={`h-full ${getPasswordStrength(loginPassword) >= 2 ? 'bg-orange-500' : ''}`} />
                      <div className={`h-full ${getPasswordStrength(loginPassword) >= 3 ? 'bg-yellow-500' : ''}`} />
                      <div className={`h-full ${getPasswordStrength(loginPassword) >= 4 ? 'bg-green-500 animate-pulse' : ''}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Persona/Role Selector for RBAC evaluation */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Assigned Security Role (RBAC Demo)</label>
                <select
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as UserRole)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer transition-colors"
                >
                  <option value="Administrator">Administrator (All Privileges)</option>
                  <option value="Lead Pentester">Lead Pentester (Findings & Scans)</option>
                  <option value="Security Analyst">Security Analyst (Triage & Read)</option>
                  <option value="Security Manager">Security Manager (Assessments & Settings)</option>
                  <option value="Viewer">Viewer (Read-Only Access)</option>
                </select>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center space-x-2 text-xs text-[#8b949e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#0d1117] border-[#30363d] text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Remember my operator credentials</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Validating credentials...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 animate-pulse" />
                    <span>Authorize Operator Session</span>
                  </>
                )}
              </button>

              {failedAttempts > 0 && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 rounded text-center font-mono">
                  Failed authentication count: {failedAttempts}/3 before lockdown
                </div>
              )}
            </form>
          )}

          {/* VIEW 3: Multi-Factor Authentication (MFA) */}
          {authSubView === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-4" id="auth-mfa-screen">
              <div className="text-center space-y-1">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">MFA Verification Triggered</h2>
                <p className="text-[11px] text-[#8b949e]">
                  {otpSuccess && otpSuccess.includes('Google')
                    ? 'Enter the 6-digit TOTP from your Google Authenticator app.'
                    : 'A secure 6-digit verification code was dispatched to your email.'}
                </p>
              </div>

              {/* Conditional Rendering: Only show QR if Google Authenticator is enabled */}
              {otpSuccess && otpSuccess.includes('Google') ? (
                <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl flex flex-col items-center justify-center space-y-2">
                  <svg className="w-32 h-32 text-white border border-red-500/20 rounded p-2 bg-white" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M5 5h20v20H5V5zm5 5v10h10V10H10zM5 75h20v20H5V75zm5 5v10h10V80H10zM75 5h20v20H75V5zm5 5v10h10V10H80z" />
                    <path d="M35 5h10v10H35V5zm20 5h10v10H55V10zm25 35h10v10H80V45zM45 45h10v10H45V45zm15 15h10v10H60V60zM35 75h10v10H35V75zm30 15h10v10H65V90zm15-15h10v10H80V75z" />
                    <path d="M5 35h10v10H5V35zm15 15h10v10H20V50zm15 10h10v10H35V60zm50-15h10v10H85V45zm-20 20h10v10H65V65zm-15 15h10v10H50V80z" />
                  </svg>
                  <div className="text-center font-mono text-[9px] text-[#8b949e]">
                    Secret: <strong className="text-white">{mfaBackupSecret}</strong>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-xl flex flex-col items-center justify-center space-y-3 font-mono text-[#8b949e] relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500">
                    <Bell className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-xs text-white font-bold">Awaiting OTP Verification</div>
                    <div className="text-[10px] text-[#8b949e]">{loginEmail}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5 text-center">6-Digit Verification PIN</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaPin}
                  onChange={(e) => setMfaPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-center text-md tracking-[0.75em] font-extrabold text-white focus:outline-none focus:border-red-500 font-mono transition-colors"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-[#30363d] disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Verify PIN &amp; Log In</span>
                  </>
                )}
              </button>

              {/* Dynamic countdown and resend button */}
              {!(otpSuccess && otpSuccess.includes('Google')) && (
                <div className="text-center pt-1.5 font-mono">
                  {otpCountdown > 0 ? (
                    <span className="text-[10px] text-[#8b949e]">
                      Resend code in <strong className="text-red-400">{otpCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-[10px] text-red-500 hover:text-red-400 font-bold hover:underline"
                    >
                      Didn't receive the email? Resend OTP Code
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setOtpError('');
                  setOtpSuccess('');
                  setDeveloperFallbackOtp('');
                  setAuthSubView('login');
                }}
                className="w-full text-center text-[11px] text-[#8b949e] hover:text-white hover:underline block pt-1"
              >
                Cancel and return
              </button>
            </form>
          )}

          {/* VIEW 4: Forgot Password Account Recovery */}
          {authSubView === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4" id="auth-forgot-screen">
              <div className="text-center space-y-1">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Security Recovery</h2>
                <p className="text-[11px] text-[#8b949e]">Enter your e-mail to dispatch a security reset authentication code.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Registered Operator E-Mail</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono transition-colors"
                  placeholder="admin@redforge.local"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Processing Link...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    <span>Dispatch Recovery Code</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpError('');
                  setOtpSuccess('');
                  setDeveloperFallbackOtp('');
                  setAuthSubView('login');
                }}
                className="w-full text-center text-[11px] text-[#8b949e] hover:text-white hover:underline block pt-1"
              >
                Back to Login
              </button>
            </form>
          )}

          {/* VIEW 5: Verification Code Step */}
          {authSubView === 'verify' && (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4" id="auth-verify-screen">
              <div className="text-center space-y-1">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Recovery Code Verification</h2>
                <p className="text-[11px] text-[#8b949e]">A secure verification code was dispatched. Enter it below.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={emailVerifyCode}
                  onChange={(e) => setEmailVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2 text-center text-xs text-white focus:outline-none focus:border-red-500 font-mono transition-colors"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-[#30363d] text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Verifying PIN...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm Verification Code</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1.5 font-mono">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] text-red-500 hover:text-red-400 font-bold hover:underline"
                >
                  Resend Recovery Code
                </button>
              </div>
            </form>
          )}

          {/* VIEW 6: Reset Password Form (with strength checklist) */}
          {authSubView === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4" id="auth-reset-screen">
              <div className="text-center space-y-1">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Establish New Password</h2>
                <p className="text-[11px] text-[#8b949e]">Configure a secure high-entropy primary operational credential.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono transition-colors"
                    placeholder="E.g. Str0ngP@ss1!"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8b949e] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Granular Password Checklist */}
                <div className="mt-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1.5 text-[10px] font-mono">
                  <span className="text-[9px] uppercase text-[#8b949e] font-bold">Cryptographic Complexity Requirements</span>
                  <div className="flex items-center space-x-1.5">
                    <span className={loginPassword.length >= 8 ? 'text-green-400' : 'text-red-400'}>
                      {loginPassword.length >= 8 ? '✓' : '✗'}
                    </span>
                    <span className={loginPassword.length >= 8 ? 'text-[#e6edf3]' : 'text-[#8b949e]'}>Minimum 8 characters ({loginPassword.length}/8)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={/[A-Z]/.test(loginPassword) ? 'text-green-400' : 'text-red-400'}>
                      {/[A-Z]/.test(loginPassword) ? '✓' : '✗'}
                    </span>
                    <span className={/[A-Z]/.test(loginPassword) ? 'text-[#e6edf3]' : 'text-[#8b949e]'}>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={/[0-9]/.test(loginPassword) ? 'text-green-400' : 'text-red-400'}>
                      {/[0-9]/.test(loginPassword) ? '✓' : '✗'}
                    </span>
                    <span className={/[0-9]/.test(loginPassword) ? 'text-[#e6edf3]' : 'text-[#8b949e]'}>At least one numeric digit (0-9)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={/[^A-Za-z0-9]/.test(loginPassword) ? 'text-green-400' : 'text-red-400'}>
                      {/[^A-Za-z0-9]/.test(loginPassword) ? '✓' : '✗'}
                    </span>
                    <span className={/[^A-Za-z0-9]/.test(loginPassword) ? 'text-[#e6edf3]' : 'text-[#8b949e]'}>At least one special character (!@#$%)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || getPasswordStrength(loginPassword) < 3}
                className={`w-full py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  getPasswordStrength(loginPassword) >= 3 && !isLoggingIn
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-[#21262d] border border-[#30363d] text-[#8b949e] cursor-not-allowed'
                }`}
              >
                {isLoggingIn ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Save New Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpError('');
                  setOtpSuccess('');
                  setDeveloperFallbackOtp('');
                  setAuthSubView('login');
                }}
                className="w-full text-center text-[11px] text-[#8b949e] hover:text-white hover:underline block pt-1"
              >
                Cancel and back to login
              </button>
            </form>
          )}

          {/* Signed footer */}
          <div className="mt-8 pt-4 border-t border-[#30363d] text-center text-[9px] text-[#8b949e] font-mono flex items-center justify-between">
            <span>SECURE LEDGER AUTH v5.0</span>
            <span className="text-green-500">AES-256 HMAC-SHA256</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#0A0B0D] text-[#E6EDF3] font-sans" id="app-viewport">
      
      {/* Sidebar Rail */}
      <aside className="sticky top-0 h-screen w-64 border-r border-[#30363d] bg-[#161B22] flex flex-col justify-between flex-shrink-0" id="sidebar">
        <div className="flex flex-col flex-1">
          {/* Logo Brand Header */}
          <div className="p-6 flex items-center space-x-3" id="brand-logo">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]">
              RF
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white font-display block">REDFORGE</span>
              <span className="text-[8px] text-[#8b949e] uppercase font-mono tracking-widest font-bold">Surface Intel</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-1.5" id="sidebar-navigation">
            <div className="text-[10px] uppercase tracking-widest text-[#8b949e] font-bold mb-2 ml-2">
              Operations
            </div>
            
            {/* Nav item 1 */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Command Center</span>
            </button>

            {/* Discovery active tab */}
            <button
              onClick={() => setActiveTab('discovery')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'discovery'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Network className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span className="text-xs">Surface Discovery</span>
            </button>

            {/* Projects active tab */}
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span className="text-xs">Projects Workspace</span>
            </button>

            {/* Nav item 2 */}
            <button
              onClick={() => setActiveTab('assets')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Asset Inventory</span>
            </button>

            {/* Nav item 3 */}
            <button
              onClick={() => setActiveTab('findings')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'findings'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Findings Lab</span>
            </button>

            {/* Nav item 4 */}
            <button
              onClick={() => setActiveTab('assessments')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'assessments'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Assessments</span>
            </button>

            <div className="mt-6 text-[10px] uppercase tracking-widest text-[#8b949e] font-bold mb-2 ml-2">
              Intelligence
            </div>

            {/* Nav item 5 */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Reporting Engine</span>
            </button>

            {/* Nav item Threat Intel */}
            <button
              onClick={() => setActiveTab('threat-intel')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'threat-intel'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-orange-400" />
              <span className="text-xs">Threat Intelligence</span>
            </button>

            {/* Nav item 6 */}
            <button
              onClick={() => setActiveTab('arch')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'arch'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Database className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">Systems Blueprint</span>
            </button>

            {/* Nav item 7 */}
            <button
              onClick={() => setActiveTab('logs-settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                activeTab === 'logs-settings'
                  ? 'bg-[#21262d] text-white border-l-2 border-red-600 font-semibold'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <Terminal className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">System Controls</span>
            </button>
          </nav>
        </div>

        {/* User Identity block */}
        <div className="p-4 border-t border-[#30363d]" id="sidebar-user">
          <div className="flex flex-col space-y-2 p-2.5 bg-[#21262d] rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center font-bold text-white text-[10px]">
                  {currentUser.avatar}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-white truncate" title={currentUser.name}>
                    {currentUser.name}
                  </div>
                  <div className="text-[9px] text-[#8b949e] truncate" title={currentUser.email}>
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Disconnect Session"
                className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-red-400 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick RBAC Role Selector right on the sidebar footer for immediate demo usage */}
            <div className="pt-1.5 border-t border-[#30363d]/50 flex flex-col space-y-1">
              <span className="text-[8px] uppercase tracking-wider text-[#8b949e] font-bold">Active Role</span>
              <select
                value={currentUser.role}
                onChange={(e) => switchRole(e.target.value as UserRole)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none cursor-pointer w-full"
              >
                <option value="Administrator">Administrator</option>
                <option value="Lead Pentester">Lead Pentester</option>
                <option value="Security Analyst">Security Analyst</option>
                <option value="Security Manager">Security Manager</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Workspace */}
      <main className="flex-1 flex flex-col" id="workspace">
        {/* Header Console */}
        <header className="h-16 border-b border-[#30363d] bg-[#161B22]/80 backdrop-blur-sm flex items-center justify-between px-8 flex-shrink-0 z-40" id="header-bar">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold font-display text-white">{getHeaderTitle()}</h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 tracking-wider">
              SYSTEMS NOMINAL
            </span>
            {rbacEnabled && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider">
                RBAC ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {/* Notification trigger and panel */}
            <div className="relative">
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#21262d] cursor-pointer text-[#8b949e] hover:text-white"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-[#161B22]"></div>
                )}
              </div>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#30363d] bg-[#161B22]/95 p-4 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm z-[60] text-xs text-[#e6edf3]" id="notifications-panel">
                  <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                    <div>
                      <span className="font-semibold font-display text-white">System Notifications</span>
                      <p className="mt-1 text-[10px] text-[#8b949e]">Priority updates and workflow alerts</p>
                    </div>
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b949e] transition-colors hover:text-white"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-4 text-center text-[#8b949e]">No unread notifications.</div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div key={idx} className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-[#e6edf3] font-sans">
                          {notif}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[10px] text-[#8b949e] font-mono">
                {currentUser.role.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic View Injection */}
        <div className="p-8" id="workspace-viewport">
          
          {activeTab === 'dashboard' && (
            <DashboardOverview
              findings={findings}
              assets={assets}
              logs={logs}
              projectsCount={projects.length}
              assessmentsCount={assessments.length}
              reportsCount={findings.filter(f => f.status === 'Resolved' || f.status === 'Closed').length}
              onInitiateScan={triggerScan}
              isScanning={isScanning}
              scanProgress={scanProgress}
              onQuickAction={handleQuickAction}
              onSearchQuery={handleDashboardSearchQuery}
            />
          )}

          {activeTab === 'discovery' && (
            <AttackSurfaceDiscovery
              assets={assets}
              onAddAsset={addAsset}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectWorkspace
              projects={projects}
              assets={assets}
              assessments={assessments}
              findings={findings}
              onAddProject={addProject}
              onUpdateProjectNotes={updateProjectNotes}
            />
          )}

          {activeTab === 'assets' && (
            <AssetInventory
              assets={assets}
              onAddAsset={addAsset}
              onBulkAddAssets={bulkAddAssets}
              onBulkDeleteAssets={bulkDeleteAssets}
            />
          )}

          {activeTab === 'findings' && (
            <FindingsLab
              findings={findings}
              onUpdateFindingStatus={updateFindingStatus}
              onUpdateFindingCVSS={updateFindingCVSS}
              onAddFindingComment={addFindingComment}
              onUploadFindingAttachment={uploadFindingAttachment}
            />
          )}

          {activeTab === 'assessments' && (
            <Assessments
              assessments={assessments}
              onAddAssessment={addAssessment}
              onUpdateAssessmentStatus={updateAssessmentStatus}
            />
          )}

          {activeTab === 'reports' && (
            <ReportingEngine
              findings={findings}
              assets={assets}
            />
          )}

          {activeTab === 'threat-intel' && (
            <ThreatIntelligence />
          )}

          {activeTab === 'arch' && (
            <ArchitectureDocs />
          )}

          {activeTab === 'logs-settings' && (
            <LogsAndSettings
              logs={logs}
              users={users}
              onUpdateUserRole={updateUserRole}
              onUpdateUserStatus={updateUserStatus}
              onAddUser={addUser}
            />
          )}
        </div>

        {/* Footer Console status line */}
        <footer className="h-10 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between px-8 text-[10px] text-[#8b949e] flex-shrink-0" id="footer-bar">
          <div>&copy; 2026 REDFORGE Enterprise ASM Platform. All security telemetry is cryptographically signed.</div>
          <div className="flex space-x-4">
            <button 
              onClick={resetAllData} 
              className="text-red-500 hover:text-red-400 cursor-pointer font-bold transition-colors uppercase text-[9px] tracking-wider"
              title="Reset state to initial template profiles"
            >
              Reset Data State
            </button>
            <span>v4.3.0-stable</span>
            <span className="text-green-500 font-semibold">API Latency: 12ms</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
