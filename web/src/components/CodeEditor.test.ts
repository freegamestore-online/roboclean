import { describe, it, expect } from "vitest";
import { highlightCode } from "./CodeEditor";

/** The text a user sees: highlighted HTML with tags stripped and entities decoded. */
function visibleText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent ?? "";
}

const programs = [
  "move()",
  "while (!roomClean()) {\n  if (dirty()) { vacuum() }\n  if (wallAhead()) { turnRight() } else { move() }\n}",
  "repeat(3) { turnLeft(); collect() }\nturnAround()",
  "if (garbageHere()) collect() // while move 12 (}",
  "x <b>&amp;</b> 'a' \"b\" moved remove 3a a3",
];

describe("highlightCode", () => {
  for (const code of programs) {
    it(`shows exactly the source text: ${JSON.stringify(code)}`, () => {
      expect(visibleText(highlightCode(code))).toBe(code);
    });
  }

  it("colours tokens the same as the original chained highlighter", () => {
    expect(programs.map(highlightCode)).toMatchInlineSnapshot(`
      [
        "<span style="color:#61afef">move</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span>",
        "<span style="color:#c678dd">while</span> <span style="color:#abb2bf">(</span><span style="color:#abb2bf">!</span><span style="color:#e5c07b">roomClean</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">{</span>
        <span style="color:#c678dd">if</span> <span style="color:#abb2bf">(</span><span style="color:#e5c07b">dirty</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">{</span> <span style="color:#61afef">vacuum</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">}</span>
        <span style="color:#c678dd">if</span> <span style="color:#abb2bf">(</span><span style="color:#e5c07b">wallAhead</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">{</span> <span style="color:#61afef">turnRight</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">}</span> else <span style="color:#abb2bf">{</span> <span style="color:#61afef">move</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">}</span>
      <span style="color:#abb2bf">}</span>",
        "<span style="color:#c678dd">repeat</span><span style="color:#abb2bf">(</span><span style="color:#d19a66">3</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">{</span> <span style="color:#61afef">turnLeft</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span>; <span style="color:#61afef">collect</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span> <span style="color:#abb2bf">}</span>
      <span style="color:#61afef">turnAround</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span>",
        "<span style="color:#c678dd">if</span> <span style="color:#abb2bf">(</span><span style="color:#e5c07b">garbageHere</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span><span style="color:#abb2bf">)</span> <span style="color:#61afef">collect</span><span style="color:#abb2bf">(</span><span style="color:#abb2bf">)</span> <span style="color:#5c6370">// while move 12 (}</span>",
        "x &lt;b&gt;&amp;amp;&lt;/b&gt; 'a' "b" moved remove 3a a3",
      ]
    `);
  });
});
