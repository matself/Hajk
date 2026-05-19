import Tooltip from "@mui/material/Tooltip";
import { ReactElement, ReactNode } from "react";

interface Props {
  title?: ReactNode;
  children?: ReactNode;
  [key: string]: unknown;
}

const HajkTooltip = ({ title, children, ...rest }: Props) => {
  return (
    <Tooltip
      enterDelay={500}
      leaveDelay={50}
      disableInteractive={true}
      title={title}
      {...rest}
    >
      {children ?? <></>}
    </Tooltip>
  );
};

export default HajkTooltip;
