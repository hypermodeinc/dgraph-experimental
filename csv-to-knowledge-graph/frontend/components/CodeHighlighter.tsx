import React, { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";

// More specific styling for both RDF/Turtle and GraphQL/DQL
const styleMap = {
  rdf: {
    container: {
      padding: "0.5em",
      border: "1px solid #333",
      borderRadius: "0.3em",
    },
    pre: {
      padding: "1em",
      margin: "0",
    },
  },
  turtle: {
    container: {
      padding: "0.5em",
      border: "1px solid #333",
      borderRadius: "0.3em",
    },
    pre: {
      padding: "1em",
      margin: "0",
    },
  },
  graphql: {
    container: {
      padding: "0",
      border: "none",
      borderRadius: "0",
      background: "transparent",
    },
    pre: {
      padding: "0.5em",
      margin: "0",
      background: "transparent",
    },
  },
  dql: {
    container: {
      padding: "0",
      border: "none",
      borderRadius: "0",
      background: "transparent",
    },
    pre: {
      padding: "0.5em",
      margin: "0",
      background: "transparent",
    },
  },
  default: {
    container: {
      padding: "0.25em",
      border: "none",
      borderRadius: "0.3em",
    },
    pre: {
      padding: "0.75em",
      margin: "0",
    },
  },
};

interface CodeHighlighterProps {
  code: string;
  language: "turtle" | "graphql" | "dql" | "rdf" | string;
  maxHeight?: string;
}

const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  language,
  maxHeight = "400px",
}) => {
  const codeRef = useRef<HTMLDivElement>(null);

  // File: components/CodeHighlighter.tsx
  // Update this component to ensure proper background colors for the Query page
  // In the existing ColorHighlighter component, update the getStyle function:

  const getStyle = (type: "container" | "pre") => {
    const langStyle =
      styleMap[language as keyof typeof styleMap] || styleMap.default;

    // Override background colors for graphql/dql to match the UI theme
    if (language === "graphql" || language === "dql") {
      if (type === "container") {
        return {
          ...langStyle[type],
          background: "#1c1c1c", // Match the main background color
        };
      }
      if (type === "pre") {
        return {
          ...langStyle[type],
          background: "#1c1c1c", // Match the main background color
        };
      }
    }

    return langStyle[type];
  };

  useEffect(() => {
    if (!code || !codeRef.current) return;

    codeRef.current.innerHTML = "";

    const preElement = document.createElement("pre");
    preElement.className = "whitespace-pre";

    // Set background only for RDF/Turtle, not for queries
    if (language === "turtle" || language === "rdf") {
      preElement.style.background = "#222";
    } else if (language === "graphql" || language === "dql") {
      preElement.style.background = "transparent";
    } else {
      preElement.style.background = "#222";
    }

    // Apply language-specific pre styling
    const preStyle = getStyle("pre");
    Object.entries(preStyle).forEach(([key, value]) => {
      (preElement.style as any)[key] = value;
    });

    codeRef.current.appendChild(preElement);

    // Create and style code element
    const codeElement = document.createElement("code");

    // Set background based on language type
    if (language === "graphql" || language === "dql") {
      codeElement.style.background = "transparent";
    } else {
      codeElement.style.background = "#222";
    }

    codeElement.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    codeElement.style.textShadow = "none";
    codeElement.style.fontSize = "14px";
    codeElement.style.lineHeight = "1.6";

    // Handle different language types
    if (language === "graphql" || language === "dql") {
      codeElement.className = "language-graphql";
      codeElement.textContent = code;
      preElement.appendChild(codeElement);

      // Apply Prism highlighting
      Prism.highlightElement(codeElement);

      // Apply custom styling for GraphQL/DQL tokens
      setTimeout(() => {
        if (preElement && preElement.parentNode) {
          const parentDiv = preElement.parentNode as HTMLElement;
          const allElements = parentDiv.querySelectorAll("*");

          allElements.forEach((el) => {
            // Set background based on language
            if (language === "graphql" || language === "dql") {
              (el as HTMLElement).style.background = "transparent";
            } else {
              (el as HTMLElement).style.background = "#222";
            }

            // Ensure crisp font rendering
            (el as HTMLElement).style.fontFamily =
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            (el as HTMLElement).style.textShadow = "none";

            // Specific styling for token types
            if (el.classList.contains("token")) {
              if (el.classList.contains("function")) {
                (el as HTMLElement).style.color = "#6bbbff";
              } else if (el.classList.contains("keyword")) {
                (el as HTMLElement).style.color = "#c792ea";
                (el as HTMLElement).style.fontWeight = "normal";
              } else if (el.classList.contains("property")) {
                (el as HTMLElement).style.color = "#7e9dfc";
              } else if (el.classList.contains("punctuation")) {
                (el as HTMLElement).style.color = "#aaa";
              } else if (el.classList.contains("string")) {
                (el as HTMLElement).style.color = "#a5e075";
              } else if (el.classList.contains("attr-name")) {
                (el as HTMLElement).style.color = "#ffb454";
              } else if (el.classList.contains("number")) {
                (el as HTMLElement).style.color = "#ffb454";
              } else if (el.classList.contains("operator")) {
                (el as HTMLElement).style.color = "#aaa";
              }
            }
          });
        }
      }, 0);
    } else if (language === "turtle" || language === "rdf") {
      // Custom highlighting for RDF/Turtle syntax
      highlightTurtle(preElement, code);
    } else {
      // Default for other languages
      codeElement.textContent = code;
      preElement.appendChild(codeElement);
    }
  }, [code, language]);

  return (
    <div
      ref={codeRef}
      className={`CodeHighlighter rounded-md overflow-auto font-mono text-sm leading-relaxed ${language}-highlighter`}
      style={{
        maxHeight,
        background:
          language === "graphql" || language === "dql" ? "transparent" : "#222",
        color: "#e2e2e2",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        ...getStyle("container"),
      }}
    ></div>
  );
};

