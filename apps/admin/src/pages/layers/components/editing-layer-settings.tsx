import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchDescribeFeatureType } from "../../../api/services/describe-feature-type";
import DialogWrapper from "../../../components/flexible-dialog";
import FormPanel from "../../../components/form-components/form-panel";
import { TextFieldWithHelp } from "../../../components/form-components/field-label-with-help";
import {
  EditingFieldRow,
  EditingGeometryTypes,
  mergeDescribeWithSavedFields,
} from "../types/editing-layer";
import type { EditableFieldConfig } from "../types/editing-layer";
import { useLayerFieldLabels } from "../use-layer-field-labels";

const GEOMETRY_TYPE_ROW_CONFIG: {
  field: keyof EditingGeometryTypes;
  labelKey:
    | "layers.editing.geometry.point"
    | "layers.editing.geometry.multipoint"
    | "layers.editing.geometry.line"
    | "layers.editing.geometry.multiline"
    | "layers.editing.geometry.polygon"
    | "layers.editing.geometry.multipolygon"
    | "layers.editing.allowMultiGeometries";
}[] = [
  { field: "editPoint", labelKey: "layers.editing.geometry.point" },
  { field: "editMultiPoint", labelKey: "layers.editing.geometry.multipoint" },
  { field: "editLine", labelKey: "layers.editing.geometry.line" },
  { field: "editMultiLine", labelKey: "layers.editing.geometry.multiline" },
  { field: "editPolygon", labelKey: "layers.editing.geometry.polygon" },
  {
    field: "editMultiPolygon",
    labelKey: "layers.editing.geometry.multipolygon",
  },
  {
    field: "allowMultiGeometries",
    labelKey: "layers.editing.allowMultiGeometries",
  },
];

interface EditingLayerSettingsProps {
  serviceUrl: string;
  typeName: string;
  geometryField: string;
  onGeometryFieldChange: (value: string) => void;
  geometryTypes: EditingGeometryTypes;
  onGeometryTypesChange: (value: EditingGeometryTypes) => void;
  savedEditableFields: EditableFieldConfig[];
  savedNonEditableFields: EditableFieldConfig[];
  onFieldsChange: (
    editable: EditableFieldConfig[],
    nonEditable: EditableFieldConfig[],
  ) => void;
}

const STRING_INPUT_TYPES = [
  { value: "fritext", labelKey: "layers.editing.textType.text" },
  { value: "datum", labelKey: "layers.editing.textType.dateInput" },
  { value: "lista", labelKey: "layers.editing.textType.list" },
  { value: "flerval", labelKey: "layers.editing.textType.multiSelect" },
  { value: "url", labelKey: "layers.editing.textType.url" },
] as const;

const INTEGER_INPUT_TYPES = [
  { value: "heltal", labelKey: "layers.editing.textType.integer" },
  { value: "positive", labelKey: "layers.editing.textType.positiveInteger" },
  { value: "negative", labelKey: "layers.editing.textType.negativeInteger" },
  { value: "boolean", labelKey: "layers.editing.textType.trueFalse" },
] as const;

const NUMBER_INPUT_TYPES = [
  { value: "tal", labelKey: "layers.editing.textType.number" },
  ...INTEGER_INPUT_TYPES,
] as const;

const TEXT_TYPE_OPTIONS: Record<string, { value: string; labelKey: string }[]> =
  {
    string: [...STRING_INPUT_TYPES],
    int: [...INTEGER_INPUT_TYPES],
    integer: [...INTEGER_INPUT_TYPES],
    number: [...NUMBER_INPUT_TYPES],
    decimal: [...NUMBER_INPUT_TYPES],
    boolean: [
      { value: "boolean", labelKey: "layers.editing.textType.boolean" },
    ],
    date: [{ value: "datum", labelKey: "layers.editing.textType.date" }],
    "date-time": [
      { value: "datumtid", labelKey: "layers.editing.textType.dateTime" },
      { value: "datum", labelKey: "layers.editing.textType.date" },
    ],
  };

function textTypeOptionsFor(localType: string) {
  return TEXT_TYPE_OPTIONS[localType] ?? TEXT_TYPE_OPTIONS.string;
}

function textTypeSelectValue(row: EditingFieldRow): string {
  if (row.textType) return row.textType;
  return textTypeOptionsFor(row.localType)[0]?.value ?? "fritext";
}

