/**
 * Convert external streaming URLs from various cloud storage providers
 * to direct playable URLs
 */

export function convertExternalUrl(url: string, type: string | null): string {
  if (!url || !type) return url;

  switch (type) {
    case "google_drive":
      return convertGoogleDriveUrl(url);
    case "dropbox":
      return convertDropboxUrl(url);
    case "onedrive":
      return convertOneDriveUrl(url);
    case "icloud":
      // iCloud direct streaming is complex and requires authentication
      // For now, return the original URL
      return url;
    case "direct":
    default:
      return url;
  }
}

function convertGoogleDriveUrl(url: string): string {
  // Google Drive share links: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // Convert to: https://drive.google.com/uc?export=download&id=FILE_ID
  
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
  }
  
  // Already in direct format
  if (url.includes("drive.google.com/uc")) {
    return url;
  }
  
  return url;
}

function convertDropboxUrl(url: string): string {
  // Dropbox share links: https://www.dropbox.com/s/TOKEN/filename.mp4?dl=0
  // Convert to: https://www.dropbox.com/s/TOKEN/filename.mp4?dl=1
  
  if (url.includes("dropbox.com")) {
    return url.replace("dl=0", "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }
  
  return url;
}

function convertOneDriveUrl(url: string): string {
  // OneDrive share links: https://onedrive.live.com/...
  // Convert to direct download link
  
  if (url.includes("onedrive.live.com")) {
    // Replace 'view.aspx' with 'download.aspx'
    return url.replace("view.aspx", "download.aspx");
  }
  
  return url;
}

/**
 * Validate if URL is accessible and playable
 */
export async function validateStreamUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
    return true; // no-cors means we can't check status, assume success if no error
  } catch {
    return false;
  }
}
