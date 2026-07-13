import React, { createContext, useContext, useState, useEffect } from 'react';
import { Asset, Finding, Assessment, AuditLog, User, Project, UserRole, FindingStatus, AssessmentStatus, SeverityLevel } from '../types';
import { API } from '../lib/api';

interface RedforgeStateContextType {
  // Authentication & RBAC
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  rbacEnabled: boolean;
  setRbacEnabled: (enabled: boolean) => void;
  checkPermission: (action: 'WRITE_FINDINGS' | 'TRIGGER_SCANS' | 'MANAGE_USERS' | 'MANAGE_SETTINGS') => boolean;

  // Data State Arrays
  assets: Asset[];
  findings: Finding[];
  assessments: Assessment[];
  logs: AuditLog[];
  users: User[];
  projects: Project[];
  notifications: string[];

  // Scanning Engine States
  isScanning: boolean;
  scanProgress: number;
  triggerScan: () => Promise<void>;

  // Data Actions
  addAsset: (asset: Omit<Asset, 'id' | 'lastScanned'>) => Promise<void>;
  bulkAddAssets: (assets: Omit<Asset, 'id' | 'lastScanned'>[]) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  bulkDeleteAssets: (ids: string[]) => Promise<void>;

  updateFindingStatus: (id: string, status: FindingStatus) => Promise<void>;
  updateFindingCVSS: (id: string, score: number) => Promise<void>;
  addFindingComment: (findingId: string, text: string) => Promise<void>;
  uploadFindingAttachment: (findingId: string, fileName: string) => Promise<void>;

  addAssessment: (asm: Omit<Assessment, 'id' | 'progress' | 'findingsCount'>) => Promise<void>;
  updateAssessmentStatus: (id: string, status: AssessmentStatus) => Promise<void>;

