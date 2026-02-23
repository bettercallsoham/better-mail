import { useHotkeys, Options } from "react-hotkeys-hook";
import { DependencyList } from "react";

type KeyCallback = (event: KeyboardEvent) => void;

export function useKeyboard(
  keys: string,
  callback: KeyCallback,
  deps: DependencyList = [],
  options?: Options,
) {
  useHotkeys(
    keys,
    (event) => {
      event.preventDefault();
      callback(event);
    },
    {
      enableOnFormTags: false,
      preventDefault: true,
      ...options,
    },
    deps,
  );
}
