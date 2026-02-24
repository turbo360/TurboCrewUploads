export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const k = 1024;
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds === Infinity || isNaN(seconds)) return '--';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}hr${hours > 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}min${minutes > 1 ? 's' : ''}`);
  }

  if (hours === 0 && minutes < 5 && secs > 0) {
    parts.push(`${secs}sec${secs > 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(' ') : '< 1sec';
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return formatTime(seconds);
}

export function formatTimeRemaining(bytes: number, bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '--';
  const seconds = Math.ceil(bytes / bytesPerSecond);
  return formatTime(seconds);
}

export function formatTimeOfDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
