export const MARKETPLACES = ['eBay', 'Craigslist', 'Amazon', 'Facebook Marketplace', 'Etsy', 'Other'];

export const VIOLATION_STATUS_TABS = [
  'All',
  'Open',
  'Notice Sent',
  'RESPONSE SUBMITTED',
  'APPROVED',
  'REJECTED',
  'ESCALATED',
  'ARCHIVED',
];

export function statusColor(status) {
  switch (status) {
    case 'Open': return 'warning';
    case 'Notice Sent': return 'info';
    case 'RESPONSE SUBMITTED': return 'secondary';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    case 'ESCALATED': return 'warning';
    case 'ARCHIVED': return 'default';
    default: return 'default';
  }
}

export { VIOLATION_TYPES } from 'shared';

export const MARKETPLACE_COLORS = {
  eBay: { bg: '#e3f2fd', text: '#0D47A1' },
  Amazon: { bg: '#fff3e0', text: '#e65100' },
  Walmart: { bg: '#e8eaf6', text: '#283593' },
  Craigslist: { bg: '#e0f2f1', text: '#00695c' },
  'Facebook Marketplace': { bg: '#e3f2fd', text: '#1565c0' },
  Etsy: { bg: '#fce4ec', text: '#c62828' },
  Other: { bg: '#f5f5f5', text: '#616161' },
};

export const SOURCE_COLORS = {
  'eBay API': { bg: '#e8f5e9', text: '#2e7d32' },
  Zyte: { bg: '#fce4ec', text: '#c62828' },
  Manual: { bg: '#f3e5f5', text: '#6a1b9a' },
};
