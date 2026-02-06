import {withBasePath} from '@canopy-iiif/app/base-path';
import React, {useEffect, useRef} from 'react';

type ViewerConfig = {
  container: HTMLElement | string;
  manifestUrl: string;
  disablePanAndZoom?: boolean;
  pointOfInterestSvgUrl?: string;
} & Record<string, unknown>;

type ViewerInstance = {
  destroy?: () => void;
};

type ViewerConstructor = new (config: ViewerConfig) => ViewerInstance;

type ImageStoryProps = {
  manifestUrl: string;
  disablePanAndZoom?: boolean;
  pointOfInterestSvgUrl?: string;
  viewerOptions?: Record<string, unknown>;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

const STORIIIES_STYLE_URL =
  'https://unpkg.com/@cogapp/storiiies-viewer@latest/dist/storiiies-viewer.css';
const STORIIIES_SCRIPT_URL =
  'https://unpkg.com/@cogapp/storiiies-viewer@latest/dist/umd/storiiies-viewer.js';

const assetLoaders = new Map<string, Promise<void>>();

function loadAsset(kind: 'style' | 'script', url: string) {
  if (!assetLoaders.has(url)) {
    assetLoaders.set(
      url,
      new Promise<void>((resolve, reject) => {
        const tag = document.createElement(kind === 'script' ? 'script' : 'link');
        if (kind === 'script') {
          tag.setAttribute('src', url);
          tag.setAttribute('async', 'true');
        } else {
          tag.setAttribute('rel', 'stylesheet');
          tag.setAttribute('href', url);
        }

        tag.addEventListener('load', () => resolve(), {once: true});
        tag.addEventListener(
          'error',
          () => reject(new Error(`Failed to load ${url}`)),
          {once: true}
        );

        document.head.appendChild(tag);
      })
    );
  }

  return assetLoaders.get(url)!;
}

export default function ImageStory({
  manifestUrl,
  disablePanAndZoom,
  pointOfInterestSvgUrl,
  viewerOptions,
  height = 600,
  className,
  style,
}: ImageStoryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolvedClassName = [
    'canopy-image-story',
    className ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    let viewer: ViewerInstance | null = null;
    let cancelled = false;

    const mount = async () => {
      try {
        await Promise.all([
          loadAsset('style', STORIIIES_STYLE_URL),
          loadAsset('script', STORIIIES_SCRIPT_URL),
        ]);

        if (cancelled || !containerRef.current) return;

        const {StoriiiesViewer} = window as typeof window & {
          StoriiiesViewer?: ViewerConstructor;
        };

        if (!StoriiiesViewer) {
          console.warn('StoriiiesViewer global is unavailable.');
          return;
        }

        const config: ViewerConfig = {
          ...(viewerOptions ?? {}),
          container: containerRef.current,
          manifestUrl: withBasePath(manifestUrl),
        };

        if (typeof disablePanAndZoom === 'boolean') {
          config.disablePanAndZoom = disablePanAndZoom;
        }

        if (pointOfInterestSvgUrl) {
          config.pointOfInterestSvgUrl = withBasePath(pointOfInterestSvgUrl);
        }

        viewer = new StoriiiesViewer(config);
      } catch (error) {
        console.error('Failed to initialize Storiiies Viewer', error);
      }
    };

    mount();

    return () => {
      cancelled = true;
      viewer?.destroy?.();
      viewer = null;
    };
  }, [manifestUrl, disablePanAndZoom, pointOfInterestSvgUrl, viewerOptions]);

  return (
    <div
      ref={containerRef}
      className={resolvedClassName}
      data-canopy-image-story
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        ...(style ?? {}),
      }}
    />
  );
}
