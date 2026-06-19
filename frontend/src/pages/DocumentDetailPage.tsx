import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import PDFSigner from '../components/PDFSigner';
import SignaturePad, { SignaturePadRef } from '../components/SignaturePad';
import { DocumentItem, SignatureItem, AuditLogItem } from '../types';
import { usePdfFile, downloadPdf } from '../hooks/usePdfFile';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signatureField, setSignatureField] = useState<{ x: number; y: number; page: number } | null>(null);
  const [savedSignatureId, setSavedSignatureId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const sigPadRef = useRef<SignaturePadRef>(null);

  const fileUrl = id ? `/docs/${id}/file` : '';
  const { file: pdfFile, loading: pdfLoading, error: pdfError } = usePdfFile(fileUrl);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/docs/${id}`),
      api.get(`/signatures/${id}`),
      api.get(`/audit/${id}`),
    ])
      .then(([docRes, sigRes, auditRes]) => {
        setDocument(docRes.data.document);
        const sigs = sigRes.data.signatures;
        setSignatures(sigs);
        setAuditLogs(auditRes.data.auditLogs);

        // Restore active pending signature if one exists
        const pendingSig = sigs.find((s: any) => s.status === 'pending');
        if (pendingSig) {
          setSavedSignatureId(pendingSig._id);
          setSignatureField({ x: pendingSig.x, y: pendingSig.y, page: pendingSig.page });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleFieldPlaced = async (field: { x: number; y: number; page: number }) => {
    setSignatureField(field);
    try {
      const { data } = await api.post('/signatures', {
        documentId: id,
        x: field.x,
        y: field.y,
        page: field.page,
        width: 150,
        height: 50,
      });
      setSavedSignatureId(data.signature.id);
      // Reload signatures list to capture the newly added signature
      const sigsRes = await api.get(`/signatures/${id}`);
      setSignatures(sigsRes.data.signatures);
    } catch {
      alert('Failed to save signature position');
    }
  };

  const handleFieldMoved = async (sigId: string, x: number, y: number) => {
    try {
      await api.patch(`/signatures/${sigId}`, { x, y });
      setSignatures((prev) =>
        prev.map((s) => (s._id === sigId ? { ...s, x, y } : s))
      );
      // Refresh audit trail
      const auditRes = await api.get(`/audit/${id}`);
      setAuditLogs(auditRes.data.auditLogs);
    } catch {
      console.error('Failed to update signature position');
    }
  };

  const handleFinalize = async () => {
    if (!savedSignatureId || !sigPadRef.current) return;
    if (sigPadRef.current.isEmpty()) {
      alert('Please draw your signature first');
      return;
    }

    const blob = await sigPadRef.current.toBlob();
    if (!blob) return;

    setFinalizing(true);
    try {
      const formData = new FormData();
      formData.append('signatureId', savedSignatureId);
      formData.append('signatureImage', blob, 'signature.png');

      await api.post('/signatures/finalize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const [docRes, sigRes, auditRes] = await Promise.all([
        api.get(`/docs/${id}`),
        api.get(`/signatures/${id}`),
        api.get(`/audit/${id}`),
      ]);
      setDocument(docRes.data.document);
      setSignatures(sigRes.data.signatures);
      setAuditLogs(auditRes.data.auditLogs);
      alert('Document signed successfully!');
    } catch {
      alert('Failed to finalize signature');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Reject this document?')) return;
    try {
      await api.patch(`/docs/${id}/reject`);
      setDocument((d) => (d ? { ...d, status: 'rejected' } : d));
    } catch {
      alert('Failed to reject document');
    }
  };

  if (loading) {
    return (
      <>
        <Layout />
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </>
    );
  }

  if (!document) {
    return (
      <>
        <Layout />
        <div className="mx-auto max-w-6xl px-4 py-12 text-center">
          <p className="text-slate-500">Document not found</p>
          <Link to="/dashboard" className="mt-4 inline-block text-brand-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Layout />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
            ← Back to dashboard
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
              <p className="mt-1 text-sm text-slate-600">{document.filename}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={document.status} />
              {document.status === 'pending' && (
                <button onClick={handleReject} className="btn-secondary text-red-600">
                  Reject
                </button>
              )}
              {document.status === 'signed' && (
                <button
                  onClick={() => downloadPdf(fileUrl, document.filename)}
                  className="btn-primary"
                >
                  Download signed PDF
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card overflow-x-auto">
              <PDFSigner
                file={pdfFile}
                loading={pdfLoading}
                error={pdfError}
                onFieldPlaced={handleFieldPlaced}
                onFieldMoved={handleFieldMoved}
                existingFields={signatures.map((s) => ({
                  id: s._id,
                  x: s.x,
                  y: s.y,
                  page: s.page,
                  width: s.width,
                  height: s.height,
                }))}
                readOnly={document.status !== 'pending'}
              />
            </div>
          </div>

          <div className="space-y-6">
            {document.status === 'pending' && (
              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">Draw Signature</h2>
                <SignaturePad ref={sigPadRef} />
                <div className="mt-4 flex gap-2">
                  <button onClick={() => sigPadRef.current?.clear()} className="btn-secondary flex-1">
                    Clear
                  </button>
                  <button
                    onClick={handleFinalize}
                    disabled={!savedSignatureId || finalizing}
                    className="btn-primary flex-1"
                  >
                    {finalizing ? 'Signing...' : 'Sign & Finalize'}
                  </button>
                </div>
                {signatureField && (
                  <p className="mt-2 text-xs text-slate-500">
                    Field placed on page {signatureField.page} at ({Math.round(signatureField.x)}, {Math.round(signatureField.y)})
                  </p>
                )}
              </div>
            )}

            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Signatures</h2>
              {signatures.length === 0 ? (
                <p className="text-sm text-slate-500">No signatures yet</p>
              ) : (
                <ul className="space-y-3">
                  {signatures.map((sig) => (
                    <li key={sig._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{sig.signerName || 'Owner'}</span>
                        <StatusBadge status={sig.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Page {sig.page} · ({sig.x}, {sig.y})
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Audit Trail</h2>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No audit events</p>
              ) : (
                <ul className="max-h-64 space-y-3 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <li key={log._id} className="border-l-2 border-brand-200 pl-3 text-sm">
                      <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                      {log.details && <p className="text-xs text-slate-500">{log.details}</p>}
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                        {log.ipAddress && ` · IP: ${log.ipAddress}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
