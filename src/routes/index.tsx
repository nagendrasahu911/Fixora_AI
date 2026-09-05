import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Wand2,
  Eraser,
  Download,
  Terminal,
  Sparkles,
  BookOpen,
  History as HistoryIcon,
  BarChart3,
  Loader2,
  Check,
  Repeat2,
  Mic,
  Save,
  FolderOpen,
  Trash2,
  Copy,
  Trophy,
  Flame,
  Swords,
} from "lucide-react";

import logo from "@/assets/fixora-logo.png";
import { CodeEditor } from "@/components/CodeEditor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { fixCode, completeCode, convertCode, voiceToCode } from "@/lib/fixora.functions";
import { runPython, type GraphType, type RunResult } from "@/lib/pyodide-runner";
import {
  loadProjects,
  saveProject,
  deleteProject,
  type SavedProject,
} from "@/lib/projects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGamification, BADGES, levelOf } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fixora AI — Python Debugger & Data Visualizer" },
      {
        name: "description",
        content:
          "Fixora AI fixes your Python instantly, runs it in the browser and turns your data into NumPy + Matplotlib charts.",
      },
      { property: "og:title", content: "Fixora AI — Python Debugger & Data Visualizer" },
      {
        property: "og:description",
        content:
          "Fix, run and visualize Python with NumPy and Matplotlib — line, bar, scatter, histogram, pie and box plots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Fixora,
});

const STARTER = `# Welcome to Fixora AI 🔧📊
# Try running this buggy code, then press "Fix My Code".

import numpy as np

data = np.random.normal(50, 12, 200)

def average(numbers):
    total = 0
    for n in numbers:
        total += n
    return total / len(number)

print("Average:", average(data))
`;

type HistoryEntry = {
  id: string;
  time: string;
  kind: "run" | "fix";
  label: string;
  ok: boolean;
};

const GRAPH_TYPES: { value: GraphType; label: string }[] = [
  { value: "auto", label: "Auto Detect" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "scatter", label: "Scatter" },
  { value: "hist", label: "Histogram" },
  { value: "pie", label: "Pie" },
  { value: "box", label: "Box" },
];

