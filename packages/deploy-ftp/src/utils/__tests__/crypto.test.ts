import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../crypto.js";

describe("encrypt / decrypt", () => {
  it("encrypts and decrypts a plaintext string", () => {
    const plaintext = "my-secret-password";
    const passphrase = "correct-horse-battery-staple";
    const encoded = encrypt(plaintext, passphrase);

    expect(encoded).toBeTruthy();
    expect(encoded).toContain(":");

    const decoded = decrypt(encoded, passphrase);
    expect(decoded).toBe(plaintext);
  });

  it("produces different ciphertexts for same input (due to random salt/iv)", () => {
    const plaintext = "same-text";
    const passphrase = "same-key";
    const a = encrypt(plaintext, passphrase);
    const b = encrypt(plaintext, passphrase);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with wrong passphrase", () => {
    const plaintext = "hello-world";
    const encoded = encrypt(plaintext, "correct-key");
    expect(() => decrypt(encoded, "wrong-key")).toThrow();
  });

  it("throws on malformed encoded string", () => {
    expect(() => decrypt("invalid", "key")).toThrow("Invalid encrypted payload format");
    expect(() => decrypt("a:b:c", "key")).toThrow("Invalid encrypted payload format");
    expect(() => decrypt("a:b:c:d:e", "key")).toThrow("Invalid encrypted payload format");
  });

  it("handles empty string", () => {
    const encoded = encrypt("", "passphrase");
    const decoded = decrypt(encoded, "passphrase");
    expect(decoded).toBe("");
  });

  it("handles special characters", () => {
    const plaintext = "p@$$w0rd! üñîçødé \n newline";
    const passphrase = "key 🔑";
    const encoded = encrypt(plaintext, passphrase);
    const decoded = decrypt(encoded, passphrase);
    expect(decoded).toBe(plaintext);
  });
});