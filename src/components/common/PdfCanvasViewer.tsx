"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface PdfCanvasViewerProps {
  pdfUrl: string;
  pdfBlob?: Blob | null;
  onSaveOffline?: (blob: Blob) => void;
  title: string;
}

export function PdfCanvasViewer({
  pdfUrl,
  pdfBlob,
  onSaveOffline,
  title,
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const renderTaskRef = useRef<any>(null);

  // Load PDF.js library dynamically
  const ensurePdfJs = useCallback(async (): Promise<any> => {
    if (typeof window === "undefined") return null;
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      // Check if already injected
      const existing = document.querySelector('script[src*="pdf.min.js"]');
      if (existing) {
        existing.addEventListener("load", () => {
          const lib = (window as any).pdfjsLib;
          if (lib) {
            lib.GlobalWorkerOptions.workerSrc = "/vendor/pdf/pdf.worker.min.js";
            resolve(lib);
          } else {
            reject(new Error("pdfjsLib not defined"));
          }
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "/vendor/pdf/pdf.min.js";
      script.async = true;
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "/vendor/pdf/pdf.worker.min.js";
          resolve(lib);
        } else {
          reject(new Error("pdfjsLib not defined"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF viewer engine"));
      document.head.appendChild(script);
    });
  }, []);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setCurrentPage(1);

    async function load() {
      try {
        const lib = await ensurePdfJs();
        if (cancelled || !lib) return;

        let loadingTask: any;

        if (pdfBlob) {
          const arrayBuffer = await pdfBlob.arrayBuffer();
          if (cancelled) return;
          loadingTask = lib.getDocument({ data: new Uint8Array(arrayBuffer) });
        } else {
          loadingTask = lib.getDocument({ url: pdfUrl });

          // Background cache
          if (onSaveOffline) {
            fetch(pdfUrl)
              .then((res) => (res.ok ? res.blob() : null))
              .then((blob) => {
                if (blob && !cancelled) onSaveOffline(blob);
              })
              .catch(() => {});
          }
        }

        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoading(false);
      } catch (err: any) {
        console.error("PDF loading error:", err);
        if (!cancelled) {
          setLoadError(err?.message || "PDF لوڈ کرنے میں خرابی آئی۔ براہ کرم دوبارہ کوشش کریں۔");
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pdfBlob, ensurePdfJs, onSaveOffline]);

  // Render current page onto Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      setIsRendering(true);
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = containerRef.current;
      const containerWidth = container ? container.clientWidth - 16 : 600;

      // Calculate responsive fit
      const unscaledViewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min(2.5, Math.max(0.8, (containerWidth / unscaledViewport.width) * scale));
      const viewport = page.getViewport({ scale: fitScale });

      // Handle HiDPI displays (retina screens on mobile)
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.scale(outputScale, outputScale);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      ctx.restore();
      setIsRendering(false);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Page render error:", err);
      }
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    void renderCurrentPage();
  }, [renderCurrentPage]);

  // Window resize handler to maintain sharp responsive canvas
  useEffect(() => {
    let timer: any;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void renderCurrentPage();
      }, 200);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [renderCurrentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none" ref={containerRef}>
      {/* Top Floating Controls Bar */}
      <div className="w-full bg-[#fbf9f4] border border-[#ded5c0] rounded-2xl px-3 py-2 mb-2.5 flex items-center justify-between gap-2 shadow-xs flex-wrap">
        {/* Page status */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#112a1d]">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>
            صفحہ {currentPage} از {totalPages}
          </span>
          <span className="text-[11px] text-[#527060] font-normal hidden sm:inline">
            (Page {currentPage} of {totalPages})
          </span>
        </div>

        {/* Zoom Stepper */}
        <div className="flex items-center gap-1 bg-white border border-[#ded5c0] rounded-xl p-0.5 shadow-2xs">
          <button
            onClick={() => setScale((s) => Math.max(0.8, s - 0.2))}
            disabled={scale <= 0.8}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#efe8d6] disabled:opacity-30 text-[#112a1d] font-bold text-xs active:scale-95 transition-all cursor-pointer"
            title="Zoom Out"
          >
            A−
          </button>
          <span className="text-[11px] font-mono font-bold text-emerald-950 px-1 min-w-[36px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
            disabled={scale >= 2.0}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#efe8d6] disabled:opacity-30 text-[#112a1d] font-bold text-xs active:scale-95 transition-all cursor-pointer"
            title="Zoom In"
          >
            A+
          </button>
        </div>

        {/* Page Switch Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#efe8d6] disabled:opacity-30 border border-[#ded5c0] text-xs font-bold text-[#112a1d] shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Previous Page"
          >
            ← Prev
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Next Page"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Frame */}
      <div className="w-full flex flex-col items-center justify-center min-h-[400px] sm:min-h-[600px] bg-[#fcfaf5] rounded-2xl border border-[#d9ccb0] p-1.5 sm:p-3 shadow-md relative overflow-x-auto">
        {/* Loading Spinner State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-bold text-[#112a1d]">
              پی ڈی ایف لوڈ ہو رہی ہے...
            </div>
            <p className="text-xs text-[#527060]">
              اصل 16 سطری مصحف اسکرین پر تیار کیا جا رہا ہے
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md px-4 gap-3">
            <div className="text-3xl">⚠️</div>
            <div className="text-sm font-bold text-rose-800">{loadError}</div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              براہِ راست نئے ٹیب میں کھولیں (Open in New Tab)
            </a>
          </div>
        )}

        {/* The Native HTML5 Canvas: Crisp rendering on all mobile & desktop browsers! */}
        <canvas
          ref={canvasRef}
          className={`shadow-lg rounded-xl max-w-full transition-opacity duration-200 bg-white ${
            isLoading || loadError ? "hidden" : "block"
          }`}
          style={{
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
          }}
        />

        {isRendering && !isLoading && (
          <div className="absolute top-4 right-4 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
            Rendering…
          </div>
        )}
      </div>

      {/* Bottom Page Navigation Buttons */}
      {totalPages > 1 && !isLoading && !loadError && (
        <div className="w-full mt-3 bg-white border border-[#ded5c0] rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-3">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="flex-1 py-2 px-3 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] disabled:opacity-30 border border-[#ded5c0] text-[#112a1d] font-bold text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            ← Previous Page
          </button>

          <span className="text-xs sm:text-sm font-bold text-emerald-950 px-2 select-none">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );
}
