import React from "react";

export function Id({title = "IIIF Manifest", id, ...props}) {
  return (
    <dl>
      <dt>{title}</dt>
      <dd>
        <a href={id}>{id}</a>
      </dd>
    </dl>
  );
}
