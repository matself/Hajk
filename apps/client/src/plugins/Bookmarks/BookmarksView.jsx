import React from "react";
import PropTypes from "prop-types";
import { useSnackbar } from "notistack";
import { saveAs } from "file-saver";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import ConfirmationDialog from "../../components/ConfirmationDialog";
import HajkToolTip from "../../components/HajkToolTip";

// Hooks
import useUpdateEffect from "../../hooks/useUpdateEffect";
import useCookieStatus from "../../hooks/useCookieStatus";

const List = styled("div")(() => ({
  display: "flex",
  flex: "1 0 100%",
  flexFlow: "column nowrap",
  marginTop: "10px",
}));

const ListItem = styled("div")(({ theme }) => ({
  display: "flex",
  position: "relative",
  flex: "1 0 100%",
  justifyContent: "flex-start",
  border: `1px solid ${theme.palette.grey[400]}`,
  transform: "translateZ(1px)",
  borderBottom: "none",
  "&:first-of-type": {
    borderRadius: "3px 3px 0 0",
  },
  "&:last-child": {
    borderBottom: `1px solid ${theme.palette.grey[400]}`,
    borderRadius: "0 0 3px 3px",
  },
}));

const AddButton = styled(Button)(() => ({
  flex: "1 0 auto",
  whiteSpace: "nowrap",
  height: "0%",
  top: "-22px",
  marginLeft: "10px",
}));

const BookmarkButton = styled(Button)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-start",
  flex: "1 0 100%",
  transform: "translateZ(1px)",
  "& svg": {
    color: theme.palette.text.secondary,
  },
  "&:hover svg.on": {
    opacity: 0.7,
  },
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
  display: "block",
  position: "absolute",
  top: 0,
  right: 0,
  padding: "5px",
  width: "36px",
  height: "36px",
  borderRadius: "100% 0 0 100%",
  "&:hover svg": {
    color: theme.palette.error.dark,
    stoke: theme.palette.error.dark,
    fill: theme.palette.error.dark,
  },
}));

const BookmarkIconSpan = styled("span")(({ theme }) => ({
  display: "inline-block",
  position: "relative",
  width: "24px",
  height: "24px",
  marginRight: "8px",
  "& .on": {
    position: "absolute",
    top: "0",
    left: "0",
    width: "24px",
    height: "24px",
    color: theme.palette.text.secondary,
    stoke: theme.palette.text.secondary,
    fill: theme.palette.text.secondary,
    opacity: 0.001,
    transition: "all 300ms",
  },
}));

const ItemNameSpan = styled("span")(() => ({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "calc(100% - 71px)",
  textTransform: "none",
}));

const StyledDeleteIcon = styled(DeleteIcon)(() => ({
  display: "block",
  width: "24px",
  height: "24px",
  transition: "all 300ms",
}));

