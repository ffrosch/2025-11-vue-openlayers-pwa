import { describe, it, expect } from 'vitest'
import { formatBytes } from '@/utils/format'

describe('formatBytes', () => {
  it('should format 0 bytes as "0 Bytes"', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('should format 1024 bytes as "1 KB"', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('should format 1,048,576 bytes as "1 MB"', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
  })

  it('should format 1,073,741,824 bytes as "1 GB"', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('should format 1,099,511,627,776 bytes as "1 TB"', () => {
    expect(formatBytes(1099511627776)).toBe('1 TB')
  })

  it('should format 1500 bytes as "1.46 KB" (rounded)', () => {
    const result = formatBytes(1500)
    expect(result).toMatch(/1\.4[56] KB/)
  })

  it('should format 25,600,000 bytes as "24.41 MB"', () => {
    const result = formatBytes(25600000)
    expect(result).toMatch(/24\.4[0-1] MB/)
  })

  it('should format 512 bytes as "512 Bytes"', () => {
    expect(formatBytes(512)).toBe('512 Bytes')
  })

  it('should format 2048 bytes as "2 KB"', () => {
    expect(formatBytes(2048)).toBe('2 KB')
  })
})
