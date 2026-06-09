import type { GridRowId, GridRowSelectionModel } from "@mui/x-data-grid";

export interface NormalizedRowSelectionModel {
  type: "include" | "exclude";
  ids: Set<GridRowId>;
}

/** MUI X v9 selection model; also accepts legacy v7 array shape from older call sites. */
export function normalizeRowSelectionModel(
  model: GridRowSelectionModel | undefined,
): NormalizedRowSelectionModel | undefined {
  if (model == null) return undefined;
  if (Array.isArray(model)) {
    return { type: "include", ids: new Set(model as GridRowId[]) };
  }
  if (typeof model === "object" && "ids" in model && model.ids != null) {
    const ids =
      model.ids instanceof Set
        ? model.ids
        : new Set(model.ids as Iterable<GridRowId>);
    return {
      type: model.type === "exclude" ? "exclude" : "include",
      ids,
    };
  }
  return undefined;
}

export function isGridRowSelected(
  rowId: GridRowId,
  model: NormalizedRowSelectionModel | undefined,
): boolean {
  if (!model) return false;
  const inSet = model.ids.has(rowId);
  return model.type === "include" ? inSet : !inSet;
}

export function emptyIncludeSelectionModel(): GridRowSelectionModel {
  return { type: "include", ids: new Set() };
}

export function includeSelectionModel(ids: GridRowId[]): GridRowSelectionModel {
  return { type: "include", ids: new Set(ids) };
}
