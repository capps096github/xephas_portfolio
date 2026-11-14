// Markdown twin of /code/export, served at /code/export.md. The "Copy page"
// menu copies this and links AI assistants to it. Built from the same data the
// page loops over (src/scripts/code_export.ts), so the two never drift apart.
import type { APIRoute } from "astro";
import { baseUrl } from "../../scripts/constants.js";
import { IMG_DIR, intro, routes, beforeYouStart, mustContain, githubSteps, gitlabSteps, faqs, aiPrompt, aiRules, exportFinishSend } from "../../scripts/code_export";
import type { Step } from "../../scripts/code_export";
import { company } from "../../scripts/code_offer";
import { CHECK_FORM_URL, finishNext } from "../../scripts/code_prepare";

const origin = baseUrl.replace(/\/$/, "");
const fence = (code: string, lang = "bash") => "```" + lang + "\n" + code + "\n```";

const renderSteps = (steps: Step[]) =>
  steps.map((s, i) => {
    const parts = [`### ${i + 1}. ${s.title}`, s.body];
    if (s.note) parts.push(`> ${s.note}`);
    for (const c of s.codes ?? []) {
      if (c.label) parts.push(`**${c.label}**`);
      parts.push(fence(c.code));
    }
    if (s.example) parts.push(s.example.label, fence(s.example.code, "json"));
    if (s.shots) parts.push(s.shots.map((sh) => `![${sh.alt}](${origin}${IMG_DIR}${sh.src})`).join("\n"));
    return parts.join("\n\n");
  });

const prep = (t: string) => t.replace("/code/prepare", `${origin}/code/prepare/`);

const out: string[] = [];
out.push(`# Get the archive: full history and pull requests`);
out.push(`${company} · Source Code Acquisition. Page: ${origin}/code/export/`);
out.push(intro);

out.push(`## Who runs the export (the crucial step)`);
for (const r of routes) out.push(`### ${r.title}\n\n**Who:** ${r.who}\n\n${prep(r.body)}\n\n${r.prs}`);

out.push(`## Before you start`);
out.push(beforeYouStart.map((t, i) => `${i + 1}. ${prep(t)}`).join("\n"));

out.push(`## What must be inside the archive`);
out.push(mustContain.map((m) => `- **${m.title}.** ${m.body}`).join("\n"));
out.push(
  `run_instruction.md template: ${origin}/code/run_instruction.template.md. What it must cover: ${origin}/code/prepare/#run-instruction`,
);

out.push(`## Let an AI assistant walk you through it`);
out.push("Open your repo in an AI coding assistant (Claude Code, Cursor or similar) and paste the prompt below. You stay in charge:");
out.push(aiRules.map((r) => `- ${r}`).join("\n"));
out.push(`### ${aiPrompt.title}\n\n${aiPrompt.body} Download: ${origin}/code/${aiPrompt.file}\n\n\`\`\`\`markdown\n${aiPrompt.text}\n\`\`\`\``);

out.push(`## Or do it by hand: GitHub, the Migration API`);
out.push("Replace `<YOUR_TOKEN>`, `<MIGRATION_ID>`, `<YOUR_ORG_NAME>`, `{github-username}` and `{repo-name}` with yours.");
out.push(...renderSteps(githubSteps));

out.push(`## Or do it by hand: GitLab, the project export`);
out.push(...renderSteps(gitlabSteps));

out.push(`## Final step: submit the form`);
out.push(`Invite the GitHub account with Read access, then upload your archive in the submission form (name, check-repo.sh report, .tar.gz): ${CHECK_FORM_URL}`);
out.push(`What to put in the form:\n\n${exportFinishSend.map((x) => `- ${x}`).join("\n")}`);
out.push(`What happens next:\n\n${finishNext.map((s, i) => `${i + 1}. **${s.title}.** ${s.body}`).join("\n")}`);

out.push(`## FAQ\n\n${faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}`);

export const GET: APIRoute = () =>
  new Response(out.join("\n\n").replaceAll("__USER__", "{github-username}").replaceAll("__REPO__", "{repo-name}") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
