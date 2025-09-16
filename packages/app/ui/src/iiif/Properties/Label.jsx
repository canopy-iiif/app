import { Label } from "@samvera/clover-iiif/primitives";
import React from "react";

export function Label({ name, ...props }) {
  return <Label label={props.label} />;
}
