import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { DocumentItem } from '../types';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const { data } = await api.get('/docs/');
      setDocuments(data.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    setUploading(true);
    try {
      await api.post('/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      await fetchDocs();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url);
    alert('Signing link copied to clipboard!');
  };

  return (
    <>
      <Layout />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
            <p className="mt-1 text-sm text-slate-600">Upload, sign, and track your documents</p>
          </div>
        </div>

        <div className="card mb-8">
          <h2 className="mb-4 text-lg font-semibold">Upload Document</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Title (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Contract Agreement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">PDF File</label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                required
              />
            </div>
            <button type="submit" disabled={uploading} className="btn-primary whitespace-nowrap">
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-slate-500">No documents yet. Upload your first PDF to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-slate-700">Title</th>
                  <th className="px-6 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-6 py-3 font-medium text-slate-700">Created</th>
                  <th className="px-6 py-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={`/documents/${doc._id}`} className="font-medium text-brand-600 hover:underline">
                        {doc.title}
                      </Link>
                      <p className="text-xs text-slate-500">{doc.filename}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link to={`/documents/${doc._id}`} className="btn-secondary text-xs">
                          View
                        </Link>
                        {doc.shareToken && doc.status === 'pending' && (
                          <button
                            onClick={() => copyShareLink(doc.shareToken!)}
                            className="btn-secondary text-xs"
                          >
                            Copy link
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
