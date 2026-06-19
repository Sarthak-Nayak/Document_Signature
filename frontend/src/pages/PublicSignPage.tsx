import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../lib/api';
import PDFSigner from '../components/PDFSigner';
import SignaturePad, { SignaturePadRef } from '../components/SignaturePad';
import StatusBadge from '../components/StatusBadge';
import { DocumentItem } from '../types';
import { usePdfFile } from '../hooks/usePdfFile';

export default function PublicSignPage() {
  const { token } = useParams<{ token: string }>();
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [savedSignatureId, setSavedSignatureId] = useState<string | null>(null);
  const [signatureField, setSignatureField] = useState<{ x: number; y: number; page: number } | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const sigPadRef = useRef<SignaturePadRef>(null);

  const fileUrl = token ? `/docs/share/${token}/file` : '';
  const { file: pdfFile, loading: pdfLoading, error: pdfError } = usePdfFile(fileUrl, false);

  const [signatures, setSignatures] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      publicApi.get(`/docs/share/${token}`),
      publicApi.get(`/signatures/document/${token}/public`),
    ])
      .then(([docRes, sigRes]) => {
        setDocument(docRes.data.document);
        if (docRes.data.document.status === 'signed') setCompleted(true);
        const sigs = sigRes.data.signatures;
        setSignatures(sigs);

        const pendingSig = sigs.find((s: any) => s.status === 'pending');
        if (pendingSig) {
          setSavedSignatureId(pendingSig._id);
          setSignatureField({ x: pendingSig.x, y: pendingSig.y, page: pendingSig.page });
          if (pendingSig.signerName) setSignerName(pendingSig.signerName);
          if (pendingSig.signerEmail) setSignerEmail(pendingSig.signerEmail);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleFieldPlaced = async (field: { x: number; y: number; page: number }) => {
    if (!signerName.trim()) {
      alert('Please enter your name before placing a signature field');
      return;
    }

    setSignatureField(field);
    try {
      const { data } = await publicApi.post('/signatures/public', {
        shareToken: token,
        signerName,
        signerEmail,
        x: field.x,
        y: field.y,
        page: field.page,
        width: 150,
        height: 50,
      });
      setSavedSignatureId(data.signature.id);

      const sigRes = await publicApi.get(`/signatures/document/${token}/public`);
      setSignatures(sigRes.data.signatures);
    } catch {
      alert('Failed to save signature position');
    }
  };

  const handleFieldMoved = async (sigId: string, x: number, y: number) => {
    try {
      await publicApi.patch(`/signatures/public/${sigId}`, {
        shareToken: token,
        x,
        y,
      });
      setSignatures((prev) =>
        prev.map((s) => (s._id === sigId ? { ...s, x, y } : s))
      );
    } catch (err) {
      console.error('Failed to update signature position:', err);
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
      formData.append('shareToken', token!);
      formData.append('signatureImage', blob, 'signature.png');

      await publicApi.post('/signatures/finalize/public', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCompleted(true);
      setDocument((d) => (d ? { ...d, status: 'signed' } : d));
    } catch {
      alert('Failed to sign document');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Invalid or expired signing link</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-bold text-slate-900">Document Signed</h1>
          <p className="mt-2 text-sm text-slate-600">
            &ldquo;{document.title}&rdquo; has been signed successfully. The document owner has been notified via audit trail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              DS
            </div>
            <span className="text-lg font-semibold">Sign Document</span>
          </div>
          <StatusBadge status={document.status} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
          <p className="mt-1 text-sm text-slate-600">Please review and sign this document</p>
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
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Your Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full name *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email (optional)</label>
                  <input
                    type="email"
                    className="input-field"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Draw Signature</h2>
              <SignaturePad ref={sigPadRef} />
              <div className="mt-4 flex gap-2">
                <button onClick={() => sigPadRef.current?.clear()} className="btn-secondary flex-1">
                  Clear
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={!savedSignatureId || finalizing || !signerName.trim()}
                  className="btn-primary flex-1"
                >
                  {finalizing ? 'Signing...' : 'Sign Document'}
                </button>
              </div>
              {signatureField && (
                <p className="mt-2 text-xs text-slate-500">
                  Field on page {signatureField.page}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
