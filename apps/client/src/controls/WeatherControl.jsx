import { useCallback, useEffect, useRef, useState } from "react";
import { transform } from "ol/proj";
import { Box, CircularProgress, Popover, Typography } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import CloudIcon from "@mui/icons-material/Cloud";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import GrainIcon from "@mui/icons-material/Grain";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import ControlButton from "components/ControlButton";

// SMHI's open forecast API (MetFcst), takes lon/lat directly, no API key required.
// https://opendata.smhi.se/apidocs/metfcst/
// Note: SMHI retired the old "pmp3g" forecast API on 2026-03-31 in favor of
// "snow1g" - same URL shape and symbol codes, but the response nests each
// parameter under a flat "data" object instead of a "parameters" array, and
// uses human-readable parameter names and "time" instead of "validTime".
const FORECAST_ENDPOINT =
  "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point";

// symbol_code values, same numbering as the old API's Wsymb2 (1-27), see SMHI's MetFcst documentation
const WEATHER_SYMBOLS = {
  1: "Klart",
  2: "Nästan klart",
  3: "Växlande molnighet",
  4: "Halvklart",
  5: "Molnigt",
  6: "Mulet",
  7: "Dimma",
  8: "Lätta regnskurar",
  9: "Måttliga regnskurar",
  10: "Kraftiga regnskurar",
  11: "Åska",
  12: "Lätta snöblandade skurar",
  13: "Måttliga snöblandade skurar",
  14: "Kraftiga snöblandade skurar",
  15: "Lätta snöbyar",
  16: "Måttliga snöbyar",
  17: "Kraftiga snöbyar",
  18: "Lätt regn",
  19: "Måttligt regn",
  20: "Kraftigt regn",
  21: "Åska",
  22: "Lätt snöblandat regn",
  23: "Måttligt snöblandat regn",
  24: "Kraftigt snöblandat regn",
  25: "Lätt snöfall",
  26: "Måttligt snöfall",
  27: "Kraftigt snöfall",
};

const SUNNY_CODES = new Set([1, 2]);
const CLOUDY_CODES = new Set([3, 4, 5, 6]);
const THUNDER_CODES = new Set([11, 21]);
const SNOWY_CODES = new Set([12, 13, 14, 15, 16, 17, 22, 23, 24, 25, 26, 27]);

function renderWeatherIcon(code) {
  if (SUNNY_CODES.has(code)) return <WbSunnyIcon />;
  if (THUNDER_CODES.has(code)) return <ThunderstormIcon />;
  if (SNOWY_CODES.has(code)) return <AcUnitIcon />;
  if (CLOUDY_CODES.has(code)) return <CloudIcon />;
  if (code === 7) return <BlurOnIcon />;
  return <GrainIcon />;
}

// Refetching on every pixel of panning would hammer SMHI's API, so we only
// refetch once the center has moved roughly a kilometer, and debounce that
// check so a drag-in-progress doesn't trigger repeated requests.
const MIN_MOVE_DEGREES = 0.01;
const DEBOUNCE_MS = 800;

/**
 * @summary Shows the current weather forecast (SMHI MetFcst) for the map's center point
 *
 * @param {object} props
 * @returns {object} React
 */
const WeatherControl = (props) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const lastFetchedLonLat = useRef(null);
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchWeather = useCallback((lon, lat) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(false);

    fetch(
      `${FORECAST_ENDPOINT}/lon/${lon.toFixed(4)}/lat/${lat.toFixed(4)}/data.json`,
      { signal: controller.signal }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `SMHI forecast failed with status ${response.status}`
          );
        }
        return response.json();
      })
      .then((data) => {
        // The first entry in timeSeries is the forecast closest to now.
        const series = data?.timeSeries?.[0];
        if (!series) {
          throw new Error("No forecast data returned");
        }
        setWeather({
          validTime: series.time,
          temperature: series.data?.air_temperature,
          windSpeed: series.data?.wind_speed,
          precipitation: series.data?.precipitation_amount_mean,
          symbol: series.data?.symbol_code,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("WeatherControl: failed to fetch SMHI forecast", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleMapMove = useCallback(() => {
    if (!props.map) return;
    const view = props.map.getView();
    const center = view.getCenter();
    if (!center) return;

    const [lon, lat] = transform(center, view.getProjection(), "EPSG:4326");

    const last = lastFetchedLonLat.current;
    if (
      last &&
      Math.abs(last[0] - lon) < MIN_MOVE_DEGREES &&
      Math.abs(last[1] - lat) < MIN_MOVE_DEGREES
    ) {
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastFetchedLonLat.current = [lon, lat];
      fetchWeather(lon, lat);
    }, DEBOUNCE_MS);
  }, [props.map, fetchWeather]);

  useEffect(() => {
    if (!props.map || !props.showWeatherControl) return;

    handleMapMove();
    props.map.on("moveend", handleMapMove);
    return () => {
      props.map.un("moveend", handleMapMove);
      clearTimeout(debounceRef.current);
      abortControllerRef.current?.abort();
    };
  }, [props.map, props.showWeatherControl, handleMapMove]);

  if (!props.showWeatherControl) {
    return null;
  }

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const tooltip =
    weather?.temperature !== undefined
      ? `Väder vid kartans centrum: ${Math.round(weather.temperature)}°C`
      : "Väder vid kartans centrum";

  return (
    <>
      <ControlButton
        tooltip={tooltip}
        ariaLabel="Visa väder vid kartans centrum"
        aria-owns={anchorEl ? "weather-popover" : undefined}
        aria-haspopup="true"
        onClick={handleClick}
      >
        {loading ? (
          <CircularProgress size={20} />
        ) : (
          renderWeatherIcon(weather?.symbol)
        )}
      </ControlButton>
      <Popover
        id="weather-popover"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" gutterBottom>
            Väder vid kartans centrum
          </Typography>
          {error && (
            <Typography variant="body2" color="error">
              Kunde inte hämta väderdata från SMHI.
            </Typography>
          )}
          {!error && weather && (
            <>
              <Typography variant="body2">
                {WEATHER_SYMBOLS[weather.symbol] ?? "Okänt väder"}
              </Typography>
              <Typography variant="h5">
                {Math.round(weather.temperature)}°C
              </Typography>
              <Typography variant="body2">
                Vind: {weather.windSpeed} m/s
              </Typography>
              <Typography variant="body2">
                Nederbörd: {weather.precipitation} mm/h
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Källa: SMHI,{" "}
                {weather.validTime &&
                  new Date(weather.validTime).toLocaleString("sv-SE")}
              </Typography>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default WeatherControl;
