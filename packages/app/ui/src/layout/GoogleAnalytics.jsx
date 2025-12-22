import React from 'react';

const GA_HOST = 'https://www.googletagmanager.com/gtag/js';

export default function GoogleAnalytics({ id }) {
  if (!id) return null;

  const inlineConfig = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;

  return (
    <>
      <script async src={`${GA_HOST}?id=${encodeURIComponent(id)}`}></script>
      <script dangerouslySetInnerHTML={{ __html: inlineConfig }} />
    </>
  );
}
