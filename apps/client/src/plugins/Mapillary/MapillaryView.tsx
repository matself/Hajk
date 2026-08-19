import { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useSnackbar } from "notistack";

import "mapillary-js/dist/mapillary.css";

import type { MapillaryViewProps } from "./types";

// mapillary-js unconditionally sets its container's CSS class to
// "mapillary-viewer" on construction, which carries its own stylesheet rule
// (position: relative - required so the viewer's internal canvas/controls,
// themselves position: absolute, have something to anchor to). That rule
// has the same specificity as - and loads after - anything we set here, so
// it always wins: a position: absolute here was silently overridden back
// to relative, leaving this element sized by normal flow instead of by its
// top/bottom/left/right offsets. Sizing it via flex instead of absolute
// positioning sidesteps the conflict entirely.
const ViewerArea = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  position: "relative",
}));

const MapillaryWindow = styled(Box)(() => ({
  flex: 1,
  minWidth: 0,
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
          Stäng detta fönster genom att klicka på krysset i hörnet. <br />
          Visa Mapillary i helskärm genom att klicka på den diskreta länken nere
          till höger i bilden.
        </Typography>
      )}
      <ViewerArea sx={{ display: displayViewer ? "flex" : "none" }}>
        <MapillaryWindow id="mapillary-window" />
        <DateWrapper id="image-date">{imageDate}</DateWrapper>
      </ViewerArea>
    </Box>
  );
}

export default MapillaryView;
