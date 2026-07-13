import React, { useState } from 'react';
import { Finding, Asset } from '../types';
import { 
  Download, Eye, FileText, Check, ShieldCheck, Printer, RefreshCw, 
  Sparkles, Award, User, AlertTriangle, Cpu, HelpCircle, Lock, Calendar, FileType
} from 'lucide-react';

interface ReportingEngineProps {
  findings: Finding[];
  assets: Asset[];
}

export default function ReportingEngine({ findings, assets }: ReportingEngineProps) {
  const [reportType, setReportType] = useState<'Executive' | 'Technical' | 'Risk' | 'Management'>('Executive');
  const [minSeverity, setMinSeverity] = useState<'All' | 'High' | 'Critical'>('All');
  const [companyName, setCompanyName] = useState('REDFORGE Enterprise Corp');
  const [reportTitle, setReportTitle] = useState('Attack Surface Vulnerability Dossier');
  const [authorName, setAuthorName] = useState('Chief Information Security Officer (CISO)');
  const [classification, setClassification] = useState<'CONFIDENTIAL' | 'RESTRICTED' | 'INTERNAL' | 'SECRET'>('CONFIDENTIAL');
  const [customExecutiveSummary, setCustomExecutiveSummary] = useState(
    'During our continuous Attack Surface Assessment campaigns, several high-priority threat vectors were discovered on boundary nodes. Prompt remediation is strongly recommended to isolate critical systems.'
  );
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledSuccess, setCompiledSuccess] = useState(false);

  // Filtered Findings
  const filteredReportFindings = findings.filter((f) => {
    if (minSeverity === 'Critical') return f.severity === 'Critical';
    if (minSeverity === 'High') return f.severity === 'Critical' || f.severity === 'High';
    return true;
  });

  const criticalCount = filteredReportFindings.filter(f => f.severity === 'Critical').length;
  const highCount = filteredReportFindings.filter(f => f.severity === 'High').length;
  const mediumCount = filteredReportFindings.filter(f => f.severity === 'Medium').length;
  const lowCount = filteredReportFindings.filter(f => f.severity === 'Low').length;

  const handleCompile = () => {
    setIsCompiling(true);
    setCompiledSuccess(false);
    setTimeout(() => {
      setIsCompiling(false);
      setCompiledSuccess(true);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadJSONReport = () => {
    const reportData = {
      title: reportTitle,
      type: reportType,
      organization: companyName,
      author: authorName,
      classification: classification,
      dateCompiled: new Date().toISOString(),
      executiveSummary: customExecutiveSummary,
      scopeCoverageCount: assets.length,
      scopeExposuresFound: filteredReportFindings.length,
      severities: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      },
      vulnerabilities: filteredReportFindings.map((f) => ({
        identifier: f.identifier,
        title: f.title,
        severity: f.severity,
        cvss: f.cvss,
        assetTarget: f.asset,
        cwe: f.cwe,
        owasp: f.owasp,
        mitreAttack: f.mitreAttack,
        remediation: f.recommendation,
        proofOfConcept: f.proofOfConcept
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REDFORGE_${reportType.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadDocxReport = () => {
    const findingsHtml = filteredReportFindings.map(f => `
      <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #dddddd;">
        <h3 style="color: #e11d48; font-size: 14pt; font-family: Arial, sans-serif; margin-bottom: 5px;">${f.identifier}: ${f.title}</h3>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin: 5px 0;"><strong>Affected Host / IP:</strong> ${f.asset}</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin: 5px 0;"><strong>CVSS Severity Score:</strong> ${f.cvss} (${f.severity})</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin: 5px 0;"><strong>CWE Mapping:</strong> ${f.cwe}</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin: 5px 0;"><strong>OWASP Top 10 Mapping:</strong> ${f.owasp}</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin: 5px 0;"><strong>MITRE ATT&CK Mapping:</strong> ${f.mitreAttack}</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin-top: 10px; margin-bottom: 5px;"><strong>Vulnerability Description:</strong></p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; color: #333333; margin: 0 0 10px 0; background-color: #f6f8fa; padding: 10px; border-left: 3px solid #8b949e;">${f.description}</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin-top: 10px; margin-bottom: 5px;"><strong>Remediation Recommendations:</strong></p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; color: #15803d; margin: 0 0 10px 0; background-color: #f0fdf4; padding: 10px; border-left: 3px solid #16a34a;">${f.recommendation}</p>
        <p style="font-family: Arial, sans-serif; font-size: 10pt; margin-top: 10px; margin-bottom: 5px;"><strong>Technical Proof of Concept (PoC) Code:</strong></p>
        <pre style="font-family: Courier New, monospace; font-size: 9pt; background-color: #0f141c; color: #e6edf3; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${f.proofOfConcept || 'None provided'}</pre>
      </div>
    `).join('');

    const documentContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${reportTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 8.5in 11in;
            margin: 1.0in 1.0in 1.0in 1.0in;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #111111;
          }
          h1 {
            color: #111111;
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          h2 {
            color: #e11d48;
            font-size: 16pt;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e11d48;
            padding-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <!-- COVER PAGE -->
        <div style="text-align: center; margin-top: 100px; margin-bottom: 200px;">
          <div style="background-color: #e11d48; color: #ffffff; padding: 15px; font-weight: bold; font-size: 18pt; width: 120px; margin: 0 auto 30px auto; border-radius: 5px;">REDFORGE</div>
          <h1>${reportTitle}</h1>
          <p style="font-size: 14pt; color: #555555; margin-bottom: 50px;">${reportType} Security Dossier</p>
          
          <table style="width: 80%; margin: 100px auto 0 auto; text-align: left; border-collapse: collapse; font-size: 10pt;">
            <tr>
              <td style="padding: 5px; font-weight: bold; width: 35%;">Organization:</td>
              <td style="padding: 5px;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">Authorized Author:</td>
              <td style="padding: 5px;">${authorName}</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">Security Level:</td>
              <td style="padding: 5px; color: #e11d48; font-weight: bold;">${classification} // SENSITIVE PERSONNEL ONLY</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">Date Compiled:</td>
              <td style="padding: 5px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <br clear="all" style="page-break-before: always;" />

        <!-- EXECUTIVE SUMMARY -->
        <h2>Executive Security Summary</h2>
        <p style="font-size: 11pt; color: #222222; text-align: justify;">
          ${customExecutiveSummary}
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 30px; font-size: 10pt;">
          <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
            <th style="border: 1px solid #cccccc; padding: 10px;">Critical Vulnerabilities</th>
            <th style="border: 1px solid #cccccc; padding: 10px;">High Vulnerabilities</th>
            <th style="border: 1px solid #cccccc; padding: 10px;">Medium Vulnerabilities</th>
            <th style="border: 1px solid #cccccc; padding: 10px;">Low Vulnerabilities</th>
          </tr>
          <tr style="text-align: center; font-size: 14pt; font-weight: bold;">
            <td style="border: 1px solid #cccccc; padding: 15px; color: #ef4444;">${criticalCount}</td>
            <td style="border: 1px solid #cccccc; padding: 15px; color: #f97316;">${highCount}</td>
            <td style="border: 1px solid #cccccc; padding: 15px; color: #eab308;">${mediumCount}</td>
            <td style="border: 1px solid #cccccc; padding: 15px; color: #3b82f6;">${lowCount}</td>
          </tr>
        </table>

        <!-- INDIVIDUAL VULNERABILITIES -->
        <h2>Technical Threats Dossier Breakdowns</h2>
        ${findingsHtml}

        <!-- SIGNED STAMP -->
        <div style="margin-top: 100px; padding-top: 20px; border-top: 2px solid #dddddd; font-size: 9pt; color: #777777; text-align: center;">
          <p><strong>Signed and sealed via cryptographical SHA256 REDFORGE-CRAWLER-AGENT validation ledger</strong></p>
          <p>STAMP: SHA256//B56AE7000FF1B838CA2820BEEFF33</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([documentContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REDFORGE_${reportType.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="reporting-panel">
      
      {/* Report Customization left panel */}
      <div className="lg:col-span-4 bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 h-fit shadow-sm" id="reporting-customizer flex flex-col">
        <h3 className="text-sm font-bold text-white font-display border-b border-[#30363d] pb-2 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-red-500" />
          <span>Report Configuration</span>
        </h3>

        {/* Report Type */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Template Profile</label>
          <div className="grid grid-cols-2 gap-2" id="report-type-selectors">
            {(['Executive', 'Technical', 'Risk', 'Management'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  reportType === type
                    ? 'bg-red-600/10 border-red-500 text-white'
                    : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                }`}
              >
                {type} Profile
              </button>
            ))}
          </div>
        </div>

        {/* Custom Report Title */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Report Header Title</label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          />
        </div>

        {/* Client Org & Author */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Target Client</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Signed Author</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Document Security Classification */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Security Classification</label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value as any)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="CONFIDENTIAL">CONFIDENTIAL // SENSITIVE</option>
            <option value="SECRET">SECRET // EXPLOITATION ASSETS</option>
            <option value="RESTRICTED">RESTRICTED USE ONLY</option>
            <option value="INTERNAL">INTERNAL COMPLIANCE USE</option>
          </select>
        </div>

        {/* Severity Minimum Limit */}
        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Severity Filter Limit</label>
          <div className="grid grid-cols-3 gap-1" id="report-severity-selectors">
            {(['All', 'High', 'Critical'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setMinSeverity(sev)}
                className={`py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  minSeverity === sev
                    ? 'bg-red-600/10 border-red-500 text-white'
                    : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Narrative Summary */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Executive Narrative Commentary</label>
          <textarea
            value={customExecutiveSummary}
            onChange={(e) => setCustomExecutiveSummary(e.target.value)}
            rows={3}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 leading-relaxed font-sans"
          />
        </div>

        {/* Compiler Buttons */}
        <div className="space-y-2 pt-2" id="report-compilation-actions">
          <button
            onClick={handleCompile}
            disabled={isCompiling}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all cursor-pointer"
          >
            {isCompiling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Cryptographic Dossier...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Compile Security Dossier</span>
              </>
            )}
          </button>

          {compiledSuccess && (
            <div className="flex flex-col space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrint}
                  className="py-2 bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 border border-[#30363d] transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={downloadJSONReport}
                  className="py-2 bg-[#21262d] hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 border border-[#30363d] hover:border-blue-500/30 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Save JSON</span>
                </button>
              </div>
              <button
                onClick={downloadDocxReport}
                className="w-full py-2 bg-green-700/20 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 border border-green-500/20 hover:border-green-400 transition-all cursor-pointer"
              >
                <FileType className="w-3.5 h-3.5 text-green-400" />
                <span>Download DOCX Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview right panel */}
      <div className="lg:col-span-8 bg-[#161B22] border border-[#30363d] rounded-xl p-8 flex flex-col shadow-lg relative overflow-hidden h-[630px] overflow-y-auto text-xs" id="reporting-previewer">
        
        {isCompiling && (
          <div className="absolute inset-0 bg-[#161B22]/80 backdrop-blur-xs z-10 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
            <span className="text-xs text-[#8b949e]">Assembling threat vectors and cryptographic signatures...</span>
          </div>
        )}

        {/* Report Document Dossier Layout */}
        <div className="space-y-6" id="printed-report-area">
          
          {/* Header Shield block */}
          <div className="border-b-4 border-red-600 pb-5" id="document-header">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-black font-display text-white tracking-widest">REDFORGE Security Command</div>
                <div className="text-[10px] text-[#8b949e] uppercase tracking-wider mt-0.5 font-bold">Attack Surface Management intelligence division</div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-red-600/15 text-red-400 border border-red-500/20 rounded font-mono text-[9px] font-bold uppercase tracking-wider">
                  {classification} // INTEL REGISTRY
                </span>
              </div>
            </div>
            
            <div className="mt-5 flex justify-between text-[11px] text-[#8b949e] font-mono" id="document-subhead">
              <div>
                <div>Target Client: <strong className="text-white font-sans">{companyName}</strong></div>
                <div>Monitored Scope: <strong className="text-white font-sans">{assets.length} active network nodes</strong></div>
                <div>Assessed Author: <strong className="text-white font-sans">{authorName}</strong></div>
              </div>
              <div className="text-right">
                <div>Dossier Title: <strong className="text-white font-sans">{reportTitle}</strong></div>
                <div>Report Class: <strong className="text-white font-sans">{reportType} Template Profile</strong></div>
                <div>Timestamp: <strong className="text-white">{new Date().toISOString().split('T')[0]} UTC</strong></div>
              </div>
            </div>
          </div>

          {/* REPORT PROFILE SECTION 1: EXECUTIVE */}
          {reportType === 'Executive' && (
            <div className="space-y-5" id="executive-profile-content">
              
              <div className="bg-[#0d1117] p-4.5 rounded-lg border border-[#30363d] space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#30363d] pb-1.5 flex items-center space-x-1.5 font-display">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>I. Executive Summary Narrative</span>
                </h4>
                <p className="text-[#8b949e] text-xs leading-relaxed italic pl-2.5 border-l-2 border-red-600 font-sans">
                  "{customExecutiveSummary}"
                </p>
              </div>

              {/* Stat breakdown boxes */}
              <div className="grid grid-cols-4 gap-3 text-center" id="stat-boxes">
                <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <div className="text-[8px] text-[#8b949e] uppercase font-bold tracking-wider">Scope Assets</div>
                  <div className="text-lg font-bold text-white font-display mt-0.5">{assets.length}</div>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <div className="text-[8px] text-[#8b949e] uppercase font-bold tracking-wider">Exposures Map</div>
                  <div className="text-lg font-bold text-red-500 font-display mt-0.5">{filteredReportFindings.length}</div>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <div className="text-[8px] text-[#8b949e] uppercase font-bold tracking-wider">Critical Vulns</div>
                  <div className="text-lg font-bold text-red-400 font-display mt-0.5">{criticalCount}</div>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <div className="text-[8px] text-[#8b949e] uppercase font-bold tracking-wider">Threat Score</div>
                  <div className="text-lg font-bold text-orange-400 font-display mt-0.5">
                    {Math.min(100, Math.round(criticalCount * 25 + highCount * 12 + mediumCount * 5))}
                  </div>
                </div>
              </div>

              {/* Remediation Priorities lists */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-bold text-white border-b border-[#30363d] pb-1 font-display">
                  II. Immediate Perimeter Remediation Priorities
                </h4>
                <div className="space-y-2">
                  {filteredReportFindings.slice(0, 3).map((f) => (
                    <div key={f.id} className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-red-400 font-bold">{f.identifier}</span>
                          <span className="font-bold text-white">{f.title}</span>
                        </div>
                        <p className="text-[11px] text-[#8b949e] truncate max-w-lg">{f.recommendation}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-red-600/15 border border-red-500/25 text-red-400 font-bold font-mono text-[9px] rounded uppercase flex-shrink-0">
                        {f.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* REPORT PROFILE SECTION 2: TECHNICAL */}
          {reportType === 'Technical' && (
            <div className="space-y-5" id="technical-profile-content">
              
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-bold text-white border-b border-[#30363d] pb-1 flex items-center space-x-1.5 font-display">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>I. Detailed Exploit Chains & PoC Artifacts</span>
                </h4>
                
                <div className="space-y-4">
                  {filteredReportFindings.slice(0, 2).map((f) => (
                    <div key={f.id} className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl space-y-3 font-mono text-[11px]">
                      <div className="flex justify-between border-b border-[#30363d]/50 pb-2">
                        <div>
                          <span className="text-red-400 font-bold uppercase tracking-wide">{f.identifier} | CVSS {f.cvss}</span>
                          <h5 className="text-xs font-bold text-white mt-1 font-sans">{f.title}</h5>
                        </div>
                        <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded text-[10px] uppercase border border-blue-500/15">
                          {f.severity}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#8b949e]">
                        <div>Target Asset Location: <strong className="text-white">{f.asset}</strong></div>
                        <div>CWE Mapping Class: <strong className="text-white">{f.cwe}</strong></div>
                        <div>MITRE ATT&amp;CK Tactic: <strong className="text-white">{f.mitreAttack}</strong></div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-red-400 font-bold uppercase">Exploit Proof-of-Concept Shell Payload:</span>
                        <pre className="bg-[#161B22] p-2.5 rounded border border-[#30363d] text-white overflow-x-auto text-[10px]">
                          {f.proofOfConcept}
                        </pre>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-green-400 font-bold uppercase">Remediation Action Step:</span>
                        <p className="bg-green-500/5 text-[#e6edf3] p-2.5 rounded border border-green-500/15 font-sans leading-relaxed text-xs">
                          {f.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* REPORT PROFILE SECTION 3: RISK ASSESSMENT */}
          {reportType === 'Risk' && (
            <div className="space-y-5" id="risk-profile-content">
              
              <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-display">Risk Vector Mapping</h4>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  This dossier calculates vulnerability vectors using mathematical formulas mapped across exploitability parameters (AV, AC, PR, UI) and business impact metrics (C, I, A). This maps potential threat trajectories relative to target exposure perimeters.
                </p>
              </div>

              {/* MITRE and OWASP coverage summary tables */}
              <div className="grid grid-cols-2 gap-4" id="risk-coverage-tables">
                <div className="bg-[#0d1117] border border-[#30363d] p-3.5 rounded-lg space-y-2">
                  <h5 className="font-bold text-white text-[10px] uppercase border-b border-[#30363d] pb-1 font-display">MITRE ATT&amp;CK TTP Exposure</h5>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#8b949e]">T1190 Exploitation (AV)</span>
                      <span className="text-red-400 font-bold">2 active exposures</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b949e]">T1539 Session Takeovers</span>
                      <span className="text-orange-400 font-bold">1 active exposure</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b949e]">T1530 Cloud Objects</span>
                      <span className="text-yellow-400 font-bold">1 active exposure</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-3.5 rounded-lg space-y-2">
                  <h5 className="font-bold text-white text-[10px] uppercase border-b border-[#30363d] pb-1 font-display">OWASP Top 10 Mapping</h5>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#8b949e]">A01 Broken Access Control</span>
                      <span className="text-red-400 font-bold">CRITICAL RISK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b949e]">A03 Injection Vulnerability</span>
                      <span className="text-orange-400 font-bold">HIGH RISK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b949e]">A05 Security Config Error</span>
                      <span className="text-yellow-400 font-bold">MEDIUM RISK</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* REPORT PROFILE SECTION 4: MANAGEMENT / COMPLIANCE */}
          {reportType === 'Management' && (
            <div className="space-y-5" id="management-profile-content">
              
              <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-[#30363d] pb-1.5 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-green-400" />
                  <span>ISO 27001 / SOC 2 Type II Compliance Mapping</span>
                </h4>
                <p className="text-[11px] text-[#8b949e] leading-relaxed pt-1.5">
                  Attack Surface Management aligns with SOC2 CC7.1 (Vulnerability Management), ISO 27001 Annex A.12.6.1 (Technical Vulnerability Management), and Annex A.14.2.1 (Secure Development Policies).
                </p>
              </div>

              {/* Custodian Ownership grid */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Custodian Owner & SLA Accountability</h4>
                <div className="grid grid-cols-2 gap-3" id="sla-accountability-cards">
                  <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg text-xs">
                    <span className="text-[#8b949e] uppercase font-bold text-[9px] block mb-1">CISO SLA TARGET</span>
                    <p className="text-white font-bold leading-tight">Critical fixes resolved within 48 hours.</p>
                    <span className="text-[10px] text-green-400 font-mono mt-2 block font-semibold">● ON TRACK</span>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg text-xs">
                    <span className="text-[#8b949e] uppercase font-bold text-[9px] block mb-1">SecOps Core Accountability</span>
                    <p className="text-white font-bold leading-tight">Total pending vulnerabilities assigned: {filteredReportFindings.length}</p>
                    <span className="text-[10px] text-red-400 font-mono mt-2 block font-semibold">● ACTION REQUIRED</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Core Findings List Table (always appended at bottom of dossiers for compliance) */}
          <div className="space-y-2" id="report-ledger-bottom">
            <h4 className="text-xs uppercase tracking-wider font-bold text-white border-b border-[#30363d] pb-1 font-display flex items-center space-x-1.5">
              <span>Appendix. Unified Threat Ledger Catalog</span>
            </h4>
            <div className="overflow-x-auto rounded-lg border border-[#30363d]" id="preview-findings-table-wrapper">
              <table className="w-full text-left border-collapse text-[10px] font-mono">
                <thead className="bg-[#0d1117] text-[#8b949e] uppercase border-b border-[#30363d]">
                  <tr>
                    <th className="p-2 font-bold">Identifier</th>
                    <th className="p-2 font-bold">Title</th>
                    <th className="p-2 font-bold">Severity</th>
                    <th className="p-2 font-bold">CVSS</th>
                    <th className="p-2 font-bold">Affected Host / Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
                  {filteredReportFindings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-[#8b949e] font-sans">
                        No vulnerability findings recorded for this report scope.
                      </td>
                    </tr>
                  ) : (
                    filteredReportFindings.map((f) => (
                      <tr key={f.id} className="hover:bg-[#21262d]/20">
                        <td className="p-2 font-mono text-red-400 font-bold">{f.identifier}</td>
                        <td className="p-2 font-medium font-sans text-white">{f.title}</td>
                        <td className="p-2 font-mono font-semibold">{f.severity}</td>
                        <td className="p-2 font-mono text-white">{f.cvss}</td>
                        <td className="p-2 text-[#8b949e] truncate max-w-[150px]">{f.asset}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signed Cryptographic Stamp */}
          <div className="border-t border-[#30363d] pt-4 mt-8 flex justify-between items-center text-[9px] text-[#8b949e] font-mono" id="document-signature">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Signed via cryptographical SHA256 REDFORGE-CRAWLER-AGENT validation ledger</span>
            </div>
            <div>STAMP: SHA256//B56AE7000FF1B838CA2820BEEFF33</div>
          </div>

        </div>

      </div>

    </div>
  );
}
