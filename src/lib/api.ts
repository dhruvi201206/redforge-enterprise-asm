import { Asset, Finding, Assessment, AuditLog, User, Project, UserRole, FindingStatus, AssessmentStatus, SeverityLevel } from '../types';
import { auth } from './firebase.ts';

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const customToken = localStorage.getItem('redforge_access_token');
    if (customToken) {
      headers['Authorization'] = `Bearer ${customToken}`;
    } else {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error('Failed to resolve Auth Token header:', error);
  }
  return headers;
}

export const API = {
  // Authentication & Session Sync
  auth: {
    async getCurrentUser(): Promise<User | null> {
      const stored = localStorage.getItem('redforge_current_user');
      return stored ? JSON.parse(stored) : null;
    },

    // Demo Mode: Direct JWT Login (Single Step)
    async loginInitiate(email: string, password: string, role?: UserRole): Promise<any> {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed password verification.');
      }
      
      // Handle Demo Mode Response (Direct JWT without MFA)
      if (data.access_token && data.token_type === 'Bearer' && data.user) {
        // Store session details directly
        localStorage.setItem('redforge_current_user', JSON.stringify(data.user));
        localStorage.setItem('redforge_access_token', data.access_token);
        // Return data in format expected by caller
        return {
          mfaRequired: false,
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refreshToken || null
        };
      }
      
      return data;
    },

    // Dispatches standard/resend email verification codes (EMAIL_MFA)
    async sendOtp(email: string): Promise<any> {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification PIN.');
      }
      return data;
    },

    // Step 2 of Real Auth: Verify Code & finalize JWT session creation
    async verifyOtp(email: string, otp: string, rememberMe: boolean = false): Promise<any> {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, rememberMe })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'MFA validation failed.');
      }
      // Store session details
      localStorage.setItem('redforge_current_user', JSON.stringify(data.user));
      localStorage.setItem('redforge_access_token', data.accessToken);
      localStorage.setItem('redforge_refresh_token', data.refreshToken);
      return data;
    },

    async switchRole(role: UserRole): Promise<User> {
      const current = localStorage.getItem('redforge_current_user');
      if (!current) throw new Error('No user currently authenticated');
      const user = JSON.parse(current) as User;
      
      const headers = await getHeaders();
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        throw new Error('Failed to update session privilege');
      }
      const updated = await res.json();
      localStorage.setItem('redforge_current_user', JSON.stringify(updated));
      return updated;
    },

    async logout(): Promise<void> {
      const refreshToken = localStorage.getItem('redforge_refresh_token');
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (err) {
        console.error('Revocation request failed:', err);
      }
      localStorage.removeItem('redforge_current_user');
      localStorage.removeItem('redforge_access_token');
      localStorage.removeItem('redforge_refresh_token');
    },

    async logoutAllDevices(email: string): Promise<any> {
      const res = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Global session cleanup failed.');
      return data;
    },

    async forgotPassword(email: string): Promise<any> {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger account recovery.');
      return data;
    },

    async verifyResetCode(email: string, code: string): Promise<any> {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid recovery verification PIN.');
      return data;
    },

    async resetPassword(email: string, password: string): Promise<any> {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update operator password.');
      return data;
    },

    // TOTP Google Authenticator Methods
    async setupTotp(): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate authenticator setup.');
      return data;
    },

    async enableTotp(secret: string, code: string): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/auth/totp/enable', {
        method: 'POST',
        headers,
        body: JSON.stringify({ secret, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate Google Authenticator.');
      return data;
    },

    async disableTotp(code: string): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/auth/totp/disable', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate Google Authenticator.');
      return data;
    },

    // Email verification
    async sendVerificationEmail(): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request email verification code.');
      return data;
    },

    async verifyEmail(email: string, code: string): Promise<any> {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'E-mail verification failed.');
      return data;
    }
  },

  // Assets Inventory
  assets: {
    async getAll(): Promise<Asset[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/assets', { headers });
      if (!res.ok) throw new Error('Failed to fetch asset inventory');
      return res.json();
    },

    async create(asset: Omit<Asset, 'id' | 'lastScanned'>): Promise<Asset> {
      const headers = await getHeaders();
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers,
        body: JSON.stringify(asset)
      });
      if (!res.ok) throw new Error('Failed to record new asset');
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to remove asset record');
    },

    async bulkCreate(newAssets: Omit<Asset, 'id' | 'lastScanned'>[]): Promise<Asset[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/assets/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: newAssets })
      });
      if (!res.ok) throw new Error('Failed to batch upload assets');
      return res.json();
    },

    async bulkDelete(ids: string[]): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch('/api/assets/bulk-delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('Failed to bulk delete assets');
    }
  },

  // Findings Lab
  findings: {
    async getAll(): Promise<Finding[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/findings', { headers });
      if (!res.ok) throw new Error('Failed to fetch diagnostic findings');
      return res.json();
    },

    async create(finding: Omit<Finding, 'id' | 'discoveredAt'>): Promise<Finding> {
      const headers = await getHeaders();
      const res = await fetch('/api/findings', {
        method: 'POST',
        headers,
        body: JSON.stringify(finding)
      });
      if (!res.ok) throw new Error('Failed to log new finding');
      return res.json();
    },

    async updateStatus(id: string, status: FindingStatus, operator: string): Promise<Finding> {
      const headers = await getHeaders();
      const res = await fetch(`/api/findings/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, operator })
      });
      if (!res.ok) throw new Error('Failed to shift finding triage state');
      return res.json();
    },

    async updateCVSS(id: string, score: number, severity: SeverityLevel, operator: string): Promise<Finding> {
      const headers = await getHeaders();
      const res = await fetch(`/api/findings/${id}/cvss`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ score, severity, operator })
      });
      if (!res.ok) throw new Error('Failed to record CVSS recalibration');
      return res.json();
    },

    async addComment(findingId: string, text: string, operator: string): Promise<Finding> {
      const headers = await getHeaders();
      const res = await fetch(`/api/findings/${findingId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, operator })
      });
      if (!res.ok) throw new Error('Failed to post collaboration text');
      // Fetch updated finding with refreshed comments and history list
      return this.getAll().then(findings => {
        const found = findings.find(f => f.id === findingId);
        if (!found) throw new Error('Finding updated but lookup failed');
        return found;
      });
    },

    async addAttachment(findingId: string, fileName: string, operator: string): Promise<Finding> {
      const headers = await getHeaders();
      const res = await fetch(`/api/findings/${findingId}/attachments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileName, operator })
      });
      if (!res.ok) throw new Error('Failed to save file attachment');
      return this.getAll().then(findings => {
        const found = findings.find(f => f.id === findingId);
        if (!found) throw new Error('Finding updated but lookup failed');
        return found;
      });
    }
  },

  // Assessments
  assessments: {
    async getAll(): Promise<Assessment[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/assessments', { headers });
      if (!res.ok) throw new Error('Failed to retrieve assessment campaigns');
      return res.json();
    },

    async create(asm: Omit<Assessment, 'id' | 'progress' | 'findingsCount'>): Promise<Assessment> {
      const headers = await getHeaders();
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers,
        body: JSON.stringify(asm)
      });
      if (!res.ok) throw new Error('Failed to build evaluation audit');
      return res.json();
    },

    async updateStatus(id: string, status: AssessmentStatus): Promise<Assessment> {
      const headers = await getHeaders();
      const res = await fetch(`/api/assessments/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to advance assessment campaign');
      return res.json();
    }
  },

  // Projects
  projects: {
    async getAll(): Promise<Project[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/projects', { headers });
      if (!res.ok) throw new Error('Failed to retrieve projects');
      return res.json();
    },

    async create(proj: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
      const headers = await getHeaders();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify(proj)
      });
      if (!res.ok) throw new Error('Failed to create project workspace');
      return res.json();
    },

    async updateNotes(id: string, notes: string): Promise<Project> {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${id}/notes`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes })
      });
      if (!res.ok) throw new Error('Failed to save project progress notes');
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete project');
    }
  },

  // Organizations
  organizations: {
    async getAll(): Promise<any[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/organizations', { headers });
      if (!res.ok) throw new Error('Failed to retrieve organizations');
      return res.json();
    },

    async create(org: any): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers,
        body: JSON.stringify(org)
      });
      if (!res.ok) throw new Error('Failed to create organization');
      return res.json();
    },

    async update(id: string, org: any): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(org)
      });
      if (!res.ok) throw new Error('Failed to update organization');
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete organization');
    }
  },

  // Teams
  teams: {
    async getAll(): Promise<any[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/teams', { headers });
      if (!res.ok) throw new Error('Failed to retrieve teams');
      return res.json();
    },

    async create(team: any): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify(team)
      });
      if (!res.ok) throw new Error('Failed to create team');
      return res.json();
    },

    async update(id: string, team: any): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(team)
      });
      if (!res.ok) throw new Error('Failed to update team');
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete team');
    }
  },

  // Threat Intelligence Feed
  threatIntel: {
    async getFeed(): Promise<any[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/threat-intel/feed', { headers });
      if (!res.ok) throw new Error('Failed to retrieve tactical feeds');
      const data = await res.json();
      return data.intel || [];
    },

    async analyzeIoC(ioc: string): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/threat-intel/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ioc })
      });
      if (!res.ok) throw new Error('Failed to analyze Indicator of Compromise');
      return res.json();
    }
  },

  // Reporting Compilation
  reports: {
    async compile(reportData: any): Promise<any> {
      const headers = await getHeaders();
      const res = await fetch('/api/reports/compile', {
        method: 'POST',
        headers,
        body: JSON.stringify(reportData)
      });
      if (!res.ok) throw new Error('Failed to record report compilation');
      return res.json();
    }
  },

  // Audit Logs
  logs: {
    async getAll(): Promise<AuditLog[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/logs', { headers });
      if (!res.ok) throw new Error('Failed to retrieve system security logs');
      return res.json();
    },

    async create(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
      const headers = await getHeaders();
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers,
        body: JSON.stringify(log)
      });
      if (!res.ok) throw new Error('Failed to register audit log record');
      return res.json();
    }
  },

  // Directory Management
  users: {
    async getAll(): Promise<User[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/users', { headers });
      if (!res.ok) throw new Error('Failed to list system users');
      return res.json();
    },

    async create(user: Omit<User, 'id'>): Promise<User> {
      const headers = await getHeaders();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('Failed to register operator principal');
      return res.json();
    },

    async updateRole(id: string, role: UserRole): Promise<User> {
      const headers = await getHeaders();
      const res = await fetch(`/api/users/${id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error('Failed to modify operator security role');
      return res.json();
    },

    async updateStatus(id: string, status: 'Active' | 'Suspended'): Promise<User> {
      const headers = await getHeaders();
      const res = await fetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to suspend operator principal');
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete operator record');
    }
  },

  // Inbox Notifications
  notifications: {
    async getAll(): Promise<string[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/notifications', { headers });
      if (!res.ok) throw new Error('Failed to fetch unread warnings');
      return res.json();
    },

    async create(message: string): Promise<string[]> {
      const headers = await getHeaders();
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('Failed to dispatch alert');
      return res.json();
    },

    async clearAll(): Promise<void> {
      const headers = await getHeaders();
      const res = await fetch('/api/notifications/clear', {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to truncate inbox warnings');
    }
  },

  // Reset helper
  async resetAllData(): Promise<void> {
    const headers = await getHeaders();
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Failed to completely truncate and re-seed data');
  }
};
