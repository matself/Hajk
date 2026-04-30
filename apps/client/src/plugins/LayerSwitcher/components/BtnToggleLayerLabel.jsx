import LabelOutlinedIcon from "@mui/icons-material/LabelImportantOutline";
import LabelIcon from "@mui/icons-material/LabelImportant";
import LsIconButton from "./LsIconButton";

function BtnToggleLayerLabel({ active, onClick }) {
  return (
    <LsIconButton
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {active ? (
        <LabelIcon className="ls-details-icon" />
      ) : (
        <LabelOutlinedIcon className="ls-details-icon" />
      )}
    </LsIconButton>
  );
}

export default BtnToggleLayerLabel;
