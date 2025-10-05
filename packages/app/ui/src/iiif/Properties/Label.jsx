import React from 'react';
import { Label as CloverLabel } from '@samvera/clover-iiif/primitives';

export function Label({ name, ...props }) {
  return <CloverLabel label={props.label} />;
}
