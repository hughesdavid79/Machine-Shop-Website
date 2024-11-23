import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Clock, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { getInventory, getBarrels, getAnnouncements } from '../services/api';

// Helper function to check if a date is today
const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const productivityData = [
  { name: "Mon", value: 85 },
  { name: "Tue", value: 90 },
  { name: "Wed", value: 78 },
  { name: "Thu", value: 88 },
  { name: "Fri", value: 92 }
];

const onTimeDeliveryData = [
  { name: 'Mon', onTime: 95, delayed: 5 },
  { name: 'Tue', onTime: 98, delayed: 2 },
  { name: 'Wed', onTime: 92, delayed: 8 },
  { name: 'Thu', onTime: 96, delayed: 4 },
  { name: 'Fri', onTime: 94, delayed: 6 },
];

const scrapData = [
  { name: 'Material A', value: 2.5 },
  { name: 'Material B', value: 1.8 },
  { name: 'Material C', value: 3.2 },
  { name: 'Material D', value: 1.2 },
];

const safetyData = [
  { name: 'Jan', incidents: 0 },
  { name: 'Feb', incidents: 1 },
  { name: 'Mar', incidents: 0 },
  { name: 'Apr', incidents: 0 },
  { name: 'May', incidents: 1 },
];

const utilizationData = [
  { name: 'Active', value: 75 },
  { name: 'Idle', value: 15 },
  { name: 'Maintenance', value: 10 }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { data: inventory = [] } = useQuery('inventory', getInventory, {
    refetchInterval: 1000 // Refetch every second
  });
  const { data: barrels = [] } = useQuery('barrels', getBarrels, {
    refetchInterval: 1000
  });
  const { data: announcements = [] } = useQuery('announcements', getAnnouncements, {
    refetchInterval: 1000
  });

  // Filter announcements to only show today's
  const todayAnnouncements = useMemo(() => {
    return announcements.filter(announcement => 
      isToday(new Date(announcement.timestamp))
    );
  }, [announcements]);

  // Mock data for charts
  const utilizationData = [
    { name: 'Active', value: 75 },
    { name: 'Idle', value: 15 },
    { name: 'Maintenance', value: 10 }
  ];

  return (
    <div className="space-y-8">
      {/* System Messages */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">System Messages</h3>
        <div className="space-y-4">
          {/* Inventory Alerts */}
          {inventory
            .filter(item => item.quantity <= item.threshold)
            .map(item => (
              <div key={item.id} className="flex items-center text-yellow-700">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span>Low inventory: {item.name} ({item.quantity} remaining)</span>
              </div>
            ))}
          
          {/* Barrel Alerts */}
          {barrels
            .filter(type => {
              const filledCount = type.barrels?.filter(b => b.filled).length || 0;
              return type.type === 'Chips' || type.type === 'Vacuum'
                ? filledCount >= type.threshold
                : filledCount <= type.threshold;
            })
            .map(type => (
              <div key={type.id} className="flex items-center text-yellow-700">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span>
                  {type.type === 'Chips' || type.type === 'Vacuum' 
                    ? `Warning: ${type.type} barrels need emptying`
                    : `Low ${type.type} level - needs refill`}
                </span>
              </div>
            ))}

          {/* Today's Announcements */}
          {todayAnnouncements.map(announcement => (
            <div key={announcement.id} className="flex items-center text-blue-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{announcement.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Productivity Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Productivity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* On-Time Delivery */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">On-Time Delivery</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={onTimeDeliveryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="onTime" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              <Area type="monotone" dataKey="delayed" stackId="1" stroke="#ffc658" fill="#ffc658" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scrap Rate */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Scrap Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={scrapData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {scrapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Safety Incidents */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Safety Incidents</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safetyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="incidents" stroke="#ff7300" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;