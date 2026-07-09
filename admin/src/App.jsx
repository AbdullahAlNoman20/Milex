import React, { useState, createContext, useContext } from 'react';
import { 
  Search, FileText, CheckCircle, Clock, Users, LogOut, 
  Plus, FileSpreadsheet, ShieldCheck, FileDigit, Building, 
  AlertCircle, Check, Trash2, XCircle, FileOutput, ArrowLeft, Printer,
  LayoutDashboard, Target, HelpCircle, Bell, Settings, User, UploadCloud, FileBox, ArrowRight, Mail, PenTool,
} from 'lucide-react';

const AppContext = createContext();

const ROLES = {
  KAM: 'KAM', SALES: 'SALES', LM: 'LM', OPS: 'OPS', CREDIT: 'CREDIT', ACCOUNTS: 'ACCOUNTS'
};

const USERS = [
  { id: 1, name: 'Imran Hossain (KAM)', role: ROLES.KAM, email: 'kam@milex.com', password: 'demo' },
  { id: 2, name: 'Saleh Uddin (SALES)', role: ROLES.SALES, email: 'sales@milex.com', password: 'demo' },
  { id: 3, name: 'SK Md Aliraz (Line Manager)', role: ROLES.LM, email: 'lm@milex.com', password: 'demo' },
  { id: 4, name: 'Operations Dept', role: ROLES.OPS, email: 'ops@milex.com', password: 'demo' },
  { id: 5, name: 'Credit Dept', role: ROLES.CREDIT, email: 'credit@milex.com', password: 'demo' },
  { id: 6, name: 'Accounts Dept', role: ROLES.ACCOUNTS, email: 'accounts@milex.com', password: 'demo' },
];

const STATUS = {
  PENDING_RATE: 'PENDING RATE PREPARATION',
  PENDING_APPROVAL: 'PENDING RATE APPROVAL',
  APPROVED_PENDING_OFFER: 'RATE APPROVED (GENERATE OFFER)',
  OFFER_DRAFTING: 'DRAFTING OFFER LETTER', 
  OFFER_REVIEW: 'OFFER SENT (AWAITING CLIENT FEEDBACK)',
  OFFER_REJECTED: 'OFFER REJECTED (REVISE RATE)',
  PENDING_AGREEMENT: 'OFFER ACCEPTED (GENERATE AGREEMENT)',
  AGREEMENT_DRAFTING: 'DRAFTING AGREEMENT', 
  AGREEMENT_REVIEW: 'AGREEMENT SENT (AWAITING SIGNATURE)',
  PENDING_PROFILE: 'AGREEMENT SIGNED (PENDING PROFILE)',
  ACTIVE: 'ACTIVE ACCOUNT'
};

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil", "Canada", 
  "China", "Denmark", "Egypt", "Finland", "France", "Germany", "Greece", "Hong Kong", "India", "Indonesia", "Italy", 
  "Japan", "Malaysia", "Mexico", "Netherlands", "New Zealand", "Norway", "Pakistan", "Philippines", "Poland", "Portugal", 
  "Qatar", "Russia", "Saudi Arabia", "Singapore", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", 
  "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"
];

// Signature Library Mock
const SIGNATURE_LIBRARY = {
  LM: "\n\n___________________________\nDavid (Line Manager)\n[DIGITAL SIGNATURE: AUTH-LM-7738]\nMilex Logistics Auth. Signatory",
  SALES: "\n\n___________________________\nSales Coordinator\n[DIGITAL SIGNATURE: AUTH-SC-9912]\nMilex Logistics"
};

