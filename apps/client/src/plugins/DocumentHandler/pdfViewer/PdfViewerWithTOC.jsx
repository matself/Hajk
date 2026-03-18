import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Document, Page } from "react-pdf";
import { styled } from "@mui/material/styles";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import IconButton from "@mui/material/IconButton";
import { scroller, animateScroll as scroll, Element } from "react-scroll";
import ScrollToTop from "../documentWindow/ScrollToTop";
import PdfDownloadDialog from "./PdfDownloadDialog";
import PdfTOC from "./PdfTOC";
import { observeLinks } from "./PdfLink";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "./style.css";

const PdfContainer = styled("div")(() => ({
  maxHeight: "100%",
  overflowY: "auto",
  overflowX: "auto",
  userSelect: "text",
  padding: 0,
  position: "relative",
}));

const StickyTopBar = styled("div")(() => ({
  position: "sticky",
  top: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  padding: 0,
}));

const TOCContainer = styled("div")(() => ({
  overflowY: "auto",
}));

const StickyTOCWrapper = styled("div")(() => ({
  position: "sticky",
  top: 40,
  zIndex: 1000,
  padding: 0,
}));

const SCROLL_LIMIT = 400;

function cleanHash() {
  const p = new URLSearchParams(window.location.hash.slice(1));
  p.delete("page");
  if (p.has("title")) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${p.toString() ? "#" + p : ""}`
    );
  }
}

function PdfViewerWithTOC({
  document,
  customTheme,
  showDownloadWindow,
  toggleDownloadWindow,
  model,
  options,
  localObserver,
  app,
}) {
  const [numPages, setNumPages] = useState(null);
  const [pdfInstance, setPdfInstance] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const [scale, setScale] = useState(1.0);
  const [menuOpen, setMenuOpen] = useState(
    options.tableOfContents.expanded ?? false
  );
  const [pageWidth, setPageWidth] = useState(0);
  const disconnectors = useRef({});

  const [pendingPage, setPendingPage] = useState(document.targetPage ?? null);
  const currentTitle = document.title ?? "";

  // Stores a requested page number across document transitions.
  const pendingPageRef = useRef(null);

  // Allows scrollToChapterHandler (stale closure) to read the current numPages
  // without being in its dependency array. When null, the PDF is not yet rendered.
  const numPagesRef = useRef(null);
  numPagesRef.current = numPages;

  const customScrollToPage = useCallback((pageNumber) => {
    if (!pageNumber) return;
    scroller.scrollTo(`page-${pageNumber}`, {
      containerId: "pdfViewer",
      smooth: true,
      duration: 600,
      offset: -5,
    });
  }, []);

  // Reset numPages and pdfInstance synchronously when the document changes.
  // useLayoutEffect fires before the setState callback that triggers
  // scrollToChapterHandler, so numPagesRef.current is guaranteed to be null
  // by the time that handler runs — preventing it from scrolling into the old PDF.
  useLayoutEffect(() => {
    setNumPages(null);
    setPdfInstance(null);
  }, [document]);

  useEffect(() => {
    // pendingPageRef is set by handlePdfLink (internal PDF links).
    // window.pendingPage is set by DocumentWindowBase.handleHashChange (URL hash).
    const page = pendingPageRef.current ?? window.pendingPage ?? null;
    window.pendingPage = null;
    pendingPageRef.current = null;
    setPendingPage(null); // clear any stale value so onRenderSuccess stays quiet

    if (page == null) return;

    // Poll until every page from 1 up to (and including) the target has a
    // rendered canvas. All those pages' heights must be correct before we scroll,
    // because the scroll position of page N is determined by the combined height
    // of pages 1…N-1. Gives up after 3 s so there is no leak if the PDF never
    // loads.
    let timerId;
    let attempts = 0;
    const tryScroll = () => {
      const container = containerRef.current;
      if (container) {
        let allReady = true;
        for (let p = 1; p <= page; p++) {
          if (!container.querySelector(`[name="page-${p}"] canvas`)) {
            allReady = false;
            break;
          }
        }
        if (allReady) {
          customScrollToPage(page);
          return;
        }
      }
      if (++attempts < 30) {
        timerId = setTimeout(tryScroll, 100);
      }
    };
    timerId = setTimeout(tryScroll, 0);
    return () => clearTimeout(timerId);
  }, [document, customScrollToPage]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handlePdfLink = (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;

      const url = new URL(a.href, window.location.href);
      const title = url.searchParams.get("title");
      const folder = url.searchParams.get("folder");
      const pageStr = url.searchParams.get("page");

      if (!title) return;

      e.preventDefault();
      e.stopPropagation();

      const targetPage = pageStr ? Number(pageStr) : null;

      if (title === currentTitle && folder == null) {
        // Same document — publish immediately so the subscriber can scroll.
        app.globalObserver.publish("document-page-change", {
          page: targetPage,
        });
      } else {
        // Different document — store the page so useEffect([document]) picks
        // it up after the new document prop arrives. Do NOT publish
        // document-page-change here; the document hasn't loaded yet.
        pendingPageRef.current = targetPage;

        localObserver.publish("set-active-document", {
          documentName: title,
          headerIdentifier: null,
          folder,
        });
        localObserver.publish("document-link-clicked", {
          documentName: title,
          headerIdentifier: null,
          folder,
        });
      }
    };

    node.addEventListener("click", handlePdfLink, true);
    return () => node.removeEventListener("click", handlePdfLink, true);
  }, [localObserver, currentTitle, app]);

  useEffect(() => {
    let t;
    const handlePageChange = ({ page }) => {
      if (page != null) {
        setPendingPage(page);
        clearTimeout(t);
        t = setTimeout(() => customScrollToPage(page), 300);
      }
    };

    app.globalObserver.subscribe("document-page-change", handlePageChange);
    return () => {
      app.globalObserver.unsubscribe("document-page-change", handlePageChange);
      clearTimeout(t);
    };
  }, [app.globalObserver, customScrollToPage]);

  useLayoutEffect(() => {
    if (showDownloadWindow) return;
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (!containerRef.current) return;
      setPageWidth(containerRef.current.clientWidth);
    };

    const debouncedUpdate = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(updateWidth, 300);
    };

    updateWidth();
    const ro = new ResizeObserver(debouncedUpdate);
    ro.observe(el);

    return () => {
      try {
        ro.disconnect();
      } catch {}
      clearTimeout(timerRef.current);
    };
  }, [showDownloadWindow]);

  useEffect(() => {
    const scrollToChapterHandler = (chapter) => {
      if (chapter.pageNumber == null) return;
      // numPagesRef.current is null when the PDF is not yet rendered —
      // either because no document has loaded, or because useLayoutEffect([document])
      // just reset it during this document transition. In that case store the
      // target page for onRenderSuccess to pick up once pages are rendered.
      if (numPagesRef.current === null) {
        pendingPageRef.current = chapter.pageNumber;
        return;
      }
      scroller.scrollTo(`page-${chapter.pageNumber}`, {
        containerId: "pdfViewer",
        smooth: true,
        duration: 600,
        offset: -5,
      });
    };
    localObserver.subscribe("pdf-scroll-to-chapter", scrollToChapterHandler);
    return () => {
      localObserver.unsubscribe(
        "pdf-scroll-to-chapter",
        scrollToChapterHandler
      );
    };
  }, [localObserver]);

  useEffect(() => {
    setSelectedNodeId(null);
    setCollapsedItems({});
  }, [document]);

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    setPdfInstance(pdf);
  };

  const onScroll = (e) => {
    setShowScrollButton(e.target.scrollTop > SCROLL_LIMIT);
  };

  const scrollToTop = () => {
    scroll.scrollTo(0, {
      containerId: "pdfViewer",
      smooth: true,
      duration: 500,
      delay: 100,
    });
  };

  const zoomIn = () => setScale((prev) => prev + 0.1);
  const zoomOut = () => setScale((prev) => (prev > 0.2 ? prev - 0.1 : prev));

  const renderAllPages = () => {
    if (!numPages) return null;

    return Array.from({ length: numPages }, (_, i) => {
      const pageNumber = i + 1;

      return (
        <Element
          name={`page-${pageNumber}`}
          key={pageNumber}
          className="page-element"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            width={pageWidth}
            renderAnnotationLayer
            renderTextLayer
            onRenderSuccess={() => {
              if (pendingPage === pageNumber) {
                customScrollToPage(pageNumber);
                setPendingPage(null);
                cleanHash();
              }
            }}
            inputRef={(ref) => {
              if (disconnectors.current[pageNumber]) {
                disconnectors.current[pageNumber]();
                delete disconnectors.current[pageNumber];
              }
              if (ref) {
                disconnectors.current[pageNumber] = observeLinks(ref);
              }
            }}
          />
        </Element>
      );
    });
  };

  return (
    <>
      {!showDownloadWindow && (
        <PdfContainer
          id="pdfViewer"
          ref={containerRef}
          onScroll={onScroll}
          className={customTheme?.palette?.mode === "dark" ? "dark-theme" : ""}
        >
          <StickyTopBar
            className="upper-section"
            style={{
              background:
                customTheme?.palette?.mode === "dark" ? "#000" : "#ffffff",
              color: customTheme?.palette?.mode === "dark" ? "#fff" : "#000",
            }}
          >
            <IconButton
              aria-label="Zooma ut"
              onClick={zoomOut}
              className="icon-button"
            >
              <ZoomOutIcon />
            </IconButton>
            <IconButton
              aria-label="Zooma in"
              onClick={zoomIn}
              className="icon-button"
            >
              <ZoomInIcon />
            </IconButton>
            <span className="zoom-percentage">{Math.round(scale * 100)}%</span>
            {options.tableOfContents.active && (
              <div
                role="button"
                tabIndex={0}
                aria-expanded={menuOpen}
                aria-controls="pdf-toc"
                onClick={() => setMenuOpen((p) => !p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMenuOpen((p) => !p);
                  }
                }}
                className="toggle-menu"
              >
                {menuOpen
                  ? "Dölj " + options.tableOfContents.title
                  : "Visa " + options.tableOfContents.title}
              </div>
            )}
          </StickyTopBar>
          {menuOpen && pdfInstance && pageWidth > 0 && (
            <StickyTOCWrapper>
              <TOCContainer
                id="pdf-toc"
                style={{
                  maxHeight: Number(options.tableOfContents.height) || 300,
                }}
              >
                <PdfTOC
                  pdf={pdfInstance}
                  options={options}
                  customScrollToPage={customScrollToPage}
                  collapsedItems={collapsedItems}
                  setCollapsedItems={setCollapsedItems}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  customTheme={customTheme}
                />
              </TOCContainer>
            </StickyTOCWrapper>
          )}

          <Document
            file={document.blob}
            onLoadSuccess={onDocumentLoadSuccess}
            externalLinkTarget="_blank"
          >
            {renderAllPages()}
          </Document>

          {showScrollButton && (
            <ScrollToTop color={document.documentColor} onClick={scrollToTop} />
          )}
        </PdfContainer>
      )}
      {showDownloadWindow && (
        <PdfDownloadDialog
          open={showDownloadWindow}
          onClose={toggleDownloadWindow}
          model={model}
          options={options}
        />
      )}
    </>
  );
}

export default PdfViewerWithTOC;
