'use client';
import { ReactNode, useState } from 'react';

interface AccessibilitySidebarProps {
  className?: string;
}

interface AccessibilityCategoryProps {
  title: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
  hasRun?: boolean;
}

interface AccessibilityViolationProps {
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  innerHTML?: string;
  impact?: string;
  help?: string;
}

const severityClasses = {
  error: 'bg-red-50/90 border-red-200 text-red-700',
  warning: 'bg-yellow-50/90 border-yellow-200 text-yellow-700',
  info: 'bg-blue-50/90 border-blue-200 text-blue-700',
};

interface AccessibilityIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  element: string;
  innerHTML?: string;
  impact: string;
  help: string;
}

interface AccessibilityReport {
  aria: AccessibilityIssue[];
  structure: AccessibilityIssue[];
}

type AccessibilityCategory = 'aria' | 'structure';

const checkAccessibility = (
  category?: AccessibilityCategory,
): AccessibilityReport => {
  const issues: AccessibilityReport = {
    aria: [],
    structure: [],
  };

  // Only run the requested category check if specified
  if (!category || category === 'aria') {
    // Batch all ARIA-related DOM queries
    const interactiveElements = document.querySelectorAll(
      'button, a, input, [role]',
    );

    const images = document.querySelectorAll('img');
    const formControls = document.querySelectorAll('input, select, textarea');
    const labels = Array.from(document.querySelectorAll('label'));

    interactiveElements.forEach((element) => {
      const el = element as HTMLElement;
      if (
        (el.tagName === 'BUTTON' ||
          el.tagName === 'A' ||
          el.hasAttribute('role')) &&
        !el.hasAttribute('aria-label') &&
        !el.hasAttribute('aria-labelledby') &&
        !el.textContent?.trim()
      ) {
        issues.aria.push({
          severity: 'error',
          message: 'Interactive element missing accessible name',
          element: `<${el.tagName.toLowerCase()}>`,
          innerHTML: el.innerHTML,
          impact: 'Critical - Screen readers cannot identify the purpose',
          help: 'Add aria-label, aria-labelledby, or visible text content',
        });
      }
    });

    images.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        issues.aria.push({
          severity: 'error',
          message: 'Image missing alt text',
          element: '<img>',
          innerHTML: img.innerHTML,
          impact: 'Critical - Screen readers cannot describe the image',
          help: 'Add alt attribute to provide image description',
        });
      }
    });

    formControls.forEach((input) => {
      const hasLabel = labels.some((label) => label.htmlFor === input.id);

      if (!hasLabel && !input.hasAttribute('aria-label')) {
        issues.aria.push({
          severity: 'error',
          message: 'Form control missing label',
          element: `<${input.tagName.toLowerCase()}>`,
          innerHTML: input.innerHTML,
          impact: 'Critical - Screen readers cannot identify the input purpose',
          help: 'Add a label element with matching "for" attribute or aria-label',
        });
      }
    });
  }

  if (!category || category === 'structure') {
    // Batch check heading structure
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    );

    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName[1]);
      if (index > 0) {
        const prevLevel = parseInt(headings[index - 1].tagName[1]);
        if (currentLevel > prevLevel + 1) {
          issues.structure.push({
            severity: 'warning',
            message: 'Skipped heading level',
            element: `<${heading.tagName.toLowerCase()}>`,
            innerHTML: heading.innerHTML,
            impact: 'Moderate - Document structure may be confusing',
            help: `Don't skip heading levels. Expected h${
              prevLevel + 1
            }, found h${currentLevel}`,
          });
        }
      }
    });
  }

  return issues;
};

