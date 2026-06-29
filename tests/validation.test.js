import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaymentPayload,
  normalizeAmount,
  validatePaymentForm,
} from "../src/validation.js";

const validForm = {
  amount: "10000.50",
  currency: "COP",
  notificationUrl: "",
  firstName: "María José",
  lastName: "O'Connor-Pérez",
  personalId: "1016109337",
};

test("accepts valid names, numeric IDs and decimal amounts", () => {
  assert.deepEqual(validatePaymentForm(validForm), {});
});

test("rejects digits and symbols in names", () => {
  const errors = validatePaymentForm({
    ...validForm,
    firstName: "Juan3",
    lastName: "Bello@",
  });

  assert.match(errors.firstName, /solo puede contener letras/);
  assert.match(errors.lastName, /solo puede contener letras/);
});

test("rejects empty first and last names", () => {
  const errors = validatePaymentForm({
    ...validForm,
    firstName: " ",
    lastName: "",
  });

  assert.match(errors.firstName, /obligatorio/);
  assert.match(errors.lastName, /obligatorio/);
});

test("rejects letters and invalid lengths in personal IDs", () => {
  const letters = validatePaymentForm({
    ...validForm,
    personalId: "1016A09337",
  });
  const tooShort = validatePaymentForm({
    ...validForm,
    personalId: "123",
  });

  assert.match(letters.personalId, /dígitos/);
  assert.match(tooShort.personalId, /5 y 20/);
});

test("rejects invalid, zero, negative and over-precision amounts", () => {
  for (const amount of ["abc", "0", "-10", "12.345", "1e3"]) {
    const errors = validatePaymentForm({ ...validForm, amount });
    assert.ok(errors.amount, `expected ${amount} to be invalid`);
  }
});

test("normalizes decimal commas and builds the dummy webhook payload", () => {
  assert.equal(normalizeAmount(" 1250,75 "), "1250.75");

  const payload = buildPaymentPayload(
    { ...validForm, amount: "1250,75" },
    "transaction-id",
    "https://merchant.example/webhooks/payments",
  );

  assert.equal(payload.amount, "1250.75");
  assert.equal(
    payload.notification_url,
    "https://merchant.example/webhooks/payments",
  );
});

test("rejects invalid webhook URLs but allows an empty optional value", () => {
  assert.deepEqual(validatePaymentForm(validForm), {});

  const errors = validatePaymentForm({
    ...validForm,
    notificationUrl: "ftp://merchant.example/hook",
  });

  assert.match(errors.notificationUrl, /http/);
});
