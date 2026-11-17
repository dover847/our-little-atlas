import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { previewConnection } from "./preview-db";

async function main() {
  const client = await previewConnection();
  const alice = randomUUID(),
    bob = randomUUID(),
    first = randomUUID(),
    second = randomUUID();
  try {
    // All fixtures are in one transaction and always rolled back, even on success.
    await client.query("begin");
    await client.query("insert into auth.users(id) values ($1),($2)", [
      alice,
      bob,
    ]);
    await client.query(
      "insert into public.spaces(id,name,owner_id) values ($1,$2,$3),($4,$5,$6)",
      [first, "RLS fixture A", alice, second, "RLS fixture B", bob],
    );
    await client.query(
      "insert into public.space_memberships(space_id,user_id,role) values ($1,$2,$3),($4,$5,$3)",
      [first, alice, "owner", second, bob],
    );
    await client.query("set local role authenticated");
    for (const [userId, expectedSpace] of [
      [alice, first],
      [bob, second],
    ]) {
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [userId],
      );
      const spaces = await client.query("select id from public.spaces");
      assert.deepEqual(
        spaces.rows.map((row) => row.id),
        [expectedSpace],
      );
      const members = await client.query(
        "select user_id from public.space_memberships",
      );
      assert.deepEqual(
        members.rows.map((row) => row.user_id),
        [userId],
      );
      await client.query("savepoint denied_write");
      await assert.rejects(
        client.query(
          "insert into public.space_memberships(space_id,user_id,role) values ($1,$2,'owner')",
          [userId === alice ? second : first, userId],
        ),
        /permission denied/,
      );
      await client.query("rollback to savepoint denied_write");
    }
    await client.query("select set_config('request.jwt.claim.sub', '', true)");
    assert.equal(
      (await client.query("select id from public.spaces")).rowCount,
      0,
    );
    await client.query("set local role anon");
    await assert.rejects(
      client.query("select * from public.spaces"),
      /permission denied/,
    );
    console.log(
      "RLS verified: separate accounts see separate spaces; self-enrollment and anonymous reads denied. Fixtures rolled back.",
    );
  } finally {
    await client.query("rollback");
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Preview RLS verification failed. Fixtures rolled back; inspect policy configuration.",
  );
  process.exitCode = 1;
});
