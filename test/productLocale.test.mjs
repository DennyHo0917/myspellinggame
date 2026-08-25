import test from "node:test";
import assert from "node:assert/strict";

import { PRODUCT_LOCALES, productMessages } from "../src/js/productLocale.mjs";

test("every product locale keeps the brand and has a distinct student-limit message", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.equal(copy.brand, "My Spelling Game");
    assert.ok(copy.studentLimit);
    assert.notEqual(copy.studentLimit, copy.teacherLimit);
    assert.ok(copy.checkoutRetry);
    assert.ok(copy.retryCheckout);
  }
});
