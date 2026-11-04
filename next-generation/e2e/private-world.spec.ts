import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes, randomUUID } from "node:crypto";
import { previewConnection, previewProjectRef } from "../scripts/preview-db";

// Explicit opt-in, local isolated preview only. CI never receives privileged keys.
test("verified accounts, invitations, private writing, sharing and stale edits", async ({
  browser,
}) => {
  test.skip(
    process.env.ATLAS_PREVIEW_AUTH_E2E !== "1",
    "Needs explicitly targeted preview credentials.",
  );
  test.setTimeout(120000);
  const env = parseEnv(readFileSync(".env.local", "utf8"));
  expect(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname).toBe(
    `${previewProjectRef}.supabase.co`,
  );
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const accounts: { id: string; email: string; password: string }[] = [];
  const database = await previewConnection();
  const ownerContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const memberContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const outsiderContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    for (let i = 0; i < 3; i++) {
      const email = `atlas-fixture-${randomUUID()}@example.invalid`;
      const password = randomBytes(24).toString("base64url");
      if (i === 0) {
        const { data, error } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo: "http://127.0.0.1:3100/activate" },
        });
        expect(error?.message).toBeUndefined();
        expect(data.user?.id).toBeTruthy();
        accounts.push({ id: data.user!.id, email, password });
        await database.query(
          "insert into atlas_private.first_owners(email) values($1)",
          [email],
        );
        const page = await ownerContext.newPage();
        await page.goto("/activate");
        await page
          .getByLabel("Account confirmation link from your email")
          .fill(data.properties!.action_link);
        await page.getByLabel("Choose your own password").fill(password);
        await page.getByLabel("Confirm your password").fill(password);
        await page.getByRole("button", { name: "Activate my account" }).click();
        await expect(page).toHaveURL(/\/space$/);
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        expect(error?.message).toBeUndefined();
        accounts.push({ id: data.user!.id, email, password });
      }
    }
    const owner = ownerContext.pages()[0];
    const cookies = await ownerContext.cookies();
    expect(
      cookies
        .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
        .every((c) => c.httpOnly),
    ).toBe(true);
    await owner
      .getByLabel("A name for your world")
      .fill("Fixture world — no real memories");
    await owner.getByRole("button", { name: "Create our space" }).click();
    await expect(owner).toHaveURL(/\/space\/[a-f0-9-]+$/);
    const worldPath = new URL(owner.url()).pathname;
    await owner.getByLabel("Their email address").fill(accounts[1].email);
    await owner
      .getByRole("button", { name: "Create a private invitation" })
      .click();
    const invitation = await owner
      .getByLabel("Your invitation — share it privately")
      .inputValue();
    async function login(
      context: typeof memberContext,
      account: (typeof accounts)[number],
    ) {
      const page = await context.newPage();
      await page.goto("/sign-in");
      await page.getByLabel("Your email").fill(account.email);
      await page
        .getByLabel("Your password", { exact: true })
        .fill(account.password);
      await page.getByRole("button", { name: "Enter your space" }).click();
      await expect(page).toHaveURL(/\/space$/);
      return page;
    }
    const wrong = await login(outsiderContext, accounts[2]);
    await wrong.goto(invitation);
    await wrong.getByRole("button", { name: "Accept invitation" }).click();
    await expect(wrong.locator(".auth-error")).toContainText("unavailable");
    const member = await login(memberContext, accounts[1]);
    if (test.info().project.name === "desktop") {
      await member
        .getByRole("button", { name: "Accept & join this space" })
        .click();
    } else {
      await member.goto(invitation);
      await member.getByRole("button", { name: "Accept invitation" }).click();
    }
    await expect(member).toHaveURL(new RegExp(worldPath + "$"));
    await owner.getByRole("button", { name: "Write a little page" }).click();
    const composer = owner.locator(".writing-composer");
    await composer
      .getByLabel("Give this page a name", { exact: false })
      .fill("A private beginning");
    await composer.getByLabel("Your words").fill("PRIVATE ORIGINAL SENTINEL");
    await composer
      .getByRole("button", { name: "Save my private page" })
      .click();
    await expect(composer.getByRole("status")).toContainText("Saved privately");
    await member.reload();
    await expect(member.locator(".writing-page")).toHaveCount(0);
    await composer.getByLabel("Your words").fill("SHARED CURRENT SENTINEL");
    await composer
      .getByRole("radio", { name: /Share with this space/ })
      .check();
    await composer.getByRole("button", { name: "Save changes" }).click();
    await expect(composer.getByRole("status")).toContainText(
      "Saved and shared",
    );
    await member.reload();
    await expect(member.locator(".writing-page")).toHaveCount(1);
    await expect(member.locator(".writing-body")).toHaveText(
      "SHARED CURRENT SENTINEL",
    );
    await expect(member.locator("body")).not.toContainText(
      "PRIVATE ORIGINAL SENTINEL",
    );
    await expect(
      member.getByRole("button", { name: "Edit my page" }),
    ).toHaveCount(0);
    const stale = await ownerContext.newPage();
    await stale.goto(worldPath);
    await stale.getByRole("button", { name: "Edit my page" }).click();
    await stale
      .locator(".writing-page")
      .getByLabel("Your words")
      .fill("UNSAVED STALE SENTINEL");
    await composer.getByLabel("Your words").fill("NEWEST SHARED SENTINEL");
    await composer.getByRole("button", { name: "Save changes" }).click();
    await expect(owner.locator(".writing-page > .writing-body")).toHaveText(
      "NEWEST SHARED SENTINEL",
    );
    await expect(composer.getByRole("status")).toContainText(
      "Saved and shared",
    );
    await stale
      .locator(".writing-page")
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(stale.locator(".auth-error")).toContainText(
      "This page changed",
    );
    await expect(
      stale.locator(".writing-page").getByLabel("Your words"),
    ).toHaveValue("UNSAVED STALE SENTINEL");
    await member.getByRole("button", { name: "Write a little page" }).click();
    await member
      .locator(".writing-composer")
      .getByLabel("Your words")
      .fill("MEMBER PRIVATE SENTINEL");
    await member.getByRole("button", { name: "Save my private page" }).click();
    await expect(member.locator(".save-message")).toContainText(
      "Saved privately",
    );
    await owner.reload();
    await expect(owner.locator("body")).not.toContainText(
      "MEMBER PRIVATE SENTINEL",
    );
    await expect(owner.locator(".writing-page")).toHaveCount(1);
    await wrong.goto(worldPath);
    await expect(
      wrong.getByText("This page could not be found."),
    ).toBeVisible();
    await owner.screenshot({
      path: `.atlas-local/private-studio-${test.info().project.name}.png`,
      fullPage: true,
    });
  } finally {
    await ownerContext.close();
    await memberContext.close();
    await outsiderContext.close();
    const ids = accounts.map((a) => a.id);
    const emails = accounts.map((a) => a.email);
    // Only fixtures created in this test are removed. Existing accounts/data are never queried or deleted.
    try {
      await database.query("begin");
      await database.query(
        "delete from public.writing_revisions where entry_id in(select id from public.writing_entries where space_id in(select id from public.spaces where owner_id=any($1::uuid[])))",
        [ids],
      );
      await database.query(
        "delete from public.writing_entries where space_id in(select id from public.spaces where owner_id=any($1::uuid[]))",
        [ids],
      );
      await database.query(
        "delete from public.space_invitations where space_id in(select id from public.spaces where owner_id=any($1::uuid[]))",
        [ids],
      );
      await database.query(
        "delete from public.space_memberships where space_id in(select id from public.spaces where owner_id=any($1::uuid[]))",
        [ids],
      );
      await database.query(
        "delete from public.spaces where owner_id=any($1::uuid[])",
        [ids],
      );
      await database.query(
        "delete from atlas_private.first_owners where email=any($1::text[])",
        [emails],
      );
      await database.query("commit");
      for (const account of accounts) {
        const { error } = await admin.auth.admin.deleteUser(account.id);
        if (error) throw Error("Fixture cleanup failed.");
      }
    } finally {
      await database.end();
    }
  }
});