  addProject: (proj: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProjectNotes: (id: string, notes: string) => Promise<void>;

  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUserRole: (id: string, role: UserRole) => Promise<void>;
  updateUserStatus: (id: string, status: 'Active' | 'Suspended') => Promise<void>;

  clearNotifications: () => Promise<void>;
  resetAllData: () => Promise<void>;

  // Settings Configuration
  immutableLock: boolean;
  setImmutableLock: (lock: boolean) => void;
  scanInterval: string;
  setScanInterval: (interval: string) => void;
}

const RedforgeStateContext = createContext<RedforgeStateContextType | undefined>(undefined);

export function RedforgeStateProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [rbacEnabled, setRbacEnabled] = useState<boolean>(true);
  const [immutableLock, setImmutableLock] = useState<boolean>(true);
  const [scanInterval, setScanInterval] = useState<string>('24h');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);

  // Initialize and load everything on mount
  useEffect(() => {
    async function loadData() {
      const authUser = await API.auth.getCurrentUser();
      if (authUser) {
        setCurrentUser(authUser);
        setIsAuthenticated(true);
        try {
          setAssets(await API.assets.getAll());
          setFindings(await API.findings.getAll());
          setAssessments(await API.assessments.getAll());
          setLogs(await API.logs.getAll());
          setUsers(await API.users.getAll());
          setProjects(await API.projects.getAll());
          setNotifications(await API.notifications.getAll());
        } catch (err) {
          console.error('Failed to load secure API assets. Operator session may be invalid.', err);
        }
      } else {
        setIsAuthenticated(false);
      }
    }
    loadData();
  }, []);

  // Sync state changes back to localStorage
  const triggerLog = async (action: string, severity: 'Info' | 'Warning' | 'Critical' = 'Info') => {
    const operator = currentUser?.email || 'System';
    const newLog = await API.logs.create({
      user: operator,
      action,
      ip: '192.168.4.150',
      browser: navigator.userAgent.substring(0, 50),
      severity
    });
    setLogs(prev => [newLog, ...prev]);
  };

  // Permission RBAC Gates
  const checkPermission = (action: 'WRITE_FINDINGS' | 'TRIGGER_SCANS' | 'MANAGE_USERS' | 'MANAGE_SETTINGS'): boolean => {
    if (!rbacEnabled) return true; // Bypass
    if (!currentUser) return false;

    const role = currentUser.role;
    if (role === 'Administrator' || role === 'Super Admin') return true;

    switch (action) {
      case 'WRITE_FINDINGS':
        return role === 'Lead Pentester' || role === 'Security Analyst' || role === 'Security Manager';
      case 'TRIGGER_SCANS':
        return role === 'Lead Pentester' || role === 'Security Analyst';
      case 'MANAGE_USERS':
        return false; // Admins only
      case 'MANAGE_SETTINGS':
        return role === 'Security Manager';
      default:
        return false;
    }
  };

  // Auth Operations
  const login = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      setAssets(await API.assets.getAll());
      setFindings(await API.findings.getAll());
      setAssessments(await API.assessments.getAll());
      setLogs(await API.logs.getAll());
      setUsers(await API.users.getAll());
      setProjects(await API.projects.getAll());
      setNotifications(await API.notifications.getAll());
    } catch (err) {
      console.error('Failed to load secure API assets on login:', err);
    }
    await triggerLog(`User authenticated: ${user.email} with role ${user.role}`, 'Info');
  };

  const logout = async () => {
    await triggerLog(`User logged out: ${currentUser?.email}`, 'Info');
    await API.auth.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const switchRole = async (role: UserRole) => {
    if (!currentUser) return;
    const updated = await API.auth.switchRole(role);
    setCurrentUser(updated);
    await triggerLog(`Privileges escalated/changed to: ${role}`, 'Warning');
  };

  // Scanning Engine simulator
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(async () => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            
            // Register Completion
            triggerLog('Automated continuous attack surface discovery scan completed. Mapped 942 endpoints.', 'Info');

            // Generate random vulnerability discovery
            const rand = Math.floor(Math.random() * 1000);
            const severity: SeverityLevel = Math.random() > 0.5 ? 'High' : 'Critical';
            const newFinding: Finding = {
              id: `fnd-${rand}`,
              identifier: `CVE-2026-${rand}`,
              title: `Unauthenticated Administrative Panel Exposure Port ${Math.floor(Math.random() * 8000 + 1000)}`,
              description: 'Continuous port discovery mapping found an active administrative control web GUI exposed on the staging cloud subnet with default credentials.',
              severity,
              cvss: severity === 'Critical' ? 9.8 : 8.1,
              asset: 'staging-redis-node.prod.reforge.io',
              status: 'Open',
              mitreAttack: 'T1190 - Exploit Public-Facing Application',
              cwe: 'CWE-306: Missing Authentication for Critical Function',
              owasp: 'A01:2021-Broken Access Control',
              proofOfConcept: `GET /admin/dashboard HTTP/1.1\nHost: staging-redis-node.prod.reforge.io\n\nHTTP/1.1 200 OK\nServer: AdminPanelConsole v1.0.2\nContent-Type: text/html`,
              recommendation: 'Configure strict firewall ingress groups restricting administrative interfaces to authorized internal gateway VPN addresses.',
              references: ['https://cwe.mitre.org/data/definitions/306.html'],
              assignedTo: 'Lead Pentester',
              discoveredAt: new Date().toISOString(),
              comments: [],
              history: [{ id: `h-${Date.now()}`, user: 'System', action: 'Discovered via continuous crawler agent', timestamp: new Date().toISOString() }],
              attachments: []
            };

            API.findings.create(newFinding).then((f) => {
              setFindings(prev => [f, ...prev]);
            });

            // Trigger real notification
            const notifMsg = `New ${severity} Risk vulnerability detected: CVE-2026-${rand}!`;
            API.notifications.create(notifMsg).then((notifs) => {
              setNotifications(notifs);
            });

            return 0;
          }
          return prev + 10;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const triggerScan = async () => {
    if (!checkPermission('TRIGGER_SCANS')) {
      await triggerLog('Access Denied: Attempted to trigger scan campaign without privilege', 'Critical');
      alert('Security Exception: Required privilege TRIGGER_SCANS is missing.');
      return;
    }
    setIsScanning(true);
    setScanProgress(0);
    await triggerLog('Operator triggered a real-time boundary discovery sweep', 'Warning');
  };

  // Asset Actions
  const addAsset = async (assetData: Omit<Asset, 'id' | 'lastScanned'>) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Writing asset records requires operator privileges.');
      return;
    }
    const newAsset = await API.assets.create(assetData);
    setAssets(prev => [newAsset, ...prev]);
    await triggerLog(`Enlisted active target perimeter asset: ${newAsset.address}`, 'Info');
  };

  const bulkAddAssets = async (assetsList: Omit<Asset, 'id' | 'lastScanned'>[]) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Writing asset records requires operator privileges.');
      return;
    }
    const added = await API.assets.bulkCreate(assetsList);
    setAssets(prev => [...added, ...prev]);
    await triggerLog(`Bulk-enrolled ${assetsList.length} external subnet assets`, 'Info');
  };

  const deleteAsset = async (id: string) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Deleting asset records requires administrator privileges.');
      return;
    }
    const target = assets.find(a => a.id === id);
    await API.assets.delete(id);
    setAssets(prev => prev.filter(a => a.id !== id));
    await triggerLog(`De-commissioned target perimeter asset: ${target?.address || id}`, 'Warning');
  };

  const bulkDeleteAssets = async (ids: string[]) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Bulk asset operations are restricted.');
      return;
    }
    await API.assets.bulkDelete(ids);
    setAssets(prev => prev.filter(a => !ids.includes(a.id)));
    await triggerLog(`Bulk purged ${ids.length} perimeter target assets`, 'Warning');
  };

  // Finding Actions
  const updateFindingStatus = async (id: string, status: FindingStatus) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Modifying finding records requires triage privileges.');
      return;
    }
    const updated = await API.findings.updateStatus(id, status, currentUser?.email || 'admin@redforge.io');
    setFindings(prev => prev.map(f => f.id === id ? updated : f));
    await triggerLog(`Findings ledger updated: ${updated.identifier} status to ${status}`, 'Info');
  };

  const updateFindingCVSS = async (id: string, score: number) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Recalculating threat metrics is restricted.');
      return;
    }
    let severity: SeverityLevel = 'Low';
    if (score >= 9.0) severity = 'Critical';
    else if (score >= 7.0) severity = 'High';
    else if (score >= 4.0) severity = 'Medium';

    const updated = await API.findings.updateCVSS(id, score, severity, currentUser?.email || 'admin@redforge.io');
    setFindings(prev => prev.map(f => f.id === id ? updated : f));
    await triggerLog(`CVSS Threat index recalculation: ${updated.identifier} -> score ${score} (${severity})`, 'Warning');
  };

  const addFindingComment = async (findingId: string, text: string) => {
    const updated = await API.findings.addComment(findingId, text, currentUser?.email || 'admin@redforge.io');
    setFindings(prev => prev.map(f => f.id === findingId ? updated : f));
    await triggerLog(`Coordinated note added to vulnerability: ${updated.identifier}`, 'Info');
  };

  const uploadFindingAttachment = async (findingId: string, fileName: string) => {
    const updated = await API.findings.addAttachment(findingId, fileName, currentUser?.email || 'admin@redforge.io');
    setFindings(prev => prev.map(f => f.id === findingId ? updated : f));
    await triggerLog(`Proof payload artifact uploaded to finding: ${updated.identifier}`, 'Info');
  };

  // Assessment Actions
  const addAssessment = async (asmData: Omit<Assessment, 'id' | 'progress' | 'findingsCount'>) => {
    if (!checkPermission('WRITE_FINDINGS')) {
      alert('Access Denied: Scheduled attack campaigns require higher credentials.');
      return;
    }
    const newAsm = await API.assessments.create(asmData);
    setAssessments(prev => [newAsm, ...prev]);
    await triggerLog(`Initiated high-priority security audit campaign: ${newAsm.name}`, 'Info');
  };

  const updateAssessmentStatus = async (id: string, status: AssessmentStatus) => {
    const updated = await API.assessments.updateStatus(id, status);
    setAssessments(prev => prev.map(asm => asm.id === id ? updated : asm));
    await triggerLog(`Security audit campaign status modified: ${updated.name} -> ${status}`, 'Info');
  };

  // Project Actions
  const addProject = async (projData: Omit<Project, 'id' | 'createdAt'>) => {
    const newProj = await API.projects.create(projData);
    setProjects(prev => [newProj, ...prev]);
    await triggerLog(`Created attack surface management project workspace: ${newProj.name}`, 'Info');
  };

  const updateProjectNotes = async (id: string, notes: string) => {
    const updated = await API.projects.updateNotes(id, notes);
    setProjects(prev => prev.map(p => p.id === id ? updated : p));
  };

  // Users Administration Actions
  const addUser = async (userData: Omit<User, 'id'>) => {
    if (!checkPermission('MANAGE_USERS')) {
      alert('Access Denied: Administrator directory control is restricted.');
      return;
    }
    const newUser = await API.users.create(userData);
    setUsers(prev => [...prev, newUser]);
    await triggerLog(`Enrolled operator principal identity: ${newUser.email}`, 'Warning');
  };

  const updateUserRole = async (id: string, role: UserRole) => {
    if (!checkPermission('MANAGE_USERS')) {
      alert('Access Denied: Administrator directory control is restricted.');
      return;
    }
    const updated = await API.users.updateRole(id, role);
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    await triggerLog(`Escalated role permissions for user: ${updated.email} to ${role}`, 'Critical');
  };

  const updateUserStatus = async (id: string, status: 'Active' | 'Suspended') => {
    if (!checkPermission('MANAGE_USERS')) {
      alert('Access Denied: Operator status overrides are restricted.');
      return;
    }
    const updated = await API.users.updateStatus(id, status);
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    await triggerLog(`Operator session override: ${updated.email} -> ${status}`, 'Critical');
  };

  // Notifications helper
  const clearNotifications = async () => {
    await API.notifications.clearAll();
    setNotifications([]);
  };

  const resetAllData = async () => {
    await API.resetAllData();
    setAssets(await API.assets.getAll());
    setFindings(await API.findings.getAll());
    setAssessments(await API.assessments.getAll());
    setLogs(await API.logs.getAll());
    setUsers(await API.users.getAll());
    setProjects(await API.projects.getAll());
    setNotifications(await API.notifications.getAll());
    
    // Refresh User session if present
    if (currentUser) {
      try {
        setAssets(await API.assets.getAll());
        setFindings(await API.findings.getAll());
        setAssessments(await API.assessments.getAll());
        setLogs(await API.logs.getAll());
        setUsers(await API.users.getAll());
        setProjects(await API.projects.getAll());
        setNotifications(await API.notifications.getAll());
      } catch (err) {
        console.error(err);
      }
    }
    
    await triggerLog('System memory cleared. Initial state profiles synchronized.', 'Warning');
  };

  return (
    <RedforgeStateContext.Provider value={{
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
      resetAllData,

      immutableLock,
      setImmutableLock,
      scanInterval,
      setScanInterval
    }}>
      {children}
    </RedforgeStateContext.Provider>
  );
}

export function useRedforgeState() {
  const context = useContext(RedforgeStateContext);
  if (!context) throw new Error('useRedforgeState must be used inside RedforgeStateProvider');
  return context;
}
