import {
  BlockMapBuilder,
  ContentBlock,
  EditorState,
  genKey as generateRandomKey,
  Modifier,
} from "draft-js";
import { List } from "immutable";

export default function insertNewLine(editorState) {
  const newEditorState = editorState;
  const contentState = newEditorState.getCurrentContent();
  const selectionState = newEditorState.getSelection();

  // Only the new empty block belongs in the fragment being inserted at the
  // current (atomic-block) selection - re-including the current block here
  // duplicated it (e.g. an inserted image would be rendered twice) since
  // replaceWithFragment inserts a copy of everything in the fragment.
  const fragmentArray = [
    new ContentBlock({
      key: generateRandomKey(),
      type: "unstyled",
      text: "",
      characterList: List(),
    }),
  ];

  const fragment = BlockMapBuilder.createFromArray(fragmentArray);

  const withUnstyledBlock = Modifier.replaceWithFragment(
    contentState,
    selectionState,
    fragment
  );

  const newContent = withUnstyledBlock.merge({
    selectionAfter: withUnstyledBlock.getSelectionAfter().set("hasFocus", true),
  });

  return EditorState.push(newEditorState, newContent, "insert-fragment");
}
