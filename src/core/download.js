/** Keep the object URL alive long enough for browsers to start reading it. */
export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error('导出文件为空');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
