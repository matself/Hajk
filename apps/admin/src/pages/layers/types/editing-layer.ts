/** Field config persisted in layer.options (legacy wfstlayers shape). */
export interface EditableFieldConfig {
  index: number;
  name: string;
  alias?: string;
  description?: string;
  dataType: string;
  textType?: string | null;
  values?: string[] | null;
  hidden?: boolean;
  defaultValue?: string;
}

export interface EditingFieldRow extends EditableFieldConfig {
  editable: boolean;
  localType: string;
  type: string;
}

export interface EditingGeometryTypes {
  editPoint: boolean;
  editMultiPoint: boolean;
  editLine: boolean;
  editMultiLine: boolean;
  editPolygon: boolean;
  editMultiPolygon: boolean;
  allowMultiGeometries: boolean;
}

export const defaultEditingGeometryTypes = (): EditingGeometryTypes => ({
  editPoint: false,
  editMultiPoint: false,
  editLine: false,
  editMultiLine: false,
  editPolygon: false,
  editMultiPolygon: false,
  allowMultiGeometries: false,
});

export function geometryTypesFromOptions(
  options: Record<string, unknown> | undefined,
): EditingGeometryTypes {
  if (!options) return defaultEditingGeometryTypes();
  return {
    editPoint: options.editPoint === true,
    editMultiPoint: options.editMultiPoint === true,
    editLine: options.editLine === true,
    editMultiLine: options.editMultiLine === true,
    editPolygon: options.editPolygon === true,
    editMultiPolygon: options.editMultiPolygon === true,
    allowMultiGeometries: options.allowMultiGeometries === true,
  };
}

export function mergeDescribeWithSavedFields(
  describeProperties: {
    index: number;
    name: string;
    localType: string;
    type: string;
  }[],
  savedEditable: EditableFieldConfig[],
  savedNonEditable: EditableFieldConfig[],
): EditingFieldRow[] {
  const savedByName = new Map<string, EditableFieldConfig>();
  for (const f of [...savedEditable, ...savedNonEditable]) {
    savedByName.set(f.name, f);
  }
  const editableNames = new Set(savedEditable.map((f) => f.name));

  return describeProperties
    .filter((p) => !p.type.includes("gml:"))
    .map((p, index) => {
      const saved = savedByName.get(p.name);
      return {
        index: saved?.index ?? index,
        name: p.name,
        localType: p.localType,
        type: p.type,
        alias: saved?.alias ?? p.name,
        description: saved?.description ?? "",
        dataType: saved?.dataType ?? p.localType,
        textType: saved?.textType ?? defaultTextType(p.localType),
        values: saved?.values ?? null,
        hidden: saved?.hidden ?? false,
        defaultValue: saved?.defaultValue ?? "",
        editable: saved ? editableNames.has(p.name) : false,
      };
    });
}

function defaultTextType(localType: string): string | null {
  switch (localType) {
    case "date":
      return "date";
    case "date-time":
      return "date-time";
    case "int":
    case "integer":
      return "heltal";
    case "number":
    case "decimal":
      return "tal";
    case "boolean":
      return "boolean";
    default:
      return "text";
  }
}

export function splitEditingFields(rows: EditingFieldRow[]): {
  editableFields: EditableFieldConfig[];
  nonEditableFields: EditableFieldConfig[];
} {
  const mapRow = (row: EditingFieldRow): EditableFieldConfig => ({
    index: row.index,
    name: row.name,
    alias: row.alias,
    description: row.description,
    dataType: row.dataType,
    textType: row.textType,
    values: row.values,
    hidden: row.hidden,
    defaultValue: row.defaultValue,
  });

  return {
    editableFields: rows.filter((r) => r.editable).map(mapRow),
    nonEditableFields: rows.filter((r) => !r.editable).map(mapRow),
  };
}