const INITIAL_CUSTOMERS = [
  {
    id: 'MLX8903801',
    barcode: 'MLX8903801',
    accountName: "L'USINE FASHION LTD.",
    address: 'A-127-131, BSCIC Industrial Area, Fatullah, Narayanganj P.O. Box: 1400',
    mobile: '+8802997746185', phone: '9816127-9', fax: '9816126', email: 'info@fakirapparels.com',
    businessType: 'Garments',
    serviceRequired: 'IB', accountMode: 'EX', accountType: 'Credit',
    handledBy: 'Sarah Jenkins (Senior KAM)', creditLimitTk: '50000', creditPeriodDays: '30',
    areaName: 'GAZIPUR', zoneName: 'DHAKA NORTH',
    contacts: [
      { type: 'KEY CONTACT PERSON', name: 'Mr. Xyz (MD)', designation: 'MD', mobile: '+8802997746185', email: 'info@fakirapparels.com' },
      { type: 'FINANCIAL CONTACT', name: 'Mr. GPO (CFO)', designation: 'CFO', mobile: '+8802997746185', email: 'info@fakirapparels.com' }
    ],
    shippingDetails: [
      { shipmentType: ['Document'], rateFor: 'Import', country: 'CHINA', volume: '20', weight: '200', revenue: '1400', provider: 'DPEX' }
    ],
    recNote: 'NEED TO OFFER MX RATE.',
    status: STATUS.APPROVED_PENDING_OFFER, 
    rateRef: 'REF-MLX1707581',
    revision: 0,
    proposedRate: '32 USD/Kg + 10 USD Custom',
    approvedRate: '32 USD/Kg + 10 USD Custom',
    lmNote: 'Approved as proposed. Ensure fast delivery.',
    offerText: '',
    agreementText: '',
    rejectReason: '',
    accountProfileType: 'REGULAR',
    provisionalReason: '',
    provisionalExpiryDate: null,
    legalDocExpiryDate: '',
    history: [
      { date: 'Oct 24, 2026 - 09:41 AM', action: 'RATE APPROVED BY LM', status: 'completed' },
      { date: 'Oct 24, 2026 - 09:30 AM', action: 'RATE PREPARED BY SC', status: 'completed' },
      { date: 'Oct 24, 2026 - 09:00 AM', action: 'RECOMMENDATION CREATED', status: 'completed' }
    ],
    profileData: {}
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // Changed from USERS[1] to null
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [currentView, setCurrentView] = useState('list');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [printData, setPrintData] = useState(null);

  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };
  const generateBarcode = () => `MLX${Math.floor(100000 + Math.random() * 900000)}`;

  const login = (email, password) => {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) { setCurrentUser(user); setCurrentView('dashboard'); } 
    else { showToast('Invalid credentials'); }
  };

  const updateStatus = (id, newStatus, updates = {}, actionText, subText = '') => {
    const timeString = new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) + ' - ' + new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const newHistory = c.history.map(h => ({...h, status: 'completed'}));
        return {
          ...c, ...updates, status: newStatus,
          history: [{ date: timeString, action: actionText.toUpperCase(), subText, status: 'active' }, ...newHistory]
        };
      }
      return c;
    }));
    showToast(`Success: ${actionText}`);
    if (selectedCustomer && selectedCustomer.id === id) {
      setSelectedCustomer(prev => {
        const newHistory = prev.history.map(h => ({...h, status: 'completed'}));
        return {...prev, ...updates, status: newStatus, history: [{ date: timeString, action: actionText.toUpperCase(), subText, status: 'active' }, ...newHistory]};
      });
    }
  };

  if (!currentUser) return <LoginScreen onLogin={login} />;

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, customers, setCustomers, currentView, setCurrentView, selectedCustomer, setSelectedCustomer, showToast, generateBarcode, updateStatus, printData, setPrintData }}>
      {printData ? (
        <PrintTemplate data={printData} onClose={() => setPrintData(null)} />
      ) : (
        <div className="flex h-screen bg-[#F4F6F8] font-sans text-slate-800">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 relative">
              {toastMessage && (
                <div className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded shadow-lg z-50 flex items-center animate-in slide-in-from-top-2">
                  <CheckCircle size={18} className="mr-3" /> {toastMessage}
                </div>
              )}
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'new-rec' && <NewRecommendationWizard />}
              {currentView === 'list' && <TaskQueue />}
              {currentView === 'customers' && <CustomersList />}
              {currentView === 'detail' && <CustomerDetail />}
            </main>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 relative mb-4">
            <div className="absolute inset-0 bg-emerald-600 transform rotate-45 rounded-sm"></div>
            <div className="absolute inset-2 bg-white transform rotate-45 rounded-sm"></div>
            <div className="absolute inset-4 bg-emerald-600 transform rotate-45 rounded-sm"></div>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">MILEX</h1>
          <p className="text-emerald-600 text-xs font-bold tracking-widest mt-1">WITH YOU EVERY MILE</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, 'demo'); }} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">System Login Role</label>
            <select className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
              value={email} onChange={(e) => setEmail(e.target.value)} required>
              <option value="">Choose role...</option>
              {USERS.map(u => <option key={u.email} value={u.email}>{u.name} - {u.role}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg hover:bg-emerald-700 transition shadow-md">Login</button>
        </form>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { currentUser, setCurrentView, currentView } = useContext(AppContext);
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: Object.values(ROLES) },
    { id: 'new-rec', label: 'Recommendations', icon: <FileBox size={20} />, roles: [ROLES.KAM] },
    { id: 'list', label: 'Task Queue & Record', icon: <FileText size={20} />, roles: Object.values(ROLES) },
    { id: 'customers', label: 'Customers', icon: <Users size={20} />, roles: Object.values(ROLES) },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
      <div className="h-20 flex items-center px-6 border-b border-slate-100 mt-2">
        <div className="flex items-center">
          <div className="w-8 h-8 relative mr-3">
            <div className="absolute inset-0 bg-emerald-600 transform rotate-45 rounded-sm"></div>
            <div className="absolute inset-1 bg-white transform rotate-45 rounded-sm"></div>
            <div className="absolute inset-2 bg-emerald-600 transform rotate-45 rounded-sm"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase leading-none">MILEX</h1>
            <p className="text-emerald-600 text-[7px] font-bold tracking-widest mt-0.5 leading-none">WITH YOU EVERY MILE</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-6 space-y-1">
        {navItems.filter(i => i.roles.includes(currentUser.role)).map(item => {
          const isActive = currentView === item.id || (currentView === 'detail' && (item.id === 'list' || item.id === 'customers'));
          return (
            <button key={item.id} onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center px-6 py-3 transition text-left text-sm font-semibold
                ${isActive ? 'bg-emerald-50/50 text-emerald-700 border-l-4 border-emerald-600' : 'text-slate-500 hover:bg-slate-50 border-l-4 border-transparent'}`}>
              <span className={`mr-3 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{item.icon}</span> {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const TopBar = () => {
  const { customers, setCurrentView, setSelectedCustomer, showToast, currentUser, setCurrentUser } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    const found = customers.find(c => c.barcode.toLowerCase() === search.toLowerCase());
    if (found) { setSelectedCustomer(found); setCurrentView('detail'); setSearch(''); } 
    else { showToast('Not found'); }
  };

  const toggleMenu = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 relative">
      <div className="flex-1 max-w-xl">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Search size={16} /></span>
          <input type="text" placeholder="Search accounts, leads, or proposals..."
            className="w-full border border-slate-200 bg-slate-50 rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>
      <div className="flex items-center space-x-4 text-slate-500 relative">
        
        {/* Help Menu */}
        <div className="relative">
          <HelpCircle size={20} className="cursor-pointer hover:text-emerald-600 transition" onClick={() => toggleMenu('help')} />
          {activeMenu === 'help' && (
            <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">Support Documentation</p>
              <p className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">Contact IT Helpdesk</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <div className="relative cursor-pointer hover:text-emerald-600 transition" onClick={() => toggleMenu('notifications')}>
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </div>
          {activeMenu === 'notifications' && (
            <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 font-bold text-slate-800 text-sm">Notifications</div>
              <div className="px-4 py-6 text-center text-sm text-slate-500">No new notifications.</div>
            </div>
          )}
        </div>

        {/* Settings */}
        <Settings size={20} className="cursor-pointer hover:text-emerald-600 transition" onClick={() => showToast('Settings Panel Locked for Demo')} />

        {/* User Profile */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 ml-2 border border-emerald-200 cursor-pointer hover:ring-2 ring-emerald-500 transition" onClick={() => toggleMenu('profile')}>
             <span className="font-bold text-xs">{currentUser.name.charAt(0)}</span>
          </div>
          {activeMenu === 'profile' && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
              </div>
              <button onClick={() => setCurrentUser(null)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center mt-1">
                <LogOut size={16} className="mr-2"/> Logout System
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

const Dashboard = () => {
  const { currentUser, customers, setCurrentView, setSelectedCustomer } = useContext(AppContext);
  
  const pendingTasks = customers.filter(c => {
    if (c.status === STATUS.ACTIVE) return false;
    if (currentUser.role === ROLES.SALES) return [STATUS.PENDING_RATE, STATUS.APPROVED_PENDING_OFFER, STATUS.OFFER_DRAFTING, STATUS.OFFER_REJECTED, STATUS.PENDING_AGREEMENT, STATUS.AGREEMENT_DRAFTING].includes(c.status);
    if (currentUser.role === ROLES.LM) return c.status === STATUS.PENDING_APPROVAL;
    if (currentUser.role === ROLES.KAM) return [STATUS.OFFER_REVIEW, STATUS.AGREEMENT_REVIEW, STATUS.PENDING_PROFILE].includes(c.status);
    return false;
  });

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Key Account Performance & Activity</p>
        </div>
        {currentUser.role === ROLES.KAM && (
          <button onClick={() => setCurrentView('new-rec')} className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center shadow-sm hover:bg-emerald-800 transition">
            <Plus size={16} className="mr-2"/> Create New Recommendation
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><LayoutDashboard size={16}/></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Active Accounts</p>
          <p className="text-2xl font-bold text-slate-800">{customers.filter(c=>c.status === STATUS.ACTIVE).length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3"><FileText size={16}/></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Pipeline Accounts</p>
          <p className="text-2xl font-bold text-slate-800">{customers.filter(c=>c.status !== STATUS.ACTIVE).length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><ShieldCheck size={16}/></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Your Queue</p>
          <p className="text-2xl font-bold text-slate-800">{pendingTasks.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-800 to-slate-900 p-5 rounded-xl shadow-sm border border-emerald-900 text-white relative">
          <div className="w-8 h-8 rounded bg-white/10 text-white flex items-center justify-center mb-3"><Target size={16}/></div>
          <p className="text-xs text-emerald-100 font-medium mb-1">Conversion Rate</p>
          <p className="text-3xl font-bold">68<span className="text-lg font-normal">%</span></p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
          <h3 className="font-bold text-emerald-900 flex items-center text-sm"><Clock size={16} className="mr-2 text-emerald-600"/> Action Required Queue</h3>
          <button onClick={() => setCurrentView('list')} className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition">View All</button>
        </div>
        <div className="divide-y divide-slate-100 min-h-[200px] flex flex-col justify-center">
          {pendingTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">No tasks pending for your role</div>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{task.accountName}</p>
                  <div className="flex items-center mt-1 space-x-3">
                    <span className="font-mono text-xs text-slate-500 border rounded px-1.5">{task.barcode}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${task.status.includes('REJECTED') ? 'text-red-700 bg-red-50 border border-red-200' : 'text-amber-600 bg-amber-50 border border-amber-200'}`}>{task.status}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedCustomer(task); setCurrentView('detail'); }} className="text-emerald-600 font-semibold text-sm hover:underline border px-4 py-1.5 rounded border-emerald-200 hover:bg-emerald-50 transition">Process Task</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const TaskQueue = () => {
  const { customers, setCurrentView, setSelectedCustomer } = useContext(AppContext);
  // Show ONLY non-active customers here
  const pendingCustomers = customers.filter(c => c.status !== STATUS.ACTIVE);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Task Queue & In-Progress Workflows</h2>
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">CURRENT WORKFLOW STATUS</th>
              <th className="p-4">ASSIGNED KAM</th>
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {pendingCustomers.length === 0 ? (
               <tr><td colSpan="5" className="p-8 text-center text-slate-400">No active tasks.</td></tr>
            ) : pendingCustomers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                <td className="p-4 font-bold text-slate-800">{c.accountName}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded border ${c.status.includes('REJECTED') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{c.status}</span>
                </td>
                <td className="p-4 text-xs font-medium text-slate-500">{c.handledBy}</td>
                <td className="p-4 pr-6 text-right">
                  <button onClick={() => { setSelectedCustomer(c); setCurrentView('detail'); }} className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs border border-emerald-200 px-3 py-1.5 rounded hover:bg-emerald-50 transition">Open Record</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CustomersList = () => {
  const { customers, setCurrentView, setSelectedCustomer } = useContext(AppContext);
  // Show ONLY active customers here
  const activeCustomers = customers.filter(c => c.status === STATUS.ACTIVE);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Fully Onboarded Customers</h2>
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">STATUS</th>
              <th className="p-4">PROFILE TYPE</th>
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {activeCustomers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                <td className="p-4 font-bold text-slate-800">{c.accountName}</td>
                <td className="p-4"><span className="px-2.5 py-1 text-[9px] font-bold uppercase rounded border bg-emerald-50 text-emerald-700 border-emerald-200">{c.status}</span></td>
                <td className="p-4 text-xs font-bold text-slate-500"><span className={`px-2 py-0.5 rounded ${c.accountProfileType === 'PROVISIONAL' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{c.accountProfileType || 'REGULAR'}</span></td>
                <td className="p-4 pr-6 text-right"><button onClick={() => { setSelectedCustomer(c); setCurrentView('detail'); }} className="text-slate-600 hover:text-slate-800 font-semibold text-xs border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition">View Master Profile</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const NewRecommendationWizard = () => {
  const { generateBarcode, setCustomers, setCurrentView, showToast, currentUser } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const newId = React.useMemo(() => generateBarcode(), []);

  const [form, setForm] = useState({
    accountName: '', address: '', areaName: '', zoneName: '', mobile: '', email: '', phone: '', fax: '', businessType: '',
    serviceRequired: 'Select Inbound/Outbound', accountMode: 'Select Tier', accountType: 'Select Payment Term', handledBy: currentUser.name,
    creditLimitTk: '', creditPeriodDays: '', recNote: ''
  });

  const [contacts, setContacts] = useState({
    senior: { name: '', designation: '', mobile: '', email: '' },
    key: { name: '', designation: '', mobile: '', email: '' },
    financial: { name: '', designation: '', mobile: '', email: '' }
  });
  const [sameAsKey, setSameAsKey] = useState(false);
  const [shipping, setShipping] = useState([{ shipmentType: [], rateFor: 'Select Import or Export', country: 'Select country', volume: '', weight: '', revenue: '', provider: '' }]);

  const handleNext = () => {
    // Strict Validation mapped to the red asterisks in the UI screenshots
    if (step === 1) {
      if (!form.accountName || !form.address || !form.mobile || !form.email) return showToast('Please fill all mandatory (*) fields in Basic Info');
    }
    if (step === 2) {
      if (form.accountType === 'Select Payment Term') return showToast('Please select Account Type');
      if (form.accountType === 'CREDIT CUSTOMER' && (!form.creditLimitTk || !form.creditPeriodDays)) return showToast('Credit Limit and Period are required for Credit accounts');
    }
    if (step === 3) {
      if (!contacts.senior.name || !contacts.senior.mobile || !contacts.key.name || !contacts.key.mobile) return showToast('Senior Management & Key Contact mandatory fields (*) required');
    }
    if (step === 4) {
       const inv = shipping.find(s => s.country === 'Select country' || s.rateFor === 'Select Import or Export');
       if (inv || shipping.length === 0) return showToast('Please complete all dropdowns in Shipping Details');
    }
    if (step === 5) {
       if(!form.recNote) return showToast('Recommendation Note is mandatory');
       handleSubmit();
       return;
    }
    setStep(s => s + 1);
  };

  const handleCheckbox = (index, type) => {
    setShipping(prev => prev.map((s, i) => {
      if (i === index) {
        const current = s.shipmentType || [];
        const newType = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
        return {...s, shipmentType: newType};
      }
      return s;
    }));
  };

  const handleSubmit = () => {
    const flatContacts = [
      { type: 'SENIOR MANAGEMENT', ...contacts.senior },
      { type: 'KEY CONTACT PERSON', ...contacts.key },
      { type: 'FINANCIAL CONTACT', ...(sameAsKey ? contacts.key : contacts.financial) }
    ];
    setCustomers(prev => [...prev, {
      id: newId, barcode: newId, ...form, contacts: flatContacts, shippingDetails: shipping, 
      status: STATUS.PENDING_RATE, revision: 0, accountProfileType: 'REGULAR', profileData: {}, 
      history: [{ date: new Date().toISOString(), action: 'RECOMMENDATION FORM CREATED BY KAM', status: 'completed' }]
    }]);
    showToast('Recommendation Form Submitted Successfully!');
    setCurrentView('list');
  };

  return (
    <div className="max-w-6xl mx-auto flex gap-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 space-y-6">
        
        {/* Main Wizard Form Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-8">New Recommendation Form</h2>
          
          {/* Progress Bar exactly matching reference */}
          <div className="flex justify-between items-center mb-10 px-4 relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 -z-10 transform -translate-y-1/2"></div>
            {[ {num: 1, title: 'Basic Info'}, {num: 2, title: 'Financial'}, {num: 3, title: 'Contact Info'}, {num: 4, title: 'Shipping Details'}, {num: 5, title: 'Notes'} ].map(s => (
              <div key={s.num} className="flex flex-col items-center bg-white px-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 border-2 
                  ${step === s.num ? 'border-emerald-600 text-emerald-600' : step > s.num ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 text-slate-400 bg-white'}`}>
                  {step > s.num ? <Check size={16}/> : s.num}
                </div>
                <span className={`text-[10px] font-bold ${step === s.num ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</span>
              </div>
            ))}
          </div>

          <div className="min-h-[400px]">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 1: Basic Information</h3>
                  <p className="text-xs text-slate-500 mb-6">Provide legally registered entity details.</p>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Account Name <span className="text-red-500">*</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Enter legally registered company name" value={form.accountName} onChange={e=>setForm({...form, accountName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Primary Address <span className="text-red-500">*</span></label><textarea className="w-full border border-slate-200 p-2.5 rounded text-sm h-20 focus:border-emerald-500 outline-none" placeholder="Street address, building, suite" value={form.address} onChange={e=>setForm({...form, address: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Area Name</label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Enter Area name" value={form.areaName} onChange={e=>setForm({...form, areaName: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Zone Name</label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Enter Zone name" value={form.zoneName} onChange={e=>setForm({...form, zoneName: e.target.value})} /></div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Contact & Communications</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="+1 (555) 000-0000" value={form.mobile} onChange={e=>setForm({...form, mobile: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label><input type="email" className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="dispatch@company.com" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-700 mb-1">Office Phone <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Ext. or Direct Line" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-700 mb-1">Fax Number <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Facsimile line" value={form.fax} onChange={e=>setForm({...form, fax: e.target.value})} /></div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Service & Logistics Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Business Type</label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g., E-Commerce, Retail, B2B" value={form.businessType} onChange={e=>setForm({...form, businessType: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Service Required</label><select className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white focus:border-emerald-500 outline-none" value={form.serviceRequired} onChange={e=>setForm({...form, serviceRequired: e.target.value})}><option>Select Inbound/Outbound</option><option>IB</option><option>OB</option><option>BOTH</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Account Mode</label><select className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white focus:border-emerald-500 outline-none" value={form.accountMode} onChange={e=>setForm({...form, accountMode: e.target.value})}><option>Select Tier</option><option>EX</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Handled By (KAM)</label>
                      <div className="w-full border border-blue-200 p-2.5 rounded text-sm bg-blue-50 text-slate-700 flex items-center font-medium"><User size={14} className="mr-2 text-blue-500"/> Auto-filled: {currentUser.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex items-start text-blue-900 mb-6">
                  <AlertCircle size={20} className="mr-3 text-blue-600 shrink-0 mt-0.5"/>
                  <div><p className="font-bold text-sm">Action Required</p><p className="text-xs text-blue-700 mt-1">These fields are required if Account Type = Credit. Ensure limits align with the master risk assessment policy before proceeding.</p></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 2: Financial Terms</h3>
                  <p className="text-xs text-slate-500 mb-6">Provide expected volume and routing information to calculate initial viability.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Type</label>
                    <select className="w-full border border-slate-200 p-3 rounded text-sm bg-white focus:border-emerald-500 outline-none" value={form.accountType} onChange={e=>setForm({...form, accountType: e.target.value})}>
                      <option>Select Payment Term</option><option>CREDIT CUSTOMER</option><option>CASH</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit {form.accountType === 'CREDIT CUSTOMER' && <span className="text-red-500">*</span>}</label>
                      <input type="number" className="w-full border border-slate-200 p-3 rounded text-sm focus:border-emerald-500 outline-none" value={form.creditLimitTk} onChange={e=>setForm({...form, creditLimitTk: e.target.value})} placeholder="0.00" />
                      <span className="absolute right-4 top-9 text-slate-400 text-xs font-bold">TK</span>
                      <p className="text-[10px] text-slate-400 mt-1">Maximum allowable outstanding balance.</p>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Credit Period {form.accountType === 'CREDIT CUSTOMER' && <span className="text-red-500">*</span>}</label>
                      <input type="number" className="w-full border border-slate-200 p-3 rounded text-sm focus:border-emerald-500 outline-none" value={form.creditPeriodDays} onChange={e=>setForm({...form, creditPeriodDays: e.target.value})} placeholder="0" />
                      <span className="absolute right-4 top-9 text-slate-400 text-xs font-bold">Days</span>
                      <p className="text-[10px] text-slate-400 mt-1">Standard settlement window.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 3: Contact Persons</h3>
                  <p className="text-xs text-slate-500 mb-6">Provide accurate contact routing for operations and finance.</p>
                </div>
                <div className="space-y-8">
                  {/* 1. Senior Management */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3">1. Senior Management</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Full Legal Name" value={contacts.senior.name} onChange={e=>setContacts({...contacts, senior: {...contacts.senior, name: e.target.value}})} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Designation <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g. General Manager" value={contacts.senior.designation} onChange={e=>setContacts({...contacts, senior: {...contacts.senior, designation: e.target.value}})} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Mobile <span className="text-red-500">*</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="+1 (555) 000-0000" value={contacts.senior.mobile} onChange={e=>setContacts({...contacts, senior: {...contacts.senior, mobile: e.target.value}})} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="contact@company.com" value={contacts.senior.email} onChange={e=>setContacts({...contacts, senior: {...contacts.senior, email: e.target.value}})} /></div>
                    </div>
                  </div>
                  
                  {/* 2. Key Contact */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3">2. Key Contact Person</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Full Legal Name" value={contacts.key.name} onChange={e=>setContacts({...contacts, key: {...contacts.key, name: e.target.value}})} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Designation <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g. Operations Manager" value={contacts.key.designation} onChange={e=>setContacts({...contacts, key: {...contacts.key, designation: e.target.value}})} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Mobile <span className="text-red-500">*</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="+1 (555) 000-0000" value={contacts.key.mobile} onChange={e=>setContacts({...contacts, key: {...contacts.key, mobile: e.target.value}})} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="contact@company.com" value={contacts.key.email} onChange={e=>setContacts({...contacts, key: {...contacts.key, email: e.target.value}})} /></div>
                    </div>
                  </div>

                  {/* 3. Financial Contact */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3">3. Financial Contact</h4>
                    <label className="flex items-center space-x-2 text-sm text-slate-700 mb-4 cursor-pointer font-bold"><input type="checkbox" checked={sameAsKey} onChange={(e)=>setSameAsKey(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"/><span>Same as Key Contact Person</span></label>
                    {!sameAsKey && (
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-700 mb-1">Name <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="Finance Lead Name" value={contacts.financial.name} onChange={e=>setContacts({...contacts, financial: {...contacts.financial, name: e.target.value}})} /></div>
                        <div><label className="block text-xs font-bold text-slate-700 mb-1">Designation <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g. CFO / Accounts Payable" value={contacts.financial.designation} onChange={e=>setContacts({...contacts, financial: {...contacts.financial, designation: e.target.value}})} /></div>
                        <div><label className="block text-xs font-bold text-slate-700 mb-1">Mobile <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="+1 (555) 000-0000" value={contacts.financial.mobile} onChange={e=>setContacts({...contacts, financial: {...contacts.financial, mobile: e.target.value}})} /></div>
                        <div><label className="block text-xs font-bold text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Optional)</span></label><input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="billing@company.com" value={contacts.financial.email} onChange={e=>setContacts({...contacts, financial: {...contacts.financial, email: e.target.value}})} /></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Shipping details exactly matching the specific screenshot UI */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 4: Shipping Details</h3>
                  <p className="text-xs text-slate-500 mb-6">Provide expected volume and routing information to calculate initial viability.</p>
                </div>
                {shipping.map((s, i) => (
                  <div key={i} className="bg-white border border-slate-100 shadow-sm p-6 rounded-xl relative mb-6">
                    {shipping.length > 1 && <button type="button" onClick={() => setShipping(shipping.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>}
                    <div className="grid grid-cols-2 gap-6">
                      
                      {/* Checkboxes matching the image */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-3">Shipment Type</label>
                        <div className="flex space-x-6">
                          {['Document', 'Non-Document', 'Others'].map(type => (
                            <label key={type} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={(s.shipmentType || []).includes(type)} onChange={() => handleCheckbox(i, type)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"/>
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Dropdown Import/Export/Both */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Rate For</label>
                        <select className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white outline-none focus:border-emerald-500" value={s.rateFor} onChange={e => { const n = [...shipping]; n[i].rateFor = e.target.value; setShipping(n); }}>
                          <option>Select Import or Export</option>
                          <option>Import</option>
                          <option>Export</option>
                          <option>Both</option>
                        </select>
                      </div>

                      {/* Country Searchable Dropdown (Simulated with datalist/select) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Primary Destination Country</label>
                        <select className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white outline-none focus:border-emerald-500" value={s.country} onChange={e => { const n = [...shipping]; n[i].country = e.target.value; setShipping(n); }}>
                           <option>Select country</option>
                           {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* Inputs with Icons */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Avg Monthly Volume (CBM/TEU)</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g. 150" value={s.volume} onChange={e => { const n = [...shipping]; n[i].volume = e.target.value; setShipping(n); }} />
                        <FileBox size={16} className="absolute right-3 top-8 text-slate-300" />
                      </div>

                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Avg Monthly Weight (KG)</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g. 5000" value={s.weight} onChange={e => { const n = [...shipping]; n[i].weight = e.target.value; setShipping(n); }} />
                        <FileText size={16} className="absolute right-3 top-8 text-slate-300" />
                      </div>

                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Expected Monthly Revenue (USD)</label>
                        <input className="w-full border border-slate-200 p-2.5 pl-7 rounded text-sm focus:border-emerald-500 outline-none" placeholder="10000" value={s.revenue} onChange={e => { const n = [...shipping]; n[i].revenue = e.target.value; setShipping(n); }} />
                        <span className="absolute left-3 top-8 text-slate-400 text-sm">$</span>
                      </div>

                      <div className="col-span-2 relative">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Current Service Provider</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none" placeholder="e.g. Maersk, DHL" value={s.provider} onChange={e => { const n = [...shipping]; n[i].provider = e.target.value; setShipping(n); }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setShipping([...shipping, {shipmentType: [], rateFor: 'Select Import or Export', country: 'Select country', volume: '', weight: '', revenue: '', provider: ''}])} className="text-sm font-bold text-emerald-700 flex items-center hover:text-emerald-800 transition"><Plus size={16} className="mr-1"/> Add Route</button>
              </div>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in">
                <div><h3 className="text-lg font-bold text-slate-800">Step 5: Recommendation Details</h3></div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recommendation Note <span className="text-red-500">*</span></label>
                  <textarea className="w-full border border-slate-200 p-4 rounded text-sm min-h-[150px] focus:border-emerald-500 outline-none" placeholder="Enter detailed justification for approval, highlighting key strengths from the risk assessment and any specific conditions for the credit limit..." value={form.recNote} onChange={e=>setForm({...form, recNote: e.target.value})}></textarea>
                  <p className="text-[10px] text-slate-400 mt-1">Provide a comprehensive summary for the Sales Coordinator. Minimum 50 words.</p>
                </div>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
            {step > 1 ? <button onClick={() => setStep(s=>s-1)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center"><ArrowLeft size={16} className="mr-2"/> Previous Step</button> : <div></div>}
            <div className="flex gap-3">
              <button className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Save Draft</button>
              {step < 5 ? (
                <button onClick={handleNext} className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition">Next Step <ArrowRight size={16} className="ml-2"/></button>
              ) : (
                <button onClick={handleNext} className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition">Submit to Sales Coordinator <ArrowRight size={16} className="ml-2"/></button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: System Registry */}
      <div className="w-80 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm sticky top-6">
           <div className="flex justify-between items-start mb-6">
             <h3 className="font-black text-slate-800 text-lg">System<br/>Registry</h3>
             <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100">Status: Draft</span>
           </div>
           
           <div className="space-y-6">
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CUSTOMER CODE</p>
               <p className="font-bold text-slate-800 text-sm">{newId}</p>
             </div>
             
             <div className="border-t border-b border-slate-100 py-6">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">SCANNABLE IDENTITY</p>
               <div className="border border-slate-200 p-3 rounded bg-white h-16 flex items-center justify-center overflow-hidden">
                 <div className="flex items-stretch h-full opacity-80 gap-[1px] w-full px-2">
                    {[...Array(40)].map((_,i) => <div key={i} className="bg-slate-800 h-full" style={{width: Math.random() > 0.5 ? '2px' : '4px'}}></div>)}
                 </div>
               </div>
             </div>

             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">CREATED BY</p>
               <p className="text-xs font-bold text-slate-700 flex items-center"><span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] mr-2">KU</span> KAM User</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">CREATED DATE</p>
               <p className="text-xs font-medium text-slate-600 flex items-center"><Clock size={14} className="mr-1.5 text-slate-400"/> {new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const CustomerDetail = () => {
  const { currentUser, selectedCustomer: c, updateStatus, setCurrentView, setPrintData, ZONES, BASE_RATES, showToast } = useContext(AppContext);
  
  const [rateRefInput, setRateRefInput] = useState(c.rateRef || `REF-${c.id}`);
  const [proposedRateInput, setProposedRateInput] = useState(c.proposedRate || '');
  const [lmApprovedRate, setLmApprovedRate] = useState(c.approvedRate || c.proposedRate || '');
  const [lmNoteInput, setLmNoteInput] = useState(c.lmNote || '');
  
  // Advanced Flow States
  const [offerTextEdit, setOfferTextEdit] = useState(c.offerText || `Based on your projected volumes, we are pleased to offer the following competitive rate:\n\n${c.approvedRate || c.proposedRate}\n\nNotes: ${c.lmNote || 'Standard Delivery'}\n\n${SIGNATURE_LIBRARY.LM}`);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [agreementTextEdit, setAgreementTextEdit] = useState(c.agreementText || `This agreement is made between MILEX and ${c.accountName}.\n\nThe customer agrees to the rates defined in Annexure ${c.rateRef} with a credit limit of BDT ${c.creditLimitTk}.\n\n${SIGNATURE_LIBRARY.SALES}`);

  const [profType, setProfType] = useState(c.accountProfileType || 'REGULAR');
  const [provReason, setProvReason] = useState(c.provisionalReason || '');
  const [legalExpiry, setLegalExpiry] = useState(c.legalDocExpiryDate || '');
  const [prof, setProf] = useState(c.profileData || {});
  const [docMeta, setDocMeta] = useState({});

  if (!c) return null;

  const isKAM = currentUser.role === ROLES.KAM;
  const isSales = currentUser.role === ROLES.SALES;
  const isLM = currentUser.role === ROLES.LM;
  const isReadOnlyDept = [ROLES.OPS, ROLES.CREDIT, ROLES.ACCOUNTS].includes(currentUser.role);

  // --- ACTIONS ---
  const handleAutoGenerateRate = () => setProposedRateInput(`CHINA (Zone 2): $3.50/Kg + $20 Base | FRANCE (Zone 4): $6.00/Kg + $25 Base`);
  const handleSalesUploadRate = () => updateStatus(c.id, STATUS.PENDING_APPROVAL, { rateRef: rateRefInput, proposedRate: proposedRateInput }, `RATE PREPARATION BY SC`, `Waiting for Line Manager Approval`);
  const handleLMApprove = () => updateStatus(c.id, STATUS.APPROVED_PENDING_OFFER, { approvedRate: lmApprovedRate, lmNote: lmNoteInput }, `RATE APPROVED BY LM`, `Waiting for SC Offer letter`);
  const handleLMRejectToSales = () => updateStatus(c.id, STATUS.PENDING_RATE, { revision: c.revision + 1 }, `RATE REJECTED BY LM`, `Revision R-${c.revision + 1} requested`);
  
  // Offer Workflow (Draft -> Finalize)
  const handleDraftOffer = () => updateStatus(c.id, STATUS.OFFER_DRAFTING, {}, 'DRAFTING OFFER LETTER', 'Sales editing generated letter');
  const handleFinalizeOffer = () => {
    updateStatus(c.id, STATUS.OFFER_REVIEW, { offerText: offerTextEdit }, 'OFFER LETTER SENT', `Emailed to ${c.email} & KAM`);
    showToast(`Finalized: Auto-Email Sent to ${c.email}`);
  };

  // Client Feedback Loop
  const handleKAMAcceptOffer = () => updateStatus(c.id, STATUS.PENDING_AGREEMENT, {}, `OFFER ACCEPTED BY CUSTOMER`, `Proceed to SLA generation`);
  const handleKAMRejectOffer = () => {
     if(!rejectReasonInput) return showToast('Please provide a reason for rejection');
     updateStatus(c.id, STATUS.OFFER_REJECTED, { rejectReason: rejectReasonInput, revision: c.revision + 1 }, `OFFER REJECTED BY CUSTOMER`, `KAM submitted reject reason.`);
  };
  const handleSalesRevisedOffer = () => updateStatus(c.id, STATUS.PENDING_APPROVAL, { proposedRate: proposedRateInput }, `REVISED RATE SUBMITTED TO LM`);

  // Agreement Workflow (Draft -> Finalize)
  const handleDraftAgreement = () => updateStatus(c.id, STATUS.AGREEMENT_DRAFTING, {}, 'DRAFTING AGREEMENT', 'Sales editing SLA clauses');
  const handleFinalizeAgreement = () => updateStatus(c.id, STATUS.AGREEMENT_REVIEW, { agreementText: agreementTextEdit }, 'AGREEMENT FINALIZED', `Awaiting physical/digital signature`);
  const handleKAMUploadAgreement = () => updateStatus(c.id, STATUS.PENDING_PROFILE, {}, `AGREEMENT SIGNED`, `Ready for Final Profile Setup`);

  const handleFinalProfileSubmit = () => {
    let updates = { profileData: prof, accountProfileType: profType, legalDocExpiryDate: legalExpiry };
    if (profType === 'PROVISIONAL') { updates.provisionalReason = provReason; updates.provisionalExpiryDate = new Date(Date.now() + 30 * 86400000).toISOString(); }
    updateStatus(c.id, STATUS.ACTIVE, updates, `ACCOUNT FULLY ONBOARDED`, `Profile Activated & Distributed`);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <button onClick={() => setCurrentView('list')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center mb-6 transition"><ArrowLeft size={14} className="mr-1.5"/> Back to List</button>

      {/* Top Banner */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-800 mb-2">{c.accountName}</h2>
          <div className="flex items-center space-x-3 mt-3">
            <span className="text-slate-500 font-mono text-[11px] font-bold flex items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200"><FileDigit size={14} className="mr-2"/> {c.barcode}</span>
            {c.rateRef && <span className="text-blue-600 font-mono text-[11px] font-bold flex items-center bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100"><FileSpreadsheet size={14} className="mr-2"/> {c.rateRef} {c.revision > 0 ? `(R-${c.revision})` : ''}</span>}
          </div>
        </div>
        <div>
          <div className={`px-5 py-3 rounded-lg font-bold text-sm uppercase tracking-wider border-2 ${
            c.status.includes('REJECTED') ? 'text-red-700 bg-red-50 border-red-200' :
            c.status.includes('ACTIVE') ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
            'text-amber-700 bg-[#FFFDF5] border-amber-200 shadow-sm'
          }`}>
            {c.status}
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left Column Data Blocks */}
        <div className="flex-1 space-y-6 min-w-0">
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-bold text-base text-slate-800 flex items-center"><Building size={18} className="mr-2 text-slate-400"/> Initial Account Info</h3>
              <button onClick={() => setPrintData({type: 'recommendation', customer: c})} className="text-emerald-600 text-xs font-bold flex items-center bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 hover:bg-emerald-100 transition"><Printer size={14} className="mr-1.5"/> Print Form</button>
            </div>
            <div className="grid grid-cols-2 gap-y-8 gap-x-8 text-sm mb-8">
              <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">ADDRESS</span> <span className="font-medium text-slate-700 leading-relaxed block pr-8">{c.address}</span></div>
              <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">BUSINESS TYPE</span> <span className="font-medium text-slate-700">{c.businessType}</span></div>
              <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">MOBILE / EMAIL</span> <span className="font-medium text-slate-700 block mb-0.5">{c.mobile}</span><span className="text-slate-500 text-xs">{c.email}</span></div>
              <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">REQ. LIMITS</span> <span className="font-medium text-slate-700">TK {c.creditLimitTk} ({c.creditPeriodDays} Days)</span></div>
            </div>

            {!isReadOnlyDept && (
              <>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">PRIMARY CONTACTS</span>
                <div className="bg-slate-50 rounded-xl border border-slate-200 text-xs divide-y divide-slate-200 mb-6">
                   {c.contacts.map((contact, i) => (
                     <div key={i} className="flex p-4 items-center hover:bg-white transition">
                       <span className="font-bold text-slate-800 w-1/3 text-xs">{contact.type}</span>
                       <span className="w-1/3 text-slate-600">{contact.name} {contact.designation && `(${contact.designation})`}</span>
                       <span className="w-1/3 text-right text-slate-400 font-medium">{contact.mobile} | {contact.email}</span>
                     </div>
                   ))}
                </div>
                <div className="p-5 bg-[#FFFBF0] rounded-xl border border-[#FDE68A]">
                  <span className="block text-amber-700 text-[10px] uppercase font-bold tracking-widest mb-2">KAM RECOMMENDATION NOTE</span>
                  <p className="italic text-amber-900 font-bold text-sm leading-relaxed">{c.recNote}</p>
                </div>
              </>
            )}
          </div>

          {/* Historical Data Simulation */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[200px]">
            <div className="flex items-end gap-1 mb-4 opacity-50">
              <div className="w-2 h-4 bg-slate-400 rounded-sm"></div>
              <div className="w-2 h-8 bg-slate-400 rounded-sm"></div>
              <div className="w-2 h-6 bg-slate-400 rounded-sm"></div>
              <div className="w-2 h-10 bg-slate-400 rounded-sm"></div>
            </div>
            <h3 className="font-bold text-slate-800">Historical Volume Data</h3>
            <p className="text-xs text-slate-500 mt-1">Volume charts will populate after initial rate approval.</p>
          </div>

          {/* Supporting Docs / Final Profile (Combined correctly based on state) */}
          {(c.status === STATUS.PENDING_PROFILE || c.status === STATUS.ACTIVE) && (
            <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-emerald-500 relative">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="font-bold text-base text-slate-800 flex items-center"><FileBox size={18} className="mr-2 text-emerald-600"/> Supporting Documentation & Profile</h3>
                <button onClick={() => setPrintData({type: 'profile', customer: c})} className="text-emerald-600 text-xs font-bold flex items-center border border-emerald-200 px-3 py-1.5 rounded-md hover:bg-emerald-50 transition"><Printer size={14} className="mr-1.5"/> Print Profile</button>
              </div>
              
              {c.status === STATUS.PENDING_PROFILE && isKAM && (
                <div className="space-y-6">
                  <p className="text-xs text-slate-500 mb-6">Please upload high-resolution PDF or Image files for each category. Maximum file size 10MB.</p>
                  
                  {/* Dynamic Upload Grid Matching Reference */}
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
                    {[
                      {name: 'Offer Letter', fields: false}, 
                      {name: 'Signed Agreement', fields: false}, 
                      {name: 'Customer TIN', fields: true}, 
                      {name: 'Customer BIN', fields: true}, 
                      {name: 'Trade License', fields: true}, 
                      {name: 'Others Document', fields: true}
                    ].map((doc, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col relative group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center"><FileText size={14} className="text-emerald-600 mr-1.5"/><span className="font-bold text-xs text-slate-800">{doc.name}</span></div>
                          <Trash2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500 transition"/>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-3 text-left">Pending upload</p>
                        <button className="w-full py-2.5 border-2 border-dashed border-emerald-300 bg-white text-emerald-600 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-emerald-50 transition mb-3"><UploadCloud size={14} className="mr-1.5"/> Upload File</button>
                        
                        {doc.fields && (
                          <div className="flex gap-2 text-left mt-auto border-t border-slate-100 pt-3">
                            <div className="flex-1">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Number</label>
                              <input type="text" className="w-full border border-slate-200 p-1.5 rounded bg-slate-50 text-[10px] outline-none focus:border-emerald-500" onChange={(e) => setDocMeta({...docMeta, [doc.name]: {...docMeta[doc.name], number: e.target.value}})} />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expiry Date</label>
                              <input type="date" className="w-full border border-slate-200 p-1.5 rounded bg-slate-50 text-[10px] outline-none focus:border-emerald-500" onChange={(e) => setDocMeta({...docMeta, [doc.name]: {...docMeta[doc.name], expiry: e.target.value}})} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={handleFinalProfileSubmit} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition text-sm">Activate & Distribute Profile</button>
                </div>
              )}

              {c.status === STATUS.ACTIVE && (
                <div className="grid grid-cols-2 gap-y-4 text-sm mt-4">
                  {c.accountProfileType === 'PROVISIONAL' && <div className="col-span-2 text-amber-700 font-bold mb-2">Provisional Account (Expires in 30 days)</div>}
                  <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest">BIN</span> <span className="font-mono">{c.profileData?.bin}</span></div>
                  <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest">Final Limits</span> <span className="font-bold">BDT {c.profileData?.amountLimit} ({c.profileData?.timeLimit} Days)</span></div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Action Box & Audit Trail */}
        <div className="w-[360px] shrink-0 space-y-6">
          
          {/* Main Action Box */}
          {!isReadOnlyDept && c.status !== STATUS.ACTIVE && (
            <div className="bg-white rounded-xl shadow-sm border border-emerald-600 overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-slate-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">ACTION BOX</div>
              
              <div className="p-6 pt-10">
                <h3 className="font-bold text-slate-900 text-base mb-5">Required Action</h3>

                {/* SC: Prep Rate */}
                {c.status === STATUS.PENDING_RATE && isSales && (
                  <div className="space-y-4">
                    <input type="text" value={rateRefInput} onChange={e=>setRateRefInput(e.target.value)} className="w-full text-xs border border-slate-300 p-2.5 rounded-lg mb-2 outline-none focus:border-emerald-500" placeholder="Rate Ref" />
                    <div className="flex flex-col gap-2 mt-1 mb-4">
                      <textarea value={proposedRateInput} readOnly placeholder="Awaiting system generation..." className="w-full text-xs border border-slate-300 p-3 rounded-lg bg-slate-50 min-h-[60px]" />
                      <button onClick={handleAutoGenerateRate} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow hover:bg-slate-700 transition">⚙️ Auto-Compute Rate</button>
                    </div>
                    <button onClick={handleSalesUploadRate} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-sm text-sm hover:bg-emerald-700 transition">Forward to Line Manager</button>
                  </div>
                )}

                {/* LM: Approve */}
                {c.status === STATUS.PENDING_APPROVAL && isLM && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ATTACHED RATE FORM</p>
                      <p className="font-black text-xl text-slate-800 mb-2">{c.rateRef}</p>
                      <button className="text-xs text-blue-600 font-bold flex items-center justify-center w-full hover:underline"><FileOutput size={14} className="mr-1"/> Download Excel to Verify</button>
                    </div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">NOTE</label>
                    <textarea value={lmNoteInput} onChange={e=>setLmNoteInput(e.target.value)} className="w-full text-xs border border-slate-300 p-3 rounded-xl mb-4 outline-none focus:border-emerald-500 min-h-[80px]" placeholder="Notes...." />
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleLMApprove} className="bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition"><CheckCircle size={16} className="mr-1.5"/> Approve</button>
                      <button onClick={handleLMRejectToSales} className="bg-white border border-red-400 text-red-500 font-bold py-3 rounded-xl flex justify-center items-center text-sm hover:bg-red-50 transition"><XCircle size={16} className="mr-1.5"/> Revision</button>
                    </div>
                  </div>
                )}

                {/* SC: Choose Offer or Agreement Action (Matches Screen 3) */}
                {c.status === STATUS.APPROVED_PENDING_OFFER && isSales && (
                  <div className="space-y-5">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest leading-relaxed">
                      RATE APPROVED BY LM. PREPARE OFFICIAL LETTERHEAD.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleDraftOffer} className="bg-[#00704A] text-white text-[11px] py-3.5 rounded-lg font-bold flex items-center justify-center shadow-md hover:bg-[#005e3e] transition text-center leading-snug px-2">
                         Generate & Email<br/>Offer Letter &rarr;
                      </button>
                      <button className="bg-blue-700 text-white text-[11px] py-3.5 rounded-lg font-bold flex items-center justify-center shadow-md opacity-50 cursor-not-allowed text-center leading-snug px-2">
                         Generate<br/>Agreement &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* SC: Edit Draft Offer */}
                {c.status === STATUS.OFFER_DRAFTING && isSales && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center"><PenTool size={16} className="mr-2 text-indigo-600"/> Edit Offer Letter</h3>
                    <p className="text-[10px] text-slate-500 mb-4">Draft generated with LM Signature. Edit if needed before final dispatch.</p>
                    <textarea value={offerTextEdit} onChange={e=>setOfferTextEdit(e.target.value)} className="w-full text-xs font-mono border border-slate-300 p-3 rounded-lg mb-4 min-h-[250px] outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
                    <div className="flex gap-3">
                      <button onClick={() => setPrintData({type:'offer', customer: {...c, offerText: offerTextEdit}})} className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"><Printer size={14} className="mr-1.5"/> Print</button>
                      <button onClick={handleFinalizeOffer} className="flex-[2] bg-emerald-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-800 transition flex items-center justify-center"><Mail size={14} className="mr-1.5"/> Finalize & Send</button>
                    </div>
                  </div>
                )}

                {/* KAM: Offer Feedback */}
                {c.status === STATUS.OFFER_REVIEW && isKAM && (
                  <div className="text-center space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Client Feedback</p>
                    <div className="flex gap-3 mb-4">
                      <button onClick={handleKAMAcceptOffer} className="flex-1 bg-emerald-600 text-white text-xs font-bold py-3 rounded-lg shadow hover:bg-emerald-700 transition">Accept</button>
                      <button onClick={()=>setRejectReasonInput('Client requested...')} className="flex-1 bg-white border border-red-300 text-red-600 text-xs font-bold py-3 rounded-lg hover:bg-red-50 transition">Reject</button>
                    </div>
                    {rejectReasonInput !== '' && (
                      <div className="mt-4 text-left animate-in fade-in slide-in-from-top-2">
                        <label className="block text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5">Reason for Rejection</label>
                        <textarea value={rejectReasonInput} onChange={e=>setRejectReasonInput(e.target.value)} className="w-full border border-red-200 p-3 rounded-lg text-xs mb-3 outline-none focus:border-red-500 min-h-[80px]"/>
                        <button onClick={handleKAMRejectOffer} className="w-full bg-red-600 text-white text-xs font-bold py-3 rounded-lg shadow-md hover:bg-red-700 transition">Submit Rejection to SC</button>
                      </div>
                    )}
                  </div>
                )}

                {/* SC: Offer Rejected (Revise) with CSV Upload */}
                {c.status === STATUS.OFFER_REJECTED && isSales && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="font-bold text-red-700 text-sm flex items-center"><XCircle size={16} className="mr-2"/> Offer Rejected</h3>
                    <p className="text-xs text-slate-700 p-4 bg-red-50 border border-red-100 rounded-lg"><strong>Client Feedback:</strong><br/><span className="mt-1 block italic">{c.rejectReason}</span></p>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Revise Rate Details</label>
                    <input type="text" value={proposedRateInput} onChange={e=>setProposedRateInput(e.target.value)} className="w-full text-xs border border-slate-300 p-3 rounded-lg font-bold text-blue-700 outline-none focus:border-blue-500" />
                    <button onClick={handleAutoGenerateRate} className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold shadow hover:bg-slate-700 transition">⚙️ Auto-Compute Revised Rate</button>
                    <button className="w-full bg-white border border-dashed border-emerald-400 text-emerald-700 py-3 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-emerald-50 transition"><UploadCloud size={16} className="mr-2"/> Attach Revised Excel (CSV)</button>
                    <button onClick={handleSalesRevisedOffer} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-blue-700 transition mt-2">Forward Revised Rate to LM</button>
                  </div>
                )}

                {/* SC/KAM: Prepare Agreement */}
                {c.status === STATUS.PENDING_AGREEMENT && (isSales || isKAM) && (
                  <div className="space-y-5 text-center">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest leading-relaxed">
                      OFFER ACCEPTED. PREPARE SERVICE LEVEL AGREEMENT.
                    </p>
                    <button onClick={handleDraftAgreement} className="w-full bg-blue-700 text-white text-[11px] py-3.5 rounded-lg font-bold shadow-md hover:bg-blue-800 transition">
                       Generate Agreement &rarr;
                    </button>
                  </div>
                )}

                {/* SC/KAM: Edit Draft Agreement */}
                {c.status === STATUS.AGREEMENT_DRAFTING && (isSales || isKAM) && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center"><PenTool size={16} className="mr-2 text-blue-600"/> Edit Agreement (SLA)</h3>
                    <p className="text-[10px] text-slate-500 mb-4">Draft generated with signature. Edit clauses if needed.</p>
                    <textarea value={agreementTextEdit} onChange={e=>setAgreementTextEdit(e.target.value)} className="w-full text-xs font-mono border border-slate-300 p-3 rounded-lg mb-4 min-h-[250px] outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed" />
                    <div className="flex gap-3">
                      <button onClick={() => setPrintData({type:'agreement', customer: {...c, agreementText: agreementTextEdit}})} className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"><Printer size={14} className="mr-1.5"/> Print</button>
                      <button onClick={handleFinalizeAgreement} className="flex-[2] bg-blue-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-800 transition flex items-center justify-center"><Mail size={14} className="mr-1.5"/> Finalize & Send SLA</button>
                    </div>
                  </div>
                )}

                {/* KAM: Upload Signed SLA */}
                {c.status === STATUS.AGREEMENT_REVIEW && isKAM && (
                  <div className="text-center space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm">Awaiting Signature</h3>
                    <p className="text-[10px] text-slate-500 mb-4">SLA sent to client. Upload the physically signed copy here.</p>
                    <button onClick={handleKAMUploadAgreement} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg shadow-md hover:bg-emerald-700 transition flex items-center justify-center"><UploadCloud size={16} className="mr-2"/> Mark SLA Signed</button>
                  </div>
                )}
                
                {/* Generic Waiting State */}
                {((isKAM && [STATUS.PENDING_RATE, STATUS.PENDING_APPROVAL, STATUS.APPROVED_PENDING_OFFER, STATUS.OFFER_DRAFTING, STATUS.OFFER_REJECTED, STATUS.AGREEMENT_DRAFTING].includes(c.status)) ||
                  (isSales && [STATUS.PENDING_APPROVAL, STATUS.OFFER_REVIEW, STATUS.AGREEMENT_REVIEW, STATUS.PENDING_PROFILE].includes(c.status)) ||
                  (isLM && c.status !== STATUS.PENDING_APPROVAL)) && (
                  <div className="text-center py-8">
                     <Clock size={36} className="mx-auto text-slate-200 mb-3"/>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting for other department</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Process Audit Trail */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 flex items-center border-b border-slate-100"><Clock size={18} className="text-slate-400 mr-2"/><h3 className="font-bold text-base text-slate-800">Process Audit Trail</h3></div>
            <div className="p-6 pb-8">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-[2px] before:bg-slate-200">
                {c.history.map((h, i) => (
                  <div key={i} className="relative flex items-start">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${h.status === 'active' ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]' : 'bg-slate-300'}`}></div>
                    <div className="ml-4 -mt-1 w-full">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${h.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>{h.action}</p>
                      {h.subText && <p className="text-[11px] text-slate-600 mb-1">{h.subText}</p>}
                      <p className="text-[10px] text-slate-400 font-mono">{h.status === 'active' ? 'Waiting for next step' : h.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PrintTemplate = ({ data, onClose }) => {
  const c = data.customer;
  const today = new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 bg-slate-800 overflow-y-auto p-8 flex flex-col items-center">
      <div className="print:hidden w-full max-w-4xl bg-slate-900 rounded-lg p-4 flex justify-between items-center mb-6 shadow-xl">
        <p className="text-white font-bold text-sm">Document Print Preview</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="bg-slate-700 text-white px-5 py-2 rounded text-xs font-bold hover:bg-slate-600 transition">Cancel</button>
          <button onClick={() => window.print()} className="bg-emerald-600 text-white px-5 py-2 rounded text-xs font-bold shadow-md hover:bg-emerald-700 transition flex items-center"><Printer size={14} className="mr-2"/> Print Document</button>
        </div>
      </div>
      
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] text-black p-12 shadow-2xl relative print:shadow-none print:m-0">
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
          <div><h1 className="text-4xl font-black text-emerald-800 italic tracking-tighter">MILEX</h1></div>
          <div className="text-right text-xs text-slate-600"><p className="mt-2 font-mono bg-slate-100 px-2 py-1 inline-block border font-bold text-slate-800">ID: {c.barcode}</p></div>
        </div>

        {data.type === 'offer' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.offerText}</div>
        )}
        
        {data.type === 'agreement' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.agreementText}</div>
        )}

        {(data.type === 'recommendation' || data.type === 'profile') && (
           <div className="text-center mt-20">
             <h2 className="text-2xl font-bold">{data.type === 'profile' ? 'Master Profile' : 'Recommendation'} Form Printout</h2>
             {c.accountProfileType === 'PROVISIONAL' && <p className="text-red-600 font-bold mt-4">PROVISIONAL ACCOUNT</p>}
           </div>
        )}
      </div>
    </div>
  );
};