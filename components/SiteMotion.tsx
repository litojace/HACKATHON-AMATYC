"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Reveal content once per visit, including content that arrives asynchronously. */
export default function SiteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const selector = 'main .panel, [data-motion="heading"], [data-motion="section"], [data-motion="progress"]';
    const observed = new WeakSet<HTMLElement>();
    const animations = new Map<HTMLElement, Animation>();
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const element = entry.target as HTMLElement;
        if (preference.matches || element.contains(document.activeElement)) continue;
        const progress = element.dataset.motion === "progress";
        const animation = element.animate(progress ? [
          { transform: "scaleX(0)" }, { transform: "scaleX(1)" },
        ] : [
          { opacity: .35, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], {
          duration: progress ? 650 : 420,
          delay: Math.min(order++ * 45, 135),
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "backwards",
        });
        animations.set(element, animation);
        animation.onfinish = () => animations.delete(element);
      }
    }, { threshold: 0, rootMargin: "0px 0px -20px 0px" });

    function observe(element: HTMLElement) {
      if (preference.matches || observed.has(element)) return;
      if (element.closest('.home-entrance, [data-motion="none"], [role="dialog"], dialog')) return;
      if (element.querySelector('[role="timer"]')) return;
      // Animate a card, not every panel nested inside it.
      if (!element.dataset.motion && element.parentElement?.closest(".panel")) return;
      observed.add(element);
      observer.observe(element);
    }
    function scan(root: Element) {
      if (root instanceof HTMLElement && root.matches(selector)) observe(root);
      root.querySelectorAll<HTMLElement>(selector).forEach(observe);
    }
    scan(document.body);
    const mutations = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => { if (node instanceof Element) scan(node); });
        record.removedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          observer.unobserve(node);
          node.querySelectorAll(selector).forEach(element => observer.unobserve(element));
          for (const [element, animation] of animations) {
            if (node.contains(element)) { animation.cancel(); animations.delete(element); }
          }
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    function stop() {
      if (!preference.matches) return;
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      animations.clear();
    }
    function onFocus(event: FocusEvent) {
      for (const [element, animation] of animations) {
        if (event.target instanceof Node && element.contains(event.target)) {
          animation.cancel(); animations.delete(element);
        }
      }
    }
    preference.addEventListener("change", stop);
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect(); mutations.disconnect();
      animations.forEach(animation => animation.cancel());
      preference.removeEventListener("change", stop);
      document.removeEventListener("focusin", onFocus);
    };
  }, [pathname]);
  return null;
}
