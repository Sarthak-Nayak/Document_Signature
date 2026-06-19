import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface SignatureField {
  id: string;
  x: number;
  y: number;
  page: number;
  width?: number;
  height?: number;
}

interface PDFSignerProps {
  file: string | null;
  loading?: boolean;
  error?: string | null;
  onFieldPlaced: (field: Omit<SignatureField, 'id'>) => void;
  onFieldMoved?: (id: string, x: number, y: number) => void;
  existingFields?: SignatureField[];
  readOnly?: boolean;
}

function DraggableField({
  id,
  x,
  y,
  width,
  height,
  readOnly,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: readOnly,
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    left: x,
    top: y,
    width,
    height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(readOnly ? {} : listeners)}
      {...(readOnly ? {} : attributes)}
      className={`absolute z-10 flex items-center justify-center rounded border-2 border-brand-500 bg-brand-50/90 text-xs font-semibold text-brand-700 shadow-sm ${
        readOnly
          ? 'cursor-default border-slate-300 bg-slate-100/90 text-slate-400'
          : 'cursor-grab active:cursor-grabbing hover:border-brand-600 hover:bg-brand-100/90'
      }`}
    >
      Sign here
    </div>
  );
}

function PDFDropZone({
  pageNumber,
  children,
  onClick,
}: {
  pageNumber: number;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent, page: number) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `page-${pageNumber}` });

  return (
    <div
      ref={setNodeRef}
      className="relative inline-block"
      onClick={(e) => onClick(e, pageNumber)}
    >
      {children}
    </div>
  );
}

export default function PDFSigner({
  file,
  loading = false,
  error = null,
  onFieldPlaced,
  onFieldMoved,
  existingFields = [],
  readOnly = false,
}: PDFSignerProps) {
  const [numPages, setNumPages] = useState(0);
  const [fields, setFields] = useState<SignatureField[]>(existingFields);
  const [activePage, setActivePage] = useState(1);
  const [pageDimensions, setPageDimensions] = useState<
    Record<number, { width: number; height: number }>
  >({});

  // Keep fields synchronized with incoming prop updates
  useEffect(() => {
    setFields(existingFields);
  }, [existingFields]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      if (!delta.x && !delta.y) return;

      let updatedField: SignatureField | null = null;

      setFields((prev) =>
        prev.map((f) => {
          if (f.id === active.id) {
            const pageData = pageDimensions[f.page];
            const scale = pageData ? pageData.width / 600 : 1;

            const newX = Math.max(0, f.x + delta.x * scale);
            const newY = Math.max(0, f.y + delta.y * scale);
            updatedField = { ...f, x: newX, y: newY };
            return updatedField;
          }
          return f;
        })
      );

      if (updatedField && onFieldMoved) {
        onFieldMoved(
          (updatedField as SignatureField).id,
          (updatedField as SignatureField).x,
          (updatedField as SignatureField).y
        );
      }
    },
    [pageDimensions, onFieldMoved]
  );

  const handlePageClick = (e: React.MouseEvent, page: number) => {
    if (readOnly) return;
    // Do not place field if clicking directly on a signature box
    if ((e.target as HTMLElement).closest('.cursor-grab') || (e.target as HTMLElement).closest('.cursor-default')) {
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left - 75; // 75 is half of 150px
    const clickY = e.clientY - rect.top - 25;  // 25 is half of 50px

    const pageData = pageDimensions[page];
    const scale = pageData ? pageData.width / 600 : 1;

    const originalX = Math.max(0, clickX * scale);
    const originalY = Math.max(0, clickY * scale);

    const field: SignatureField = {
      id: `field-${Date.now()}`,
      x: originalX,
      y: originalY,
      page,
      width: 150,
      height: 50,
    };

    setFields((prev) => [...prev, field]);
    onFieldPlaced({
      x: field.x,
      y: field.y,
      page: field.page,
      width: field.width,
      height: field.height,
    });
    setActivePage(page);
  };

  const addFieldAtCenter = () => {
    const pageData = pageDimensions[activePage];
    const originalWidth = pageData ? pageData.width : 600;
    const originalHeight = pageData ? pageData.height : 800;

    // Place in center of page coordinates
    const field: SignatureField = {
      id: `field-${Date.now()}`,
      x: (originalWidth - 150) / 2,
      y: (originalHeight - 50) / 2,
      page: activePage,
      width: 150,
      height: 50,
    };

    setFields((prev) => [...prev, field]);
    onFieldPlaced({
      x: field.x,
      y: field.y,
      page: field.page,
      width: field.width,
      height: field.height,
    });
  };

  return (
    <div>
      {!readOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={addFieldAtCenter} className="btn-secondary">
            Add signature field
          </button>
          <p className="text-sm text-slate-500">
            Click on the PDF page or click the button to add a field, then drag to reposition.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <span className="ml-2 text-sm text-slate-500">Loading PDF document...</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {file && (
        <DndContext onDragEnd={handleDragEnd}>
          <Document file={file} onLoadSuccess={({ numPages: n }) => setNumPages(n)}>
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              const pageFields = fields.filter((f) => f.page === pageNum);

              return (
                <PDFDropZone key={pageNum} pageNumber={pageNum} onClick={handlePageClick}>
                  <Page
                    pageNumber={pageNum}
                    width={600}
                    onLoadSuccess={(page) => {
                      setPageDimensions((prev) => ({
                        ...prev,
                        [pageNum]: { width: page.originalWidth, height: page.originalHeight },
                      }));
                    }}
                    className="mb-4 shadow-md"
                  />
                  {pageFields.map((field) => {
                    const pageData = pageDimensions[pageNum];
                    const renderScale = pageData ? 600 / pageData.width : 1;

                    return (
                      <DraggableField
                        key={field.id}
                        id={field.id}
                        x={field.x * renderScale}
                        y={field.y * renderScale}
                        width={(field.width || 150) * renderScale}
                        height={(field.height || 50) * renderScale}
                        readOnly={readOnly}
                      />
                    );
                  })}
                </PDFDropZone>
              );
            })}
          </Document>
        </DndContext>
      )}
    </div>
  );
}