const BookmarksView = (props) => {
  const { globalObserver } = props;
  const { functionalCookiesOk } = useCookieStatus(globalObserver);
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = React.useRef(null);

  const [name, setName] = React.useState("");
  const [error, setError] = React.useState(false);
  const [helperText, setHelperText] = React.useState(" ");
  const [bookmarks, setBookmarks] = React.useState(props.model.bookmarks);
  const [showRemovalConfirmation, setShowRemovalConfirmation] =
    React.useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = React.useState(null);

  // Update bookmarks when model changes.
  useUpdateEffect(() => {
    setBookmarks(props.model.bookmarks);
  }, [props.model.bookmarks]);

  const addBookmark = (_e) => {
    if (name.trim() === "") {
      return;
    }

    props.model.addBookmark(name, true);

    setName("");
    checkBookmarkName("");
  };

  const openBookmark = (bookmark) => {
    props.model.setMapState(bookmark);
  };

  const deleteBookmark = (id) => {
    setShowRemovalConfirmation(true);
    setBookmarkToDelete(id);
  };

  const checkBookmarkName = (name) => {
    const trimmedName = name.trim();

    if (trimmedName === "") {
      setError(false);
      setHelperText(" ");
      return false;
    }

    const exists = props.model.bookmarkWithNameExists(trimmedName);

    if (exists) {
      setError(true);
      setHelperText(`Namnet upptaget. Ersätt bokmärke "${trimmedName}"?`);
      return false;
    } else {
      setError(false);
      setHelperText(" ");
      return true;
    }
  };

  const handleChange = (event) => {
    setName(event.target.value);
  };

  const handleKeyUp = (e) => {
    checkBookmarkName(e.target.value);

    if (e.nativeEvent.keyCode === 13 /* Enter, yes we all know... */) {
      addBookmark();
    }
  };

  const handleRemoveConfirmation = () => {
    setShowRemovalConfirmation(false);
    props.model.deleteBookmark(bookmarkToDelete);
    setBookmarkToDelete(null);
  };

  const handleRemoveConfirmationAbort = () => {
    setShowRemovalConfirmation(false);
  };

  // Downloads all current bookmarks as a JSON file, so they can be
  // moved to another browser/device or restored if storage is cleared.
  const handleExportClick = () => {
    const blobData = new Blob(
      [JSON.stringify(props.model.bookmarks, null, 2)],
      {
        type: "application/json",
      }
    );
    saveAs(blobData, `bokmarken - ${new Date().toLocaleString()}.json`);
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Reads a previously exported bookmarks file and merges it into the
  // current bookmarks.
  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    // Allow selecting the same file again later.
    event.target.value = "";
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedBookmarks = JSON.parse(e.target?.result);
        const { importedCount, renamedCount, skippedCount } =
          props.model.importBookmarks(parsedBookmarks);
        setBookmarks({ ...props.model.bookmarks });

        if (importedCount === 0) {
          enqueueSnackbar("Inga bokmärken kunde importeras från filen.", {
            variant: "warning",
            anchorOrigin: { vertical: "bottom", horizontal: "center" },
          });
          return;
        }

        let message = `${importedCount} bokmärke${
          importedCount === 1 ? "" : "n"
        } importerades.`;
        if (renamedCount > 0) {
          message += ` ${renamedCount} bytte namn på grund av namnkrock.`;
        }
        if (skippedCount > 0) {
          message += ` ${skippedCount} kunde inte läsas in.`;
        }

        enqueueSnackbar(message, {
          variant: "success",
          anchorOrigin: { vertical: "bottom", horizontal: "center" },
        });
      } catch (error) {
        console.error(`Bookmarks could not be imported. Error: ${error}`);
        enqueueSnackbar(
          "Bokmärkena kunde inte läsas in, kontrollera att filen ser korrekt ut.",
          {
            variant: "error",
            anchorOrigin: { vertical: "bottom", horizontal: "center" },
          }
        );
      }
    };
    reader.readAsText(file);
  };

  const renderCookiesWarning = () => {
    return (
      <div>
        <Typography sx={{ marginBottom: 1 }}>
          Du har inte tillåtit funktionella kakor. För att kunna spara bokmärken
          måste du tillåta funktionella kakor.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          onClick={props.model.handleChangeCookieSettingsClick}
        >
          Cookie-inställningar
        </Button>
      </div>
    );
  };

  return functionalCookiesOk ? (
    <div>
      <Stack
        direction="row"
        sx={{ justifyContent: "flex-end", marginBottom: 1 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileInputChange}
        />
        <HajkToolTip title="Importera bokmärken från fil">
          <IconButton
            aria-label="Importera bokmärken"
            size="small"
            onClick={handleImportButtonClick}
          >
            <FileUploadOutlinedIcon fontSize="small" />
          </IconButton>
        </HajkToolTip>
        <HajkToolTip title="Exportera bokmärken till fil">
          <span>
            <IconButton
              aria-label="Exportera bokmärken"
              size="small"
              disabled={Object.keys(bookmarks).length === 0}
              onClick={handleExportClick}
            >
              <FileDownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </HajkToolTip>
      </Stack>
      <Typography sx={{ marginBottom: 1 }}>
        Skapa ett bokmärke med kartans synliga lager, aktuella zoomnivå och
        utbredning.
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexFlow: "row nowrap",
          alignItems: "flex-end",
        }}
      >
        <TextField
          placeholder="Skriv bokmärkets namn"
          label="Namn"
          value={name}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          error={error}
          helperText={helperText}
          sx={{ flex: "0 1 100%", height: "0%" }}
          variant="standard"
        ></TextField>
        <AddButton
          variant="contained"
          color="primary"
          size="small"
          startIcon={error ? null : <AddCircleOutlineIcon />}
          onClick={addBookmark}
          disabled={!name.trim()}
        >
          {error ? "Ersätt" : "Lägg till"}
        </AddButton>
      </Box>

      <List>
        {Object.keys(bookmarks).map((id) => {
          const bookmark = bookmarks[id];
          return (
            <ListItem key={id}>
              <BookmarkButton onClick={() => openBookmark(bookmark)}>
                <BookmarkIconSpan>
                  <BookmarkOutlinedIcon />
                  <BookmarkIcon className="on" />
                </BookmarkIconSpan>
                <ItemNameSpan>{id}</ItemNameSpan>
              </BookmarkButton>
              <DeleteButton
                aria-label="Ta bort"
                size="large"
                onClick={() => deleteBookmark(id)}
              >
                <StyledDeleteIcon fontSize="small" />
              </DeleteButton>
            </ListItem>
          );
        })}
        <ConfirmationDialog
          open={showRemovalConfirmation === true}
          titleName={"Radera bokmärke"}
          contentDescription={`Är du säker på att du vill radera bokmärket "${bookmarkToDelete}"?`}
          cancel={"Avbryt"}
          confirm={"Radera"}
          handleConfirm={handleRemoveConfirmation}
          handleAbort={handleRemoveConfirmationAbort}
        />
      </List>
    </div>
  ) : (
    renderCookiesWarning()
  );
};

BookmarksView.propTypes = {
  model: PropTypes.object.isRequired,
};

export default BookmarksView;
