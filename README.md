# Accessibility Sidebar Component

This component provides a sidebar for displaying accessibility violations, offering a way to check common accessibility issues on a webpage, such as ARIA attributes, contrast ratios, and document structure.

## Features

- **Real-time accessibility checks**: Detect issues with ARIA attributes, document structure, and contrast ratios.
- **Sidebar Interface**: A collapsible sidebar displaying the list of issues found.
- **Severity Indicators**: Issues are categorized by severity (`error`, `warning`, `info`).
- **Interactive**: Ability to rerun checks and view detailed information about issues, including how to fix them.

## Usage

1. **Install Dependencies**:

   This component assumes you are using **React** and **Next.js**. Ensure that you have the necessary dependencies in your project.

2. **Import the Component**:

   To use the sidebar, simply import `AllySidebar` in your component:

   ```javascript
   import { AllySidebar } from "./path/to/AllySidebar";
   ```

3. Use the Component:

   Add the `AllySidebar` component to your layout or page:

   ```javascript
   <AllySidebar />
   ```

## Accessibility Checks

The following checks are performed:

- Contrast Check: Ensures that text contrast ratios meet WCAG standards.
- ARIA and Labels Check: Verifies that interactive elements (buttons, links, form controls) have appropriate ARIA attributes or text content.
- Document Structure Check: Verifies heading structure (e.g., no skipped heading levels) and the presence of landmark regions (header, main, footer, etc.).

> [!WARNING]
> Remember to remove the component before shipping product to production.
