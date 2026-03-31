import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
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
import { Clock, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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

interface Investigator {
  id: string;
  name: string;
  team: string;
  active: boolean;
}

interface RecallAssignment {
  id: string;
  recallId: string;
  investigatorId: string;
  assignedDate: string;
  dueDate: string;
  status: 'Assigned' | 'In Progress' | 'Blocked' | 'Closed';
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

  const [investigators] = useState<Investigator[]>([
    { id: 'INV-001', name: 'Alex Rivera', team: 'Northeast', active: true },
    { id: 'INV-002', name: 'Jamie Chen', team: 'Southeast', active: true },
    { id: 'INV-003', name: 'Morgan Patel', team: 'West', active: true },
  ]);

  const [assignments] = useState<RecallAssignment[]>([
    {
      id: 'ASG-001',
      recallId: 'RC-2026-001',
      investigatorId: 'INV-001',
      assignedDate: '2026-02-02',
      dueDate: '2026-02-20',
      status: 'In Progress',
    },
    {
      id: 'ASG-002',
      recallId: 'RC-2026-002',
      investigatorId: 'INV-001',
      assignedDate: '2026-02-05',
      dueDate: '2026-02-22',
      status: 'Assigned',
    },
    {
      id: 'ASG-003',
      recallId: 'RC-2026-003',
      investigatorId: 'INV-002',
      assignedDate: '2026-02-07',
      dueDate: '2026-02-28',
      status: 'Blocked',
    },
    {
      id: 'ASG-004',
      recallId: 'RC-2026-004',
      investigatorId: 'INV-003',
      assignedDate: '2026-02-10',
      dueDate: '2026-02-26',
      status: 'In Progress',
    },
    {
      id: 'ASG-005',
      recallId: 'RC-2026-005',
      investigatorId: 'INV-003',
      assignedDate: '2026-02-12',
      dueDate: '2026-03-05',
      status: 'Assigned',
    },
  ]);

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

  const getAssignmentStatusColor = (status: RecallAssignment['status']) => {
    switch (status) {
      case 'Closed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Blocked':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Assigned':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getRecallById = (recallId: string) => recalls.find((r) => r.id === recallId);

  const getAssignmentsForInvestigator = (investigatorId: string) =>
    assignments
      .filter((a) => a.investigatorId === investigatorId)
      .map((a) => ({ assignment: a, recall: getRecallById(a.recallId) }))
      .filter((row): row is { assignment: RecallAssignment; recall: Recall } => !!row.recall);

  const priorities: Array<Recall['priorityLevel']> = ['High', 'Medium', 'Low'];

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
            <TabsTrigger value="investigators">
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                Investigators
              </span>
            </TabsTrigger>
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

          <TabsContent value="investigators">
            <div className="space-y-6">
              <Card className="p-6 bg-white">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Investigator Assignments
                    </h3>
                    <p className="text-sm text-gray-600">
                      Recalls assigned to each investigator, broken out by
                      priority so it’s easy to triage.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{investigators.filter((i) => i.active).length} active</Badge>
                    <Badge variant="outline">{assignments.length} assignments</Badge>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-6">
                {investigators.map((inv) => {
                  const rows = getAssignmentsForInvestigator(inv.id);
                  const rowsByPriority = {
                    High: rows.filter((r) => r.recall.priorityLevel === 'High'),
                    Medium: rows.filter((r) => r.recall.priorityLevel === 'Medium'),
                    Low: rows.filter((r) => r.recall.priorityLevel === 'Low'),
                  };

                  return (
                    <Card key={inv.id} className="p-6">
                      <div className="flex items-start justify-between gap-6 mb-5">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-xl font-semibold text-gray-900">
                              {inv.name}
                            </h4>
                            <Badge variant="outline">{inv.team}</Badge>
                            {!inv.active && (
                              <Badge
                                variant="outline"
                                className="bg-gray-100 text-gray-700 border-gray-300"
                              >
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Assigned recalls: <span className="font-medium">{rows.length}</span>
                          </p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Reassign
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {priorities.map((priority) => {
                          const priorityRows = rowsByPriority[priority];
                          return (
                            <div key={`${inv.id}-${priority}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={getPriorityColor(priority)}
                                  >
                                    {priority} Priority
                                  </Badge>
                                  <span className="text-sm text-gray-600">
                                    {priorityRows.length} assigned
                                  </span>
                                </div>
                              </div>

                              <Card className="border p-0 overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Recall</TableHead>
                                      <TableHead>Manufacturer</TableHead>
                                      <TableHead>Hazard</TableHead>
                                      <TableHead>Assigned</TableHead>
                                      <TableHead>Due</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {priorityRows.length === 0 ? (
                                      <TableRow>
                                        <TableCell
                                          colSpan={6}
                                          className="text-sm text-gray-500 py-6"
                                        >
                                          No {priority.toLowerCase()} priority recalls assigned.
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      priorityRows.map(({ assignment, recall }) => (
                                        <TableRow key={assignment.id}>
                                          <TableCell className="whitespace-normal">
                                            <div className="font-medium text-gray-900">
                                              {recall.productName}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {recall.id} • Model {recall.modelNumber}
                                            </div>
                                          </TableCell>
                                          <TableCell className="whitespace-normal">
                                            {recall.manufacturer}
                                          </TableCell>
                                          <TableCell className="whitespace-normal text-red-700">
                                            {recall.hazardType}
                                          </TableCell>
                                          <TableCell>{assignment.assignedDate}</TableCell>
                                          <TableCell>{assignment.dueDate}</TableCell>
                                          <TableCell>
                                            <Badge
                                              variant="outline"
                                              className={getAssignmentStatusColor(assignment.status)}
                                            >
                                              {assignment.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
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