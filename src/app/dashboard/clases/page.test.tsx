import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import ClassesPage from "./page";

it("redirects historical class links instead of showing the retired form", () => {
  expect(() => ClassesPage()).toThrow("redirect:/dashboard");
});
