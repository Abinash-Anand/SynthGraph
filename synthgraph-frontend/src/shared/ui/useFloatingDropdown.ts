"use client";

import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";

const DROPDOWN_MAX_HEIGHT = 360;

/**
 * A floating, portal-rendered dropdown anchored to a reference element -
 * used by both EntitySearchPicker and TrainingRunSearchForm's Key field,
 * which previously rendered their menus as `position: absolute` children of
 * an ordinary flex/grid cell. That approach has no way to avoid colliding
 * with whatever sibling sits below or beside it in the layout (a Compare
 * button directly underneath, a Project/Operator field next to it in the
 * same row) - it can only ever render exactly where its DOM parent happens
 * to be. Floating UI computes the menu's position against the viewport
 * instead (auto-flip when there's no room below, auto-shift to stay on
 * screen, capped height that also respects available space) and renders it
 * through a portal, so it floats above everything else on the page without
 * shifting any surrounding layout - the "z-50 popover that never overlaps
 * page content" pattern this file exists to give both call sites.
 */
export function useFloatingDropdown({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements, rects }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(DROPDOWN_MAX_HEIGHT, availableHeight)}px`,
            width: `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  return { refs, floatingStyles, getReferenceProps, getFloatingProps };
}
