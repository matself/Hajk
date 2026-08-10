import React from "react";
import { Component } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchIcon from "@material-ui/icons/Search";

const HASH_PREFIX = "#!/manual/";
const SNIPPET_RADIUS = 60;

// Pulls the doc filename back out of a URL like ".../#!/manual/admin-tool-search.md"
// so a bookmarked/shared link to a specific page lands on that page, not the
// first one. This is intentionally independent from whatever admin tab or
// tool happens to be open elsewhere — the manual's own navigation only.
function fileFromHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(HASH_PREFIX.length));
}

function buildSnippet(content, query) {
  const lower = content.toLowerCase();
  const at = lower.indexOf(query.toLowerCase());
  if (at === -1) return "";
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(content.length, at + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return prefix + content.slice(start, end).replace(/\s+/g, " ") + suffix;
}

/**
 * In-app viewer for the admin manual. Renders the .md files straight from
 * public/manual/ (mirrored from docs/ by scripts/sync-manual.js) so the
 * manual has a single source of truth and internal links between chapters
 * keep working — no Document Handler chapter model involved.
 */
class Manual extends Component {
  constructor(props) {
    super(props);
    this.state = {
      index: [],
      files: [],
      titles: {},
      content: {},
      activeFile: null,
      markdown: "",
      loading: true,
      query: "",
    };
  }

  componentDidMount() {
    Promise.all([
      fetch("manual/manual-index.json").then((response) => response.json()),
      fetch("manual/manual-files.json").then((response) => response.json()),
      fetch("manual/manual-titles.json").then((response) => response.json()),
    ])
      .then(([index, files, titles]) => {
        this.setState({ index, files, titles });
        // Fetch every doc's raw text up front so search can look inside
        // them, not just at titles. The manual is a few dozen small files,
        // so this is cheap and keeps search instant with no debounce.
        Promise.all(
          files.map((file) =>
            fetch(`manual/${file}`)
              .then((response) => response.text())
              .then((text) => [file, text])
          )
        ).then((entries) => {
          this.setState({ content: Object.fromEntries(entries) });
        });

        const requested = fileFromHash();
        const initial =
          requested && files.includes(requested)
            ? requested
            : index.length > 0
            ? index[0].file
            : null;
        if (initial) {
          this.loadFile(initial, { updateHash: false });
        } else {
          this.setState({ loading: false });
        }
      })
      .catch(() => this.setState({ loading: false }));
  }

  loadFile(file, { updateHash = true } = {}) {
    this.setState({ loading: true, activeFile: file });
    if (updateHash) {
      window.location.hash = HASH_PREFIX + encodeURIComponent(file);
    }
    const cached = this.state.content[file];
    if (cached !== undefined) {
      this.setState({ markdown: cached, loading: false });
      return;
    }
    fetch(`manual/${file}`)
      .then((response) => response.text())
      .then((markdown) => this.setState({ markdown, loading: false }));
  }

  // Internal links between manual chapters (e.g. "[x](admin-tooloptions.md)",
  // possibly with a "#heading" suffix) resolve within the viewer instead of
  // navigating away; everything else (external URLs) behaves like a normal
  // link.
  linkComponent = ({ href, children }) => {
    if (!href || href.startsWith("http://") || href.startsWith("https://")) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }

    const [file] = href.split("#");
    const isInternal = file && this.state.files.includes(file);

    if (isInternal) {
      return (
        <a
          href={`#${href}`}
          onClick={(e) => {
            e.preventDefault();
            this.loadFile(file);
          }}
        >
          {children}
        </a>
      );
    }
    // Anchor-only links (e.g. "#some-heading") or unresolvable relative
    // links: neither should trigger a full-page navigation.
    return <span title={href}>{children}</span>;
  };

  getSearchResults() {
    const { query, files, titles, content } = this.state;
    const q = query.trim().toLowerCase();
    if (!q) return null;

    return files
      .map((file) => {
        const title = titles[file] || file;
        const text = content[file] || "";
        const titleMatches = title.toLowerCase().includes(q);
        const snippet = buildSnippet(text, q);
        if (!titleMatches && !snippet) return null;
        return { file, title, snippet };
      })
      .filter(Boolean);
  }

  render() {
    const { index, activeFile, markdown, loading, query } = this.state;
    const searchResults = this.getSearchResults();
    const list = searchResults || index;

    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div
          style={{
            width: 320,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "8px 16px" }}>
            <TextField
              fullWidth
              placeholder="Sök i manualen"
              value={query}
              onChange={(e) => this.setState({ query: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </div>
          <List style={{ overflowY: "auto" }}>
            {list.length === 0 && (
              <ListItem>
                <ListItemText primary="Inga träffar" />
              </ListItem>
            )}
            {list.map((entry) => (
              <ListItem
                button
                key={entry.file}
                selected={entry.file === activeFile}
                onClick={() => this.loadFile(entry.file)}
              >
                <ListItemText primary={entry.title} secondary={entry.snippet} />
              </ListItem>
            ))}
          </List>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 32px" }}>
          {loading ? (
            <CircularProgress />
          ) : (
            <ReactMarkdown
              remarkPlugins={[gfm]}
              components={{ a: this.linkComponent }}
            >
              {markdown}
            </ReactMarkdown>
          )}
        </div>
      </div>
    );
  }
}

export default Manual;
