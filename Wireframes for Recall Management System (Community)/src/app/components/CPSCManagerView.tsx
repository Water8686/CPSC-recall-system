import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { AlertCircle, CheckCircle2, Clock, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Recall {
  id: string;
  manufacturer: string;
  productName: string;
  modelNumber: string;
  priorityLevel: 'High' | 'Medium' | 'Low';
  dateIssued: string;
  hazardType: string;
  selected: boolean;
}

export function CPSCManagerView() {
  const [recalls, setRecalls] = useState<Recall[]>([
    {
      id: 'RC-2026-001',
      manufacturer: 'SafeHome Inc.',
      productName: 'Child Safety Gate Model X200',
      modelNumber: 'X200-2024',
      priorityLevel: 'High',
      dateIssued: '2026-01-15',
      hazardType: 'Entrapment / Strangulation',
      selected: false,
    },
    {
      id: 'RC-2026-002',
      manufacturer: 'TechPlay',
      productName: 'Battery-Powered Toy Car',
      modelNumber: 'TP-CAR-500',
      priorityLevel: 'High',
      dateIssued: '2026-01-20',
      hazardType: 'Fire / Burns',
      selected: false,
    },
    {
      id: 'RC-2026-003',
      manufacturer: 'KidCo',
      productName: 'Portable Crib',
      modelNumber: 'KC-CRIB-100',
      priorityLevel: 'Medium',
      dateIssued: '2026-01-10',
      hazardType: 'Fall / Injury',
      selected: false,
    },
    {
      id: 'RC-2026-004',
      manufacturer: 'HomeWare Plus',
      productName: 'Electric Space Heater',
      modelNumber: 'HW-HEAT-300',
      priorityLevel: 'High',
      dateIssued: '2026-02-01',
      hazardType: 'Fire / Electrical Shock',
      selected: false,
    },
    {
      id: 'RC-2026-005',
      manufacturer: 'Outdoor Brands',
      productName: 'Camping Lantern',
      modelNumber: 'OB-LAMP-250',
      priorityLevel: 'Low',
      dateIssued: '2026-01-25',
      hazardType: 'Burns',
      selected: false,
    },
  ]);

  const [showEditPriorityDialog, setShowEditPriorityDialog] = useState(false);
  const [selectedRecall, setSelectedRecall] = useState<Recall | null>(null);
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const toggleRecall = (id: string) => {
    setRecalls(
      recalls.map((recall) =>
        recall.id === id ? { ...recall, selected: !recall.selected } : recall
      )
    );
  };

  const openEditPriorityDialog = (recall: Recall) => {
    setSelectedRecall(recall);
    setNewPriority(recall.priorityLevel);
    setShowEditPriorityDialog(true);
  };

  const updatePriority = () => {
    if (selectedRecall) {
      setRecalls(
        recalls.map((recall) =>
          recall.id === selectedRecall.id
            ? { ...recall, priorityLevel: newPriority }
            : recall
        )
      );
      setShowEditPriorityDialog(false);
    }
  };

  const selectedCount = recalls.filter((r) => r.selected).length;

  // Calculate recall statistics for visualizations
  const priorityStats = {
    High: recalls.filter((r) => r.priorityLevel === 'High').length,
    Medium: recalls.filter((r) => r.priorityLevel === 'Medium').length,
    Low: recalls.filter((r) => r.priorityLevel === 'Low').length,
  };

  const barChartData = [
    { priority: 'High', count: priorityStats.High, fill: '#ef4444' },
    { priority: 'Medium', count: priorityStats.Medium, fill: '#f97316' },
    { priority: 'Low', count: priorityStats.Low, fill: '#eab308' },
  ];

  const pieChartData = [
    { name: 'High', value: priorityStats.High, color: '#ef4444' },
    { name: 'Medium', value: priorityStats.Medium, color: '#f97316' },
    { name: 'Low', value: priorityStats.Low, color: '#eab308' },
  ];

  const totalRecalls = recalls.length;

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              CPSC Manager Dashboard
            </h1>
            <Badge variant="outline" className="text-sm">
              Sprint 1: Prioritize Recall
            </Badge>
          </div>
          <p className="text-gray-600">
            Select high-priority recalls to monitor for online violations
          </p>
        </div>

        <Tabs defaultValue="prioritize" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="prioritize">Prioritize Recalls</TabsTrigger>
            <TabsTrigger value="active">Active Investigations</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="prioritize">
            {/* Selection Summary */}
            <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Recalls Selected: {selectedCount} / 5
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select 3-5 recalls to prioritize for investigation
                  </p>
                </div>
                <Button
                  size="lg"
                  disabled={selectedCount < 3 || selectedCount > 5}
                >
                  Assign to Investigators
                </Button>
              </div>
            </Card>

            {/* Recall List */}
            <div className="space-y-4">
              {recalls.map((recall) => (
                <Card
                  key={recall.id}
                  className={`p-6 transition-all ${
                    recall.selected
                      ? 'border-blue-500 border-2 bg-blue-50'
                      : 'hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={recall.selected}
                      onCheckedChange={() => toggleRecall(recall.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {recall.productName}
                            </h3>
                            <Badge
                              variant="outline"
                              className={getPriorityColor(recall.priorityLevel)}
                            >
                              {recall.priorityLevel} Priority
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Recall ID:</span>{' '}
                            {recall.id}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Date Issued:</span>{' '}
                            {recall.dateIssued}
                          </p>
                        </div>
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPriorityDialog(recall)}
                          >
                            Edit Priority
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Manufacturer
                          </p>
                          <p className="font-medium">{recall.manufacturer}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Model Number
                          </p>
                          <p className="font-medium">{recall.modelNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Hazard Type
                          </p>
                          <p className="font-medium text-red-600">
                            {recall.hazardType}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          View Full Recall Details
                        </Button>
                        <Button variant="outline" size="sm">
                          View Recall History
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <Card className="p-8">
              <div className="text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Active Investigations
                </h3>
                <p className="text-gray-600 mb-4">
                  View ongoing violation investigations and their status
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <Card className="p-4 bg-yellow-50">
                    <p className="text-2xl font-bold text-yellow-800">12</p>
                    <p className="text-sm text-gray-600">Pending Review</p>
                  </Card>
                  <Card className="p-4 bg-blue-50">
                    <p className="text-2xl font-bold text-blue-800">8</p>
                    <p className="text-sm text-gray-600">Under Investigation</p>
                  </Card>
                  <Card className="p-4 bg-green-50">
                    <p className="text-2xl font-bold text-green-800">45</p>
                    <p className="text-sm text-gray-600">Resolved</p>
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Recalls</p>
                  <p className="text-3xl font-bold text-gray-900">{totalRecalls}</p>
                </Card>
                <Card className="p-4 bg-red-50 border-red-200">
                  <p className="text-sm text-gray-600 mb-1">High Priority</p>
                  <p className="text-3xl font-bold text-red-600">{priorityStats.High}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {((priorityStats.High / totalRecalls) * 100).toFixed(0)}%
                  </p>
                </Card>
                <Card className="p-4 bg-orange-50 border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">Medium Priority</p>
                  <p className="text-3xl font-bold text-orange-600">{priorityStats.Medium}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {((priorityStats.Medium / totalRecalls) * 100).toFixed(0)}%
                  </p>
                </Card>
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <p className="text-sm text-gray-600 mb-1">Low Priority</p>
                  <p className="text-3xl font-bold text-yellow-600">{priorityStats.Low}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {((priorityStats.Low / totalRecalls) * 100).toFixed(0)}%
                  </p>
                </Card>
              </div>

              {/* Bar Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recalls by Priority Level</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Number of Recalls" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Pie Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Priority Level Distribution</h3>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Priority Dialog */}
        <Dialog open={showEditPriorityDialog} onOpenChange={setShowEditPriorityDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Recall Priority</DialogTitle>
              <DialogDescription>
                Change the priority level of the selected recall.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={newPriority}
                onValueChange={(value) => setNewPriority(value as 'High' | 'Medium' | 'Low')}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select a priority level">
                    {newPriority}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditPriorityDialog(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={updatePriority}>
                Update Priority
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}