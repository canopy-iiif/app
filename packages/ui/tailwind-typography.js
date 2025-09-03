/**
 * Opinionated Canopy typography theme extension for @tailwindcss/typography.
 * Consumers must install and enable the plugin in tailwind.config.js:
 *   plugins: [require('@tailwindcss/typography')]
 */
module.exports = {
  theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.slate.800'),
            '--tw-prose-headings': theme('colors.slate.900'),
            '--tw-prose-links': theme('colors.brand.600', '#2563eb'),
            '--tw-prose-bold': theme('colors.slate.900'),
            '--tw-prose-counters': theme('colors.slate.600'),
            '--tw-prose-bullets': theme('colors.slate.400'),
            '--tw-prose-hr': theme('colors.slate.200'),
            '--tw-prose-quotes': theme('colors.slate.900'),
            '--tw-prose-quote-borders': theme('colors.slate.200'),
            '--tw-prose-captions': theme('colors.slate.500'),
            '--tw-prose-code': theme('colors.slate.900'),
            '--tw-prose-pre-code': theme('colors.slate.100'),
            '--tw-prose-pre-bg': theme('colors.slate.900'),
            '--tw-prose-th-borders': theme('colors.slate.300'),
            '--tw-prose-td-borders': theme('colors.slate.200'),

            maxWidth: theme('maxWidth.content', '760px'),
            a: { textDecoration: 'none' },
            'a:hover': { textDecoration: 'underline' },
            h1: { fontWeight: '700' },
            h2: { fontWeight: '700' },
            h3: { fontWeight: '600' },
            code: {
              backgroundColor: theme('colors.slate.100'),
              paddingLeft: '0.2rem',
              paddingRight: '0.2rem',
              paddingTop: '0.1rem',
              paddingBottom: '0.1rem',
              borderRadius: '0.25rem',
            },
            pre: {
              backgroundColor: theme('colors.slate.900'),
              color: theme('colors.slate.100'),
              borderRadius: '0.5rem',
            },
            img: { borderRadius: '0.375rem' },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.slate.200'),
            '--tw-prose-headings': theme('colors.white'),
            '--tw-prose-links': theme('colors.brand.400', '#60a5fa'),
            '--tw-prose-bold': theme('colors.white'),
            '--tw-prose-counters': theme('colors.slate.400'),
            '--tw-prose-bullets': theme('colors.slate.600'),
            '--tw-prose-hr': theme('colors.slate.700'),
            '--tw-prose-quotes': theme('colors.slate.100'),
            '--tw-prose-quote-borders': theme('colors.slate.700'),
            '--tw-prose-captions': theme('colors.slate.400'),
            '--tw-prose-code': theme('colors.white'),
            '--tw-prose-pre-code': theme('colors.slate.200'),
            '--tw-prose-pre-bg': theme('colors.slate.800'),
            '--tw-prose-th-borders': theme('colors.slate.600'),
            '--tw-prose-td-borders': theme('colors.slate.700'),
          },
        },
      }),
    },
  },
};

