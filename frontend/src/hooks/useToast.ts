import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

let count = 0;
function genId() { return `toast-${++count}`; }

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

interface State { toasts: ToasterToast[] }

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId }), TOAST_REMOVE_DELAY);
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      };
    }
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: action.toastId === undefined ? [] : state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss(); } },
  });
  setTimeout(dismiss, TOAST_REMOVE_DELAY);
  return { id, dismiss };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { const i = listeners.indexOf(setState); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return { ...state, toast, dismiss: (id?: string) => dispatch({ type: "DISMISS_TOAST", toastId: id }) };
}

export { useToast, toast };
