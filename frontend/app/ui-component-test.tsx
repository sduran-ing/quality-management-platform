import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { 
  Search, 
  AlertTriangle, 
  CheckSquare 
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import DocumentStatusChart from '@/components/dashboard/DocumentStatusChart';
import AchievementSummary from '@/components/dashboard/AchievementSummary';
import UpcomingAudits from '@/components/dashboard/UpcomingAudits';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page header */}
        <div>
          <h1 className="font-heading text-4xl font-bold text-gray-900 mb-2">
            UI Components Test
          </h1>
          <p className="font-body text-gray-600">
            Testing our base components with the Fresh Green theme
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Different button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            
            <div className="flex gap-3 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            
            <div className="flex gap-3">
              <Button disabled>Disabled</Button>
              <Button isLoading>Loading</Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status and severity indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="draft">Draft</Badge>
              <Badge variant="pending">Pending</Badge>
              <Badge variant="approved">Approved</Badge>
              <Badge variant="obsolete">Obsolete</Badge>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Form input fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Email" type="email" placeholder="Enter your email" />
            <Input label="Password" type="password" placeholder="Enter password" />
            <Input 
              label="With Error" 
              error="This field is required"
              placeholder="Try typing..."
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* TopBar */}
          <TopBar />

          {/* Page content */}
          <main className="flex-1 p-8 overflow-auto bg-gray-50">
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-4">
              Layout Test
            </h1>
            <p className="font-body text-gray-600 mb-4">
              Test the sidebar navigation and user menu dropdown!
            </p>

            {/* Test content */}
            <div className="space-y-6">
              {/* Page Header */}
              <div>
                <h1 className="font-heading text-3xl font-bold text-gray-900">
                  Dashboard
                </h1>
                <p className="font-body text-gray-600 mt-1">
                  Welcome back! Here's what's happening with your quality management system.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                  title="My Tasks"
                  value={12}
                  icon={CheckSquare}
                  subtitle="Across all modules"
                  badge={{ text: '3 overdue', variant: 'error' }}
                />

                <StatCard
                  title="Open Findings"
                  value={8}
                  icon={AlertTriangle}
                  subtitle="Requiring action"
                  badge={{ text: '4 major', variant: 'warning' }}
                />

                <StatCard
                  title="My Audits"
                  value={5}
                  icon={Search}
                  subtitle="Active audits"
                  trend={{ value: 2, isPositive: true, label: 'this quarter' }}
                />
              </div>

              {/* Placeholder sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
                  <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                    My Document Status
                  </h3>
                  <DocumentStatusChart 
                    data={{
                      draft: 17,
                      pending: 10,
                      approved: 13,
                      obsolete: 2,
                    }}
                  />
                </div>
                <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
                  <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                    Achievement Progress
                  </h3>
                  <AchievementSummary
                    recentAchievements={[
                      {
                        id: '1',
                        name: 'First Audit Completed',
                        description: 'Complete your first audit',
                        icon: '🎯',
                        unlockedAt: '2026-01-25T10:00:00Z',
                      },
                      {
                        id: '2',
                        name: '10 CAs Verified',
                        description: 'Verify 10 corrective actions',
                        icon: '✅',
                        unlockedAt: '2026-01-22T15:30:00Z',
                      },
                      {
                        id: '3',
                        name: 'Team Player',
                        description: 'Collaborate on 5 audits',
                        icon: '🤝',
                        unlockedAt: '2026-01-20T09:15:00Z',
                      },
                    ]}
                    progressAchievements={[
                      {
                        id: '4',
                        name: '50 Documents Created',
                        description: 'Create 50 documents',
                        icon: '📄',
                        progress: 80,
                        target: 50,
                      },
                      {
                        id: '5',
                        name: 'Quality Champion',
                        description: 'Approve 100 documents',
                        icon: '⭐',
                        progress: 60,
                        target: 100,
                      },
                      {
                        id: '6',
                        name: 'Audit Master',
                        description: 'Complete 20 audits',
                        icon: '🏆',
                        progress: 50,
                        target: 20,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
                <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                  Upcoming Audit Schedule
                </h3>
                <UpcomingAudits
                  audits={[
                    {
                      id: 5,
                      title: 'Q1 2026 Internal Audit - IT Department',
                      scheduledStartDate: '2026-02-01T00:00:00Z',
                      scheduledEndDate: '2026-02-15T00:00:00Z',  // Feb 15
                      status: 'scheduled',
                      leadAuditor: { id: 1, firstName: 'Santiago', lastName: 'Rodriguez' },
                    },
                    {
                      id: 6,
                      title: 'Q2 2026 Internal Audit - HR Department',
                      scheduledStartDate: '2026-05-05T00:00:00Z',
                      scheduledEndDate: '2026-05-20T00:00:00Z',  // May 20
                      status: 'scheduled',
                      leadAuditor: { id: 2, firstName: 'Maria', lastName: 'Garcia' },
                    },
                    {
                      id: 7,
                      title: 'ISO 9001 Certification Audit',
                      scheduledStartDate: '2026-03-10T00:00:00Z',
                      scheduledEndDate: '2026-03-12T00:00:00Z',  // Mar 12
                      status: 'scheduled',
                      leadAuditor: { id: 3, firstName: 'Carlos', lastName: 'Martinez' },
                    },
                    {
                      id: 8,
                      title: 'Completed Audit (Should Not Show)',
                      scheduledStartDate: '2026-01-01T00:00:00Z',
                      scheduledEndDate: '2026-01-15T00:00:00Z',
                      status: 'completed',  // Should be filtered out
                      leadAuditor: { id: 4, firstName: 'Ana', lastName: 'Lopez' },
                    },
                    {
                      id: 9,
                      title: 'Emergency Safety Audit',
                      scheduledStartDate: '2026-01-30T00:00:00Z',
                      scheduledEndDate: '2026-01-31T00:00:00Z',  // Jan 31 - SOONEST!
                      status: 'in_progress',
                      leadAuditor: { id: 5, firstName: 'Pedro', lastName: 'Santos' },
                    },
                  ]}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

    </main>
  );
}