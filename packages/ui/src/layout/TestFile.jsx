import React, { useEffect, useState } from "react";

export const TestFile = (props) => {
  const [CloverViewer, setCloverViewer] = useState(null);

  useEffect(() => {
    let mounted = true;
    const canUseDom =
      typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer")
        .then((mod) => {
          if (!mounted) return;
          const Comp = mod && (mod.default || mod.Viewer || mod);
          setCloverViewer(() => Comp);
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (!CloverViewer) return null;
  return <CloverViewer {...props} />;
};
