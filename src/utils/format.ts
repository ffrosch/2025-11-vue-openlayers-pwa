/**
 * Format utilities for displaying human-readable data
 */

/**
 * Convert bytes to human-readable format (Bytes, KB, MB, GB, TB)
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
