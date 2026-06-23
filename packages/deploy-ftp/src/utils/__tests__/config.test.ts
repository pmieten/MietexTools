import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadConfig,
  applyOverrides,
  resolveConfig,
  saveConfig,
} from "../config.js";
import type { FtpConfig, FtpConfigOverrides } from "../config.js";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const MOCK_CONFIG_PATH = "/fake/home/.mietextools/deploy-ftp.json";

const VALID_CONFIG: FtpConfig = {
  host: "ftp.example.com",
  port: 21,
  user: "john",
  password: "s3cret",
  secure: false,
  pathToApp: "/public_html",
  currentApp: "myapp",
  localDist: "dist",
  keepBackups: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── loadConfig ─────────────────────────────────────────────────────────────

describe("loadConfig", () => {
  it("returns null when config file does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    const result = loadConfig(MOCK_CONFIG_PATH);
    expect(result).toBeNull();
  });

  it("loads and returns config when file exists", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    const result = loadConfig(MOCK_CONFIG_PATH);
    expect(result).toEqual(VALID_CONFIG);
  });

  it("decrypts password when key is provided and password is encrypted", () => {
    // Encrypted password format is "salt:iv:tag:data"
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ ...VALID_CONFIG, password: "a1b2:c3d4:e5f6:7890" }),
    );
    // The decryption will fail because our mocked data isn't real encrypted data.
    // We verify the function tries to decrypt (will exit with error because decrypt throws).
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    expect(() => loadConfig(MOCK_CONFIG_PATH, "wrong-key")).toThrow("process.exit called");
    exitSpy.mockRestore();
  });

  it("does not attempt decryption when password lacks colon delimiter", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ ...VALID_CONFIG, password: "plaintext-password" }),
    );
    const result = loadConfig(MOCK_CONFIG_PATH, "some-key");
    expect(result!.password).toBe("plaintext-password");
  });

  it("exits on invalid JSON", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not valid json");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    expect(() => loadConfig(MOCK_CONFIG_PATH)).toThrow("process.exit called");
    exitSpy.mockRestore();
  });
});

// ─── applyOverrides ─────────────────────────────────────────────────────────

describe("applyOverrides", () => {
  const BASE: Partial<FtpConfig> = {
    host: "base.example.com",
    port: 21,
    user: "base-user",
    password: "base-pwd",
    secure: false,
    pathToApp: "/base",
    currentApp: "base-app",
    localDist: "build",
    keepBackups: 5,
  };

  afterEach(() => {
    delete process.env.FTP_HOST;
    delete process.env.FTP_PORT;
    delete process.env.FTP_USER;
    delete process.env.FTP_PASSWORD;
    delete process.env.FTP_PATH;
    delete process.env.FTP_APP_FOLDER;
    delete process.env.FTP_LOCAL_DIST;
    delete process.env.FTP_KEEP_BACKUPS;
    delete process.env.FTP_SECURE;
  });

  it("uses base values when no overrides or env vars are set", () => {
    const result = applyOverrides(BASE, {});
    expect(result.host).toBe("base.example.com");
    expect(result.port).toBe(21);
    expect(result.user).toBe("base-user");
    expect(result.password).toBe("base-pwd");
    expect(result.pathToApp).toBe("/base");
    expect(result.currentApp).toBe("base-app");
    expect(result.localDist).toBe("build");
    expect(result.keepBackups).toBe(5);
  });

  it("overrides base with CLI overrides", () => {
    const result = applyOverrides(BASE, {
      host: "override.example.com",
      port: 2121,
      user: "override-user",
      password: "override-pwd",
      pathToApp: "/override",
      currentApp: "override-app",
      localDist: "override-dist",
      keepBackups: 3,
    });
    expect(result.host).toBe("override.example.com");
    expect(result.port).toBe(2121);
    expect(result.user).toBe("override-user");
    expect(result.password).toBe("override-pwd");
    expect(result.pathToApp).toBe("/override");
    expect(result.currentApp).toBe("override-app");
    expect(result.localDist).toBe("override-dist");
    expect(result.keepBackups).toBe(3);
  });

  it("overrides base with env vars when no CLI override", () => {
    process.env.FTP_HOST = "env.example.com";
    process.env.FTP_PORT = "2121";
    process.env.FTP_USER = "env-user";
    process.env.FTP_PASSWORD = "env-pwd";
    process.env.FTP_PATH = "/env";
    process.env.FTP_APP_FOLDER = "env-app";
    process.env.FTP_LOCAL_DIST = "env-dist";
    process.env.FTP_KEEP_BACKUPS = "7";

    const result = applyOverrides(BASE, {});
    expect(result.host).toBe("env.example.com");
    expect(result.port).toBe(2121);
    expect(result.user).toBe("env-user");
    expect(result.password).toBe("env-pwd");
    expect(result.pathToApp).toBe("/env");
    expect(result.currentApp).toBe("env-app");
    expect(result.localDist).toBe("env-dist");
    expect(result.keepBackups).toBe(7);
  });

  it("CLI overrides take precedence over env vars", () => {
    process.env.FTP_HOST = "env.example.com";
    process.env.FTP_USER = "env-user";

    const result = applyOverrides(BASE, {
      host: "cli.example.com",
    });
    expect(result.host).toBe("cli.example.com");
    expect(result.user).toBe("env-user"); // env still applies where no CLI override
  });

  it("uses defaults when base is empty and no overrides/env", () => {
    const result = applyOverrides({}, {});
    expect(result.port).toBe(21);
    expect(result.localDist).toBe("dist");
    expect(result.keepBackups).toBe(10);
    expect(result.secure).toBe(false);
    expect(result.host).toBe("");
    expect(result.user).toBe("");
  });

  it("applies secure override correctly", () => {
    const resultTrue = applyOverrides({}, { secure: true });
    expect(resultTrue.secure).toBe(true);

    const resultFalse = applyOverrides({ secure: true }, { secure: false });
    expect(resultFalse.secure).toBe(false);
  });

  it("reads FTP_SECURE env var", () => {
    process.env.FTP_SECURE = "true";
    const result = applyOverrides({}, {});
    expect(result.secure).toBe(true);
  });

  it("reads FTP_KEEP_BACKUPS as number from env", () => {
    process.env.FTP_KEEP_BACKUPS = "42";
    const result = applyOverrides({}, {});
    expect(result.keepBackups).toBe(42);
  });
});

