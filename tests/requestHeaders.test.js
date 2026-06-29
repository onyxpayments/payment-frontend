import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRequestHeaders,
  hasHeaderErrors,
  validateHeaderRows,
} from "../src/requestHeaders.js";

test("builds multiple custom request headers", () => {
  const headers = buildRequestHeaders([
    {
      key: "Authorization",
      value: "Basic bWVyY2hhbnQ6c2VjcmV0LWtleQ==",
    },
    { key: "X-Correlation-ID", value: "frontend-test-123" },
  ]);

  assert.deepEqual(headers, {
    "Content-Type": "application/json",
    Authorization: "Basic bWVyY2hhbnQ6c2VjcmV0LWtleQ==",
    "X-Correlation-ID": "frontend-test-123",
  });
});

test("allows completely empty header rows", () => {
  const errors = validateHeaderRows([{ key: "", value: "" }]);
  assert.equal(hasHeaderErrors(errors), false);
});

test("rejects incomplete, duplicated and invalid headers", () => {
  const errors = validateHeaderRows([
    { key: "Authorization", value: "" },
    { key: "authorization", value: "duplicate" },
    { key: "Invalid Header", value: "value" },
  ]);

  assert.match(errors[0].value, /valor/);
  assert.match(errors[1].key, /duplicado/);
  assert.match(errors[2].key, /caracteres inválidos/);
  assert.equal(hasHeaderErrors(errors), true);
});

test("rejects browser-controlled headers and newline injection", () => {
  const errors = validateHeaderRows([
    { key: "Content-Length", value: "12" },
    { key: "X-Test", value: "safe\r\nInjected: true" },
  ]);

  assert.match(errors[0].key, /controlado por el navegador/);
  assert.match(errors[1].value, /saltos de línea/);
});
