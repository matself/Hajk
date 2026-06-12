import { Grid, IconButton, Typography } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import InformationWrapper from "./InformationWrapper";
import ParameterField from "./ParameterField";
import { isDisplayOnlyParameter } from "../api/parameterUi";
import type { ProductParametersProps } from "../types";

const ProductParameters = ({
  parameters,
  setProductParameters,
  infoUrl,
  model,
  uploadParameterFile,
}: ProductParametersProps) => {
  const handleParameterChange = (
    value: string | number | boolean | string[],
    index: number
  ) => {
    setProductParameters(
      parameters.map((parameter, i) =>
        i === index ? { ...parameter, value } : parameter
      )
    );
  };

  const visibleParameters = parameters.filter(
    (p) => !isDisplayOnlyParameter(p)
  );

  return (
    <Grid container spacing={2}>
      {infoUrl.length > 0 && (
        <Grid
          container
          wrap="nowrap"
          size={12}
          sx={{ justifyContent: "space-between" }}
        >
          <Typography sx={{ alignSelf: "center" }}>
            Oklart hur produkten fungerar? Tryck på frågetecknet för mer
            information.
          </Typography>
          <IconButton
            aria-label="Hjälp"
            onClick={() => window.open(infoUrl, "_blank")}
          >
            <HelpIcon />
          </IconButton>
        </Grid>
      )}

      {visibleParameters.length === 0 && (
        <Grid size={12}>
          <InformationWrapper type="info">
            <Typography>
              Det finns inga publicerade parametrar att rendera! Du kan
              fortsätta direkt till nästa steg!
            </Typography>
          </InformationWrapper>
        </Grid>
      )}

      {parameters.map((parameter, index) => (
        <ParameterField
          key={`${parameter.name}-${index}`}
          parameter={parameter}
          index={index}
          onChange={handleParameterChange}
          model={model}
          uploadParameterFile={uploadParameterFile}
        />
      ))}
    </Grid>
  );
};

export default ProductParameters;
