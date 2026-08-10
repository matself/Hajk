import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useSnackbar as useNotistackSnackbar } from "notistack";
import { Button, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { SnackbarContext } from "../components/SnackbarProvider";

// Constants for operation types.
const ADD = "ADD";
const SHOW = "SHOW";
const REMOVE = "REMOVE";
const ADD_ONLY = "ADD_ONLY";

// Function to generate a composite key for identifying message items.
const generateCompositeKey = (id, caption) => `${id}-${caption}`;

// Custom hook to manage snackbars.
const useSnackbar = () => {
  const { enqueueSnackbar, closeSnackbar } = useNotistackSnackbar();
  const { messageItems, setMessageItems } = useContext(SnackbarContext);
  const [operationType, setOperationType] = useState(null);

  // Reference to keep track of the current message items.
  const messageItemsRef = useRef({});

  // Effect to update messageItemsRef whenever messageItems changes.
  useEffect(() => {
    if (messageItems !== messageItemsRef.current) {
      messageItemsRef.current = messageItems;
    }
  }, [messageItems]);

  // Function to format the message text for the snackbar.
  const formatMessage = (items) => {
    const keys = Object.keys(items);
    if (keys.length === 0) return "";

    const mostRecentKey = keys[keys.length - 1];
    const mostRecentLayer = items[mostRecentKey].caption;
    const otherLayersCount = keys.length - 1;

    return otherLayersCount > 0
      ? `Lagret '${mostRecentLayer}' och ${otherLayersCount} andra lager är inte synliga vid aktuell zoomnivå.`
      : `Lagret '${mostRecentLayer}' är inte synligt vid aktuell zoomnivå.`;
  };

  // Function to display the snackbar.
  const displaySnackbar = useCallback(() => {
    const items = messageItemsRef.current;
    const keys = Object.keys(items);
    const message = formatMessage(items);
    if (!message) return;

    // Only offer a "zoom to visible scale" shortcut when there's a single,
    // unambiguous layer to zoom to.
    const mostRecentKey = keys[keys.length - 1];
    const onZoomToVisible =
      keys.length === 1 ? items[mostRecentKey].onZoomToVisible : undefined;

    // Action to display a "zoom to visible scale" and close button on the snackbar.
    const action = (key) => (
      <>
        {onZoomToVisible && (
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              onZoomToVisible();
              closeSnackbar(key);
            }}
          >
            Zooma till synlig skala
          </Button>
        )}
        <IconButton
          size="small"
          color="inherit"
          onClick={() => closeSnackbar(key)}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </>
    );

    enqueueSnackbar(message, {
      variant: "warning",
      autoHideDuration: 5000,
      action,
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "center",
      },
    });
  }, [enqueueSnackbar, closeSnackbar]);

  // Effect to handle the display of the snackbar based on operationType.
  useEffect(() => {
    if (!operationType || Object.keys(messageItems).length === 0) return;

    // Exclude REMOVE operation type from triggering snackbar.
    if ([ADD, SHOW].includes(operationType)) {
      displaySnackbar();
    }

    setOperationType(null);
  }, [operationType, messageItems, displaySnackbar]);

  // Function to update the snackbar messages and type.
  const updateSnackbar = useCallback(
    (type, id, caption, onZoomToVisible) => {
      if (!id || !caption) return;
      const key = generateCompositeKey(id, caption);

      setMessageItems((prevItems) => {
        if ([ADD, ADD_ONLY].includes(type)) {
          return { ...prevItems, [key]: { caption, onZoomToVisible } };
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prevItems;
        return rest;
      });

      if (type !== ADD_ONLY) {
        setOperationType(type);
      }
    },
    [setMessageItems]
  );

  // Function to add a new message to the snackbar.
  const addToSnackbar = (id, caption, addOnly = false, onZoomToVisible) => {
    updateSnackbar(addOnly ? ADD_ONLY : ADD, id, caption, onZoomToVisible);
  };

  // Function to remove a message from the snackbar.
  const removeFromSnackbar = (id, caption) =>
    updateSnackbar(REMOVE, id, caption);

  // Function to hide the snackbar.
  const hideSnackbar = useCallback(
    (key) => {
      if (key) closeSnackbar(key);
    },
    [closeSnackbar]
  );

  // Function to clear all messages from the snackbar.
  const clearSnackbar = () => setMessageItems({});

  // Function to display the snackbar.
  const showSnackbar = () => setOperationType(SHOW);

  // Return the snackbar methods.
  return {
    addToSnackbar,
    removeFromSnackbar,
    hideSnackbar,
    clearSnackbar,
    showSnackbar,
  };
};

export default useSnackbar;
