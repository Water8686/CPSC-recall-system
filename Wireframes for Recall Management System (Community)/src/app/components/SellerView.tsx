import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  FileText,
  Clock,
} from 'lucide-react';

interface ViolationNotice {
  id: string;
  violationId: string;
  recallId: string;
  productName: string;
  listingId: string;
  marketplace: string;
  dateReceived: string;
  dueDate: string;
  status: 'Pending Response' | 'Response Submitted' | 'Resolved' | 'Escalated';
  message: string;
  sellerResponse?: string;
  responseDate?: string;
}

export function SellerView() {
  const [activeTab, setActiveTab] = useState('notices');
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<ViolationNotice | null>(
    null
  );

  const [notices, setNotices] = useState<ViolationNotice[]>([
    {
      id: 'N001',
      violationId: 'V001',
      recallId: 'RC-2026-001',
      productName: 'Child Safety Gate Model X200',
      listingId: 'eBay-4567890',
      marketplace: 'eBay',
      dateReceived: '2026-02-14',
      dueDate: '2026-02-21',
      status: 'Pending Response',
      message:
        'Your listing (eBay-4567890) has been identified as containing a recalled product. The SafeHome Child Safety Gate Model X200 (Model: X200-2024) was recalled on January 15, 2026 due to entrapment and strangulation hazards. You are required to immediately remove this listing and cease sale of this product. Please respond within 7 days confirming removal or providing evidence that this listing does not violate the recall.',
    },
    {
      id: 'N002',
      violationId: 'V003',
      recallId: 'RC-2026-002',
      productName: 'Battery-Powered Toy Car',
      listingId: 'eBay-7891234',
      marketplace: 'eBay',
      dateReceived: '2026-02-10',
      dueDate: '2026-02-17',
      status: 'Response Submitted',
      message:
        'Your listing for the TechPlay Battery-Powered Toy Car (Model: TP-CAR-500) matches a recalled product. Please confirm removal or provide documentation.',
      sellerResponse:
        'I have removed the listing immediately. The product has been disposed of properly and I will not list similar recalled products in the future.',
      responseDate: '2026-02-11',
    },
  ]);

  const openRespondDialog = (notice: ViolationNotice) => {
    setSelectedNotice(notice);
    setShowRespondDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending Response':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Response Submitted':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Escalated':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Response':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Response Submitted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Escalated':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status !== 'Pending Response') return false;
    const due = new Date(dueDate);
    const today = new Date('2026-02-17'); // Using current date from context
    return today > due;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Seller Portal - Violation Notices
            </h1>
            <Badge variant="outline" className="text-sm">
              Sprint 3: Respond to Violation
            </Badge>
          </div>
          <p className="text-gray-600">
            Seller Account: homegoodsseller123
          </p>
        </div>

        {/* Alert Banner for Pending Notices */}
        {notices.some((n) => n.status === 'Pending Response') && (
          <Card className="p-4 mb-6 bg-yellow-50 border-yellow-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">
                  Action Required
                </p>
                <p className="text-sm text-yellow-800">
                  You have{' '}
                  {notices.filter((n) => n.status === 'Pending Response').length}{' '}
                  violation notice(s) requiring your response. Please review and
                  respond promptly to avoid further action.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="notices">Violation Notices</TabsTrigger>
            <TabsTrigger value="history">Response History</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* Tab 1: Active Notices */}
          <TabsContent value="notices">
            <div className="space-y-4">
              {notices.map((notice) => (
                <Card
                  key={notice.id}
                  className={`p-6 ${
                    isOverdue(notice.dueDate, notice.status)
                      ? 'border-red-500 border-2'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-lg">
                          Violation Notice: {notice.id}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(notice.status)}
                        >
                          {getStatusIcon(notice.status)}
                          <span className="ml-1">{notice.status}</span>
                        </Badge>
                        {isOverdue(notice.dueDate, notice.status) && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            OVERDUE
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Product
                          </p>
                          <p className="font-medium text-sm">
                            {notice.productName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Listing ID
                          </p>
                          <p className="font-medium text-sm">
                            {notice.listingId}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Marketplace
                          </p>
                          <p className="font-medium text-sm">
                            {notice.marketplace}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Recall ID
                          </p>
                          <p className="font-medium text-sm">
                            {notice.recallId}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Date Received
                          </p>
                          <p className="font-medium text-sm">
                            {notice.dateReceived}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Response Due
                          </p>
                          <p
                            className={`font-medium text-sm ${
                              isOverdue(notice.dueDate, notice.status)
                                ? 'text-red-600'
                                : ''
                            }`}
                          >
                            {notice.dueDate}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 p-4 bg-white rounded-lg border">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Violation Details:
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {notice.message}
                        </p>
                      </div>

                      {notice.sellerResponse && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-medium text-blue-900">
                              Your Response (Submitted {notice.responseDate}):
                            </p>
                          </div>
                          <p className="text-sm text-blue-800">
                            {notice.sellerResponse}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {notice.status === 'Pending Response' && (
                          <Button onClick={() => openRespondDialog(notice)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Submit Response
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          View Full Recall Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab 2: Response History */}
          <TabsContent value="history">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Response History</h3>
              <div className="space-y-4">
                {notices
                  .filter((n) => n.sellerResponse)
                  .map((notice) => (
                    <div
                      key={notice.id}
                      className="p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          Notice {notice.id} - {notice.productName}
                        </p>
                        <Badge
                          variant="outline"
                          className={getStatusColor(notice.status)}
                        >
                          {notice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Response submitted: {notice.responseDate}
                      </p>
                      <p className="text-sm text-gray-700">
                        {notice.sellerResponse}
                      </p>
                    </div>
                  ))}
              </div>
            </Card>
          </TabsContent>

          {/* Tab 3: Resources */}
          <TabsContent value="resources">
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6">
                <FileText className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">
                  Understanding Recalls
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Learn about product recalls, your responsibilities as a
                  seller, and how to avoid violations.
                </p>
                <Button variant="outline" size="sm">
                  Read More
                </Button>
              </Card>
              <Card className="p-6">
                <MessageSquare className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">
                  Contact CPSC Support
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Have questions about a violation notice? Contact our support
                  team for assistance.
                </p>
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
              </Card>
              <Card className="p-6">
                <CheckCircle className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">
                  Compliance Checklist
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use our checklist to ensure your listings comply with product
                  safety regulations.
                </p>
                <Button variant="outline" size="sm">
                  View Checklist
                </Button>
              </Card>
              <Card className="p-6">
                <AlertCircle className="w-8 h-8 text-orange-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">
                  Current Recall List
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  View the current list of recalled products to ensure
                  compliance before listing.
                </p>
                <Button variant="outline" size="sm">
                  View Recalls
                </Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Respond Dialog */}
        <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Violation Notice</DialogTitle>
              <DialogDescription>
                Provide your response to this violation notice (Sprint 3:
                Respond to Violation - D5)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Violation ID:</p>
                <p className="font-medium">{selectedNotice?.id}</p>
              </div>
              <div>
                <Label htmlFor="responseType">Response Type</Label>
                <Select>
                  <SelectTrigger id="responseType" className="mt-1">
                    <SelectValue placeholder="Select response type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="removed">
                      Listing Removed - Violation Acknowledged
                    </SelectItem>
                    <SelectItem value="different">
                      Different Model - Not Subject to Recall
                    </SelectItem>
                    <SelectItem value="batch">
                      Different Batch - Not Affected by Recall
                    </SelectItem>
                    <SelectItem value="error">
                      Error - Listing Does Not Match
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sellerResponseText">
                  Your Response (Required)
                </Label>
                <Textarea
                  id="sellerResponseText"
                  placeholder="Provide detailed explanation of your response. Include any relevant information such as confirmation of listing removal, proof of different model/batch, or explanation of why this is not a violation..."
                  rows={6}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supportingDocs">
                  Supporting Documentation (Optional)
                </Label>
                <Input
                  id="supportingDocs"
                  type="file"
                  className="mt-1"
                  multiple
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload photos, receipts, or other documents to support your
                  response
                </p>
              </div>
              <div>
                <Label htmlFor="contactMethod">
                  Preferred Contact Method
                </Label>
                <Select>
                  <SelectTrigger id="contactMethod" className="mt-1">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="message">
                      Marketplace Message
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRespondDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowRespondDialog(false)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Submit Response (D5)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
