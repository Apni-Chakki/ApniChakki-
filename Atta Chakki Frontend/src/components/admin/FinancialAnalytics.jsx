import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config'; // <-- NEW: Import API Config
import { toast } from 'sonner';

export function FinancialAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true); // <-- NEW: Loading state
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    profitMargin: 0
  });

  useEffect(() => {
    fetchFinancials();
  }, []);

  // --- NEW: FETCH FROM API ---
  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_financial_analytics.php`);
      const result = await response.json();

      if (result.success) {
        setData(result.chartData);
        setSummary({
          totalRevenue: result.summary.totalRevenue,
          totalExpense: result.summary.totalExpense,
          netProfit: result.summary.netProfit,
          profitMargin: result.summary.profitMargin
        });
      } else {
        toast.error("Failed to load financial data");
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Network connection error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Calculating Financial Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground mb-2">Financial Analytics</h1>
        <p className="text-muted-foreground">Profit & Loss overview for the last 7 days</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-200 rounded-full">
              <TrendingUp className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-green-800 font-medium">Total Revenue</p>
              <p className="text-xl font-bold text-green-900">Rs. {summary.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-200 rounded-full">
              <TrendingDown className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-red-800 font-medium">Total Expenses</p>
              <p className="text-xl font-bold text-red-900">Rs. {summary.totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 border ${summary.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${summary.netProfit >= 0 ? 'bg-blue-200' : 'bg-orange-200'}`}>
              <DollarSign className={`h-5 w-5 ${summary.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`} />
            </div>
            <div>
              <p className={`text-xs font-medium ${summary.netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Net Profit</p>
              <p className={`text-xl font-bold ${summary.netProfit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                Rs. {summary.netProfit.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-200 rounded-full">
              <Activity className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <p className="text-xs text-purple-800 font-medium">Profit Margin</p>
              <p className="text-xl font-bold text-purple-900">{summary.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Chart */}
        <Card className="p-6">
          <h3 className="mb-6 font-semibold">Income vs Expenses (7 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`Rs. ${value}`, '']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Net Profit Trend */}
        <Card className="p-6">
          <h3 className="mb-6 font-semibold">Net Profit Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`Rs. ${value}`, 'Profit']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="Net Profit" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#2563eb" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}