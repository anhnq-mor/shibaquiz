"use client";

import type { ReactNode, RefObject } from "react";

export function AdminDialog({
  dialogRef,
  titleId,
  children,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
    >
      <div className="admin-dialog-body">{children}</div>
    </dialog>
  );
}
