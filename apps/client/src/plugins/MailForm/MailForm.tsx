import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";

import EmailIcon from "@mui/icons-material/Email";

import MailFormView from "./MailFormView";

import type { MailFormProps } from "./types";

/**
 * @summary Main component for the MailForm plugin.
 * @description A lightweight alternative to Collector: instead of writing
 * a submission to a WFS-T backend, it builds a mailto: link from the
 * user's email, a generated link to the current map view, and a free
 * text message, and hands it off to the user's own mail client.
 */
const MailForm: React.FC<MailFormProps> = (props) => {
  return (
    <BaseWindowPlugin
      {...props}
      type="MailForm"
      custom={{
        icon: <EmailIcon />,
        title: props.options.title || "Tyck till",
        description:
          props.options.description || "Skicka en synpunkt om kartan",
        height: "dynamic",
        width: 400,
      }}
    >
      <MailFormView app={props.app} options={props.options} />
    </BaseWindowPlugin>
  );
};

export default MailForm;
