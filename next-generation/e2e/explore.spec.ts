import { test, expect } from "@playwright/test";

test("browse, favorite, persist preference and open a keyboard-accessible activity", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Two curious minds/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `.atlas-local/preview-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "The activity atlas", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search activities" })
    .fill("Abstract Word");
  await expect(
    page.getByRole("heading", { name: "The Abstract Word Experiment" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Save The Abstract Word Experiment",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "A little closer", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "A little closer", exact: true }),
  ).toBeFocused();
  await page.reload();
  await page
    .getByRole("button", { name: "The activity atlas", exact: true })
    .click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await expect(page.locator(".activity-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "The Abstract Word Experiment" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("server-confirmed spin, errors, and recovery respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByLabel("What are you in the mood for?")
    .selectOption({ index: 1 });
  const responsePromise = page.waitForResponse("**/api/explore/spin");
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  const { activity } = await (await responsePromise).json();
  await expect(page.locator(".spin-result h3")).toHaveText(activity.title);
  await expect(
    page.getByRole("button", { name: "Spin the wheel", exact: true }),
  ).toBeEnabled();
  await page.route("**/api/explore/spin", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".error-message")).toContainText(
    "Please try again",
  );
  await expect(
    page.getByRole("button", { name: "Spin the wheel", exact: true }),
  ).toBeEnabled();
});

test("public exploration cannot read private spaces or use legacy identity spoofing", async ({
  request,
  page,
}) => {
  const privateResponse = await request.get("/api/private/spaces");
  expect(privateResponse.status()).toBe(401);
  expect(privateResponse.headers()["cache-control"]).toContain("no-store");
  const legacy = await request.post("/api/note", {
    data: { who: "Mia", id: 1, text: "no write" },
  });
  expect(legacy.status()).toBe(404);
  const forged = await request.post("/api/explore/spin", {
    data: { ids: [999] },
  });
  expect(forged.status()).toBe(400);
  await page.goto("/space");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Your email")).toBeVisible();
});

test("reflection library and empty search provide working paths back", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "A little wisdom", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Curiosity before certainty/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("A MOMENT TO REFLECT");
  await page.getByRole("button", { name: "Close reflection" }).click();
  await page
    .getByRole("button", { name: "The activity atlas", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search activities" })
    .fill("zzzz-no-such-activity");
  await expect(
    page.getByRole("button", { name: "Show all activities" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all activities" }).click();
  await expect(page.locator(".activity-card")).toHaveCount(72);
});
