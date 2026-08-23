# Fixora AI Visualizer

https://the-code-doc.lovable.app/    this my project link ans dashboards i need same dashboard but i wnat to change these things You are building an advanced AI coding assistant named "Fixora AI".

Upgrade the system with FULL data visualization support using NumPy and Matplotlib.

========================

🔥 GRAPH FEATURES (ADVANCED)

========================

1. Project Name Update

- Rename project to: "Fixora AI"

- Update all UI branding

------------------------

2. NumPy Integration

- Auto detect numerical operations

- Add:

    import numpy as np

  if missing

- Fix NumPy errors automatically

------------------------

3. Matplotlib Integration (FULL SUPPORT)

Always ensure:

    import matplotlib.pyplot as plt

Add support for ALL major graph types:

📊 Graph Types:

- Line Plot → plt.plot()

- Bar Chart → plt.bar()

- Scatter Plot → plt.scatter()

- Histogram → plt.hist()

- Pie Chart → plt.pie()

- Box Plot → plt.boxplot()

------------------------

4. Smart Graph Detection

Detect patterns:

IF:

- list/array data → suggest graph

- statistical data → histogram

- categories → bar chart

- relationship (x,y) → line/scatter

- distribution → histogram

------------------------

5. Histogram Feature (IMPORTANT)

If code contains:

- random numbers

- dataset

- numpy arrays

Then auto generate:

plt.hist(data, bins=10, color='blue', edgecolor='black')

plt.title("Data Distribution")

plt.xlabel("Values")

plt.ylabel("Frequency")

plt.show()

------------------------

6. Graph Output Panel

Add new tab:

👉 "Graph Output"

Render graph visually (canvas), not text.

Tabs:

- Console

- AI Fix

- Explanation

- History

- Graph Output ✅

------------------------

7. User Controls (Very Important)

Add UI options:

- Toggle: "Enable Graph"

- Dropdown: Select Graph Type

    - Auto Detect

    - Line

    - Bar

    - Scatter

    - Histogram

    - Pie

    - Box

------------------------

8. AI Workflow

1. User writes code

2. AI detects error

3. Fix code

4. Execute code

5. Detect data

6. Generate graph automatically (if enabled)

------------------------

9. Safety Rules

- Do NOT generate graph if no numeric data

- Do NOT break original logic

- Keep code clean and minimal

- Graph must match data meaning

------------------------

10. Output Format

Always return:

1. Fixed Code

2. Execution Output

3. Graph (if enabled)

4. Explanation

------------------------

🎯 FINAL GOAL:

Fixora AI should act like a smart coding + data visualization assistant similar to a mini Jupyter Notebook.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fixora-ai-viz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ddea8eab-ff0c-415a-98c9-495810eb80da).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
