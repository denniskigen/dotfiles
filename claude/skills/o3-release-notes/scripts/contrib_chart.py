# /// script
# requires-python = ">=3.9"
# dependencies = ["matplotlib"]
# ///
"""Bar chart of merged PRs by organization, for the release notes' Contributor Metrics section.

  uv run contrib_chart.py <org-contributions.csv> <out.png> <release, e.g. "O3 3.8.0">

The CSV is the per-PR export for the "Release Org Contributions to PRs" sheet (organization label in
the third column, as the sheet spells it). The PNG is 3x; Confluence shows it at about 440px wide.
"""
import csv, collections, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

src, dst, release = sys.argv[1], sys.argv[2], sys.argv[3]
rows = [r for r in csv.reader(open(src))][1:]
counts = collections.Counter(r[2] for r in rows if any(r))
total = sum(counts.values())
NAMES = {"OMRS": "OpenMRS Support", "Volunteer": "Independent", "DIGI": "UW DIGI", "PIH": "PIH", "Madiro": "Madiro",
         "Palladium": "Palladium-Kenya", "ePcare": "ePCare", "Ampath": "AMPATH", "ICRC": "ICRC", "SolDevelo": "SolDevelo"}
# Largest first; ties in alphabetical order
data = sorted(((NAMES.get(k, k), v) for k, v in counts.items()), key=lambda kv: (-kv[1], kv[0].lower()))

SURFACE, INK, INK2, MUTED, BAR = "#fcfcfb", "#0b0b0b", "#52514e", "#898781", "#2a78d6"
plt.rcParams.update({"font.family": ["Helvetica Neue", "Helvetica", "Arial", "DejaVu Sans"]})

# Layout in points (1pt = 1px at 1x); the PNG is exported at 3x
W, ROW, BAR_H, RADIUS = 440, 26, 16, 4
TOP, BOTTOM, LEFT, LABEL_W, VALUE_W = 70, 14, 16, 112, 96
H = TOP + ROW * len(data) + BOTTOM
fig = plt.figure(figsize=(W / 72, H / 72), dpi=72)
fig.patch.set_facecolor(SURFACE)
plot_x, plot_w = LEFT + LABEL_W, W - LEFT - LABEL_W - VALUE_W
ax = fig.add_axes([plot_x / W, BOTTOM / H, plot_w / W, ROW * len(data) / H])
ax.set_facecolor(SURFACE)
ax.set_xlim(0, plot_w); ax.set_ylim(ROW * len(data), 0)   # axes units are points, so shapes aren't distorted
ax.axis("off")
scale = plot_w / max(v for _, v in data)
renderer = fig.canvas.get_renderer()

for i, (name, v) in enumerate(data):
    cy = i * ROW + ROW / 2
    y0 = cy - BAR_H / 2
    w = max(v * scale, 2)                                   # keep 1-PR bars visible
    if w > 2 * RADIUS:
        ax.add_patch(FancyBboxPatch((0, y0), w, BAR_H, boxstyle=f"round,pad=0,rounding_size={RADIUS}",
                                    linewidth=0, facecolor=BAR, mutation_aspect=1))
        ax.add_patch(Rectangle((0, y0), RADIUS * 2, BAR_H, linewidth=0, facecolor=BAR))  # square at the baseline
    else:
        ax.add_patch(Rectangle((0, y0), w, BAR_H, linewidth=0, facecolor=BAR))
    ax.text(-8, cy, name, ha="right", va="center", color=INK, fontsize=11)
    count = ax.text(w + 6, cy, f"{v}", ha="left", va="center", color=INK, fontsize=11, fontweight="bold")
    bb = count.get_window_extent(renderer=renderer)
    x_after = ax.transData.inverted().transform((bb.x1, bb.y0))[0]
    pct = 100 * v / total
    ax.text(x_after + 5, cy, f"({pct:.1f}%)", ha="left", va="center", color=INK2, fontsize=10)

fig.text(LEFT / W, 1 - 20 / H, f"Merged PRs by organization, {release}", ha="left", va="center", color=INK, fontsize=13, fontweight="bold")
fig.text(LEFT / W, 1 - 41 / H, f"{total} PRs across frontend, backend, distro and content repos.", ha="left", va="center", color=INK2, fontsize=10)
fig.text(LEFT / W, 1 - 56 / H, "Platform (openmrs-core) PRs are counted separately.", ha="left", va="center", color=INK2, fontsize=10)
fig.savefig(dst, dpi=72 * 3, facecolor=SURFACE)
print("wrote", dst, total, data)
