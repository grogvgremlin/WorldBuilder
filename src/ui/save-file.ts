// Hands the viewer a file to keep: the iPhone share sheet ("Save to Files") where it exists,
// otherwise a download. Design: CLAUDE.md "No server": data leaves only by the user's export.

export async function saveFile(name: string, text: string, type: string): Promise<void> {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch {
      // cancelled or unavailable: fall back to a download link
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
