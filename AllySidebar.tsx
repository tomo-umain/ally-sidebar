"use client";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
interface AccessibilitySidebarProps {
  className?: string;
}

interface AccessibilityCategoryProps {
  title: string;
  count: number;
  button?: ReactNode;
  children: ReactNode;
  hasRun?: boolean;
}

interface AccessibilityViolationProps {
  severity: "error" | "warning";
  message: string;
  element?: string;
  outerHTML?: string;
  impact?: string;
  help?: string;
}

const severityClasses = {
  error: "bg-red-50/90 border-red-200 text-red-700",
  warning: "bg-yellow-50/90 border-yellow-200 text-yellow-700",
};

interface AccessibilityIssue {
  severity: "error" | "warning";
  message: string;
  element: string;
  outerHTML?: string;
  impact: string;
  help: string;
}

interface AccessibilityReport {
  aria: AccessibilityIssue[];
  structure: AccessibilityIssue[];
  contrast: AccessibilityIssue[];
}

type AccessibilityCategory = "aria" | "structure" | "contrast";

const calculateContrastRatio = (bgColor: string, textColor: string): number => {
  // Helper function to parse CSS colors to RGB
  const parseColor = (color: string): number[] => {
    if (color.startsWith("rgb")) {
      return color.match(/\d+/g)!.map(Number);
    } else if (color.startsWith("#")) {
      if (color.length === 4) {
        return [
          parseInt(color[1] + color[1], 16),
          parseInt(color[2] + color[2], 16),
          parseInt(color[3] + color[3], 16),
        ];
      }
      return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ];
    }
    throw new Error("Unsupported color format");
  };

  // Helper function to calculate luminance
  const calculateLuminance = (r: number, g: number, b: number): number => {
    const [rr, gg, bb] = [r, g, b].map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
  };

  const bg = parseColor(bgColor);
  const text = parseColor(textColor);

  const bgLuminance = calculateLuminance(bg[0], bg[1], bg[2]);
  const textLuminance = calculateLuminance(text[0], text[1], text[2]);

  const lighter = Math.max(bgLuminance, textLuminance);
  const darker = Math.min(bgLuminance, textLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const convertToALevel = (ratio: number): string => {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "Fails WCAG";
};

const checkAccessibility = (
  category?: AccessibilityCategory
): AccessibilityReport => {
  const issues: AccessibilityReport = {
    aria: [],
    structure: [],
    contrast: [],
  };

  const sidebar = document.getElementById("accessibility-sidebar");

  if (!category || category === "contrast") {
    const elements = document.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, span, a, button, li, td, th, label, input, svg"
    );

    elements.forEach((element) => {
      if (sidebar && sidebar.contains(element)) return;
      const el = element as HTMLElement;
      const bgColor = window.getComputedStyle(el).backgroundColor;
      const textColor = window.getComputedStyle(el).color;

      const contrastRatio = Number(
        calculateContrastRatio(bgColor, textColor).toFixed(1)
      );
      console.log(element.outerHTML, bgColor, textColor, contrastRatio);

      if (contrastRatio <= 4.5 && contrastRatio !== 1) {
        issues.contrast.push({
          severity: "error",
          message: `Low contrast text - (${contrastRatio}) ${convertToALevel(
            contrastRatio
          )}`,
          element: `<${el.tagName.toLowerCase()}>`,
          outerHTML: el.outerHTML,
          impact: "Critical - Text may be difficult to read",
          help: "Ensure a contrast ratio of at least 4.5:1",
        });
      }
    });
  }

  // Only run the requested category check if specified
  if (!category || category === "aria") {
    // Batch all ARIA-related DOM queries
    const interactiveElements = document.querySelectorAll(
      "button, a, input, [role]"
    );

    const images = document.querySelectorAll("img");
    const formControls = document.querySelectorAll("input, select, textarea");
    const labels = Array.from(document.querySelectorAll("label"));

    interactiveElements.forEach((element) => {
      if (sidebar && sidebar.contains(element)) return;
      const el = element as HTMLElement;
      if (
        (el.tagName === "BUTTON" ||
          el.tagName === "A" ||
          el.hasAttribute("role")) &&
        !el.hasAttribute("aria-label") &&
        !el.hasAttribute("aria-labelledby") &&
        el.tagName !== "IFRAME" &&
        !el.textContent?.trim()
      ) {
        issues.aria.push({
          severity: "error",
          message: "Interactive element missing accessible name",
          element: `<${el.tagName.toLowerCase()}>`,
          outerHTML: el.outerHTML,
          impact: "Critical - Screen readers cannot identify the purpose",
          help: "Add aria-label, aria-labelledby, or visible text content",
        });
      }
    });

    formControls.forEach((input) => {
      if (sidebar && sidebar.contains(input)) return;
      const hasLabel = labels.some((label) => label.htmlFor === input.id);

      if (!hasLabel && !input.hasAttribute("aria-label")) {
        issues.aria.push({
          severity: "error",
          message: "Form control missing label",
          element: `<${input.tagName.toLowerCase()}>`,
          outerHTML: input.outerHTML,
          impact: "Critical - Screen readers cannot identify the input purpose",
          help: 'Add a label element with matching "for" attribute or aria-label',
        });
      }
    });

    images.forEach((img) => {
      if (sidebar && sidebar.contains(img)) return;
      if (!img.hasAttribute("alt")) {
        issues.aria.push({
          severity: "warning",
          message: "Image missing alt text",
          element: "<img>",
          outerHTML: img.outerHTML,
          impact: "Critical - Screen readers cannot describe the image",
          help: "Add alt attribute to provide image description",
        });
      }
    });

    const focusableElements = document.querySelectorAll(
      "a, button, input, select, textarea"
    );
    focusableElements.forEach((element) => {
      if (sidebar && sidebar.contains(element)) return;
      const el = element as HTMLElement;
      if (el.tabIndex < 0) {
        issues.aria.push({
          severity: "warning",
          message: "Element not focusable via keyboard",
          element: `<${el.tagName.toLowerCase()}>`,
          outerHTML: el.outerHTML,
          impact: "Critical - Element cannot be accessed via keyboard",
          help: "Ensure element is focusable via keyboard",
        });
      }
    });
  }

  if (!category || category === "structure") {
    // Batch check heading structure
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6")
    );

    headings.forEach((heading, index) => {
      if (sidebar && sidebar.contains(heading)) return;
      const currentLevel = parseInt(heading.tagName[1]);
      if (index > 0) {
        const prevLevel = parseInt(headings[index - 1].tagName[1]);
        if (currentLevel > prevLevel + 1) {
          issues.structure.push({
            severity: "warning",
            message: "Skipped heading level",
            element: `<${heading.tagName.toLowerCase()}>`,
            outerHTML: heading.outerHTML,
            impact: "Moderate - Document structure may be confusing",
            help: `Don't skip heading levels. Expected h${
              prevLevel + 1
            }, found h${currentLevel}`,
          });
        }
      }
    });

    // Batch check for missing landmarks
    const landmarks = Array.from(
      document.querySelectorAll("header, main, nav, aside, footer, aside")
    );

    const landmarkNames = ["header", "main", "nav", "footer", "aside"];

    landmarkNames.forEach((landmark) => {
      if (
        !landmarks.some(
          (el) =>
            el.tagName.toLowerCase() === landmark && !sidebar?.contains(el)
        )
      ) {
        issues.structure.push({
          severity: "warning",
          message: "Missing landmark region",
          element: `<${landmark}>`,
          impact: "Moderate - Screen readers may not navigate correctly",
          help: `Add a <${landmark}> element to define the region`,
        });
      }
    });
  }

  return issues;
};

