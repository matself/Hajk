import Tooltip from "@mui/material/Tooltip";
import { ReactNode, isValidElement } from "react";

interface Props {
  title?: ReactNode;
  children?: ReactNode;
  [key: string]: unknown;
}

const HajkTooltip = ({ title, children, ...rest }: Props) => {
  const tooltipChild = isValidElement(children) ? children : <span>{children}</span>;

  return (
    <Tooltip
      enterDelay={500}
      leaveDelay={50}
      disableInteractive={true}
      title={title}
      {...rest}
    >
      {tooltipChild}
    </Tooltip>
  );
};

export default HajkTooltip;
