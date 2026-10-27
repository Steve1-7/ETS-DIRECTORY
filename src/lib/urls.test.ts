import assert from "node:assert/strict";
import test from "node:test";
import { safeHttpUrl, safeTelephoneUrl, safeWhatsAppUrl } from "./urls";

test("safeHttpUrl accepts and normalizes HTTP and HTTPS addresses", () => {
  assert.equal(safeHttpUrl("https://example.co.za"), "https://example.co.za/");
  assert.equal(safeHttpUrl("http://example.co.za"), "http://example.co.za/");
});

test("safeHttpUrl rejects unsafe and malformed addresses", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,hello"), null);
  assert.equal(safeHttpUrl("not a URL"), null);
  assert.equal(safeHttpUrl(null), null);
});

test("safeTelephoneUrl normalizes valid international numbers", () => {
  assert.equal(safeTelephoneUrl("+27 82 123 4567"), "tel:+27821234567");
});

test("safeTelephoneUrl rejects short and missing numbers", () => {
  assert.equal(safeTelephoneUrl("123"), null);
  assert.equal(safeTelephoneUrl(null), null);
});

test("safeWhatsAppUrl creates wa.me URLs from valid numbers", () => {
  assert.equal(safeWhatsAppUrl("+27 82 123 4567"), "https://wa.me/27821234567");
});

test("safeWhatsAppUrl rejects short and missing numbers", () => {
  assert.equal(safeWhatsAppUrl("123"), null);
  assert.equal(safeWhatsAppUrl(null), null);
});
