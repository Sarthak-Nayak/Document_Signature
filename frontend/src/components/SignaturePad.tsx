import { useRef, forwardRef, useImperativeHandle } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
}

interface SignaturePadProps {
  onEnd?: () => void;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ onEnd }, ref) => {
  const sigRef = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    clear: () => sigRef.current?.clear(),
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
    toBlob: () =>
      new Promise((resolve) => {
        if (!sigRef.current || sigRef.current.isEmpty()) {
          resolve(null);
          return;
        }
        const canvas = sigRef.current.getCanvas();
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      }),
  }));

  return (
    <div className="overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white">
      <SignatureCanvas
        ref={sigRef}
        onEnd={onEnd}
        canvasProps={{
          className: 'w-full h-40 cursor-crosshair',
        }}
        penColor="#1e293b"
      />
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;
