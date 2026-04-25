const fs = require('fs');

const path = 'c:/Users/sb850/Desktop/Apni Chakki/Atta Chakki Frontend/src/components/customer/TrackOrder.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add import for useAuth
if (!code.includes('{ useAuth }')) {
    code = code.replace(
        "import { useTranslation } from 'react-i18next';",
        "import { useTranslation } from 'react-i18next';\nimport { Link } from 'react-router-dom';\nimport { useAuth } from '../../lib/AuthContext';"
    );
}

// 2. Insert useAuth and checking inside component
if (!code.includes('const { user } = useAuth();')) {
    code = code.replace('export function TrackOrder() {', 
        'export function TrackOrder() {\n  const { user } = useAuth();'
    );
}

// 3. Prevent rendering full form if not logged in
if (!code.includes('if (!user)')) {
    code = code.replace('return (\n    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">',
        `if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center shadow-lg border-primary/20 rounded-2xl">
          <User className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Login Required</h2>
          <p className="text-slate-600 mb-6">You must be logged in to track your specific orders.</p>
          <Link to="/customer-login">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl">
              Sign In to Track Order
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">`
    );
}

// 4. Update the handleSearch API call to include user_id securely
if (!code.includes('user_id=${user.id}')) {
    code = code.replace(
        'const response = await fetch(`${API_BASE_URL}/track_order.php?${param}`);',
        'const response = await fetch(`${API_BASE_URL}/track_order.php?${param}&user_id=${user.id}`);'
    );
}

// 5. Update colors to primary project theme instead of hardcoded green/emerald
code = code.replace(/from-green-600 to-emerald-600/g, 'from-primary to-primary');
code = code.replace(/bg-green-500/g, 'bg-primary');
code = code.replace(/bg-green-600/g, 'bg-primary');
code = code.replace(/bg-green-700/g, 'bg-primary/90');
code = code.replace(/text-green-500/g, 'text-primary');
code = code.replace(/text-green-600/g, 'text-primary');
code = code.replace(/text-green-700/g, 'text-primary/90'); // Adjust to keep contrast
code = code.replace(/border-green-100/g, 'border-primary/20');
code = code.replace(/border-green-500/g, 'border-primary');
code = code.replace(/bg-green-100/g, 'bg-primary/10');
code = code.replace(/shadow-lg border-green-100\/50/g, 'shadow-lg border-primary/20');

// Fix text-white to text-primary-foreground where background is primary
code = code.replace(/text-white font-bold rounded-xl transition-all shadow-md md:w-auto w-full text-lg/g, 'text-primary-foreground font-bold rounded-xl transition-all shadow-md md:w-auto w-full text-lg');

// We also need to fix the timeline texts: text-green-700 and text-green-600
// It should look coherent. 
// "bg-white border-green-500 text-green-500" -> "bg-white border-primary text-primary"
// Already handled.

fs.writeFileSync(path, code);
console.log('Frontend TrackOrder updated successfully!');
