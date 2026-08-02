// Turns whatever articles are currently visible into a CSV download.

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportArticlesToCsv(articles, filename = 'signal-tracker-export.csv') {
  const headers = ['title', 'url', 'datePublished', 'category', 'description'];
  const rows = articles.map((a) =>
    headers
      .map((h) => {
        const val = h === 'category' ? (a.category || []).join('; ') : a[h];
        return escapeCsvField(val);
      })
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
