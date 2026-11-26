import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("KumhoGo customer website exposes trip search, seat selection and a persistent cart", async () => {
  const [page, client] = await Promise.all([
    read("app/dat-ve/page.tsx"),
    read("app/dat-ve/CustomerBookingSite.tsx"),
  ]);
  assert.match(page, /KumhoGo/);
  assert.match(client, /kumhogo:cart:v1/);
  assert.match(client, /Tìm chuyến xe/);
  assert.match(client, /Thêm vào giỏ vé/);
  assert.match(client, /Đăng nhập Google để đặt vé/);
  assert.match(client, /\/api\/customer\/orders/);
});

test("customer checkout authenticates server-side and revalidates seats in one transaction", async () => {
  const route = await read("app/api/customer/orders/route.ts");
  assert.match(route, /getCurrentAppUser/);
  assert.match(route, /requireSameOrigin\(request\)/);
  assert.match(route, /BEGIN/);
  assert.match(route, /FOR UPDATE OF trips/);
  assert.match(route, /trip_reserved_seats/);
  assert.match(route, /ticket_price/);
  assert.match(route, /ROLLBACK/);
  assert.doesNotMatch(route, /totalAmount:\s*z\./);
});

test("Google customers and issued admin credentials use separate sign-in routes", async () => {
  const [google, admin, shell] = await Promise.all([
    read("app/auth/customer/google/route.ts"),
    read("app/auth/admin/login/route.ts"),
    read("app/_components/PortalShell.tsx"),
  ]);
  assert.match(google, /provider: "google"/);
  assert.match(admin, /signInWithPassword/);
  assert.match(admin, /role !== "admin"/);
  assert.match(shell, /appUser\?\.role !== "admin"/);
  assert.match(shell, /quan-tri\/dang-nhap/);
});
