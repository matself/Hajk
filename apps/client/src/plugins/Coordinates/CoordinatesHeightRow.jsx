import React from "react";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import withSnackbar from "components/WithSnackbar";
import { Grid, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { styled } from "@mui/material/styles";
import HajkToolTip from "components/HajkToolTip";

const StyledIconButton = styled(IconButton)(({ _theme }) => ({
  justifyContent: "flex-end",
  padding: "8px",
  "& svg": {
    fontSize: 20,
  },
  marginBottom: "-8px",
  marginRight: "-6px",
}));

class CoordinatesHeightRow extends React.PureComponent {
  state = {
    height: undefined,
    failed: false,
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.model.localObserver;

    this.localObserver.subscribe("newHeight", ({ height, failed }) => {
      this.setState({ height, failed: failed ?? false });
    });
  }

  formatHeight() {
    if (typeof this.state.height === "number") {
      return this.state.height.toFixed(2);
    }
    return this.state.failed
      ? "Kunde inte hämta markhöjd"
      : "Ingen höjddata";
  }

  handleCopyToClipBoard() {
    if (typeof this.state.height !== "number") {
      this.props.enqueueSnackbar("Ingen höjd att kopiera", {
        variant: "error",
      });
      return;
    }

    navigator.clipboard
      .writeText(this.formatHeight())
      .then(() => {
        this.props.enqueueSnackbar("Markhöjden kopierades till urklipp", {
          variant: "info",
        });
      })
      .catch(() => {
        this.props.enqueueSnackbar("Kopiering misslyckades", {
          variant: "error",
        });
      });
  }

  render() {
    if (this.state.height === undefined) {
      return <></>;
    }

    return (
      <Grid
        container
        columnSpacing={2}
        sx={{
          padding: 0,
        }}
      >
        <Grid
          size={{
            xs: 10,
            md: 8,
          }}
          sx={{
            alignSelf: "end",
          }}
        >
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            Markhöjd
          </Typography>
        </Grid>
        <Grid
          container
          size={{
            xs: 2,
            md: 4,
          }}
          sx={{
            justifyContent: "end",
          }}
        >
          <HajkToolTip title="Kopiera till urklipp">
            <StyledIconButton onClick={() => this.handleCopyToClipBoard()}>
              <ContentCopyIcon></ContentCopyIcon>
            </StyledIconButton>
          </HajkToolTip>
        </Grid>
        <Grid
          size={{
            xs: 12,
          }}
        >
          <TextField
            margin="dense"
            variant="outlined"
            size="small"
            value={this.formatHeight()}
            slotProps={{ input: { readOnly: true } }}
            fullWidth={true}
          />
        </Grid>
      </Grid>
    );
  }
}

export default withSnackbar(CoordinatesHeightRow);
