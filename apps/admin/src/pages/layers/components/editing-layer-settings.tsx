import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
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

const TEXT_TYPE_OPTIONS: Record<string, { value: string; labelKey: string }[]> =
  {
    string: [
      { value: "text", labelKey: "layers.editing.textType.text" },
      { value: "lista", labelKey: "layers.editing.textType.list" },
    ],
    int: [
      { value: "heltal", labelKey: "layers.editing.textType.integer" },
      {
        value: "Positiva heltal",
        labelKey: "layers.editing.textType.positiveInteger",
      },
    ],
    integer: [
      { value: "heltal", labelKey: "layers.editing.textType.integer" },
      {
        value: "Positiva heltal",
        labelKey: "layers.editing.textType.positiveInteger",
      },
    ],
    number: [
      { value: "tal", labelKey: "layers.editing.textType.number" },
      { value: "heltal", labelKey: "layers.editing.textType.integer" },
    ],
    decimal: [{ value: "tal", labelKey: "layers.editing.textType.number" }],
    boolean: [
      { value: "boolean", labelKey: "layers.editing.textType.boolean" },
    ],
    date: [{ value: "date", labelKey: "layers.editing.textType.date" }],
    "date-time": [
      { value: "date-time", labelKey: "layers.editing.textType.dateTime" },
    ],
  };

function textTypeOptionsFor(localType: string) {
  return TEXT_TYPE_OPTIONS[localType] ?? TEXT_TYPE_OPTIONS.string;
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
                    <TableCell>
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
                        minRows={2}
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
                          value={row.textType ?? "text"}
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
                    <TableCell>
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