// ─── resolveConfig ──────────────────────────────────────────────────────────

describe("resolveConfig", () => {
  it("resolves from file config when present", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    const result = resolveConfig(MOCK_CONFIG_PATH, null, {});
    expect(result.host).toBe("ftp.example.com");
    expect(result.user).toBe("john");
  });

  it("applies overrides on top of file config", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    const result = resolveConfig(MOCK_CONFIG_PATH, null, { host: "override.example.com" });
    expect(result.host).toBe("override.example.com");
    expect(result.user).toBe("john"); // from file config
  });

  it("uses CLI flags as sole source when no config file exists", () => {
    mockExistsSync.mockReturnValue(false);
    const result = resolveConfig(MOCK_CONFIG_PATH, null, {
      host: "cli.example.com",
      user: "cli-user",
      password: "cli-pwd",
      pathToApp: "/cli",
      currentApp: "cli-app",
    });
    expect(result.host).toBe("cli.example.com");
    expect(result.user).toBe("cli-user");
    expect(result.password).toBe("cli-pwd");
    expect(result.pathToApp).toBe("/cli");
    expect(result.currentApp).toBe("cli-app");
  });

  it("exits when required fields are missing", () => {
    mockExistsSync.mockReturnValue(false);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    expect(() => resolveConfig(MOCK_CONFIG_PATH, null, {})).toThrow("process.exit called");
    exitSpy.mockRestore();
  });

  it("exits when only some required fields are provided", () => {
    mockExistsSync.mockReturnValue(false);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    expect(() =>
      resolveConfig(MOCK_CONFIG_PATH, null, { host: "h", user: "u", password: "p" }),
    ).toThrow("process.exit called");
    exitSpy.mockRestore();
  });

  it("validates successfully with all required fields from mixed sources", () => {
    mockExistsSync.mockReturnValue(false);
    // Provide required fields via combination
    const result = resolveConfig(MOCK_CONFIG_PATH, null, {
      host: "h",
      user: "u",
      password: "p",
      pathToApp: "/p",
      currentApp: "app",
    });
    expect(result.host).toBe("h");
    expect(result.user).toBe("u");
  });
});

// ─── saveConfig ─────────────────────────────────────────────────────────────

describe("saveConfig", () => {
  const ENCRYPTED_PWD =
    "a1b2c3d4e5f6a1b2c3d4e5f6:a1b2c3d4e5f6a1b2c3d4e5f6:a1b2c3d4e5f6a1b2c3d4e5f6:a1b2c3d4e5f6a1b2c3d4e5f6";

  it("creates config directory if it does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    saveConfig(MOCK_CONFIG_PATH, VALID_CONFIG);
    expect(mockMkdirSync).toHaveBeenCalled();
  });

  it("writes config to disk as JSON", () => {
    mockExistsSync.mockReturnValue(true);
    saveConfig(MOCK_CONFIG_PATH, VALID_CONFIG);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      MOCK_CONFIG_PATH,
      JSON.stringify(VALID_CONFIG, null, 2),
      "utf-8",
    );
  });

  it("encrypts password when key is provided", () => {
    mockExistsSync.mockReturnValue(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    saveConfig(MOCK_CONFIG_PATH, VALID_CONFIG, "my-key");
    // Password should be encrypted (colon-separated hex parts)
    const writeCall = mockWriteFileSync.mock.calls[0][1];
    const saved = JSON.parse(writeCall);
    expect(saved.password).toContain(":");
    expect(saved.password).not.toBe("s3cret");
    logSpy.mockRestore();
  });

  it("warns about plaintext when no key provided", () => {
    mockExistsSync.mockReturnValue(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    saveConfig(MOCK_CONFIG_PATH, VALID_CONFIG);
    const saved = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(saved.password).toBe("s3cret");
    logSpy.mockRestore();
  });
});