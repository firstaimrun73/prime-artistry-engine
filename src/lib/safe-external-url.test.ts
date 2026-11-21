import { describe, expect, it } from "vitest";
import { isSafeExternalUrl } from "./safe-external-url";

describe("isSafeExternalUrl", () => {
  it("allows public https URLs", () => {
    expect(isSafeExternalUrl("https://cdn.example.com/a.png")).toBe(true);
  });
  it("rejects http", () => {
    expect(isSafeExternalUrl("http://cdn.example.com/a.png")).toBe(false);
  });
  it("rejects localhost and private IPv4", () => {
    expect(isSafeExternalUrl("https://localhost/x")).toBe(false);
    expect(isSafeExternalUrl("https://127.0.0.1/x")).toBe(false);
    expect(isSafeExternalUrl("https://10.0.0.5/x")).toBe(false);
    expect(isSafeExternalUrl("https://192.168.1.1/x")).toBe(false);
    expect(isSafeExternalUrl("https://172.16.0.1/x")).toBe(false);
    expect(isSafeExternalUrl("https://169.254.169.254/latest")).toBe(false);
  });
});
