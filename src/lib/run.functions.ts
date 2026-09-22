import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RunLanguage = "python" | "c" | "cpp" | "java";

const Input = z.object({
  language: z.enum(["python", "c", "cpp", "java"]),
  code: z.string().min(1).max(60_000),
  stdin: z.string().max(10_000).optional(),
});

export interface NativeRunResult {
  stdout: string;
  stderr: string;
  compileError: string;
  exitCode: number;
  ok: boolean;
}

const COMPILERS: Record<RunLanguage, { compiler: string; options?: string }> = {
  c: { compiler: "gcc-13.2.0-c", options: "warning" },
  cpp: { compiler: "gcc-13.2.0", options: "warning" },
  java: { compiler: "openjdk-jdk-21+35" },
  python: { compiler: "cpython-3.12.7" },
};

/** Wandbox compiles `prog.java`, so a `public class Main` must lose its modifier. */
function normalizeJava(code: string) {
  return code.replace(/\bpublic\s+(?=(final\s+|abstract\s+)?class\b)/g, "");
}

export const runNative = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<NativeRunResult> => {
    const cfg = COMPILERS[data.language];
    const source = data.language === "java" ? normalizeJava(data.code) : data.code;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch("https://wandbox.org/api/compile.json", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          code: source,
          compiler: cfg.compiler,
          ...(cfg.options ? { options: cfg.options } : {}),
          stdin: data.stdin ?? "",
          save: false,
        }),
      });
      if (!res.ok) throw new Error(`Execution service returned ${res.status}`);
      const json = (await res.json()) as {
        status?: string;
        program_output?: string;
        program_error?: string;
        compiler_error?: string;
      };
      const exitCode = Number(json.status ?? "0");
      const compileError = (json.compiler_error ?? "").trim();
      return {
        stdout: json.program_output ?? "",
        stderr: json.program_error ?? "",
        compileError,
        exitCode: Number.isFinite(exitCode) ? exitCode : 1,
        ok: exitCode === 0 && !compileError,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Execution timed out — check for an infinite loop.");
      }
      throw new Error(
        error instanceof Error ? error.message : "Native execution service unavailable.",
      );
    } finally {
      clearTimeout(timer);
    }
  });
