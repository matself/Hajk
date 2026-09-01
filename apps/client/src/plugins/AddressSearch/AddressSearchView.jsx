import { useCallback, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  ToggleButton,
  Typography,
} from "@mui/material";
import PinDropIcon from "@mui/icons-material/PinDrop";

import { useSnackbar } from "notistack";

function AddressSearchView(props) {
  const { model } = props;
  const { enqueueSnackbar } = useSnackbar();

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  // What the address point was measured against - see model.describeFeature.
  const [insamlingslage, setInsamlingslage] = useState(null);

  const debounceTimer = useRef(null);

  const reportError = useCallback(
    (error) => {
      if (error.name === "AbortError") {
        return;
      }
      enqueueSnackbar(error.message ?? "Adressökningen misslyckades.", {
        variant: "error",
      });
    },
    [enqueueSnackbar]
  );

  // Every search is a call against Lantmäteriet, so we wait for a pause in the
  // typing and never search on a string the API would reject anyway.
  useEffect(() => {
    const searchString = inputValue.trim();

    if (searchString.length < model.minSearchLength) {
      setOptions([]);
      setLoading(false);
      return;
    }

    // Nothing new to look up when the field simply shows what was picked.
    if (selected && searchString === selected.label) {
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        setOptions(await model.search(searchString));
      } catch (error) {
        setOptions([]);
        reportError(error);
      } finally {
        setLoading(false);
      }
    }, model.options.debounceTime);

    return () => clearTimeout(debounceTimer.current);
  }, [inputValue, selected, model, reportError]);

  const showAddress = useCallback(
    async (reference) => {
      try {
        const feature = await model.getAddressFeature(reference.id);
        if (!feature) {
          enqueueSnackbar("Adressen saknar geometri och kan inte visas.", {
            variant: "warning",
          });
          return;
        }
        model.showFeature(feature);
        setInsamlingslage(model.describeFeature(feature).insamlingslage);
      } catch (error) {
        reportError(error);
      }
    },
    [model, enqueueSnackbar, reportError]
  );

  const handleMapPick = useCallback(
    async (coordinate) => {
      try {
        const hit = await model.findAddressAtCoordinate(coordinate);
        if (!hit) {
          enqueueSnackbar("Ingen adress hittades vid den punkten.", {
            variant: "info",
          });
          return;
        }
        const reference = { id: hit.label, label: hit.label };
        setSelected(reference);
        setOptions([reference]);
        setInputValue(hit.label);
        setInsamlingslage(hit.insamlingslage);
        model.showFeature(hit.feature);
      } catch (error) {
        reportError(error);
      }
    },
    [model, enqueueSnackbar, reportError]
  );

  const togglePicking = () => {
    if (picking) {
      model.disablePickMode();
      setPicking(false);
    } else {
      model.enablePickMode(handleMapPick);
      setPicking(true);
      enqueueSnackbar("Klicka i kartan för att hämta närmaste adress.", {
        variant: "info",
      });
    }
  };

  // Picking must not stay on once the window is gone.
  useEffect(() => {
    return () => model.disablePickMode();
  }, [model]);

  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Autocomplete
          fullWidth
          size="small"
          autoComplete
          includeInputInList
          filterSelectedOptions
          // The API has already filtered; filtering again locally would only
          // hide hits whose label is formatted differently from the query.
          filterOptions={(x) => x}
          options={options}
          value={selected}
          inputValue={inputValue}
          loading={loading}
          noOptionsText="Inga adresser hittades"
          loadingText="Söker…"
          getOptionLabel={(option) => option.label ?? ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onInputChange={(_event, value) => setInputValue(value)}
          onChange={(_event, value) => {
            setSelected(value);
            setInsamlingslage(null);
            if (value) {
              showAddress(value);
            } else {
              model.clearResult();
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Adress"
              placeholder="T.ex. Lantmäterigatan 2 Gävle"
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps.input,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={18} /> : null}
                      {params.slotProps.input.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />
        {model.options.enableMapClick && (
          <ToggleButton
            value="pick"
            size="small"
            selected={picking}
            onChange={togglePicking}
            title="Hämta närmaste adress genom att klicka i kartan"
            aria-label="Hämta adress från kartan"
          >
            <PinDropIcon fontSize="small" />
          </ToggleButton>
        )}
      </Box>
      {insamlingslage && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ display: "block", marginTop: 1 }}
        >
          Adresspunktens läge: {insamlingslage.toLowerCase()}
        </Typography>
      )}
      <Typography
        variant="caption"
        color="textSecondary"
        sx={{ display: "block", marginTop: 2 }}
      >
        Adressdata från Lantmäteriet (Belägenhetsadress Direkt)
      </Typography>
    </Box>
  );
}

export default AddressSearchView;
