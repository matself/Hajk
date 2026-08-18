import { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useSnackbar } from "notistack";

import { isMobile } from "../../utils/IsMobile";

import "mapillary-js/dist/mapillary.css";

import type { MapillaryViewProps } from "./types";

const MapillaryWindow = styled(Box)(() => ({
  flex: 1,
  position: "absolute",
  top: isMobile ? 0 : "54px",
  bottom: 0,
  left: 0,
  right: 0,
}));

const DateWrapper = styled(Box)(({ theme }) => ({
  color: theme.palette.common.white,
  position: "absolute",
  zIndex: 1,
  top: isMobile ? 0 : "54px",
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
    <div>
      {!displayViewer && (
        <Typography sx={{ padding: 2 }}>
          Klicka i kartan för att aktivera Mapillary gatuvy. <br />
          Stäng detta fönster genom att klicka på krysset i hörnet.
        </Typography>
      )}
      <Box
        sx={{ minHeight: "200px", display: displayViewer ? "flex" : "none" }}
      >
        <MapillaryWindow id="mapillary-window" />
        <DateWrapper id="image-date">{imageDate}</DateWrapper>
      </Box>
    </div>
  );
}

export default MapillaryView;
