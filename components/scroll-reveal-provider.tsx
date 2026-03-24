"use client";

import { useEffect } from "react";

export function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Re-observe on route changes
  useEffect(() => {
    const mo = new MutationObserver(() => {
      const elements = document.querySelectorAll(".scroll-reveal:not(.revealed)");
      if (elements.length === 0) return;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("revealed");
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );
      elements.forEach((el) => observer.observe(el));
    });

    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return <>{children}</>;
}
