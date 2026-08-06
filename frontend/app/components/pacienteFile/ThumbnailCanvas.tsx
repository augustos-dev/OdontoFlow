import React from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
// Configura o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfCanvasThumbnailProps {
  url: string
}

export const PdfCanvasThumbnail: React.FC<PdfCanvasThumbnailProps> = ({ url }) => {
  return (
    <div className="pdf-canvas-thumb">
      <Document
        file={url}
        loading={<div className="text-xs text-slate-400">Gerando preview...</div>}
        error={<div className="text-xs text-red-400">PDF</div>}
      >
        <Page 
          pageNumber={1} 
          width={150} 
          renderTextLayer={false} 
          renderAnnotationLayer={false} 
        />
      </Document>
    </div>
  )
}