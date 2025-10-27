export function encodeChannelUserId(userId: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(userId).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  return userId.replace(/:/g, '-').replace(/\//g, '_').replace(/@/g, '-');
}

export function decodeChannelUserId(encodedId: string): string {
  if (typeof atob !== 'undefined') {
    try {
      let padded = encodedId.replace(/-/g, '+').replace(/_/g, '/');
      padded += '=='.slice(0, (4 - (padded.length % 4)) % 4);
      return atob(padded);
    } catch {
      return encodedId;
    }
  }
  return encodedId;
}
