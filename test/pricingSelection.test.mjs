import test from "node:test";
import assert from "node:assert/strict";
import { pricingQuerySelection } from "../src/js/upgradeSelection.mjs";

test("pricing query selects the requested plan and keeps a missing interval monthly", () => {
  assert.deepEqual(
    pricingQuerySelection(new URLSearchParams("plan=parent&interval=month")),
    { plan: "parent", interval: "month" },
  );
  assert.deepEqual(
    pricingQuerySelection(new URLSearchParams("plan=teacher&interval=year")),
    { plan: "teacher", interval: "year" },
  );
  assert.deepEqual(pricingQuerySelection(new URLSearchParams("plan=teacher")), {
    plan: "teacher",
    interval: "month",
  });
  assert.deepEqual(pricingQuerySelection(new URLSearchParams("plan=parent")), {
    plan: "parent",
    interval: "month",
  });
  assert.deepEqual(
    pricingQuerySelection(new URLSearchParams("interval=year")),
    { plan: "parent", interval: "year" },
  );
  assert.deepEqual(
    pricingQuerySelection(new URLSearchParams("from=classroom_lock")),
    { plan: "teacher", interval: "month" },
  );
  assert.equal(pricingQuerySelection(new URLSearchParams("")), null);
  assert.equal(
    pricingQuerySelection(new URLSearchParams("plan=family&interval=week")),
    null,
  );
});
