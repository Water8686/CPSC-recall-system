import { useState } from 'react';
import { CPSCManagerView } from './components/CPSCManagerView';
import { InvestigatorView } from './components/InvestigatorView';
import { SellerView } from './components/SellerView';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Shield, Search, Store, User } from 'lucide-react';
import requirementsImage from 'figma:asset/cdf0dd697c85f55aba011299eb6dd00d0ff2df88.png';

type ViewMode = 'home' | 'manager' | 'investigator' | 'seller';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');

  if (currentView === 'manager') {
    return (
      <div>
        <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="font-bold text-xl">
                    CPSC Recall Violation Monitoring System
                  </h1>
                  <p className="text-sm text-gray-600">Manager Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">Manager View</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('home')}
                >
                  Switch View
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <CPSCManagerView />
      </div>
    );
  }

  if (currentView === 'investigator') {
    return (
      <div>
        <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="font-bold text-xl">
                    CPSC Recall Violation Monitoring System
                  </h1>
                  <p className="text-sm text-gray-600">
                    Investigator Dashboard
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">Investigator View</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('home')}
                >
                  Switch View
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <InvestigatorView />
      </div>
    );
  }

  if (currentView === 'seller') {
    return (
      <div>
        <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="font-bold text-xl">
                    CPSC Recall Violation Monitoring System
                  </h1>
                  <p className="text-sm text-gray-600">
                    Violation Response System
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">Seller View</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('home')}
                >
                  Switch View
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <SellerView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              CPSC Recall Violation Monitoring System
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-6">
            Select a stakeholder view to explore the system
          </p>
        </div>

        {/* Stakeholder Views */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Stakeholder Views
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <Card
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500"
              onClick={() => setCurrentView('manager')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">CPSC Manager</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Prioritize high-risk recalls and assign investigations
                </p>
                <Badge variant="outline" className="mb-3">
                  Sprint 1
                </Badge>
                <Button className="w-full">View Manager Dashboard</Button>
              </div>
            </Card>

            <Card
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500"
              onClick={() => setCurrentView('investigator')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">Investigator</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Search listings, annotate violations, and manage cases
                </p>
                <Badge variant="outline" className="mb-3">
                  Sprint 2 & 3
                </Badge>
                <Button className="w-full">View Investigator Dashboard</Button>
              </div>
            </Card>

            <Card
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500"
              onClick={() => setCurrentView('seller')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <Store className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">Seller</h3>
                <p className="text-sm text-gray-600 mb-4">
                  View violation notices and submit responses
                </p>
                <Badge variant="outline" className="mb-3">
                  Sprint 3
                </Badge>
                <Button className="w-full">View Seller Portal</Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>
            CPSC Recall Violation Monitoring System - Interactive Wireframes
          </p>
          <p>Built for incident management across 3 stakeholder perspectives</p>
        </div>
      </div>
    </div>
  );
}