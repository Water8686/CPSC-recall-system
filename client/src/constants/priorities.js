export const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

export const PRIORITY_BG_COLORS = {
  High: { bgcolor: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' },
  Medium: { bgcolor: '#fff7ed', color: '#9a3412', borderColor: '#fdba74' },
  Low: { bgcolor: '#fefce8', color: '#854d0e', borderColor: '#fde047' },
};

export function getPriorityBgColor(priority) {
  return PRIORITY_BG_COLORS[priority] ?? { bgcolor: 'grey.100', color: 'text.secondary', borderColor: 'grey.300' };
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 'High': return 'error';
    case 'Medium': return 'warning';
    case 'Low': return 'success';
    default: return 'default';
  }
}
