import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
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
  Search,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  FileText,
} from 'lucide-react';

interface Listing {
  id: string;
  listingId: string;
  marketplace: string;
  title: string;
  seller: string;
  price: string;
  datePosted: string;
  url: string;
  status: 'Pending Review' | 'True Violation' | 'False Positive';
  annotation?: string;
  violationType?: string;
}

interface Violation {
  id: string;
  listingId: string;
  recallId: string;
  productName: string;
  marketplace: string;
  seller: string;
  dateCreated: string;
  status:
    | 'Under Review'
    | 'Violation Confirmed'
    | 'Notice Sent'
    | 'Awaiting Response'
    | 'Resolved'
    | 'Escalated';
  adjudicationStatus?: string;
  notes?: string;
}

export function InvestigatorView() {
  const [activeTab, setActiveTab] = useState('search');
  const [showCreateViolation, setShowCreateViolation] = useState(false);
  const [showAnnotateDialog, setShowAnnotateDialog] = useState(false);
  const [showSendNoticeDialog, setShowSendNoticeDialog] = useState(false);
  const [showAdjudicateDialog, setShowAdjudicateDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(
    null
  );

  const [listings, setListings] = useState<Listing[]>([
    {
      id: 'L001',
      listingId: 'eBay-4567890',
      marketplace: 'eBay',
      title: 'SafeHome Child Safety Gate X200 - Excellent Condition',
      seller: 'homegoodsseller123',
      price: '$45.99',
      datePosted: '2026-02-10',
      url: 'https://ebay.com/...',
      status: 'Pending Review',
    },
    {
      id: 'L002',
      listingId: 'Craigslist-7894561',
      marketplace: 'Craigslist',
      title: 'Baby Gate X200-2024 Model - Like New',
      seller: 'local_parent',
      price: '$40.00',
      datePosted: '2026-02-12',
      url: 'https://craigslist.org/...',
      status: 'Pending Review',
    },
    {
      id: 'L003',
      listingId: 'Mercari-3216549',
      marketplace: 'Mercari',
      title: 'SafeHome Gate for Kids',
      seller: 'quickseller99',
      price: '$38.50',
      datePosted: '2026-02-08',
      url: 'https://mercari.com/...',
      status: 'True Violation',
      annotation: 'Confirmed match - exact model number X200-2024',
      violationType: 'Recalled Product Sale',
    },
  ]);

  const [violations, setViolations] = useState<Violation[]>([
    {
      id: 'V001',
      listingId: 'eBay-4567890',
      recallId: 'RC-2026-001',
      productName: 'Child Safety Gate Model X200',
      marketplace: 'eBay',
      seller: 'homegoodsseller123',
      dateCreated: '2026-02-14',
      status: 'Notice Sent',
      notes: 'Initial notice sent to seller and eBay',
    },
    {
      id: 'V002',
      listingId: 'Mercari-3216549',
      recallId: 'RC-2026-001',
      productName: 'Child Safety Gate Model X200',
      marketplace: 'Mercari',
      seller: 'quickseller99',
      dateCreated: '2026-02-13',
      status: 'Awaiting Response',
      notes: 'Seller contacted, awaiting confirmation',
    },
  ]);

  const openAnnotateDialog = (listing: Listing) => {
    setSelectedListing(listing);
    setShowAnnotateDialog(true);
  };

  const openCreateViolationDialog = (listing: Listing) => {
    setSelectedListing(listing);
    setShowCreateViolation(true);
  };

  const openSendNoticeDialog = (violation: Violation) => {
    setSelectedViolation(violation);
    setShowSendNoticeDialog(true);
  };

  const openAdjudicateDialog = (violation: Violation) => {
    setSelectedViolation(violation);
    setShowAdjudicateDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'True Violation':
      case 'Violation Confirmed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'False Positive':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'True Violation':
      case 'Violation Confirmed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'False Positive':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Notice Sent':
      case 'Awaiting Response':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Investigator Dashboard
            </h1>
            <Badge variant="outline" className="text-sm">
              Sprint 2 & 3: Create & Manage Violations
            </Badge>
          </div>
          <p className="text-gray-600">
            Assigned Recall: Child Safety Gate Model X200 (RC-2026-001)
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="search">Search Listings</TabsTrigger>
            <TabsTrigger value="violations">Active Violations</TabsTrigger>
            <TabsTrigger value="responses">Seller Responses</TabsTrigger>
          </TabsList>

          {/* Tab 1: Search and Annotate Listings */}
          <TabsContent value="search">
            <Card className="p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">
                Search Marketplace Listings
              </h3>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="searchQuery">Search Query</Label>
                  <Input
                    id="searchQuery"
                    placeholder="SafeHome X200-2024"
                    className="mt-1"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="marketplace">Marketplace</Label>
                  <Select>
                    <SelectTrigger id="marketplace" className="mt-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Marketplaces</SelectItem>
                      <SelectItem value="ebay">eBay</SelectItem>
                      <SelectItem value="craigslist">Craigslist</SelectItem>
                      <SelectItem value="mercari">Mercari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Search by manufacturer name, model number, or product
                description
              </p>
            </Card>

            <div className="space-y-4">
              {listings.map((listing) => (
                <Card key={listing.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {listing.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(listing.status)}
                        >
                          {getStatusIcon(listing.status)}
                          <span className="ml-1">{listing.status}</span>
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Listing ID</p>
                          <p className="font-medium">{listing.listingId}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Marketplace</p>
                          <p className="font-medium">{listing.marketplace}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Seller</p>
                          <p className="font-medium">{listing.seller}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Price</p>
                          <p className="font-medium">{listing.price}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {listing.annotation && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Annotation:
                      </p>
                      <p className="text-sm text-blue-800">
                        {listing.annotation}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Listing
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAnnotateDialog(listing)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Annotate
                    </Button>
                    {listing.status === 'True Violation' && (
                      <Button
                        size="sm"
                        onClick={() => openCreateViolationDialog(listing)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Violation
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab 2: Active Violations */}
          <TabsContent value="violations">
            <div className="space-y-4">
              {violations.map((violation) => (
                <Card key={violation.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-lg">
                          Violation {violation.id}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(violation.status)}
                        >
                          {violation.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Product
                          </p>
                          <p className="font-medium text-sm">
                            {violation.productName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Marketplace
                          </p>
                          <p className="font-medium text-sm">
                            {violation.marketplace}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Seller</p>
                          <p className="font-medium text-sm">
                            {violation.seller}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Recall ID
                          </p>
                          <p className="font-medium text-sm">
                            {violation.recallId}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Date Created
                          </p>
                          <p className="font-medium text-sm">
                            {violation.dateCreated}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Listing ID
                          </p>
                          <p className="font-medium text-sm">
                            {violation.listingId}
                          </p>
                        </div>
                      </div>

                      {violation.notes && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm font-medium text-yellow-900 mb-1">
                            Notes:
                          </p>
                          <p className="text-sm text-yellow-800">
                            {violation.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSendNoticeDialog(violation)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Notice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdjudicateDialog(violation)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Adjudicate
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab 3: Seller Responses */}
          <TabsContent value="responses">
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Seller Responses (Sprint 3)
              </h3>
              <p className="text-gray-600">
                Review and process responses from sellers and marketplaces
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Annotate Dialog */}
        <Dialog open={showAnnotateDialog} onOpenChange={setShowAnnotateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Annotate Listing</DialogTitle>
              <DialogDescription>
                Mark this listing as a true violation or false positive
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="violationStatus">Violation Status</Label>
                <Select>
                  <SelectTrigger id="violationStatus" className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True Violation</SelectItem>
                    <SelectItem value="false">False Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="violationType">Violation Type</Label>
                <Select>
                  <SelectTrigger id="violationType" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recalled">
                      Recalled Product Sale
                    </SelectItem>
                    <SelectItem value="similar">
                      Similar Model (Not Recalled)
                    </SelectItem>
                    <SelectItem value="different">
                      Different Product
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="annotation">Commentary / Notes</Label>
                <Textarea
                  id="annotation"
                  placeholder="Provide details about the violation or why this is a false positive..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAnnotateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowAnnotateDialog(false)}>
                Save Annotation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Violation Dialog */}
        <Dialog
          open={showCreateViolation}
          onOpenChange={setShowCreateViolation}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Violation Record</DialogTitle>
              <DialogDescription>
                Create a formal violation record for this listing (Sprint 2:
                Create Violation)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Listing ID</Label>
                  <Input
                    value={selectedListing?.listingId}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Marketplace</Label>
                  <Input
                    value={selectedListing?.marketplace}
                    disabled
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="recallId">Recall ID</Label>
                <Select>
                  <SelectTrigger id="recallId" className="mt-1">
                    <SelectValue placeholder="Select recall" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rc001">
                      RC-2026-001 - Child Safety Gate
                    </SelectItem>
                    <SelectItem value="rc002">
                      RC-2026-002 - Toy Car
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="violationDate">Date of Violation</Label>
                <Input
                  id="violationDate"
                  type="date"
                  defaultValue="2026-02-17"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="investigatorNotes">
                  Investigator Notes (Required)
                </Label>
                <Textarea
                  id="investigatorNotes"
                  placeholder="Document the violation details, evidence, and initial assessment..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateViolation(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowCreateViolation(false)}>
                Create Violation (D4)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Notice Dialog */}
        <Dialog
          open={showSendNoticeDialog}
          onOpenChange={setShowSendNoticeDialog}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Violation Notice</DialogTitle>
              <DialogDescription>
                Contact seller and/or marketplace about this violation (Sprint
                3: Respond to Violation)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Violation ID</Label>
                <Input
                  value={selectedViolation?.id}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="recipient">Send Notice To</Label>
                <Select>
                  <SelectTrigger id="recipient" className="mt-1">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Seller Only</SelectItem>
                    <SelectItem value="marketplace">
                      Marketplace Only
                    </SelectItem>
                    <SelectItem value="both">
                      Both Seller and Marketplace
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="noticeMessage">Notice Message</Label>
                <Textarea
                  id="noticeMessage"
                  defaultValue="This listing has been identified as containing a recalled product (Recall ID: RC-2026-001). Please remove the listing immediately and cease sale of this product."
                  rows={6}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="responseDate">Response Due Date</Label>
                <Input
                  id="responseDate"
                  type="date"
                  className="mt-1"
                  defaultValue="2026-02-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSendNoticeDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowSendNoticeDialog(false)}>
                <Send className="w-4 h-4 mr-2" />
                Send Notice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjudicate Dialog */}
        <Dialog
          open={showAdjudicateDialog}
          onOpenChange={setShowAdjudicateDialog}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adjudicate Violation</DialogTitle>
              <DialogDescription>
                Make final decision on violation status (Sprint 3: Adjudicate
                Violation)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Violation ID</Label>
                <Input
                  value={selectedViolation?.id}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="adjudicationStatus">Adjudication Status</Label>
                <Select>
                  <SelectTrigger id="adjudicationStatus" className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resolutionReason">Resolution Reason</Label>
                <Select>
                  <SelectTrigger id="resolutionReason" className="mt-1">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="removed">Listing Removed</SelectItem>
                    <SelectItem value="edited">Listing Edited</SelectItem>
                    <SelectItem value="different">
                      Different Model Confirmed
                    </SelectItem>
                    <SelectItem value="batch">
                      Different Batch Confirmed
                    </SelectItem>
                    <SelectItem value="unresponsive">
                      Seller Unresponsive
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="decisionDate">Decision Date</Label>
                <Input
                  id="decisionDate"
                  type="date"
                  className="mt-1"
                  defaultValue="2026-02-17"
                />
              </div>
              <div>
                <Label htmlFor="adjudicationNotes">
                  Adjudication Notes (Required)
                </Label>
                <Textarea
                  id="adjudicationNotes"
                  placeholder="Document the final decision and reasoning..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAdjudicateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowAdjudicateDialog(false)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Decision (D6)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
