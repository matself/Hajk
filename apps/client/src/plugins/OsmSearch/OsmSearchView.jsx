import { useCallback, useState } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { useSnackbar } from "notistack";

function OsmSearchView(props) {
  const { model } = props;
  const { enqueueSnackbar } = useSnackbar();

  const [searchString, setSearchString] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = searchString.trim();
    if (trimmed.length < 2) {
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const hits = await model.search(trimmed);
      setResults(hits);
      if (hits.length === 0) {
        enqueueSnackbar("Inga träffar hittades.", { variant: "info" });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        enqueueSnackbar("Sökningen misslyckades. Försök igen.", {
          variant: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [searchString, model, enqueueSnackbar]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleResultClick = (result) => {
    model.showResult(result);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Sök plats, adress eller POI…"
        value={searchString}
        onChange={(e) => setSearchString(e.target.value)}
        onKeyDown={handleKeyDown}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSearch}
                  edge="end"
                  aria-label="Sök"
                  size="small"
                >
                  {loading ? <CircularProgress size={20} /> : <SearchIcon />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {results.length > 0 && (
        <List dense sx={{ marginTop: 1 }}>
          {results.map((result) => (
            <ListItemButton
              key={result.place_id}
              onClick={() => handleResultClick(result)}
            >
              <ListItemText
                primary={result.display_name}
                secondary={result.type}
              />
            </ListItemButton>
          ))}
        </List>
      )}
      <Typography
        variant="caption"
        color="textSecondary"
        sx={{ display: "block", marginTop: 2 }}
      >
        Platsdata från © OpenStreetMap-bidragsgivare
      </Typography>
    </Box>
  );
}

export default OsmSearchView;
