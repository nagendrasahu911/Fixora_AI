import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const Input = z.object({
  code: z.string(),
  error: z.string().optional(),
  graphType: z.string().optional(),
  enableGraph: z.boolean().optional(),
});

const Result = z.object({
  fixedCode: z.string(),
  explanation: z.string(),
  issues: z.array(z.string()),
  graphSuggestion: z.string(),
});

export type FixResult = z.infer<typeof Result>;

const SYSTEM = `You are Fixora AI, an expert Python debugger, auto-fixer and data-visualization assistant.

Rules:
- Return corrected, runnable Python. Never change the user's intent or logic.
- Add "import numpy as np" when numerical/array work is present and it is missing.
- Add "import matplotlib.pyplot as plt" when plotting is present or requested and it is missing.
- If graphs are enabled and the code produces numeric data (lists, arrays, random numbers, datasets, categories),
  append a minimal, clean plotting block that matches the data meaning:
  line/plot for trends, bar for categories, scatter for x/y relationships, hist for distributions and random data,
  pie for shares, boxplot for spread. Always add title, axis labels where meaningful, and plt.show().
- For random numbers / datasets / numpy arrays with no explicit graph type, prefer:
  plt.hist(data, bins=10, color='blue', edgecolor='black') with title "Data Distribution", xlabel "Values", ylabel "Frequency".
- Never invent a graph when there is no numeric data.
- Code must stay clean and minimal. No markdown fences in fixedCode.
- explanation: short markdown, what was broken and why the fix works.
- issues: short bullet strings of each problem found.
- graphSuggestion: one sentence about the graph (or "none").`;

export const fixCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured.");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      "Python code:\n```python\n" + data.code + "\n```",
      data.error ? "Runtime output / traceback:\n```\n" + data.error + "\n```" : "",
      `Graphs enabled: ${data.enableGraph ? "yes" : "no"}. Requested graph type: ${data.graphType ?? "auto"}.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const result = streamText({
        model: gateway("google/gemini-3.7-flash"),
        system: SYSTEM,
        prompt,
        output: Output.object({ schema: Result }),
      });
      return await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        try {
          return Result.parse(JSON.parse(error.text));
        } catch {
          /* fall through */
        }
      }
      throw error;
    }
  });
