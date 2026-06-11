export const createDragController = ({ canDrag, onDragStart, onDragMove, onDragEnd }) => {
  let enabled = true;
  let active = null;

  const onPointerMove = (event) => {
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }

    event.preventDefault();
    onDragMove(active.labelId, event.clientX, event.clientY);
  };

  const finishDrag = (event, canceled = false) => {
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }

    event.preventDefault();
    const { labelId, element } = active;
    active = null;

    if (!canceled) {
      onDragEnd(labelId, event.clientX, event.clientY);
    } else {
      onDragEnd(labelId, null, null);
    }

    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", (event) => finishDrag(event), { passive: false });
  window.addEventListener("pointercancel", (event) => finishDrag(event, true), { passive: false });

  return {
    bind(element, labelId) {
      element.addEventListener("pointerdown", (event) => {
        if (!enabled || active || !canDrag(labelId)) {
          return;
        }

        event.preventDefault();
        active = {
          element,
          labelId,
          pointerId: event.pointerId
        };
        element.setPointerCapture(event.pointerId);
        onDragStart(labelId, event.clientX, event.clientY);
      });
    },
    setEnabled(value) {
      enabled = value;
    }
  };
};
