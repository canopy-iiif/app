import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

function ready(fn) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function initSlider(host) {
  if (!host || host.__canopyHeroBound) return;
  const slider = host.querySelector('.canopy-interstitial__slider');
  if (!slider) return;
  const prev = host.querySelector('.canopy-interstitial__nav-btn--prev');
  const next = host.querySelector('.canopy-interstitial__nav-btn--next');
  const pagination = host.querySelector('.canopy-interstitial__pagination');
  const transitionAttr = (host.getAttribute && host.getAttribute('data-transition')) || 'fade';
  const transition = transitionAttr && transitionAttr.toLowerCase() === 'slide' ? 'slide' : 'fade';

  try {
    const baseModules = [Navigation, Pagination, Autoplay];
    if (transition === 'fade') baseModules.push(EffectFade);
    const swiperInstance = new Swiper(slider, {
      modules: baseModules,
      loop: true,
      slidesPerView: 1,
      effect: transition,
      fadeEffect: transition === 'fade' ? { crossFade: true } : undefined,
      navigation: {
        prevEl: prev || undefined,
        nextEl: next || undefined,
      },
      pagination: {
        el: pagination || undefined,
        clickable: true,
      },
      autoplay: {
        delay: 6000,
        disableOnInteraction: false,
      },
    });
    host.__canopyHeroBound = true;
    host.__canopyHeroSwiper = swiperInstance;
  } catch (error) {
    try {
      console.warn('[canopy][hero] failed to initialise slider', error);
    } catch (_) {}
  }
}

function observeHosts() {
  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes &&
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches && node.matches('[data-canopy-hero-slider]')) initSlider(node);
            const inner = node.querySelectorAll
              ? node.querySelectorAll('[data-canopy-hero-slider]')
              : [];
            inner && inner.forEach && inner.forEach((el) => initSlider(el));
          });
      });
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  } catch (_) {}
}

ready(() => {
  if (typeof document === 'undefined') return;
  const hosts = document.querySelectorAll('[data-canopy-hero-slider]');
  hosts.forEach((host) => initSlider(host));
  observeHosts();
});
