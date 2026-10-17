export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatUserDisplayName(email?: string | null): string {
  if (!email) return 'Gautam Kumar'
  const username = email.split('@')[0]
  // Normalize if it contains gautamkumar or gautam kumar with or without numbers
  if (/^gautam\s*kumar/i.test(username) || /^gautamkumar/i.test(username)) {
    return 'Gautam Kumar'
  }
  // Remove trailing numbers (e.g. name80004 -> name)
  const clean = username.replace(/\d+$/, '')
  const parts = clean.split(/[._-]+/).filter(Boolean)
  if (parts.length > 1) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }
  if (!clean) return 'Gautam Kumar'
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}
