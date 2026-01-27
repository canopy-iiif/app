import React from "react";

export function CanopyDiagram() {
  return (
    <div className="canopy-diagram">
      <section className="canopy-diagram__section canopy-diagram__section--collections">
        <h3>IIIF Providers</h3>
        <span className="canopy-diagram__section-summary">
          Source collections contribute 45 manifests while 5 manifests are
          directly retrieved as-is via IIIF endpoints.
        </span>
        <div className="canopy-diagram__grid">
          <article>
            <h4>Collection A</h4>
            <ul>
              <li>30 Manifests</li>
              <li>
                <em>Manuscripts</em>
              </li>
            </ul>
          </article>
          <article>
            <h4>Collection B</h4>
            <ul>
              <li>15 Manifests</li>
              <li>
                <em>Portraits</em>
              </li>
            </ul>
          </article>
          <article>
            <h4>Manifests (direct)</h4>
            <ul>
              <li>5 Manifests</li>
              <li>
                <em>Scrapbooks</em>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <div className="canopy-diagram__arrow" aria-hidden="true">
        <span className="canopy-diagram__arrow-line" />
        <span className="canopy-diagram__arrow-head" />
      </div>

      <section className="canopy-diagram__section canopy-diagram__section--build">
        <h3>Canopy Build Process</h3>
        <span className="canopy-diagram__section-summary">
          Canopy retrieves collections and syncs all manifests, page content,
          and annotations before bundling the site.
        </span>
        <div className="canopy-diagram__grid">
          <article>
            <h4>Automated content</h4>
            <ul>
              <li>50 manifests → 50 work pages</li>
              <li>One page per manifest</li>
              <li>Customize page layout</li>
            </ul>
          </article>
          <article>
            <h4>Contextual content</h4>
            <ul>
              <li>Markdown &amp; MDX pages</li>
              <li>Author narratives</li>
              <li>Reference manifests inline</li>
            </ul>
          </article>
          <article>
            <h4>Search index</h4>
            <ul>
              <li>Combines works + pages</li>
              <li>Customize result layout</li>
              <li>Optional annotations</li>
            </ul>
          </article>
        </div>
      </section>

      <div className="canopy-diagram__arrow" aria-hidden="true">
        <span className="canopy-diagram__arrow-line" />
        <span className="canopy-diagram__arrow-head" />
      </div>

      <section className="canopy-diagram__section canopy-diagram__section--output">
        <h3>Static Digital Project</h3>
        <span className="canopy-diagram__section-summary">
          The output is a lightweight bundle of HTML, CSS, JS, and JSON assets
          that can deploy anywhere.
        </span>
        <div className="canopy-diagram__grid">
          <article>
            <h4>Work pages</h4>
            <ul>
              <li>50 generated HTML pages</li>
              <li>Each links back to source manifests</li>
              <li>Styled with Canopy components</li>
            </ul>
          </article>
          <article>
            <h4>Custom pages</h4>
            <ul>
              <li>Markdown &amp; MDX-authored content</li>
              <li>Reusable layouts for narratives</li>
              <li>Embed IIIF media &amp; interstitials</li>
            </ul>
          </article>
          <article>
            <h4>Search bundle</h4>
            <ul>
              <li>Static FlexSearch index</li>
              <li>Works + pages share records</li>
              <li>Optional annotation dataset</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