export function AccessibilityViolation({
  severity,
  message,
  element,
  outerHTML,
  impact,
  help,
}: AccessibilityViolationProps) {
  return (
    <div
      className={`mb-3 rounded-lg border p-4 transition-all duration-200 hover:shadow-sm ${severityClasses[severity]}`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div>
          {severity === "warning" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          )}
          {severity === "error" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-start">
            <p
              className={`font-medium leading-tight flex gap-1 items-center text-base ${severityClasses[severity]}`}
            >
              {message}
            </p>
          </div>
          {element && (
            <p className="mt-1 font-mono text-sm opacity-80">
              Element: {element}
            </p>
          )}
          {impact && <p className="mt-1 text-sm opacity-80">{impact}</p>}
          {help && (
            <p className="mt-2 text-sm">
              <strong>How to fix:</strong> {help}
            </p>
          )}
          {!!outerHTML && (
            <details>
              <summary className="cursor-pointer">HTML</summary>
              <pre className="text-xs overflow-x-auto bg-gray-50/90 p-2 rounded-lg whitespace-pre-wrap break-all">
                {outerHTML}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export function AccessibilityCategory({
  title,
  button,
  children,
}: AccessibilityCategoryProps) {
  const [forcedLoading, setForcedLoading] = useState(false);

  useEffect(() => {
    if (!forcedLoading) return;

    setTimeout(() => {
      setForcedLoading(false);
    }, 1000);
  }, [forcedLoading]);

  return (
    <div className="border-b border-gray-200 last:border-0 pt-4">
      <div className={`grid transition-all duration-200`}>
        <div className="overflow-hidden">
          <div className="p-4 pt-0">
            <h1 className="pb-4 font-bold">{title}</h1>
            <div onClick={() => setForcedLoading(true)}>{button}</div>
            {forcedLoading && <SkeletonAccessibilityCategory />}
            <div
              className={`transition-all duration-300 ${
                forcedLoading ? "h-0 opacity-0" : "opacity-100"
              }`}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SkeletonAccessibilityCategory = () => (
  <div className="pb-4">
    <div className={`grid transition-all duration-200`}>
      <div className="overflow-hidden">
        <div className="">
          <div className="animate-pulse">
            <div className="rounded-lg border p-4 bg-gray-50/90">
              <div className="flex items-start space-x-3">
                <div>
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-start">
                    <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="mt-1">
                    <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="mt-2">
                    <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const RerunIcon = ({ loading }: { loading?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className={loading ? "animate-spin" : ""}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const PlayIcon = ({ loading }: { loading?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className={loading ? "animate-spin" : ""}
  >
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

export function AllySidebar({ className }: AccessibilitySidebarProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [violations, setViolations] = useState<AccessibilityReport>({
    aria: [],
    structure: [],
    contrast: [],
  });
  const [hasRun, setHasRun] = useState({
    aria: false,
    structure: false,
    contrast: false,
  });

  const [loading, setLoading] = useState({
    aria: false,
    structure: false,
    contrast: false,
  });

  const runCategoryCheck = (category: AccessibilityCategory) => {
    const issues = checkAccessibility(category);
    setLoading((prev) => ({
      ...prev,
      [category]: true,
    }));

    setViolations((prev) => ({
      ...prev,
      [category]: issues[category],
    }));
    setHasRun((prev) => ({
      ...prev,
      [category]: true,
    }));

    setTimeout(() => {
      setLoading((prev) => ({
        ...prev,
        [category]: false,
      }));
    }, 1000);
  };

  const totalIssues = Object.values(violations).reduce(
    (acc, curr) => acc + curr.length,
    0
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const pathname = usePathname();
  useEffect(() => {
    if (violations.aria.length > 0) {
      setViolations((prev) => ({
        ...prev,
        aria: checkAccessibility("aria").aria,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      id="accessibility-sidebar"
      className={`fixed z-[100] right-0 top-0 flex h-screen transform transition-all duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } ${hasMounted ? "opacity-100" : "opacity-0"} ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-[38px] top-[84px] flex items-center justify-center rounded-l-lg bg-black shadow-lg text-white transition-colors px-10 py-2"
        aria-label={
          isOpen ? "Close accessibility sidebar" : "Open accessibility sidebar"
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m4.93 4.93 4.24 4.24" />
          <path d="m14.83 9.17 4.24-4.24" />
          <path d="m14.83 14.83 4.24 4.24" />
          <path d="m9.17 14.83-4.24 4.24" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </button>

      <div className="h-full overflow-hidden bg-white shadow-xl w-96">
        <div className="border-b border-gray-200 bg-gray-50/50 p-4">
          <h1 className="font-semibold text-lg flex gap-2 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m4.93 4.93 4.24 4.24" />
              <path d="m14.83 9.17 4.24-4.24" />
              <path d="m14.83 14.83 4.24 4.24" />
              <path d="m9.17 14.83-4.24 4.24" />
              <circle cx="12" cy="12" r="4" />
            </svg>{" "}
            ally-sidebar
          </h1>
          {Object.values(hasRun).some(Boolean) && (
            <p className="mt-1 text-sm text-gray-600">
              {hasRun && (
                <>
                  Found{" "}
                  <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {totalIssues}
                  </span>{" "}
                  total {totalIssues === 1 ? "issue" : "issues"} to address
                </>
              )}
            </p>
          )}
        </div>

        <div className="h-[calc(100vh-64px)] overflow-y-auto pb-24">
          <AccessibilityCategory
            title="Document Structure"
            count={violations.structure.length}
            button={
              <div className="mb-3">
                <button
                  onClick={() => runCategoryCheck("structure")}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex gap-2 items-center"
                >
                  {violations.structure.length > 0 ? (
                    <>
                      <RerunIcon loading={loading.structure} /> Re-run
                    </>
                  ) : (
                    <>
                      <PlayIcon /> Run
                    </>
                  )}{" "}
                  checks
                </button>
              </div>
            }
            hasRun={hasRun.structure}
          >
            {violations.structure.map(
              (violation: AccessibilityViolationProps, index) => (
                <AccessibilityViolation key={index} {...violation} />
              )
            )}
          </AccessibilityCategory>

          <AccessibilityCategory
            title="ARIA and Labels"
            count={violations.aria.length}
            button={
              <div className="mb-3">
                <button
                  onClick={() => runCategoryCheck("aria")}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex gap-2 items-center"
                >
                  {violations.aria.length > 0 ? (
                    <>
                      <RerunIcon loading={loading.aria} /> Re-run
                    </>
                  ) : (
                    <>
                      <PlayIcon /> Run
                    </>
                  )}{" "}
                  checks
                </button>
              </div>
            }
            hasRun={hasRun.aria}
          >
            {violations.aria.map(
              (violation: AccessibilityViolationProps, index) => (
                <AccessibilityViolation key={index} {...violation} />
              )
            )}
          </AccessibilityCategory>

          <AccessibilityCategory
            title="Contrast"
            count={violations.contrast.length}
            button={
              <div className="mb-3">
                <button
                  onClick={() => runCategoryCheck("contrast")}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex gap-2 items-center"
                >
                  {violations.contrast.length > 0 ? (
                    <>
                      <RerunIcon loading={loading.contrast} /> Re-run
                    </>
                  ) : (
                    <>
                      <PlayIcon /> Run
                    </>
                  )}{" "}
                  checks
                </button>
              </div>
            }
            hasRun={hasRun.contrast}
          >
            {violations.contrast.map(
              (violation: AccessibilityViolationProps, index) => (
                <AccessibilityViolation key={index} {...violation} />
              )
            )}
          </AccessibilityCategory>
        </div>
      </div>
    </div>
  );
}
