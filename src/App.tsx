import { useState } from 'react'
import { ClientDashboard } from '@/components/ClientDashboard'

import { SPDashboard } from '@/components/SPDashboard'
import { SPJobDetail } from '@/components/SPJobDetail'
import { AdminView } from '@/components/AdminView'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Home, Wrench, ClipboardList, Users, Shield } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'

type View = 'client' | 'sp-dashboard' | 'sp-job-detail' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('client');

  return (
    <div className="dark min-h-screen bg-gray-950">
      {/* Top Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl">Home Assist</h1>
                <p className="text-gray-400 text-xs">Professional Home Repair Services</p>
              </div>
            </div>

            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as View)}>
              <TabsList className="bg-gray-800">
                <TabsTrigger value="client" className="data-[state=active]:bg-gray-700">
                  <Users className="w-4 h-4 mr-2" />
                  Client View
                </TabsTrigger>
                <TabsTrigger value="sp-dashboard" className="data-[state=active]:bg-gray-700">
                  <Wrench className="w-4 h-4 mr-2" />
                  SP Dashboard
                </TabsTrigger>
                <TabsTrigger value="sp-job-detail" className="data-[state=active]:bg-gray-700">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  SP Job Detail
                </TabsTrigger>
                <TabsTrigger value="admin" className="data-[state=active]:bg-gray-700">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div>
        {currentView === 'client' && <ClientDashboard />}
        {currentView === 'sp-dashboard' && <SPDashboard />}
        {currentView === 'sp-job-detail' && <SPJobDetail />}
        {currentView === 'admin' && <AdminView />}
      </div>

      <Toaster />
    </div>
  );
}
