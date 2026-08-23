/**
 * Browser-side Python runtime (Pyodide) with NumPy + Matplotlib support.
 * Runs user code, captures stdout/stderr and renders matplotlib figures to PNGs.
 */

export type GraphType = "auto" | "line" | "bar" | "scatter" | "hist" | "pie" | "box";

export interface RunResult {
  stdout: string;
  error: string | null;
  images: string[];
  graphNote: string | null;
  detected: string[];
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideApi>;
  }
}

interface PyodideApi {
  loadPackage: (names: string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { get: (name: string) => unknown };
}

const PYODIDE_VERSION = "0.28.3";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<PyodideApi> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load the Python runtime."));
    document.head.appendChild(s);
  });
}

const DRIVER = String.raw`
import sys, io, json, base64, traceback, builtins

import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as plt
import numpy as np

def _fx_is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)

def _fx_numeric_seq(v):
    try:
        if isinstance(v, np.ndarray):
            if v.ndim == 1 and v.size > 1 and np.issubdtype(v.dtype, np.number):
                return [float(x) for x in v.tolist()]
            return None
        if isinstance(v, (list, tuple)) and len(v) > 1 and all(_fx_is_num(x) for x in v):
            return [float(x) for x in v]
    except Exception:
        return None
    return None

def _fx_cat_map(v):
    if isinstance(v, dict) and len(v) > 1:
        ks, vs = list(v.keys()), list(v.values())
        if all(isinstance(k, str) for k in ks) and all(_fx_is_num(x) for x in vs):
            return ks, [float(x) for x in vs]
    return None

def _fx_collect(g):
    out = []
    for k, v in list(g.items()):
        if k.startswith("_"):
            continue
        seq = _fx_numeric_seq(v)
        if seq is not None:
            out.append((k, "seq", seq))
            continue
        cm = _fx_cat_map(v)
        if cm is not None:
            out.append((k, "map", cm))
    return out

def _fx_choose(kind, series):
    if kind != "auto":
        return kind
    if series and series[0][1] == "map":
        return "bar"
    data = series[0][2]
    n = len(data)
    if n >= 25:
        return "hist"
    if len(series) >= 2 and series[1][1] == "seq" and len(series[1][2]) == n:
        return "scatter"
    return "line"

def _fx_plot(kind, series):
    name, sk, val = series[0]
    plt.figure(figsize=(7, 4.2), dpi=130)
    if sk == "map":
        labels, values = val
        if kind == "pie":
            plt.pie(values, labels=labels, autopct="%1.1f%%")
            plt.title("Category Share")
            return "pie chart of " + name
        plt.bar(labels, values, color="#22d3ee", edgecolor="#0e7490")
        plt.title("Category Comparison")
        plt.xlabel("Category"); plt.ylabel("Value")
        return "bar chart of " + name
    data = val
    second = None
    for nm, k2, v2 in series[1:]:
        if k2 == "seq" and len(v2) == len(data):
            second = (nm, v2)
            break
    if kind == "hist":
        plt.hist(data, bins=10, color="blue", edgecolor="black")
        plt.title("Data Distribution"); plt.xlabel("Values"); plt.ylabel("Frequency")
        return "histogram of " + name
    if kind == "pie":
        vals = [abs(x) for x in data][:8]
        plt.pie(vals, labels=[name + "[%d]" % i for i in range(len(vals))], autopct="%1.1f%%")
        plt.title("Value Share")
        return "pie chart of " + name
    if kind == "box":
        plt.boxplot(data, vert=True, patch_artist=True)
        plt.title("Value Spread"); plt.ylabel("Values")
        return "box plot of " + name
    if kind == "bar":
        plt.bar(range(len(data)), data, color="#22d3ee", edgecolor="#0e7490")
        plt.title("Values by Index"); plt.xlabel("Index"); plt.ylabel("Value")
        return "bar chart of " + name
    if kind == "scatter":
        if second:
            plt.scatter(data, second[1], color="#a78bfa", edgecolor="#4c1d95")
            plt.title("Relationship"); plt.xlabel(name); plt.ylabel(second[0])
            return "scatter plot of " + name + " vs " + second[0]
        plt.scatter(range(len(data)), data, color="#a78bfa", edgecolor="#4c1d95")
        plt.title("Values by Index"); plt.xlabel("Index"); plt.ylabel(name)
        return "scatter plot of " + name
    if second:
        plt.plot(data, second[1], marker="o", color="#22d3ee")
        plt.title("Relationship"); plt.xlabel(name); plt.ylabel(second[0])
        return "line plot of " + name + " vs " + second[0]
    plt.plot(data, marker="o", color="#22d3ee")
    plt.title("Trend"); plt.xlabel("Index"); plt.ylabel(name)
    return "line plot of " + name

def _fx_figs():
    imgs = []
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        try:
            fig.tight_layout()
        except Exception:
            pass
        fig.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
        imgs.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return imgs

def _fx_run(code, enable_graph, graph_type):
    plt.close("all")
    g = {"__name__": "__main__", "np": np, "numpy": np, "plt": plt}
    out = io.StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout = out
    sys.stderr = out
    err = None
    try:
        exec(compile(code, "main.py", "exec"), g)
    except BaseException:
        err = traceback.format_exc(limit=3)
    finally:
        sys.stdout, sys.stderr = old_out, old_err

    imgs = _fx_figs()
    note = None
    series = _fx_collect(g)
    detected = [n for n, _k, _v in series]
    if enable_graph and not imgs and not err and series:
        kind = _fx_choose(graph_type, series)
        try:
            note = "Auto-generated " + _fx_plot(kind, series)
            imgs = _fx_figs()
        except Exception as e:
            note = "Could not build a graph: %s" % e
            plt.close("all")
    elif enable_graph and not series and not imgs and not err:
        note = "No numeric data found, so no graph was generated."
    return json.dumps({
        "stdout": out.getvalue(),
        "error": err,
        "images": imgs,
        "graphNote": note,
        "detected": detected,
    })
`;

export async function getPyodide(onStatus?: (s: string) => void): Promise<PyodideApi> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Loading Python runtime...");
      await loadScript(`${INDEX_URL}pyodide.js`);
      const py = await window.loadPyodide!({ indexURL: INDEX_URL });
      onStatus?.("Loading NumPy & Matplotlib...");
      await py.loadPackage(["numpy", "matplotlib"]);
      await py.runPythonAsync(DRIVER);
      onStatus?.("Ready");
      return py;
    })().catch((e) => {
      pyodidePromise = null;
      throw e;
    });
  }
  return pyodidePromise;
}

export async function runPython(
  code: string,
  opts: { enableGraph: boolean; graphType: GraphType },
  onStatus?: (s: string) => void,
): Promise<RunResult> {
  const py = await getPyodide(onStatus);
  onStatus?.("Running...");
  (py.globals.get("__builtins__") as unknown) ?? null;
  await py.runPythonAsync(
    `_fx_payload = _fx_run(${JSON.stringify(code)}, ${opts.enableGraph ? "True" : "False"}, ${JSON.stringify(
      opts.graphType === "auto" ? "auto" : opts.graphType,
    )})`,
  );
  const raw = (await py.runPythonAsync("_fx_payload")) as string;
  return JSON.parse(raw) as RunResult;
}