function Fixora() {
  const [code, setCode] = useState(STARTER);
  const [tab, setTab] = useState("console");
  const [enableGraph, setEnableGraph] = useState(true);
  const [graphType, setGraphType] = useState<GraphType>("auto");
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [aiFix, setAiFix] = useState<{
    fixedCode: string;
    explanation: string;
    issues: string[];
    graphSuggestion: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const lastError = useRef<string | null>(null);
  const callFix = useServerFn(fixCode);
  const callComplete = useServerFn(completeCode);
  const callConvert = useServerFn(convertCode);
  const callVoice = useServerFn(voiceToCode);

  // Code converter
  const [target, setTarget] = useState<"c" | "cpp" | "java">("c");
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState<{ language: string; converted: string } | null>(null);

  // Voice coding
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Projects
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [projectName, setProjectName] = useState("My Project");

  useEffect(() => setProjects(loadProjects()), []);

  const log = useCallback((e: Omit<HistoryEntry, "id" | "time">) => {
    setHistory((h) =>
      [
        { ...e, id: crypto.randomUUID(), time: new Date().toLocaleTimeString() },
        ...h,
      ].slice(0, 40),
    );
  }, []);

  const handleRun = useCallback(
    async (source = code) => {
      setRunning(true);
      setStatus("Starting Python...");
      try {
        const res = await runPython(source, { enableGraph, graphType }, setStatus);
        setResult(res);
        lastError.current = res.error;
        setTab(res.error ? "console" : res.images.length ? "graph" : "console");
        log({
          kind: "run",
          ok: !res.error,
          label: res.error ? "Run failed" : `Ran code${res.images.length ? " + graph" : ""}`,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not run the code.");
      } finally {
        setRunning(false);
        setStatus(null);
      }
    },
    [code, enableGraph, graphType, log],
  );

  const handleFix = useCallback(async () => {
    setFixing(true);
    try {
      const res = await callFix({
        data: {
          code,
          error: lastError.current ?? undefined,
          graphType,
          enableGraph,
        },
      });
      setAiFix(res);
      setTab("aifix");
      log({ kind: "fix", ok: true, label: "AI fix generated" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI request failed.";
      toast.error(msg.includes("402") ? "AI credits exhausted — add credits to continue." : msg);
      log({ kind: "fix", ok: false, label: "AI fix failed" });
    } finally {
      setFixing(false);
    }
  }, [code, graphType, enableGraph, callFix, log]);

  const applyFix = useCallback(async () => {
    if (!aiFix) return;
    setCode(aiFix.fixedCode);
    await handleRun(aiFix.fixedCode);
  }, [aiFix, handleRun]);

  const handleSuggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await callComplete({ data: { code, language: "python" } });
      if (res.completion) {
        setCode((c) => c.replace(/\s*$/, "\n") + res.completion + "\n");
        toast.success("AI predicted the next lines.");
      } else {
        toast.info("No suggestion available.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI suggestion failed.");
    } finally {
      setSuggesting(false);
    }
  }, [callComplete, code]);

  const fetchSuggestion = useCallback(
    async (prefix: string) => {
      try {
        const res = await callComplete({ data: { code: prefix, language: "python" } });
        const first = (res.completion ?? "").split("\n")[0] ?? "";
        return first.trim() ? first : null;
      } catch {
        return null;
      }
    },
    [callComplete],
  );

  const handleConvert = useCallback(async () => {
    setConverting(true);
    try {
      const res = await callConvert({ data: { code, target } });
      setConverted(res);
      setTab("converted");
      toast.success(`Converted to ${res.language}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setConverting(false);
    }
  }, [callConvert, code, target]);

  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onerror = () => {
      setListening(false);
      toast.error("Could not hear you — try again.");
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setTranscript("");
    setVoiceOpen(true);
    setListening(true);
    rec.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.();
    setListening(false);
  }, []);

  const generateFromVoice = useCallback(async () => {
    if (!transcript.trim()) return;
    setGeneratingVoice(true);
    try {
      const res = await callVoice({ data: { transcript } });
      if (res.code) {
        setCode((c) => c.replace(/\s*$/, "\n") + "\n" + res.code + "\n");
        setVoiceOpen(false);
        toast.success("Code inserted from voice.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice coding failed.");
    } finally {
      setGeneratingVoice(false);
    }
  }, [callVoice, transcript]);

  const doSaveProject = useCallback(() => {
    setProjects(saveProject(projectName, code));
    setSaveOpen(false);
    toast.success("Project saved.");
  }, [projectName, code]);

  const fileName = "main.py";

  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    void import("@/lib/pyodide-runner").then((m) => m.getPyodide().catch(() => undefined));
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Toaster />
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <img src={logo} alt="Fixora AI logo" width={40} height={40} className="h-10 w-10" />
        <div className="mr-auto">
          <h1 className="font-mono text-lg font-bold tracking-tight brand-text">Fixora AI</h1>
          <p className="text-xs text-muted-foreground">
            Python debugger, auto-fixer & data visualizer
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5">
          <Switch id="graph" checked={enableGraph} onCheckedChange={setEnableGraph} />
          <Label htmlFor="graph" className="text-xs">
            Enable Graph
          </Label>
        </div>
        <Select value={graphType} onValueChange={(v) => setGraphType(v as GraphType)}>
          <SelectTrigger className="w-[150px]" aria-label="Select graph type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRAPH_TYPES.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => void handleRun()} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />} Run
        </Button>
        <Button variant="secondary" onClick={handleFix} disabled={fixing}>
          {fixing ? <Loader2 className="animate-spin" /> : <Wand2 />} Fix My Code
        </Button>
        <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
          <SelectTrigger className="w-[140px]" aria-label="Convert target language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="c">Python → C</SelectItem>
            <SelectItem value="cpp">Python → C++</SelectItem>
            <SelectItem value="java">Python → Java</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={handleConvert} disabled={converting}>
          {converting ? <Loader2 className="animate-spin" /> : <Repeat2 />} Convert Code
        </Button>
        <Button variant="secondary" onClick={() => setSaveOpen(true)}>
          <Save /> Save Project
        </Button>
        <Button variant="ghost" onClick={() => setTab("projects")}>
          <FolderOpen /> My Projects
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setResult(null);
            setAiFix(null);
            lastError.current = null;
          }}
        >
          <Eraser /> Clear
        </Button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <span className="font-mono text-sm text-muted-foreground">{fileName}</span>
            <div className="flex items-center gap-1">
              <Button
                variant={listening ? "default" : "ghost"}
                size="sm"
                onClick={listening ? stopListening : startListening}
                aria-label="Voice coding"
              >
                <Mic /> {listening ? "Listening…" : "Voice"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSuggest} disabled={suggesting}>
                {suggesting ? <Loader2 className="animate-spin" /> : <Sparkles />} AI Suggest
              </Button>
              <Button variant="ghost" size="sm" onClick={download}>
                <Download /> Download
              </Button>
            </div>
          </div>
          <CodeEditor value={code} onChange={setCode} fetchSuggestion={fetchSuggestion} />
          {status && (
            <div className="border-t border-border bg-card px-4 py-1.5 text-xs text-primary">
              {status}
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col">
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-card p-0">
              {[
                { v: "console", i: Terminal, l: "Console" },
                { v: "aifix", i: Sparkles, l: "AI Fix" },
                { v: "explanation", i: BookOpen, l: "Explanation" },
                { v: "history", i: HistoryIcon, l: "History" },
                { v: "graph", i: BarChart3, l: "Graph Output" },
                { v: "converted", i: Repeat2, l: "Converted Code" },
                { v: "projects", i: FolderOpen, l: "My Projects" },
              ].map(({ v, i: Icon, l }) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                >
                  <Icon className="size-4" /> {l}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <TabsContent value="console" className="m-0">
                {!result ? (
                  <Empty text="Press Run to execute your Python in the browser." />
                ) : (
                  <div className="space-y-3">
                    {result.detected.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        Detected data:
                        {result.detected.map((d) => (
                          <Badge key={d} variant="secondary" className="font-mono">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap rounded-md bg-editor p-3 font-mono text-sm">
                      {result.stdout || "(no output)"}
                    </pre>
                    {result.error && (
                      <pre className="whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-3 font-mono text-sm text-destructive">
                        {result.error}
                      </pre>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="aifix" className="m-0">
                {!aiFix ? (
                  <Empty text='Run into an error? Hit "Fix My Code" and Fixora AI will return corrected Python.' />
                ) : (
                  <div className="space-y-3">
                    {aiFix.issues.length > 0 && (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {aiFix.issues.map((it, i) => (
                          <li key={i} className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-success" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    )}
                    <pre className="overflow-auto rounded-md bg-editor p-3 font-mono text-sm">
                      {aiFix.fixedCode}
                    </pre>
                    <div className="flex gap-2">
                      <Button onClick={applyFix}>
                        <Play /> Apply & Run
                      </Button>
                      <Button variant="secondary" onClick={() => setCode(aiFix.fixedCode)}>
                        Apply only
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="explanation" className="m-0">
                {!aiFix ? (
                  <Empty text="Explanations appear here after an AI fix." />
                ) : (
                  <div className="space-y-3 text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap">{aiFix.explanation}</p>
                    {aiFix.graphSuggestion && aiFix.graphSuggestion !== "none" && (
                      <p className="rounded-md border border-border bg-secondary/40 p-3 text-muted-foreground">
                        <BarChart3 className="mr-2 inline size-4 text-primary" />
                        {aiFix.graphSuggestion}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="m-0">
                {history.length === 0 ? (
                  <Empty text="Your runs and fixes will be listed here." />
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{h.time}</span>
                        <span>{h.label}</span>
                        <Badge
                          variant={h.ok ? "secondary" : "destructive"}
                          className="ml-auto text-[10px] uppercase"
                        >
                          {h.kind}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="graph" className="m-0">
                {!enableGraph ? (
                  <Empty text='Graphs are turned off. Flip "Enable Graph" to visualize your data.' />
                ) : result?.images.length ? (
                  <div className="space-y-3">
                    {result.graphNote && (
                      <p className="text-xs text-muted-foreground">{result.graphNote}</p>
                    )}
                    {result.images.map((img, i) => (
                      <img
                        key={i}
                        src={`data:image/png;base64,${img}`}
                        alt={`Generated chart ${i + 1}`}
                        className="w-full rounded-md border border-border bg-white"
                      />
                    ))}
                  </div>
                ) : (
                  <Empty
                    text={
                      result?.graphNote ??
                      "Run code with numeric data (lists, NumPy arrays, datasets) to see charts here."
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="converted" className="m-0">
                {!converted ? (
                  <Empty text='Pick a target language and press "Convert Code" to translate your Python.' />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{converted.language}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                          void navigator.clipboard.writeText(converted.converted);
                          toast.success("Copied converted code.");
                        }}
                      >
                        <Copy /> Copy
                      </Button>
                    </div>
                    <pre className="overflow-auto rounded-md bg-editor p-3 font-mono text-sm">
                      {converted.converted}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="projects" className="m-0">
                {projects.length === 0 ? (
                  <Empty text='No saved projects yet — press "Save Project" to keep your code.' />
                ) : (
                  <ul className="space-y-1.5">
                    {projects.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(p.date).toLocaleString()}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="ml-auto"
                          onClick={() => {
                            setCode(p.code);
                            toast.success(`Loaded "${p.name}".`);
                          }}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${p.name}`}
                          onClick={() => setProjects(deleteProject(p.id))}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </main>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save project</DialogTitle>
            <DialogDescription>Stored in this browser with today&apos;s date.</DialogDescription>
          </DialogHeader>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
          />
          <DialogFooter>
            <Button onClick={doSaveProject}>
              <Save /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={voiceOpen}
        onOpenChange={(o) => {
          if (!o) stopListening();
          setVoiceOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice coding</DialogTitle>
            <DialogDescription>
              {listening
                ? "Listening… speak your instruction, then stop."
                : "Review or edit the transcription, then generate Python."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            placeholder='e.g. "create a loop from 1 to 10 and print numbers"'
          />
          <DialogFooter>
            {listening ? (
              <Button variant="secondary" onClick={stopListening}>
                Stop listening
              </Button>
            ) : (
              <Button variant="secondary" onClick={startListening}>
                <Mic /> Record again
              </Button>
            )}
            <Button onClick={generateFromVoice} disabled={generatingVoice || !transcript.trim()}>
              {generatingVoice ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
      <img src={logo} alt="" width={64} height={64} className="h-16 w-16 opacity-40" />
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
