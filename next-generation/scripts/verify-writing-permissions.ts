import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { previewConnection } from "./preview-db";

async function main() {
  const client = await previewConnection();
  const owner = randomUUID(),
    member = randomUUID(),
    outsider = randomUUID(),
    unverified = randomUUID();
  const emails = [owner, member, outsider, unverified].map(
    (id) => `${id}@example.invalid`,
  );
  async function asUser(id: string) {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      id,
    ]);
  }
  async function denied(
    sql: string,
    args: unknown[] = [],
    pattern: RegExp = /permission denied|unavailable|required|row-level security/i,
  ) {
    await client.query("savepoint expected_denial");
    try {
      await assert.rejects(client.query(sql, args), pattern);
    } finally {
      await client.query("rollback to savepoint expected_denial");
    }
  }
  const secret = () => randomBytes(32).toString("base64url");
  const digest = (token: string) =>
    createHash("sha256").update(token).digest("hex");
  try {
    await client.query("begin");
    for (let i = 0; i < 4; i++)
      await client.query(
        "insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)",
        [
          [owner, member, outsider, unverified][i],
          emails[i],
          i === 3 ? null : new Date(),
        ],
      );
    await client.query(
      "insert into atlas_private.first_owners(email) values($1),($2)",
      [emails[0], emails[3]],
    );
    await asUser(outsider);
    await denied("select public.create_first_space('Not allowed')");
    await asUser(unverified);
    await denied("select public.create_first_space('Not verified')");
    await asUser(owner);
    const space = (
      await client.query(
        "select public.create_first_space('Permission fixture') id",
      )
    ).rows[0].id;
    assert.equal(
      (await client.query("select public.create_first_space('Retry') id"))
        .rows[0].id,
      space,
    );
    const token = secret();
    const invite = (
      await client.query("select public.create_space_invitation($1,$2,$3) id", [
        space,
        emails[1],
        digest(token),
      ])
    ).rows[0].id;
    await asUser(outsider);
    assert.equal(
      (await client.query("select * from public.my_pending_invitations()"))
        .rowCount,
      0,
    );
    await denied("select public.accept_email_invitation($1)", [invite]);
    await asUser(member);
    assert.equal(
      (await client.query("select * from public.my_pending_invitations()"))
        .rows[0].id,
      invite,
    );
    await asUser(owner);
    await denied("select token_hash from public.space_invitations");
    await asUser(outsider);
    await denied("select public.accept_space_invitation($1)", [token]);
    await client.query("set local role anon");
    assert.equal(
      (
        await client.query(
          "select public.can_register_for_invitation($1,$2) allowed",
          [token, emails[1]],
        )
      ).rows[0].allowed,
      true,
    );
    assert.equal(
      (
        await client.query(
          "select public.can_register_for_invitation($1,$2) allowed",
          [token, emails[2]],
        )
      ).rows[0].allowed,
      false,
    );
    await asUser(member);
    assert.equal(
      (
        await client.query("select public.accept_space_invitation($1) id", [
          token,
        ])
      ).rows[0].id,
      space,
    );
    await denied("select public.accept_space_invitation($1)", [token]);
    await denied("select public.create_space_invitation($1,$2,$3)", [
      space,
      emails[2],
      digest(secret()),
    ]);
    await denied("select public.revoke_space_invitation($1)", [invite]);
    await denied(
      "insert into public.space_memberships values($1,$2,'owner',now())",
      [space, outsider],
    );

    await asUser(owner);
    const entry = (
      await client.query(
        "insert into public.writing_entries(space_id,title,body) values($1,'Private thought','private sentinel') returning *",
        [space],
      )
    ).rows[0];
    assert.equal(entry.visibility, "private");
    assert.equal(entry.author_id, owner);
    await denied(
      "insert into public.writing_entries(space_id,body,client_request_id) values($1,$2,$3)",
      [space, "private sentinel", entry.client_request_id],
      /duplicate key/i,
    );
    await asUser(member);
    assert.equal(
      (await client.query("select * from public.writing_entries")).rowCount,
      0,
    );
    await denied(
      "insert into public.writing_entries(space_id,author_id,body) values($1,$2,$3)",
      [space, owner, "forged"],
    );
    await asUser(owner);
    const shared = (
      await client.query(
        "update public.writing_entries set body='shared current version',visibility='shared' where id=$1 and version=1 returning *",
        [entry.id],
      )
    ).rows[0];
    assert.equal(shared.version, 2);
    assert.equal(
      (
        await client.query(
          "update public.writing_entries set body='stale overwrite' where id=$1 and version=1 returning id",
          [entry.id],
        )
      ).rowCount,
      0,
    );
    const history = await client.query(
      "select body,visibility from public.writing_revisions where entry_id=$1",
      [entry.id],
    );
    assert.deepEqual(history.rows, [
      { body: "private sentinel", visibility: "private" },
    ]);
    await asUser(member);
    assert.equal(
      (
        await client.query(
          "select body from public.writing_entries where id=$1",
          [entry.id],
        )
      ).rows[0].body,
      "shared current version",
    );
    assert.equal(
      (await client.query("select * from public.writing_revisions")).rowCount,
      0,
    );
    assert.equal(
      (
        await client.query(
          "update public.writing_entries set body='wrong author' where id=$1 returning id",
          [entry.id],
        )
      ).rowCount,
      0,
    );
    await client.query(
      "insert into public.writing_entries(space_id,body) values($1,'member private sentinel')",
      [space],
    );
    await asUser(owner);
    assert.equal(
      (await client.query("select * from public.writing_entries")).rowCount,
      1,
    );
    await denied("update public.writing_entries set space_id=$1 where id=$2", [
      space,
      entry.id,
    ]);
    await denied("delete from public.writing_entries where id=$1", [entry.id]);
    const revoked = secret();
    const revokeId = (
      await client.query("select public.create_space_invitation($1,$2,$3) id", [
        space,
        emails[2],
        digest(revoked),
      ])
    ).rows[0].id;
    await client.query("select public.revoke_space_invitation($1)", [revokeId]);
    await asUser(outsider);
    await denied("select public.accept_space_invitation($1)", [revoked]);
    assert.equal(
      (await client.query("select * from public.writing_entries")).rowCount,
      0,
    );
    assert.equal(
      (await client.query("select id from public.spaces")).rowCount,
      0,
    );
    const expired = secret();
    await asUser(owner);
    await client.query("select public.create_space_invitation($1,$2,$3)", [
      space,
      emails[2],
      digest(expired),
    ]);
    await client.query("reset role");
    await client.query(
      "update public.space_invitations set expires_at=now()-interval '1 second' where token_hash=$1",
      [digest(expired)],
    );
    await client.query(
      "delete from public.space_memberships where space_id=$1 and user_id=$2",
      [space, member],
    );
    await asUser(outsider);
    await denied("select public.accept_space_invitation($1)", [expired]);
    await asUser(member);
    assert.equal(
      (await client.query("select * from public.writing_entries")).rowCount,
      0,
    );
    await denied(
      "insert into public.writing_entries(space_id,body) values($1,'no longer member')",
      [space],
    );
    console.log(
      "Verified real database policies: owner bootstrap, email binding, expiry, revocation, replay denial, private/shared reads, author-only edits, private revisions, stale-edit protection and membership loss. All fixtures rolled back.",
    );
  } finally {
    await client.query("rollback");
    await client.end();
  }
}
main().catch((error) => {
  console.error(
    "Writing/invitation permission verification failed:",
    error instanceof Error ? error.message : "unknown failure",
  );
  process.exitCode = 1;
});
