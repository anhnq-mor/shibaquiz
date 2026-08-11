"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useEffect, useRef, type ComponentProps } from "react";

type RouteLinkProps = ComponentProps<typeof NextLink>;

function RoutePendingIndicator() {
  const { pending } = useLinkStatus();
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchor = indicatorRef.current?.closest("a");
    if (!anchor) return;

    if (pending) {
      anchor.setAttribute("aria-busy", "true");
    } else {
      anchor.removeAttribute("aria-busy");
    }

    return () => anchor.removeAttribute("aria-busy");
  }, [pending]);

  return (
    <span
      ref={indicatorRef}
      className={`route-link-progress${pending ? "is-pending" : ""}`}
      aria-hidden="true"
    />
  );
}

export function RouteLink({ children, className, ...props }: RouteLinkProps) {
  return (
    <NextLink
      {...props}
      className={["route-aware-link", className].filter(Boolean).join(" ")}
    >
      {children}
      <RoutePendingIndicator />
    </NextLink>
  );
}
