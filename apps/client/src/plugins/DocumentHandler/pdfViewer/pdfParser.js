import { pdfjs } from "react-pdf";

/**
 * Flattens a PDF outline (table of contents) into a flat list with page numbers,
 * preserving hierarchical order so buildTOCTree can reconstruct the tree.
 */
export async function flattenOutlineAsync(
  outlineArray,
  pdf,
  prefix = "",
  level = 0
) {
  const result = [];
  for (let i = 0; i < outlineArray.length; i++) {
    const item = outlineArray[i];
    const id = prefix ? `${prefix}-${i}` : `${i}`;
    let pageNumber = null;
    if (item.dest) {
      try {
        const pageIndex = await pdf.getPageIndex(item.dest[0]);
        pageNumber = pageIndex + 1;
      } catch (error) {
        console.error("Error computing page number in flattenOutline:", error);
      }
    }
    result.push({ id, title: item.title, page: pageNumber, level });
    if (item.items && item.items.length > 0) {
      const children = await flattenOutlineAsync(item.items, pdf, id, level + 1);
      result.push(...children);
    }
  }
  return result;
}

export function buildTOCTree(flatItems, maxDepth) {
  const tree = [];
  const stack = [];
  flatItems.forEach((item) => {
    if (item.level >= maxDepth) return;
    const newItem = { ...item, children: [] };
    while (stack.length && stack[stack.length - 1].level >= newItem.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      tree.push(newItem);
    } else {
      stack[stack.length - 1].children.push(newItem);
    }
    stack.push(newItem);
  });
  return tree;
}

/**
 * Parses a PDF from a blob object and returns a list of chapters.
 * @param {Blob} pdfBlob - The PDF file as a Blob.
 * @returns {Promise<Array<Object>>} - A list of JSON-structured chapters.
 */
export async function parsePdf(pdfBlob) {
  // Counter is created per parsePdf call so IDs reset between documents.
  let idCounter = 0;
  const getUniqueId = () => idCounter++;

  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    // Build chapters per page with headings (e.g. "Sida 1") and add outline data as keywords
    const pdfChapters = await buildChaptersPerPage(pdf);
    const mappedChapters = pdfChapters.map((chapter) =>
      transformPdfChapterToJsonChapter(chapter, getUniqueId)
    );
    return mappedChapters;
  } catch (error) {
    console.error("Fel vid parsning av PDF:", error);
    throw error;
  }
}

async function buildChaptersPerPage(pdf) {
  const numPages = pdf.numPages;
  const outline = await pdf.getOutline();
  const flatOutline = outline ? await flattenOutlineAsync(outline, pdf) : [];
  const chapters = [];

  for (let i = 1; i <= numPages; i++) {
    const keywords = flatOutline
      .filter((item) => item.page === i)
      .map((item) => item.title);

    chapters.push({
      title: `Sida ${i}`,
      pageNumber: i,
      content: "", // PDF text content is not extracted
      chapters: [],
      keywords,
    });
  }

  return chapters;
}

function transformPdfChapterToJsonChapter(pdfChapter, getUniqueId) {
  const currentId = getUniqueId();
  return {
    header: pdfChapter.title,
    pageNumber: pdfChapter.pageNumber,
    headerIdentifier: `pdf_chapter_${currentId}`,
    html: pdfChapter.content,
    components: [],
    geoObjects: [],
    keywords: pdfChapter.keywords,
    id: currentId,
    chapters: pdfChapter.chapters.map((c) =>
      transformPdfChapterToJsonChapter(c, getUniqueId)
    ),
  };
}
