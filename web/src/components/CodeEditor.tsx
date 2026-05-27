import { useRef, useCallback, useMemo, useEffect } from "react";
import { COMMAND_HELP } from "../types";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  activeLine: number;
  availableCommands: string[];
  disabled: boolean;
  hasError?: boolean;
}

// --- Syntax highlighting ---

const KEYWORDS = /\b(while|if|repeat)\b/g;
const COMMANDS = /\b(move|vacuum|turnLeft|turnRight|turnAround|collect)\b/g;
const SENSORS = /\b(dirty|wallAhead|garbageHere|roomClean)\b/g;
const NUMBERS = /\b(\d+)\b/g;
const PUNCTUATION = /([(){}!])/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightCode(code: string): string {
  return code
    .split("\n")
    .map((rawLine) => {
      const escaped = escapeHtml(rawLine);

      // Check for comment first — if line has a comment, split at it
      const commentMatch = escaped.match(/\/\/.*/);
      if (commentMatch) {
        const commentStart = escaped.indexOf(commentMatch[0]);
        const before = escaped.slice(0, commentStart);
        const comment = escaped.slice(commentStart);
        return highlightExpression(before) +
          `<span style="color:#5c6370">${comment}</span>`;
      }

      return highlightExpression(escaped);
    })
    .join("\n");
}

function highlightExpression(line: string): string {
  // Tokenize by splitting on word boundaries and punctuation
  // Process in order: keywords, commands, sensors, numbers, punctuation
  return line
    .replace(KEYWORDS, '<span style="color:#c678dd">$1</span>')
    .replace(COMMANDS, '<span style="color:#61afef">$1</span>')
    .replace(SENSORS, '<span style="color:#e5c07b">$1</span>')
    .replace(NUMBERS, '<span style="color:#d19a66">$1</span>')
    .replace(PUNCTUATION, '<span style="color:#abb2bf">$1</span>');
}

export default function CodeEditor({
  code,
  onChange,
  activeLine,
  availableCommands,
  disabled,
  hasError = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const lines = useMemo(() => code.split("\n"), [code]);
  const lineCount = lines.length;

  // Sync scroll between textarea and pre overlay
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }, []);

  // Also sync on code change (content may resize)
  useEffect(() => {
    handleScroll();
  }, [code, handleScroll]);

  const highlightedHtml = useMemo(() => {
    const highlighted = highlightCode(code);
    if (!hasError || activeLine <= 0) return highlighted;

    // Add error background to the active line
    const htmlLines = highlighted.split("\n");
    return htmlLines
      .map((line, i) => {
        if (i + 1 === activeLine) {
          return `<span style="background:rgba(220,38,38,0.15);display:inline-block;width:100%;min-width:fit-content">${line}</span>`;
        }
        return line;
      })
      .join("\n");
  }, [code, hasError, activeLine]);

  const insertCommand = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const before = code.slice(0, start);
      const after = code.slice(ta.selectionEnd);
      const newCode = before + text + "\n" + after;
      onChange(newCode);
      // Re-focus and set cursor after inserted text
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + text.length + 1;
        ta.selectionStart = pos;
        ta.selectionEnd = pos;
      });
    },
    [code, onChange],
  );

  const commandChips = useMemo(() => {
    return availableCommands
      .map((key) => {
        const help = COMMAND_HELP[key];
        if (!help) return null;
        return { key, ...help };
      })
      .filter(Boolean) as { key: string; syntax: string; desc: string }[];
  }, [availableCommands]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      {/* Editor area */}
      <div
        style={{
          display: "flex",
          background: "#1e1e2e",
          borderRadius: 8,
          overflow: "hidden",
          flex: 1,
          minHeight: 120,
          border: "1px solid var(--line)",
        }}
      >
        {/* Line numbers */}
        <div
          className="code-editor"
          style={{
            padding: "12px 0",
            background: "#181825",
            color: "#6c7086",
            textAlign: "right",
            userSelect: "none",
            minWidth: 36,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              style={{
                paddingRight: 8,
                paddingLeft: 8,
                background:
                  activeLine === i + 1
                    ? hasError
                      ? "rgba(220, 38, 38, 0.25)"
                      : "rgba(5, 150, 105, 0.25)"
                    : "transparent",
                color:
                  activeLine === i + 1
                    ? hasError
                      ? "#dc2626"
                      : "#059669"
                    : undefined,
                fontWeight: activeLine === i + 1 ? 700 : 400,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code area: overlay container */}
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          {/* Highlighted pre overlay (behind textarea) */}
          <pre
            ref={preRef}
            className="code-editor"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: 12,
              color: "#abb2bf",
              background: "transparent",
              border: "none",
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
              overflowY: "auto",
              pointerEvents: "none",
              // Hide scrollbars on the pre — textarea drives scrolling
              scrollbarWidth: "none",
            }}
          />

          {/* Textarea (on top, transparent text so caret is visible) */}
          <textarea
            ref={textareaRef}
            className="code-editor"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              padding: 12,
              margin: 0,
              background: "transparent",
              color: "transparent",
              caretColor: "#abb2bf",
              border: "none",
              resize: "none",
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
              overflowY: "auto",
              opacity: disabled ? 0.6 : 1,
              zIndex: 1,
            }}
          />
        </div>
      </div>

      {/* Command reference */}
      <div
        style={{
          background: "var(--panel)",
          borderRadius: 8,
          padding: "8px 10px",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Commands
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {commandChips.map((cmd) => (
            <button
              key={cmd.key}
              onClick={() => insertCommand(cmd.syntax)}
              disabled={disabled}
              title={cmd.desc}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid var(--line-strong)",
                background: "var(--paper)",
                color: "var(--ink)",
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {cmd.syntax}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
