import React from "react";
import { Component } from "react";
import {
  Editor,
  EditorState,
  RichUtils,
  Modifier,
  CompositeDecorator,
  getDefaultKeyBinding,
} from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import { stateFromHTML } from "draft-js-import-html";

// Matches a single {...} placeholder, e.g. {name}, {area|round(2)} or {name@@plugin}.
// Does not match {{if ...}} ... {{/if}} conditional blocks - those are handled separately.
const TOKEN_REGEX = /\{[^{}]+\}/g;
// Matches a {{if ...}} ... {{/if}} conditional block, see FeaturePropsParsing.jsx on the client.
const CONDITIONAL_REGEX = /\{\{if\b[\s\S]*?\{\{\/if\}\}/;

function containsConditional(html) {
  return CONDITIONAL_REGEX.test(html || "");
}

// Wraps every {...} placeholder in a marker <span> so that stateFromHTML's
// customInlineFn (below) can turn it into a protected, atomic Draft.js entity
// instead of plain, freely-editable text.
function wrapTokens(html) {
  return (html || "").replace(TOKEN_REGEX, (match) => {
    const escaped = match
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<span data-ic-token="1">${escaped}</span>`;
  });
}

function customInlineFn(element, { Entity }) {
  if (
    element.tagName === "SPAN" &&
    element.getAttribute("data-ic-token") === "1"
  ) {
    return Entity.create("TOKEN", "IMMUTABLE", { raw: element.textContent });
  }
  return undefined;
}

function findTokenEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges((character) => {
    const entityKey = character.getEntity();
    return (
      entityKey !== null &&
      contentState.getEntity(entityKey).getType() === "TOKEN"
    );
  }, callback);
}

const TokenSpan = (props) => (
  <span className="ic-token-chip">{props.children}</span>
);

const tokenDecorator = new CompositeDecorator([
  { strategy: findTokenEntities, component: TokenSpan },
]);

function htmlToEditorState(html) {
  const contentState = stateFromHTML(wrapTokens(html), { customInlineFn });
  return EditorState.createWithContent(contentState, tokenDecorator);
}

function editorStateToHtml(editorState) {
  return stateToHTML(editorState.getCurrentContent());
}

const BLOCK_TYPES = [
  { label: "H3", style: "header-three" },
  { label: "H4", style: "header-four" },
  { label: "Citat", style: "blockquote" },
  { label: "UL", style: "unordered-list-item" },
  { label: "OL", style: "ordered-list-item" },
];

const INLINE_STYLES = [
  { label: "Fet", style: "BOLD" },
  { label: "Kursiv", style: "ITALIC" },
  { label: "Understruken", style: "UNDERLINE" },
];

/**
 * WYSIWYG-editor för Infoklick-lagrets "Inforuta"-mall. Håller sitt eget
 * Draft.js-state internt (okontrollerad komponent avseende `initialValue`)
 * så att den inte tappar markörposition när föräldrakomponenten
 * återrenderas - se wmslayerform.jsx där hela inställningsdialogen byggs
 * om vid varje tangenttryckning.
 *
 * {attributnamn}-platshållare skyddas som atomära Draft.js-entiteter så att
 * formatering aldrig kan splitta dem. {{if}}...{{/if}}-villkorsblock kan
 * innehålla godtycklig inbäddad HTML, vilket Draft.js HTML-escapar vid
 * export - därför tvingas "Kod"-läge fram (och växling till Visuell
 * spärras) så fort ett sådant block upptäcks, för att aldrig korrumpera
 * innehållet.
 */
class InfoclickEditor extends Component {
  constructor(props) {
    super(props);
    const initialValue = props.initialValue || "";
    const hasConditional = containsConditional(initialValue);
    this.state = {
      mode: hasConditional ? "code" : "visual",
      forcedCodeMode: hasConditional,
      editorState: hasConditional
        ? EditorState.createEmpty(tokenDecorator)
        : htmlToEditorState(initialValue),
      rawValue: initialValue,
    };
    this.commitTimer = null;
  }

  componentWillUnmount() {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commit();
    }
  }

  scheduleCommit = () => {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
    }
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      this.commit();
    }, 500);
  };

  commit = () => {
    const html =
      this.state.mode === "visual"
        ? editorStateToHtml(this.state.editorState)
        : this.state.rawValue;
    this.props.onChange(html);
  };

  handleEditorChange = (editorState) => {
    this.setState({ editorState }, this.scheduleCommit);
  };

  handleRawChange = (e) => {
    const rawValue = e.target.value;
    this.setState({ rawValue }, this.scheduleCommit);
  };

  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.handleEditorChange(newState);
      return "handled";
    }
    return "not-handled";
  };

  mapKeyToEditorCommand = (e) => {
    return getDefaultKeyBinding(e);
  };

  toggleBlockType = (blockType) => {
    this.handleEditorChange(
      RichUtils.toggleBlockType(this.state.editorState, blockType)
    );
  };

  toggleInlineStyle = (inlineStyle) => {
    this.handleEditorChange(
      RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle)
    );
  };

  insertAttribute = (name) => {
    if (!name) {
      return;
    }
    const { editorState } = this.state;
    const raw = `{${name}}`;
    const contentState = editorState
      .getCurrentContent()
      .createEntity("TOKEN", "IMMUTABLE", { raw });
    const entityKey = contentState.getLastCreatedEntityKey();
    const newContentState = Modifier.insertText(
      contentState,
      editorState.getSelection(),
      raw,
      null,
      entityKey
    );
    const newEditorState = EditorState.push(
      editorState,
      newContentState,
      "insert-characters"
    );
    this.handleEditorChange(
      EditorState.forceSelection(
        newEditorState,
        newContentState.getSelectionAfter()
      )
    );
  };

  switchToVisual = () => {
    if (containsConditional(this.state.rawValue)) {
      // eslint-disable-next-line no-alert
      window.alert(
        "Detta innehåll innehåller ett {{if}}...{{/if}}-villkorsblock, " +
          "vilket inte stöds i Visuellt läge (risk för att inbäddad HTML " +
          "korrumperas). Fortsätt redigera i Kod-läge."
      );
      return;
    }
    this.setState({
      mode: "visual",
      editorState: htmlToEditorState(this.state.rawValue),
    });
  };

  switchToCode = () => {
    this.setState({
      mode: "code",
      rawValue: editorStateToHtml(this.state.editorState),
    });
  };

  render() {
    const { mode, forcedCodeMode } = this.state;
    const {
      availableAttributes,
      onFetchAttributes,
      fetchingAttributes,
      fetchError,
    } = this.props;

    return (
      <div className="InfoclickEditor">
        <div className="InfoclickEditor-toolbar">
          <span className="InfoclickEditor-modeToggle">
            <button
              type="button"
              className={mode === "visual" ? "active" : ""}
              onClick={this.switchToVisual}
              disabled={forcedCodeMode}
              title={
                forcedCodeMode
                  ? "Innehållet har ett {{if}}-villkorsblock och kan bara redigeras i Kod-läge"
                  : ""
              }
            >
              Visuell
            </button>
            <button
              type="button"
              className={mode === "code" ? "active" : ""}
              onClick={this.switchToCode}
            >
              Kod
            </button>
          </span>
          <span className="InfoclickEditor-attributePicker">
            <button
              type="button"
              onClick={onFetchAttributes}
              disabled={fetchingAttributes}
            >
              {fetchingAttributes ? "Hämtar attribut…" : "Hämta attribut"}
            </button>
            {availableAttributes && availableAttributes.length > 0 && (
              <select
                value=""
                disabled={mode !== "visual"}
                onChange={(e) => this.insertAttribute(e.target.value)}
              >
                <option value="" disabled>
                  Infoga attribut…
                </option>
                {availableAttributes.map((attr) => (
                  <option key={attr.name} value={attr.name}>
                    {attr.name}
                    {attr.type ? ` (${attr.type})` : ""}
                  </option>
                ))}
              </select>
            )}
            {fetchError && (
              <span className="InfoclickEditor-fetchError">{fetchError}</span>
            )}
          </span>
        </div>
        {mode === "visual" ? (
          <>
            <div className="RichEditor-controls">
              {BLOCK_TYPES.map((type) => (
                <span
                  key={type.label}
                  className="RichEditor-styleButton"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    this.toggleBlockType(type.style);
                  }}
                >
                  {type.label}
                </span>
              ))}
              {INLINE_STYLES.map((type) => (
                <span
                  key={type.label}
                  className="RichEditor-styleButton"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    this.toggleInlineStyle(type.style);
                  }}
                >
                  {type.label}
                </span>
              ))}
            </div>
            <div className="RichEditor-editor InfoclickEditor-editor">
              <Editor
                editorState={this.state.editorState}
                handleKeyCommand={this.handleKeyCommand}
                keyBindingFn={this.mapKeyToEditorCommand}
                onChange={this.handleEditorChange}
                spellCheck={true}
              />
            </div>
          </>
        ) : (
          <textarea
            className="infoClick"
            style={{ width: "100%" }}
            value={this.state.rawValue}
            onChange={this.handleRawChange}
          />
        )}
      </div>
    );
  }
}

export default InfoclickEditor;
