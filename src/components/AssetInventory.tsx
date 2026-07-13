import React, { useState } from 'react';
import { Asset, AssetType, CriticalityLevel, EnvironmentType } from '../types';
import { 
  Search, Plus, Filter, Globe, Server, Cloud, Cpu, FileText, CheckCircle, 
  HelpCircle, Trash2, Download, Upload, Clipboard, Terminal, Shield, Users, Layers
} from 'lucide-react';

interface AssetInventoryProps {
  assets: Asset[];
  onAddAsset: (asset: Omit<Asset, 'id' | 'lastScanned'>) => void;
  onBulkAddAssets: (assets: Omit<Asset, 'id' | 'lastScanned'>[]) => void;
  onBulkDeleteAssets: (ids: string[]) => void;
}

export default function AssetInventory({ 
  assets, 
  onAddAsset,
  onBulkAddAssets,
  onBulkDeleteAssets
}: AssetInventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('All');
  const [selectedEnv, setSelectedEnv] = useState<string>('All');
  const [selectedOwner, setSelectedOwner] = useState<string>('All');
  
  // Modals & check state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Form states for single asset
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AssetType>('Domain');
  const [newAddress, setNewAddress] = useState('');
  const [newCriticality, setNewCriticality] = useState<CriticalityLevel>('Medium');
  const [newEnvironment, setNewEnvironment] = useState<EnvironmentType>('Production');
  const [newOwner, setNewOwner] = useState('SecOps Core');
  const [newTech, setNewTech] = useState('Nginx');
  const [newOS, setNewOS] = useState('Ubuntu Linux');
  const [newTagsString, setNewTagsString] = useState('');

  // Extract unique owners for filter dropdown
  const uniqueOwners = Array.from(new Set(assets.map(a => a.owner).filter(Boolean))) as string[];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAddress) return;

    const tags = newTagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    onAddAsset({
      name: newName,
      type: newType,
      address: newAddress,
      criticality: newCriticality,
      environment: newEnvironment,
      tags: tags.length > 0 ? tags : ['manual-entry'],
      status: 'Active',
      owner: newOwner,
      technology: newTech,
      operatingSystem: newOS
    });

    // Reset Form
    setNewName('');
    setNewType('Domain');
    setNewAddress('');
    setNewCriticality('Medium');
    setNewEnvironment('Production');
    setNewOwner('SecOps Core');
    setNewTech('Nginx');
    setNewOS('Ubuntu Linux');
    setNewTagsString('');
    setShowAddModal(false);
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) return;

    // Parse simple CSV text: Name,Type,Address,Criticality,Environment,Owner,Tech,OS,Tags
    const lines = bulkCsvText.split('\n');
    const imported: Omit<Asset, 'id' | 'lastScanned'>[] = [];

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const [name, type, address, criticality, environment, owner, tech, os, tagsStr] = parts;
        imported.push({
          name: name || 'Discovered Endpoint',
          type: (type as AssetType) || 'Domain',
          address: address || '127.0.0.1',
          criticality: (criticality as CriticalityLevel) || 'Medium',
          environment: (environment as EnvironmentType) || 'Production',
          owner: owner || 'SecOps Core',
          technology: tech || 'Unknown Apache',
          operatingSystem: os || 'Linux',
          tags: tagsStr ? tagsStr.split(';').map(t => t.trim()) : ['bulk-imported'],
          status: 'Active'
        });
      }
    });

    if (imported.length > 0) {
      onBulkAddAssets(imported);
    }
    setBulkCsvText('');
    setShowBulkImportModal(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedAssetIds.length === 0) return;
    if (confirm(`Are you sure you want to bulk-delete ${selectedAssetIds.length} assets?`)) {
      onBulkDeleteAssets(selectedAssetIds);
      setSelectedAssetIds([]);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Name,Type,Address,Criticality,Environment,Owner,Technology,OS,Tags,LastScanned\n";
    
    filteredAssets.forEach(a => {
      const row = [
        a.id,
        `"${a.name.replace(/"/g, '""')}"`,
        a.type,
        a.address,
        a.criticality,
        a.environment,
        a.owner || 'N/A',
        a.technology || 'N/A',
        a.operatingSystem || 'N/A',
        a.tags.join(';'),
        a.lastScanned
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `redforge_assets_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel simulation Export
  const handleExportExcel = () => {
    let excelContent = "data:application/vnd.ms-excel;charset=utf-8,";
    excelContent += "REDFORGE Attack Surface Ledger Export\n";
    excelContent += `Export Timestamp: ${new Date().toISOString()}\n\n`;
    excelContent += "ID\tName\tType\tAddress\tCriticality\tEnvironment\tOwner\tTechnology\tOS\tTags\tLast Scanned\n";
    
    filteredAssets.forEach(a => {
      const row = [
        a.id,
        a.name,
        a.type,
        a.address,
        a.criticality,
        a.environment,
        a.owner || 'N/A',
        a.technology || 'N/A',
        a.operatingSystem || 'N/A',
        a.tags.join(';'),
        a.lastScanned
      ].join("\t");
      excelContent += row + "\n";
    });

    const encodedUri = encodeURI(excelContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `redforge_assets_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Assets list
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.owner || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.technology || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || asset.type === selectedType;
    const matchesCriticality = selectedCriticality === 'All' || asset.criticality === selectedCriticality;
    const matchesEnv = selectedEnv === 'All' || asset.environment === selectedEnv;
    const matchesOwner = selectedOwner === 'All' || asset.owner === selectedOwner;

    return matchesSearch && matchesType && matchesCriticality && matchesEnv && matchesOwner;
  });

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'Domain':
      case 'Subdomain':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'IP':
      case 'CIDR':
        return <Server className="w-4 h-4 text-purple-400" />;
      case 'URL':
      case 'API Endpoint':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'Cloud':
        return <Cloud className="w-4 h-4 text-yellow-400" />;
      case 'Server':
        return <Cpu className="w-4 h-4 text-green-400" />;
      case 'Application':
        return <Layers className="w-4 h-4 text-red-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCriticalityBadge = (criticality: CriticalityLevel) => {
    switch (criticality) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 font-mono">CRITICAL</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">HIGH</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono">MEDIUM</span>;
      case 'Low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">LOW</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="assets-panel">
      
      {/* Search and Action header */}
      <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-5 space-y-4" id="assets-controls">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Global Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#8b949e]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by label, CIDR/IP, technologies, owner tags..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 transition-all placeholder-[#8b949e]"
            />
          </div>

          {/* Action trigger group */}
          <div className="flex flex-wrap items-center gap-2.5" id="assets-actions-row">
            {selectedAssetIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 px-3 border border-red-500/20 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedAssetIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowBulkImportModal(true)}
              className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-green-400" />
              <span>Bulk Import</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-1.5 text-xs transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer font-display"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Map Digital Asset</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filters panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#30363d] pt-4" id="assets-filters">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Asset Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Domain">Domains</option>
              <option value="Subdomain">Subdomains</option>
              <option value="IP">IP Addresses</option>
              <option value="CIDR">CIDR Ranges</option>
              <option value="URL">URLs</option>
              <option value="API Endpoint">API Endpoints</option>
              <option value="Cloud">Cloud Storage</option>
              <option value="Server">Servers</option>
              <option value="Application">Applications</option>
              <option value="Repository">Repositories</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Criticality</label>
            <select
              value={selectedCriticality}
              onChange={(e) => setSelectedCriticality(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="All">All Criticalities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Environment</label>
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="All">All Environments</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Owner / Custodian</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="All">All Owners</option>
              <option value="SecOps Core">SecOps Core</option>
              {uniqueOwners.filter(o => o !== 'SecOps Core').map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Asset Ledger Table */}
      <div className="bg-[#161B22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm" id="assets-table-card">
        <div className="overflow-x-auto" id="assets-table-wrapper">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0d1117] text-[#8b949e] text-[10px] uppercase tracking-widest border-b border-[#30363d] font-mono">
              <tr>
                <th className="px-4 py-4 text-center w-12">
                  <input 
                    type="checkbox"
                    checked={selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded text-red-600 focus:ring-0 cursor-pointer" 
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Asset Info</th>
                <th className="px-6 py-4 font-semibold">Address / Endpoint</th>
                <th className="px-6 py-4 font-semibold">Criticality</th>
                <th className="px-6 py-4 font-semibold">Environment</th>
                <th className="px-6 py-4 font-semibold">Custodian Owner</th>
                <th className="px-6 py-4 font-semibold">Stack Fingerprint</th>
                <th className="px-6 py-4 font-semibold">Scan Date</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#30363d] text-[#e6edf3]" id="assets-table-body">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-[#8b949e] text-xs">
                    No registered assets matched your active query filter limits.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isChecked = selectedAssetIds.includes(asset.id);
                  return (
                    <tr 
                      key={asset.id} 
                      className={`hover:bg-[#21262d]/40 transition-colors ${isChecked ? 'bg-blue-600/5' : ''}`} 
                      id={`asset-row-${asset.id}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(asset.id)}
                          className="rounded text-red-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 bg-[#0d1117] border border-[#30363d] rounded-md flex-shrink-0">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div>
                            <div className="font-bold text-white leading-tight">{asset.name}</div>
                            <div className="text-[9px] text-[#8b949e] font-mono mt-0.5 uppercase tracking-wide">{asset.id} | {asset.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[#8b949e] break-all max-w-[200px]">
                        {asset.address}
                      </td>
                      <td className="px-6 py-4">
                        {getCriticalityBadge(asset.criticality)}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px]">
                        <span className="px-2 py-0.5 bg-[#21262d] text-[#e6edf3] rounded border border-[#30363d] font-semibold">
                          {asset.environment}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#8b949e] font-medium">
                        {asset.owner || 'SecOps Core'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          {asset.technology && (
                            <span className="block text-[10px] text-blue-400 font-mono font-semibold">{asset.technology}</span>
                          )}
                          {asset.operatingSystem && (
                            <span className="block text-[9px] text-[#8b949e] font-mono">{asset.operatingSystem}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#8b949e] font-mono text-[10px]">
                        {new Date(asset.lastScanned).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-[10px] font-bold font-mono tracking-wide">{asset.status}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4" id="add-asset-modal-wrapper">
          <div className="bg-[#161B22] border border-[#30363d] w-full max-w-md rounded-xl shadow-2xl p-6 relative text-xs text-[#e6edf3]" id="add-asset-modal">
            <h3 className="text-base font-bold text-white mb-3 font-display">Register Digital Perimeter Node</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. AWS Core DNS LoadBalancer"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Asset Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AssetType)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 cursor-pointer"
                  >
                    <option value="Domain">Domain</option>
                    <option value="Subdomain">Subdomain</option>
                    <option value="IP">IP Address</option>
                    <option value="CIDR">CIDR Range</option>
                    <option value="URL">URL</option>
                    <option value="API Endpoint">API Endpoint</option>
                    <option value="Cloud">Cloud Bucket</option>
                    <option value="Server">Server VM</option>
                    <option value="Application">Application</option>
                    <option value="Repository">Repository</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Criticality</label>
                  <select
                    value={newCriticality}
                    onChange={(e) => setNewCriticality(e.target.value as CriticalityLevel)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Network Host Address / URI</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 192.168.12.83 or *.reforge.io"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Environment</label>
                  <select
                    value={newEnvironment}
                    onChange={(e) => setNewEnvironment(e.target.value as EnvironmentType)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Custodian Owner</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Tech Stack</label>
                  <input
                    type="text"
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    placeholder="Nginx / Postgres"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Operating System</label>
                  <input
                    type="text"
                    value={newOS}
                    onChange={(e) => setNewOS(e.target.value)}
                    placeholder="Linux / Windows"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={newTagsString}
                  onChange={(e) => setNewTagsString(e.target.value)}
                  placeholder="kubernetes, internal, core-api"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-[#30363d] hover:bg-[#444c56] text-white rounded-lg font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all cursor-pointer"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4" id="bulk-import-modal-wrapper">
          <div className="bg-[#161B22] border border-[#30363d] w-full max-w-lg rounded-xl shadow-2xl p-6 relative text-xs text-[#e6edf3]" id="bulk-import-modal">
            <h3 className="text-base font-bold text-white mb-2 font-display">Bulk Perimeter Import (CSV)</h3>
            <p className="text-[11px] text-[#8b949e] mb-4">Paste comma-separated rows. Required columns: Name, Type, Address, Criticality, Environment, Owner, Technology, OS, Tags (separate tags with semicolon).</p>
            
            <form onSubmit={handleBulkImportSubmit} className="space-y-3">
              <textarea
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                placeholder="Database Primary IP,IP,10.240.1.9,Critical,Production,SecOps Core,Postgres 16,RHEL 9,database;primary;cluster&#10;Staging Router VM,Server,router.stage.reforge.io,High,Staging,DevOps Network,CISCO IOS,None,ci-cd;router"
                className="w-full h-44 bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono text-[10px] text-white focus:outline-none focus:border-red-500 placeholder-[#8b949e]"
              />

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  className="flex-1 py-2 bg-[#30363d] hover:bg-[#444c56] text-white rounded-lg font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all cursor-pointer"
                >
                  Import Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