export function AccessibilityViolation({
  severity,
  message,
  element,
  innerHTML,
  impact,
  help,
}: AccessibilityViolationProps) {
  return (
    <div
      className={`mb-3 rounded-lg border p-4 transition-all duration-200 hover:shadow-sm ${severityClasses[severity]}`}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium leading-tight">{message}</p>
          </div>
          {element && (
            <p className="mt-1 font-mono text-sm opacity-80">
              Element: {element}
            </p>
          )}
          {impact && (
            <p className="mt-1 text-sm opacity-80">Impact: {impact}</p>
          )}
          {help && (
            <p className="mt-2 text-sm">
              <strong>How to fix:</strong> {help}
            </p>
          )}
          {!!innerHTML && (
            <details>
              <summary>HTML</summary>
              <pre className="text-xs overflow-x-auto bg-gray-50/90 p-2 rounded-lg whitespace-pre-wrap break-all">
                {innerHTML}
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
  children,
  defaultOpen = false,
}: AccessibilityCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-0 pt-4">
      <div
        className={`grid transition-all duration-200 ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0">
            <h1 className="pb-4">{title}</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccessibilitySidebar({ className }: AccessibilitySidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [violations, setViolations] = useState<AccessibilityReport>({
    aria: [],
    structure: [],
  });
  const [hasRun, setHasRun] = useState({
    aria: false,
    structure: false,
  });

  const [showButton, setShowButton] = useState({
    aria: true,
    structure: true,
  });

  const runCategoryCheck = (category: AccessibilityCategory) => {
    const issues = checkAccessibility(category);
    setViolations((prev) => ({
      ...prev,
      [category]: issues[category],
    }));
    setHasRun((prev) => ({
      ...prev,
      [category]: true,
    }));
    setShowButton((prev) => ({
      ...prev,
      [category]: false,
    }));
  };

  const totalIssues = Object.values(violations).reduce(
    (acc, curr) => acc + curr.length,
    0,
  );

  const categories = ['aria', 'structure'] as AccessibilityCategory[];

  return (
    <div
      id="accessibility-sidebar"
      className={`fixed z-[100] right-0 top-0 flex h-screen transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-[30px] top-4 flex items-center justify-center rounded-l-lg bg-black shadow-lg text-white transition-colors px-10 py-2"
        aria-label={
          isOpen ? 'Close accessibility sidebar' : 'Open accessibility sidebar'
        }
      >
        {isOpen ? '>' : '<'}
      </button>

      <div className="h-full overflow-hidden bg-white shadow-xl w-96">
        <div className="border-b border-gray-200 bg-gray-50/50 p-4">
          <h2 className="font-semibold">Accessibility Issues</h2>
          {Object.values(hasRun).some(Boolean) && (
            <p className="mt-1 text-sm text-gray-600">
              {hasRun && (
                <>
                  Found{' '}
                  <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {totalIssues}
                  </span>{' '}
                  total {totalIssues === 1 ? 'issue' : 'issues'} to address
                </>
              )}
            </p>
          )}
        </div>

        <div className="h-[calc(100vh-64px)] overflow-y-auto">
          <AccessibilityCategory
            title="ARIA and Labels"
            count={violations.aria.length}
            hasRun={hasRun.aria}
            defaultOpen
          >
            {showButton.aria && (
              <div className="mb-3">
                <button
                  onClick={() => runCategoryCheck('aria')}
                  className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Run Aria Checks
                </button>
              </div>
            )}
            {violations.aria.map(
              (violation: AccessibilityViolationProps, index) => (
                <AccessibilityViolation key={index} {...violation} />
              ),
            )}
          </AccessibilityCategory>

          <AccessibilityCategory
            title="Document Structure"
            count={violations.structure.length}
            hasRun={hasRun.structure}
          >
            <div>hello</div>
            {showButton.structure && (
              <div className="mb-3">
                <button
                  onClick={() => runCategoryCheck('structure')}
                  className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Run Structure Checks
                </button>
              </div>
            )}
            {violations.structure.map(
              (violation: AccessibilityViolationProps, index) => (
                <AccessibilityViolation key={index} {...violation} />
              ),
            )}
          </AccessibilityCategory>
        </div>
      </div>
    </div>
  );
}
