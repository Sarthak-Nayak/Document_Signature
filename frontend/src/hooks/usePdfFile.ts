import { useEffect, useState } from 'react';
import api, { publicApi } from '../lib/api';

export function usePdfFile(url: string, authenticated = true) {
  const [file, setFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let blobUrl: string | null = null;
    setLoading(true);
    setError(null);
    setFile(null);

    const request = authenticated
      ? api.get(url, { responseType: 'blob' })
      : publicApi.get(url, { responseType: 'blob' });

    request
      .then((res) => {
        blobUrl = URL.createObjectURL(res.data);
        setFile(blobUrl);
      })
      .catch(() => setError('Failed to load PDF'))
      .finally(() => setLoading(false));

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url, authenticated]);

  return { file, error, loading };
}

export async function downloadPdf(url: string, filename: string, authenticated = true) {
  const { data } = authenticated
    ? await api.get(url, { responseType: 'blob' })
    : await publicApi.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}