function splitRows(rows: EditingFieldRow[]) {
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

function ListValuesCell({
  row,
  rowIndex,
  onPatch,
}: {
  row: EditingFieldRow;
  rowIndex: number;
  onPatch: (index: number, patch: Partial<EditingFieldRow>) => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const list = row.values ?? [];

  const commitValue = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (list.includes(trimmed)) {
      setInput("");
      return;
    }
    onPatch(rowIndex, { values: [...list, trimmed] });
    setInput("");
  };

  return (
    <Box sx={{ minWidth: 160, maxWidth: 280 }}>
      <Stack spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={String(
            t("layers.editing.listValueAddPlaceholder" as never),
          )}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitValue();
            }
          }}
        />
        {list.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
            {list.map((v, valueIdx) => (
              <Chip
                key={`${rowIndex}-${valueIdx}`}
                label={v}
                size="small"
                variant="outlined"
                color="primary"
                deleteIcon={
                  <CloseRoundedIcon
                    fontSize="small"
                    aria-label={String(
                      t("layers.editing.listValueRemoveAria" as never, {
                        value: v,
                      }),
                    )}
                  />
                }
                onDelete={() => {
                  const next = list.filter((_, j) => j !== valueIdx);
                  onPatch(rowIndex, { values: next.length > 0 ? next : null });
                }}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

export default function EditingLayerSettings({
  serviceUrl,
  typeName,
  geometryField,
  onGeometryFieldChange,
  geometryTypes,
  onGeometryTypesChange,
  savedEditableFields,
  savedNonEditableFields,
  onFieldsChange,
}: EditingLayerSettingsProps) {
  const { t } = useTranslation();
  const { fieldLabel } = useLayerFieldLabels();
  const [fieldRows, setFieldRows] = useState<EditingFieldRow[]>([]);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [draftFieldRows, setDraftFieldRows] = useState<EditingFieldRow[]>([]);

  const {
    data: describeProperties,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["describeFeatureType", serviceUrl, typeName],
    queryFn: () => fetchDescribeFeatureType(serviceUrl, typeName),
    enabled: Boolean(serviceUrl && typeName),
  });

  useEffect(() => {
    if (!describeProperties) return;
    setFieldRows(
      mergeDescribeWithSavedFields(
        describeProperties,
        savedEditableFields,
        savedNonEditableFields,
      ),
    );
  }, [
    describeProperties,
    typeName,
    savedEditableFields,
    savedNonEditableFields,
  ]);

  const updateDraftFieldRow = (
    index: number,
    patch: Partial<EditingFieldRow>,
  ) => {
    setDraftFieldRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleOpenFieldsDialog = () => {
    setDraftFieldRows(fieldRows);
    setFieldsDialogOpen(true);
  };

  const handleCloseFieldsDialog = () => {
    setFieldsDialogOpen(false);
  };

  const handleApplyFieldsDialog = () => {
    setFieldRows(draftFieldRows);
    const { editableFields, nonEditableFields } = splitRows(draftFieldRows);
    onFieldsChange(editableFields, nonEditableFields);
    setFieldsDialogOpen(false);
  };

  const editableCount = fieldRows.filter((r) => r.editable).length;

  const setGeometryType = (
    key: keyof EditingGeometryTypes,
    checked: boolean,
    exclusiveKey?: keyof EditingGeometryTypes,
  ) => {
    const next = { ...geometryTypes, [key]: checked };
    if (checked && exclusiveKey) {
      next[exclusiveKey] = false;
    }
    onGeometryTypesChange(next);
  };

  return (
    <>
      <FormPanel title={t("layers.editing.geometrySection")}>
        <Grid container rowSpacing={2}>
          <Grid size={12}>
            <TextFieldWithHelp
              labelKey="layers.searchSettings.geometryField"
              helpKey="layers.help.editingGeometryField"
              fullWidth
              value={geometryField}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onGeometryFieldChange(e.target.value)
              }
            />
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t("layers.editing.geometryTypes")}
            </Typography>
            <Box sx={{ mb: 2 }}>
              {GEOMETRY_TYPE_ROW_CONFIG.filter(
                ({ field }) => geometryTypes[field],
              ).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("layers.editing.geometryTypesNone")}
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                  {GEOMETRY_TYPE_ROW_CONFIG.filter(
                    ({ field }) => geometryTypes[field],
                  ).map(({ field, labelKey }) => (
                    <Chip
                      key={field}
                      size="small"
                      label={String(t(labelKey as never))}
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Stack>
              )}
            </Box>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.editPoint}
                    onChange={(e) =>
                      setGeometryType(
                        "editPoint",
                        e.target.checked,
                        "editMultiPoint",
                      )
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.geometry.point",
                  "layers.help.editingGeometryPoint",
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.editMultiPoint}
                    onChange={(e) =>
                      setGeometryType(
                        "editMultiPoint",
                        e.target.checked,
                        "editPoint",
                      )
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.geometry.multipoint",
                  "layers.help.editingGeometryMultipoint",
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.editLine}
                    onChange={(e) =>
                      setGeometryType(
                        "editLine",
                        e.target.checked,
                        "editMultiLine",
                      )
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.geometry.line",
                  "layers.help.editingGeometryLine",
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.editMultiLine}
                    onChange={(e) =>
                      setGeometryType(
                        "editMultiLine",
                        e.target.checked,
                        "editLine",
                      )
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.geometry.multiline",
                  "layers.help.editingGeometryMultiline",
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.editPolygon}
                    onChange={(e) =>
                      setGeometryType(
                        "editPolygon",
                        e.target.checked,
                        "editMultiPolygon",
                      )
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.geometry.polygon",
                  "layers.help.editingGeometryPolygon",
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.editMultiPolygon}
                    onChange={(e) =>
                      setGeometryType(
                        "editMultiPolygon",
                        e.target.checked,
                        "editPolygon",
                      )
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.geometry.multipolygon",
                  "layers.help.editingGeometryMultipolygon",
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={geometryTypes.allowMultiGeometries}
                    onChange={(e) =>
                      onGeometryTypesChange({
                        ...geometryTypes,
                        allowMultiGeometries: e.target.checked,
                      })
                    }
                  />
                }
                label={fieldLabel(
                  "layers.editing.allowMultiGeometries",
                  "layers.help.editingAllowMultiGeometries",
                )}
              />
            </FormGroup>
          </Grid>
        </Grid>
      </FormPanel>

      <FormPanel title={t("layers.editing.editableFields")}>
        {!typeName ? (
          <Alert severity="info">{t("layers.editing.selectLayerFirst")}</Alert>
        ) : isLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={32} />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void refetch()}
              >
                {t("common.retry")}
              </Button>
            }
          >
            {t("layers.editing.describeFeatureTypeFailed")}
          </Alert>
        ) : fieldRows.length === 0 ? (
          <Alert severity="warning">
            {t("layers.editing.noFieldsFromCapabilities")}
          </Alert>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2" color="text.secondary">
              {t("layers.editing.fieldsSummary", {
                editable: editableCount,
                total: fieldRows.length,
              })}
            </Typography>
            <Box>
              <Button variant="outlined" onClick={handleOpenFieldsDialog}>
                {t("layers.editing.manageFields")}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t("layers.editing.fieldsFromDescribeFeatureType")}
            </Typography>
          </Box>
        )}
      </FormPanel>

      <DialogWrapper
        open={fieldsDialogOpen}
        title={t("layers.editing.editableFields")}
        onClose={handleCloseFieldsDialog}
        fullWidth
        maxWidth="xl"
        actions={
          <>
            <Button onClick={handleCloseFieldsDialog}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" onClick={handleApplyFieldsDialog}>
              {t("common.dialog.okBtn")}
            </Button>
          </>
        }
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void refetch()}
              >
                {t("common.retry")}
              </Button>
            }
          >
            {t("layers.editing.describeFeatureTypeFailed")}
          </Alert>
        ) : (
          <TableContainer sx={{ maxHeight: "min(70vh, 640px)" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.editable",
                      "layers.help.editingColEditable",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.hidden",
                      "layers.help.editingColHidden",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel("common.name", "layers.help.fieldName")}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.alias",
                      "layers.help.editingColAlias",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.description",
                      "layers.help.editingColDescription",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.inputType",
                      "layers.help.editingColInputType",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.dataType",
                      "layers.help.editingColDataType",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.listValues",
                      "layers.help.editingColListValues",
                    )}
                  </TableCell>
                  <TableCell>
                    {fieldLabel(
                      "layers.editing.col.defaultValue",
                      "layers.help.editingColDefaultValue",
                    )}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {draftFieldRows.map((row, rowIndex) => (
                  <TableRow key={row.name}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.editable}
                        onChange={(e) =>
                          updateDraftFieldRow(rowIndex, {
                            editable: e.target.checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.hidden ?? false}
                        onChange={(e) =>
                          updateDraftFieldRow(rowIndex, {
                            hidden: e.target.checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell sx={{ p: 0 }}>
                      <TextField
                        size="small"
                        value={row.alias ?? ""}
                        onChange={(e) =>
                          updateDraftFieldRow(rowIndex, {
                            alias: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        multiline
                        fullWidth
                        rows={4}
                        value={row.description ?? ""}
                        onChange={(e) =>
                          updateDraftFieldRow(rowIndex, {
                            description: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <InputLabel>
                          {t("layers.editing.col.inputType")}
                        </InputLabel>
                        <Select
                          label={t("layers.editing.col.inputType")}
                          value={textTypeSelectValue(row)}
                          onChange={(e) =>
                            updateDraftFieldRow(rowIndex, {
                              textType: e.target.value,
                            })
                          }
                        >
                          {textTypeOptionsFor(row.localType).map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {t(opt.labelKey)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>{row.localType}</TableCell>
                    <TableCell sx={{ verticalAlign: "top", py: 1 }}>
                      <ListValuesCell
                        row={row}
                        rowIndex={rowIndex}
                        onPatch={updateDraftFieldRow}
                      />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top", py: 1 }}>
                      <TextField
                        size="small"
                        value={row.defaultValue ?? ""}
                        onChange={(e) =>
                          updateDraftFieldRow(rowIndex, {
                            defaultValue: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogWrapper>
    </>
  );
}
