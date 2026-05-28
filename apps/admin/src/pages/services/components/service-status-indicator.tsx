import { Grid } from "@mui/material";
import { CircularProgress, Tooltip } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import { SERVICE_STATUS } from "../../../api/services";
import { useTranslation } from "react-i18next";

const tooltipSlotProps = {
  tooltip: {
    sx: {
      "&&": {
        bgcolor: "background.paper",
        color: "text.primary",
        border: "1px solid black",
        borderRadius: 0,
        boxShadow: "none",
        fontSize: "1.1rem",
      },
    },
  },
} as const;

interface Props {
  status: SERVICE_STATUS;
  lastChecked?: string;
}

export default function ServiceStatusIndicator({ status, lastChecked }: Props) {
  const { t } = useTranslation();

  const checkedLabel = lastChecked
    ? `${t("services.status.lastChecked")}: ${new Date(lastChecked).toLocaleTimeString("sv-SE")}`
    : "";

  return (
    <Grid
      container
      sx={{
        height: "100%",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {status === SERVICE_STATUS.UNKNOWN ? (
        <CircularProgress size={20} />
      ) : status === SERVICE_STATUS.UNHEALTHY ? (
        <Tooltip
          title={checkedLabel}
          disableHoverListener={!checkedLabel}
          slotProps={tooltipSlotProps}
        >
          <WarningAmberIcon color="warning" />
        </Tooltip>
      ) : (
        <Tooltip
          title={checkedLabel}
          disableHoverListener={!checkedLabel}
          slotProps={tooltipSlotProps}
        >
          <CheckCircleOutlineIcon color="success" />
        </Tooltip>
      )}
    </Grid>
  );
}
