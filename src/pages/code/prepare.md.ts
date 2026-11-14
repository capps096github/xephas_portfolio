// Markdown twin of /code/prepare, served at /code/prepare.md. The "Copy page"
// menu copies this and links AI assistants to it. Built from the same data the
// page loops over (src/scripts/code_prepare.ts), so the two never drift apart.
import type { APIRoute } from "astro";
import { baseUrl } from "../../scripts/constants.js";
import {
  prompts, downloads, handover, steps, checklist,
  remove, keep, runInstruction, faqs, pad, exportSummary, finishSend, finishNext, CHECK_FORM_URL,
} from "../../scripts/code_prepare";
import { company } from "../../scripts/code_offer";

const origin = baseUrl.replace(/\/$/, "");
// The page fills these from two inputs; in Markdown they stay as placeholders.
const fill = (s: string) => s.replaceAll("__USER__", "{github-username}").replaceAll("__REPO__", "{repo-name}");
const fence = (code: string) => "```bash\n" + fill(code) + "\n```";

const out: string[] = [];
out.push(`# Preparing your repo for sale`);
out.push(`${company} · Source Code Acquisition. Page: ${origin}/code/prepare/`);
out.push(
  "Once your project is shortlisted, you clean the repository and its git history before we pay, using the free scripts below. Then you export the archive yourself, and payment is released on a call once we have verified it.",
);

out.push(`## How the handover works`);
out.push(handover.map((h) => `${Number(h.n)}. **${h.title}.** ${h.body}`).join("\n"));

out.push(`## Step by step`);
out.push(
  `Replace \`{github-username}\` and \`{repo-name}\` in the commands with yours. Make the backup in step 1 first. Every branch and tag is cleaned and force-pushed back in place.`,
);
steps.forEach((s, i) => {
  const parts = [`### ${i + 1}. ${s.title}`, fill(s.body)];
  if ("note" in s && s.note) parts.push(`> ${s.note}`);
  if (s.code) parts.push(fence(s.code));
  out.push(parts.join("\n\n"));
});

out.push(`## Checklist`);
out.push(`Tick every item before inviting us. Submit the form (name, check-repo.sh report, .tar.gz archive): ${CHECK_FORM_URL}`);
checklist.forEach((c, i) => {
  const parts = [`### ${pad(i + 1)}. ${c.title}`, fill(c.body)];
  if (c.items) parts.push(c.items.map((x) => `- ${x}`).join("\n"));
  if (c.codeNote) parts.push(c.codeNote);
  if (c.code) parts.push(fence(c.code));
  out.push(parts.join("\n\n"));
});

out.push(`## Export the archive (the crucial step)`);
out.push(exportSummary.lead);
for (const r of [exportSummary.routeA]) out.push(`### ${r.title}\n\n**Who:** ${r.who}\n\n${r.body}`);
out.push(`### In brief (GitHub)`);
out.push(exportSummary.points.map((p, i) => `${i + 1}. **${p.title}.** ${p.body}`).join("\n"));
out.push(`> ${exportSummary.warning}`);
out.push(exportSummary.pullNote.replace("(step 06)", "(step 6 above)").replace("(step 11)", "(step 11 above)"));
out.push(fence(exportSummary.code));
out.push(`The archive must contain:\n\n${exportSummary.inside.map((x) => `- ${x}`).join("\n")}`);
out.push(exportSummary.runNote.replace("(step 05)", "(step 5 above)"));
out.push(`The full guide, with screenshots, GitLab, organisation repositories and how to verify the archive: ${origin}/code/export/`);

out.push(`## What we remove\n\n${remove.map((x) => `- ${x}`).join("\n")}`);
out.push(`## What stays\n\n${keep.map((x) => `- ${x}`).join("\n")}`);
out.push(`## Downloads\n\n${downloads.map((d) => `- [${d.title}](${origin}/code/${d.file}): ${d.body}`).join("\n")}`);

out.push(
  `## What run_instruction.md covers\n\n${runInstruction.map((r) => `- **${r.title}.** ${r.body}`).join("\n")}`,
);

out.push(`## AI prompts for run_instruction.md and FEATURES.md`);
out.push("Paste into Claude Code, Cursor, Copilot or any AI coding assistant opened in your repo, then check every line against your code.");
for (const p of prompts) out.push(`### ${p.title}\n\n${p.body}\n\n\`\`\`\`markdown\n${p.text}\n\`\`\`\``);

out.push(`## Final step: submit the form`);
out.push(`Invite the GitHub account with Read access, then submit the submission form: ${CHECK_FORM_URL}`);
out.push(`What to put in the form:\n\n${finishSend.map((x) => `- ${x}`).join("\n")}`);
out.push(`What happens next:\n\n${finishNext.map((s, i) => `${i + 1}. **${s.title}.** ${s.body}`).join("\n")}`);

out.push(`## FAQ\n\n${faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}`);

export const GET: APIRoute = () =>
  new Response(out.join("\n\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
