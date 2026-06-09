import { Grid } from "@mui/material";
import { SERVICE_TYPE } from "../../../api/services";
import { Chip } from "@mui/material";

interface Props {
  type: SERVICE_TYPE;
}

export default function ServiceTypeBadge(props: Props) {
  const { type } = props;
  return (
    <Grid
      container
      sx={{
        height: "100%",
        width: "100%",
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      <Chip
        size="small"
        color={type === SERVICE_TYPE.WMS ? "success" : "warning"}
        label={type}
      />
    </Grid>
  );
}
