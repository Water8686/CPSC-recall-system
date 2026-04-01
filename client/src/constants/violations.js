export const MARKETPLACES = ['eBay', 'Craigslist', 'Amazon', 'Facebook Marketplace', 'Etsy', 'Other'];

export const VIOLATION_STATUS_TABS = ['All', 'Open', 'Notice Sent', 'Response Received', 'Closed'];

export function statusColor(status) {
  switch (status) {
    case 'Open': return 'warning';
    case 'Notice Sent': return 'info';
    case 'Response Received': return 'secondary';
    case 'Closed': return 'default';
    default: return 'default';
  }
}
