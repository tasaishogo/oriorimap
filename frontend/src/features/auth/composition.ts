import type { KeyboardEvent } from 'react';

// IME変換確定のEnterで送信されないようにする（A2/A9）。
export function preventSubmitWhileComposing(e: KeyboardEvent<HTMLFormElement>): void {
  if (e.key === 'Enter' && e.nativeEvent.isComposing) {
    e.preventDefault();
  }
}
