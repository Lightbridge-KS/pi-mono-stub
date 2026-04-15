import { html, type TemplateResult } from "../lit-stubs.js";

// ------------------------------------------------------------
// ToolRenderer<I, R> — how a tool's I/O is visualized
// ------------------------------------------------------------

export interface ToolRenderer<I = unknown, R = unknown> {
  render(input: I, result?: R): TemplateResult;
}

// ------------------------------------------------------------
// Concrete renderers
// ------------------------------------------------------------

export class BashRenderer
  implements
    ToolRenderer<{ command: string }, { exitCode: number; stdout: string }>
{
  render(
    input: { command: string },
    _result?: { exitCode: number; stdout: string },
  ): TemplateResult {
    // Stub: real impl renders a terminal-style block with command + output
    return html`<div class="bash-tool">$ ${input.command}</div>`;
  }
}

export class CalculateRenderer
  implements ToolRenderer<{ expression: string }, { value: number }>
{
  render(
    input: { expression: string },
    result?: { value: number },
  ): TemplateResult {
    return html`<div class="calc-tool">
      ${input.expression} = ${result?.value}
    </div>`;
  }
}

export class ArtifactsToolRenderer
  implements ToolRenderer<{ filename: string; content: string }, void>
{
  render(input: { filename: string; content: string }): TemplateResult {
    return html`<div class="artifact-tool">Created: ${input.filename}</div>`;
  }
}

// ------------------------------------------------------------
// Registry: tool name → renderer
// ------------------------------------------------------------

export const toolRenderers = new Map<string, ToolRenderer>([
  ["bash", new BashRenderer()],
  ["calculate", new CalculateRenderer()],
  ["artifacts", new ArtifactsToolRenderer()],
]);