// Token interface for RDF/Turtle highlighting
interface Token {
  text: string;
  type: string;
  class: string;
}

// Custom highlighter for RDF/Turtle syntax
const highlightTurtle = (element: HTMLElement, code: string) => {
  const tokens = tokenizeTurtle(code);

  tokens.forEach((token) => {
    if (token.type === "whitespace") {
      element.appendChild(document.createTextNode(token.text));
    } else {
      const span = document.createElement("span");
      span.textContent = token.text;
      span.className = token.class;

      // Apply direct styling based on token type
      if (token.type === "uri") {
        span.style.color = "#6bbbff";
      } else if (token.type === "string") {
        span.style.color = "#a5e075";
      } else if (token.type === "prefixed") {
        span.style.color = "#c792ea";
      } else if (token.type === "comment") {
        span.style.color = "#888";
        span.style.fontStyle = "italic";
      } else if (token.type === "period") {
        span.style.color = "#aaa";
      }

      element.appendChild(span);
    }
  });
};

// Token regex patterns for RDF/Turtle
const tokenizeTurtle = (code: string): Token[] => {
  const tokens: Token[] = [];
  let remaining = code;

  const patterns = [
    {
      regex: /^(<_:[^>]+>)/,
      type: "uri",
      class: "text-green-400",
    },
    // Regular URI
    {
      regex: /^(<[^>]+>)/,
      type: "uri",
      class: "text-blue-400",
    },
    // String literals
    {
      regex: /^("[^"]*")/,
      type: "string",
      class: "text-yellow-400",
    },
    // Prefixed names
    {
      regex: /^([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)/,
      type: "prefixed",
      class: "text-purple-400",
    },
    // Period (end of triple)
    {
      regex: /^(\s*\.\s*)/,
      type: "period",
      class: "text-gray-400",
    },
    // Comments
    {
      regex: /^(#.*)/,
      type: "comment",
      class: "text-gray-500 italic",
    },
    // Whitespace (preserve exactly)
    {
      regex: /^(\s+)/,
      type: "whitespace",
      class: "",
    },
    // Anything else
    {
      regex: /^(\S+)/,
      type: "other",
      class: "",
    },
  ];

  // Keep tokenizing until the input is consumed
  while (remaining.length > 0) {
    let matched = false;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);

      if (match) {
        const [fullMatch, captureGroup = fullMatch] = match;

        tokens.push({
          text: captureGroup,
          type: pattern.type,
          class: pattern.class,
        });

        // Remove the matched portion from the remaining text
        remaining = remaining.slice(fullMatch.length);
        matched = true;
        break;
      }
    }

    // If nothing matched, consume one character as "other"
    if (!matched) {
      tokens.push({
        text: remaining.charAt(0),
        type: "other",
        class: "",
      });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
};

export default CodeHighlighter;
