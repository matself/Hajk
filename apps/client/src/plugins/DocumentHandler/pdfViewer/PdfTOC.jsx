import { useState, useEffect } from "react";
import { flattenOutlineAsync, buildTOCTree } from "./pdfParser";

function updateGlobalCollapse(tree, collapseValue) {
  const newState = {};
  const traverse = (nodes) => {
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        newState[node.id] = collapseValue;
        traverse(node.children);
      }
    });
  };
  traverse(tree);
  return newState;
}

function TOCItem({
  node,
  collapsedItems,
  setCollapsedItems,
  selectedNodeId,
  setSelectedNodeId,
  customScrollToPage,
}) {
  const isCollapsed = collapsedItems[node.id] !== false;
  const hasChildren = node.children.length > 0;

  const handleToggle = (e) => {
    e.stopPropagation();
    setCollapsedItems((prev) => ({ ...prev, [node.id]: !isCollapsed }));
  };

  const handleNavigation = (e) => {
    e.stopPropagation();
    if (node.page) {
      setSelectedNodeId(node.id);
      customScrollToPage(node.page);
    }
  };

  return (
    <li className="toc-list-item">
      {hasChildren && (
        <span
          role="button"
          tabIndex={0}
          aria-label={isCollapsed ? "Expandera" : "Kollapsa"}
          style={{ marginRight: "5px", cursor: "pointer" }}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle(e);
            }
          }}
        >
          {isCollapsed ? "+ " : "- "}
        </span>
      )}
      <span
        className={`node-label ${node.id === selectedNodeId ? "selected-item" : ""}`}
        onClick={handleNavigation}
        style={{ paddingLeft: `${node.level * 16}px` }}
      >
        {node.title} {node.page ? `(sid ${node.page})` : ""}
      </span>
      {!isCollapsed && hasChildren && (
        <ul onClick={(e) => e.stopPropagation()}>
          {node.children.map((child) => (
            <TOCItem
              key={child.id}
              node={child}
              collapsedItems={collapsedItems}
              setCollapsedItems={setCollapsedItems}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              customScrollToPage={customScrollToPage}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function PdfTOC({
  pdf,
  options,
  customScrollToPage,
  collapsedItems,
  setCollapsedItems,
  selectedNodeId,
  setSelectedNodeId,
  customTheme,
}) {
  const tocDepth = options.tableOfContents.chapterLevelsToShow || 3;
  const [outlineItems, setOutlineItems] = useState([]);

  useEffect(() => {
    const fetchOutline = async () => {
      try {
        const outlineData = await pdf.getOutline();
        if (!outlineData) {
          setOutlineItems([]);
          return;
        }
        // Do NOT sort — flattenOutlineAsync preserves the hierarchical order
        // that buildTOCTree relies on to reconstruct the parent-child tree.
        const flattened = await flattenOutlineAsync(outlineData, pdf);
        setOutlineItems(flattened);
      } catch (err) {
        console.error("Fel vid hämtning av innehållsförteckning:", err);
        setOutlineItems([]);
      }
    };
    fetchOutline();
  }, [pdf]);

  const tocTree = buildTOCTree(outlineItems, tocDepth);

  return (
    <div
      className={`toc-container ${
        customTheme?.palette?.mode === "dark" ? "dark-theme" : ""
      }`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: `${Number(options.tableOfContents.fontSize) + 2}px`,
        }}
      >
        <span
          role="button"
          tabIndex={0}
          aria-label="Kollapsa alla"
          style={{ cursor: "pointer" }}
          onClick={() => setCollapsedItems(updateGlobalCollapse(tocTree, true))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCollapsedItems(updateGlobalCollapse(tocTree, true));
            }
          }}
        >
          -
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label="Expandera alla"
          style={{ cursor: "pointer" }}
          onClick={() => setCollapsedItems(updateGlobalCollapse(tocTree, false))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCollapsedItems(updateGlobalCollapse(tocTree, false));
            }
          }}
        >
          +
        </span>
        <b>{options.tableOfContents.title}:</b>
      </div>
      <ul
        className="toc-list"
        style={{
          lineHeight: options.tableOfContents.lineHeight,
          fontSize: `${options.tableOfContents.fontSize}px`,
        }}
      >
        {tocTree.map((node) => (
          <TOCItem
            key={node.id}
            node={node}
            collapsedItems={collapsedItems}
            setCollapsedItems={setCollapsedItems}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            customScrollToPage={customScrollToPage}
          />
        ))}
      </ul>
    </div>
  );
}

export default PdfTOC;
