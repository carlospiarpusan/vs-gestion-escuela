// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeApiRequest: mock.auth }));
vi.mock("@/lib/server-read-cache", () => ({ revalidateServerReadCache: mock.revalidate }));
import { POST } from "./route";
const actor = { id: "staff", rol: "admin_sede", escuela_id: "school-a", sede_id: "branch-a" };
const request = (tags: string[]) =>
  new Request("https://condusoft.co/api/cache/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ ok: true, perfil: actor });
});

it("accepts only the authenticated school's domain tags", async () => {
  const response = await POST(
    request([
      "finance:income:school:school-a",
      "dashboard:school:school-a",
      "dashboard:list:horas-dashboard:school:school-a",
      "finance:income:school:school-b",
      "dashboard:aggregate",
      "scope",
      "user:other",
      "finance:income:school:school-a:other",
    ])
  );
  expect(response.status).toBe(200);
  expect(mock.revalidate).toHaveBeenCalledWith([
    "finance:income:school:school-a",
    "dashboard:school:school-a",
    "dashboard:list:horas-dashboard:school:school-a",
  ]);
});

it("rejects cross-school and global invalidation requests", async () => {
  expect(
    (await POST(request(["finance:school:school-b", "dashboard", "scope:aggregate"]))).status
  ).toBe(403);
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it("rejects unauthenticated invalidation before touching the cache", async () => {
  mock.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
  expect((await POST(request(["finance:school:school-a"]))).status).toBe(401);
  expect(mock.revalidate).not.toHaveBeenCalled();
});
