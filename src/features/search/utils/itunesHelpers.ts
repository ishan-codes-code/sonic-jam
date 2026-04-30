export const formatDuration = (ms: number): string => {
  if (!ms) return '0:00';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const upgradeArtwork = (url?: string): string | undefined => {
  if (!url) return undefined;
  return url.replace('100x100bb', '600x600bb');
};

export const extractYear = (dateString?: string): string => {
  if (!dateString) return '';
  return new Date(dateString).getFullYear().toString();
};
