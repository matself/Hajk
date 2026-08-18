import { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useSnackbar } from "notistack";

import { isMobile } from "../../utils/IsMobile";

import "mapillary-js/dist/mapillary.css";

import type { MapillaryViewProps } from "./types";

// Fills whatever box its immediate parent (ViewerContainer, below) actually
// has - no magic offsets. ViewerContainer is the positioning context, and
// it's already placed correctly below the window's header by being a normal
// flex child, so there's no header height to account for here.
const MapillaryWindow = styled(Box)(() => ({
  position: "absolute",
  inset: 0,
}));

const DateWrapper = styled(Box)(({ theme }) => ({
  color: theme.palette.common.white,
  position: "absolute",
  zIndex: 1,
  top: 0,
  left: 0,
  background: "rgba(0, 0, 0, 0.7)",
  padding: "0px 3px",
  lineHeight: 1.4,
  fontSize: "10px",
}));

// The positioning context for MapillaryWindow/DateWrapper above, and the
// flex item that actually receives the window's real available height -
// a plain flex:1 child of a flex column that spans the plugin's full
// content area, instead of a bare minHeight that never grows because its
// only child is position:absolute and contributes nothing to its own flow
// height (confirmed via diagnostic logging: container height was
// permanently stuck at exactly the old minHeight:200px value, regardless
// of the window's real configured/dragged size).
const ViewerContainer = styled(Box)(() => ({
  position: "relative",
  flex: 1,
  minHeight: isMobile ? undefined : 200,
}));

function MapillaryView({ localObserver, displayViewer }: MapillaryViewProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [imageDate, setImageDate] = useState("");

  useEffect(() => {
    const handleImageDateChanged = (date: string) => setImageDate(date);
    const handleNoImageFound = () => {
      setImageDate("");
      enqueueSnackbar("Ingen Mapillary-bild hittades nära vald position.", {
        variant: "info",
      });
    };
    const handleAccessTokenMissing = () => {
      enqueueSnackbar(
        "Kunde inte ladda Mapillary. Kontakta systemadministratören och be om att kontrollera access-token.",
        { variant: "error" }
      );
    };
    const handleLoadFailed = () => {
      enqueueSnackbar(
        "Kunde inte hämta bilder från Mapillary. Försök igen om en stund.",
        { variant: "error" }
      );
    };

    localObserver.subscribe("imageDateChanged", handleImageDateChanged);
    localObserver.subscribe("noImageFound", handleNoImageFound);
    localObserver.subscribe("accessTokenMissing", handleAccessTokenMissing);
    localObserver.subscribe("loadFailed", handleLoadFailed);

    return () => {
      localObserver.unsubscribe("imageDateChanged", handleImageDateChanged);
      localObserver.unsubscribe("noImageFound", handleNoImageFound);
      localObserver.unsubscribe("accessTokenMissing", handleAccessTokenMissing);
      localObserver.unsubscribe("loadFailed", handleLoadFailed);
    };
  }, [localObserver, enqueueSnackbar]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!displayViewer && (
        <Typography sx={{ padding: 2 }}>
          Klicka i kartan för att aktivera Mapillary gatuvy. <br />
          Stäng detta fönster genom att klicka på krysset i hörnet.
        </Typography>
      )}
      {/* Always mounted (never conditionally rendered) - MapillaryModel
          looks up #mapillary-window by id to construct the Viewer the
          first time an image loads, so the container must already exist
          in the DOM before displayViewer ever becomes true. */}
      <ViewerContainer sx={{ display: displayViewer ? "flex" : "none" }}>
        <MapillaryWindow id="mapillary-window" />
        <DateWrapper id="image-date">{imageDate}</DateWrapper>
      </ViewerContainer>
    </Box>
  );
}

export default MapillaryView;
