# Component Library

This folder contains reusable UI components and code snippets that you can copy into your tools. Each file is a self-contained example with HTML, CSS, and JavaScript.

## Available Components

1. **navigation-sidebar.html** - Complete sidebar navigation with categories and tool items
2. **collapsible-form.html** - Form that collapses after submit with hover-to-expand
3. **data-table.html** - Table with checkboxes, cyan headers, and row selection
4. **loading-spinner.html** - Loading state with spinner and message
5. **chart-integration.html** - Chart.js line chart with time-series data
6. **action-buttons.html** - Dynamic buttons that appear when items are selected
7. **info-components.html** - Badges, tooltips, alerts, and other UI elements

## How to Use

1. **Copy the entire component file** into your HTML
2. **Update IDs** to match your tool's naming convention (e.g., `kf-submit`, `ku-results`)
3. **Customize** colors, labels, and functionality as needed
4. **Test** in your browser

## Naming Convention

Always use the pattern: `{tool-shortname}-{element}`

Examples:
- `kf-submit` (Keyword Finder submit button)
- `ku-results` (Keyword Universe results)
- `kh-chart` (Keyword History chart)

This prevents ID conflicts when multiple tools are on the same page.
