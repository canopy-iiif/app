import React from "react";
import Hero from "./Hero.jsx";

/**
 * FeaturedHero
 *
 * Thin wrapper around <Hero /> kept for backward compatibility and clarity in MDX.
 * Delegates selection logic to Hero (which reads the featured cache when no item is provided).
 */
export default function FeaturedHero(props = {}) {
  return <Hero {...props} />;
}
