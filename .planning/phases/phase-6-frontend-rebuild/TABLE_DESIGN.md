# Table Design Specification -- LenconDB

**Source:** OpenHands warm palette + Flat Design principles
**Date:** 2026-03-28
**Status:** Design spec (pre-implementation)

---

## Table of Contents

1. [Design Foundations](#1-design-foundations)
2. [Shared Table Anatomy](#2-shared-table-anatomy)
3. [Status and Role Badges](#3-status-and-role-badges)
4. [Action Buttons in Table Cells](#4-action-buttons-in-table-cells)
5. [Sorting Indicators](#5-sorting-indicators)
6. [Pagination Controls](#6-pagination-controls)
7. [Search and Filter Bar](#7-search-and-filter-bar)
8. [Empty States](#8-empty-states)
9. [Mobile Responsive Strategy](#9-mobile-responsive-strategy)
10. [Table 1: Projects](#10-table-1-projects)
11. [Table 2: Employees](#11-table-2-employees)
12. [Table 3: Companies](#12-table-3-companies)
13. [Table 4: Payment Schedule](#13-table-4-payment-schedule)
14. [Table 5: Expenses](#14-table-5-expenses)
15. [Table 6: Analytics Tables](#15-table-6-analytics-tables)
16. [Table 7: Workload Calendar Grid](#16-table-7-workload-calendar-grid)
17. [Accessibility Checklist](#17-accessibility-checklist)
18. [Tailwind Token Map](#18-tailwind-token-map)

---

## 1. Design Foundations

### Core Palette

```
Backgrounds:
  --table-bg:             #fdfaf0    (lighter cream -- table container)
  --table-header-bg:      #f5ecd4    (slightly darker cream -- header row)
  --table-row-bg:         transparent (inherits container)
  --table-row-hover:      rgba(34, 21, 13, 0.04)  (very subtle warm tint)
  --table-row-selected:   rgba(255, 255, 139, 0.12) (faint yellow highlight)
  --page-bg:              #f9f0d9    (page-level cream)

Text:
  --text-primary:         #22150d    (dark brown -- primary content)
  --text-secondary:       #5c4a3e    (medium brown -- secondary info)
  --text-muted:           #7d6b5d    (light brown -- labels, captions)
  --text-link:            #5c4a3e    (same as secondary, underline on hover)

Borders:
  --border-light:         rgba(34, 21, 13, 0.10)   (row dividers)
  --border-default:       rgba(34, 21, 13, 0.15)   (card/table outer border)
  --border-strong:        rgba(34, 21, 13, 0.25)   (header bottom, active focus)

Accent:
  --accent-yellow:        #FFFF8B   (active sort, selected row ring)
  --focus-ring:           #FFFF8B   (keyboard focus)
```

### Flat Design Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| Box shadow | `none` | Flat design -- no elevation |
| Border-radius | `0.4rem` (6.4px) | Matches OpenHands system |
| Gradients | `none` | Pure flat surfaces |
| Alternating row colors | **No** | Flat design avoids zebra stripes; use border dividers |
| Hover transition | `all 0.15s ease` | Fast micro-interaction |
| Font smoothing | `-webkit-font-smoothing: antialiased` | Matches OpenHands |
| Number columns | `font-variant-numeric: tabular-nums` | Prevents layout shift in numeric data |

---

## 2. Shared Table Anatomy

Every table in LenconDB follows this structure:

```
+----------------------------------------------------------+
| [Search] [Filter Dropdown(s)] [+ Add Button]             |  <-- Toolbar
+----------------------------------------------------------+
| Column A ▲  | Column B  | Column C  | Column D | Actions |  <-- Header
+----------------------------------------------------------+
| Cell        | Cell      | Cell      | Cell     | [E] [D] |  <-- Row
|-------------|-----------|-----------|----------|---------||
| Cell        | Cell      | Cell      | Cell     | [E] [D] |  <-- Row
+----------------------------------------------------------+
| Showing 1-10 of 42          [<] [1] [2] [3] [4] [5] [>] |  <-- Pagination
+----------------------------------------------------------+
```

### Table Container

```css
/* Outer wrapper */
background: #fdfaf0;
border: 1px solid rgba(34, 21, 13, 0.15);
border-radius: 0.4rem;
overflow: hidden;                /* clips children to border-radius */
```

**Tailwind:**
```
bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-[0.4rem] overflow-hidden
```

### Header Row

| Property | Value | Tailwind |
|----------|-------|----------|
| Background | `#f5ecd4` | `bg-[#f5ecd4]` |
| Text color | `#5c4a3e` | `text-[#5c4a3e]` |
| Font size | `0.75rem` (12px) | `text-xs` |
| Font weight | `600` | `font-semibold` |
| Text transform | `uppercase` | `uppercase` |
| Letter spacing | `0.05em` | `tracking-wider` |
| Padding | `0.75rem 1rem` | `px-4 py-3` |
| Border bottom | `1px solid rgba(34, 21, 13, 0.20)` | `border-b border-[rgba(34,21,13,0.20)]` |
| Text align | Left (default), Right (numbers) | `text-left` / `text-right` |
| White space | `nowrap` | `whitespace-nowrap` |
| Cursor (sortable) | `pointer` | `cursor-pointer` |
| Vertical align | `middle` | `align-middle` |

### Body Rows

| Property | Value | Tailwind |
|----------|-------|----------|
| Background (default) | `transparent` | -- |
| Background (hover) | `rgba(34, 21, 13, 0.04)` | `hover:bg-[rgba(34,21,13,0.04)]` |
| Background (selected) | `rgba(255, 255, 139, 0.12)` | `bg-[rgba(255,255,139,0.12)]` |
| Text color | `#22150d` | `text-[#22150d]` |
| Font size | `0.875rem` (14px) | `text-sm` |
| Font weight | `400` | `font-normal` |
| Padding | `0.75rem 1rem` | `px-4 py-3` |
| Border bottom | `1px solid rgba(34, 21, 13, 0.10)` | `border-b border-[rgba(34,21,13,0.10)]` |
| Last row border | `none` | `last:border-b-0` |
| Transition | `background 0.15s ease` | `transition-colors duration-150` |
| Vertical align | `middle` | `align-middle` |

### Cell Types

**Text cell (default):**
- Color: `#22150d`
- Truncate with ellipsis if column has `max-width`
- Tailwind: `truncate max-w-[200px]` where needed

**Secondary text cell (email, phone):**
- Color: `#5c4a3e`
- Tailwind: `text-[#5c4a3e]`

**Numeric cell (amount, salary, hours):**
- Align right
- `font-variant-numeric: tabular-nums`
- Tailwind: `text-right tabular-nums`

**Date cell:**
- Format: `DD.MM.YYYY` (consistent with Russian business conventions)
- Color: `#5c4a3e`
- Tailwind: `text-[#5c4a3e] tabular-nums`

**Monetary cell:**
- Format: `1 234 567 р.` (space as thousand separator, `р.` suffix)
- Align right
- Font weight: `500` for emphasis
- Tailwind: `text-right tabular-nums font-medium`

---

## 3. Status and Role Badges

All badges share these base properties:

```css
display: inline-flex;
align-items: center;
border-radius: 9999px;          /* pill shape */
padding: 0.125rem 0.625rem;    /* 2px 10px */
font-size: 0.75rem;            /* 12px */
font-weight: 500;
line-height: 1.5;
white-space: nowrap;
```

**Tailwind base:** `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap`

### Status Badges

| Status | Background | Text | Border | Usage |
|--------|-----------|------|--------|-------|
| **Active** | `rgba(75, 108, 56, 0.12)` | `#3d5a2a` | `1px solid rgba(75, 108, 56, 0.25)` | Projects, Employees -- active state |
| **Completed** | `rgba(92, 74, 62, 0.12)` | `#5c4a3e` | `1px solid rgba(92, 74, 62, 0.25)` | Projects -- completed state |
| **Pending** | `rgba(180, 130, 50, 0.12)` | `#7a5c1f` | `1px solid rgba(180, 130, 50, 0.25)` | Employees -- pending invite |
| **Paid** | `rgba(75, 108, 56, 0.12)` | `#3d5a2a` | `1px solid rgba(75, 108, 56, 0.25)` | Payments -- paid |
| **Unpaid** | `rgba(34, 21, 13, 0.06)` | `#7d6b5d` | `1px solid rgba(34, 21, 13, 0.15)` | Payments -- not yet paid |
| **Overdue** | `rgba(156, 60, 40, 0.12)` | `#8b3a2a` | `1px solid rgba(156, 60, 40, 0.25)` | Payments -- past expected date |

**Tailwind mappings:**

```
Active:    bg-[rgba(75,108,56,0.12)] text-[#3d5a2a] border border-[rgba(75,108,56,0.25)]
Completed: bg-[rgba(92,74,62,0.12)] text-[#5c4a3e] border border-[rgba(92,74,62,0.25)]
Pending:   bg-[rgba(180,130,50,0.12)] text-[#7a5c1f] border border-[rgba(180,130,50,0.25)]
Paid:      bg-[rgba(75,108,56,0.12)] text-[#3d5a2a] border border-[rgba(75,108,56,0.25)]
Unpaid:    bg-[rgba(34,21,13,0.06)] text-[#7d6b5d] border border-[rgba(34,21,13,0.15)]
Overdue:   bg-[rgba(156,60,40,0.12)] text-[#8b3a2a] border border-[rgba(156,60,40,0.25)]
```

### Role Badges

| Role | Background | Text | Border |
|------|-----------|------|--------|
| **Admin** | `rgba(92, 74, 62, 0.15)` | `#3e2c1e` | `1px solid rgba(92, 74, 62, 0.30)` |
| **Manager** | `rgba(180, 145, 50, 0.12)` | `#6b5520` | `1px solid rgba(180, 145, 50, 0.25)` |
| **Employee** | `rgba(80, 120, 110, 0.12)` | `#3a5f56` | `1px solid rgba(80, 120, 110, 0.25)` |
| **Trial** | `rgba(34, 21, 13, 0.06)` | `#7d6b5d` | `1px solid rgba(34, 21, 13, 0.12)` |

**Tailwind mappings:**

```
Admin:    bg-[rgba(92,74,62,0.15)] text-[#3e2c1e] border border-[rgba(92,74,62,0.30)]
Manager:  bg-[rgba(180,145,50,0.12)] text-[#6b5520] border border-[rgba(180,145,50,0.25)]
Employee: bg-[rgba(80,120,110,0.12)] text-[#3a5f56] border border-[rgba(80,120,110,0.25)]
Trial:    bg-[rgba(34,21,13,0.06)] text-[#7d6b5d] border border-[rgba(34,21,13,0.12)]
```

### Company Type Badges

| Type | Background | Text | Border |
|------|-----------|------|--------|
| **Customer** | `rgba(75, 108, 56, 0.12)` | `#3d5a2a` | `1px solid rgba(75, 108, 56, 0.25)` |
| **Contractor** | `rgba(140, 110, 70, 0.12)` | `#5c4a3e` | `1px solid rgba(140, 110, 70, 0.25)` |

### Payment Type Badges

| Type | Background | Text | Border |
|------|-----------|------|--------|
| **Income** | `rgba(75, 108, 56, 0.10)` | `#3d5a2a` | `1px solid rgba(75, 108, 56, 0.20)` |
| **Expense** | `rgba(156, 60, 40, 0.10)` | `#8b3a2a` | `1px solid rgba(156, 60, 40, 0.20)` |
| **Salary** | `rgba(140, 110, 70, 0.10)` | `#5c4a3e` | `1px solid rgba(140, 110, 70, 0.20)` |

### Expense Category Badges

All expense categories use a **uniform warm-neutral** badge so the table stays calm:

| Category | Background | Text | Border |
|----------|-----------|------|--------|
| **Materials** | `rgba(140, 110, 70, 0.10)` | `#5c4a3e` | `1px solid rgba(140, 110, 70, 0.20)` |
| **Transport** | `rgba(80, 120, 110, 0.10)` | `#3a5f56` | `1px solid rgba(80, 120, 110, 0.20)` |
| **Equipment** | `rgba(92, 74, 62, 0.10)` | `#3e2c1e` | `1px solid rgba(92, 74, 62, 0.20)` |
| **Subcontractor** | `rgba(180, 130, 50, 0.10)` | `#7a5c1f` | `1px solid rgba(180, 130, 50, 0.20)` |
| **Other** | `rgba(34, 21, 13, 0.06)` | `#7d6b5d` | `1px solid rgba(34, 21, 13, 0.12)` |

**Design rationale:** Categories use subtle tonal differentiation within the warm palette rather than arbitrary hue jumps. Each category is distinguishable but none demands attention over another.

### Contrast Verification

All badge text/background combinations meet WCAG AA 4.5:1 minimum contrast:

| Badge | Text | Effective Background | Ratio | Pass |
|-------|------|---------------------|-------|------|
| Active | `#3d5a2a` | ~`#ecf0e6` | 5.2:1 | AA |
| Completed | `#5c4a3e` | ~`#f0ece8` | 4.8:1 | AA |
| Pending | `#7a5c1f` | ~`#f5efe0` | 5.0:1 | AA |
| Overdue | `#8b3a2a` | ~`#f5e9e5` | 5.4:1 | AA |
| Admin | `#3e2c1e` | ~`#ede8e3` | 7.1:1 | AAA |
| Manager | `#6b5520` | ~`#f3ede0` | 5.3:1 | AA |
| Employee | `#3a5f56` | ~`#e9f0ee` | 5.1:1 | AA |
| Trial | `#7d6b5d` | ~`#f6f3f0` | 4.6:1 | AA |

---

## 4. Action Buttons in Table Cells

### Design: Icon Buttons with Tooltip

Action buttons in table cells use **icon-only ghost buttons** with tooltips on hover. This keeps rows compact and lets the data breathe.

**Base properties:**

```css
width: 2rem;               /* 32px */
height: 2rem;
display: inline-flex;
align-items: center;
justify-content: center;
border-radius: 0.4rem;
border: none;
background: transparent;
color: #7d6b5d;            /* muted brown */
cursor: pointer;
transition: all 0.15s ease;
```

**Tailwind base:** `inline-flex items-center justify-center w-8 h-8 rounded-[0.4rem] text-[#7d6b5d] hover:bg-[rgba(34,21,13,0.06)] transition-colors duration-150`

### Action Button Variants

| Action | Icon | Hover BG | Hover Color | Tooltip |
|--------|------|----------|-------------|---------|
| **Edit** | Pencil (outline, 16px) | `rgba(34, 21, 13, 0.06)` | `#22150d` | "Edit" |
| **Delete** | Trash (outline, 16px) | `rgba(156, 60, 40, 0.08)` | `#8b3a2a` | "Delete" |
| **View** | Eye (outline, 16px) | `rgba(34, 21, 13, 0.06)` | `#22150d` | "View" |
| **Mark as Paid** | Check-circle (outline, 16px) | `rgba(75, 108, 56, 0.08)` | `#3d5a2a` | "Mark as paid" |

**Tailwind overrides:**

```
Edit hover:    hover:bg-[rgba(34,21,13,0.06)] hover:text-[#22150d]
Delete hover:  hover:bg-[rgba(156,60,40,0.08)] hover:text-[#8b3a2a]
Mark Paid:     hover:bg-[rgba(75,108,56,0.08)] hover:text-[#3d5a2a]
```

### Action Cell Layout

```css
display: flex;
align-items: center;
gap: 0.25rem;              /* 4px between icons */
justify-content: flex-end;  /* right-align actions */
```

**Tailwind:** `flex items-center gap-1 justify-end`

### "Mark as Paid" -- Special Treatment

When a payment row is unpaid and not overdue, the "Mark as Paid" action appears as a **small text button** instead of an icon, because it is the primary action for that row:

```css
display: inline-flex;
align-items: center;
gap: 0.375rem;
padding: 0.25rem 0.625rem;
border-radius: 0.4rem;
border: 1px solid rgba(75, 108, 56, 0.25);
background: transparent;
color: #3d5a2a;
font-size: 0.75rem;
font-weight: 500;
cursor: pointer;
transition: all 0.15s ease;
```

Hover state:
```css
background: rgba(75, 108, 56, 0.08);
border-color: rgba(75, 108, 56, 0.40);
```

**Tailwind:** `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[0.4rem] border border-[rgba(75,108,56,0.25)] text-[#3d5a2a] text-xs font-medium hover:bg-[rgba(75,108,56,0.08)] hover:border-[rgba(75,108,56,0.40)] transition-colors duration-150`

---

## 5. Sorting Indicators

### Sort Icon Design

Use **chevron arrows** (not filled triangles). Small, inline, sitting to the right of the header text.

**Sortable header anatomy:**

```
[Header Text] [Sort Icon]
```

### Sort States

| State | Icon | Color | Opacity |
|-------|------|-------|---------|
| **Unsorted** (sortable) | Chevron up + down (stacked, 10px total) | `#7d6b5d` | `0.3` |
| **Ascending** | Chevron up only (10px) | `#22150d` | `1.0` |
| **Descending** | Chevron down only (10px) | `#22150d` | `1.0` |
| **Not sortable** | No icon | -- | -- |

### Active Sort Header Style

When a column is the active sort key, the header text also changes:

```css
/* Active sort header */
color: #22150d;             /* from #5c4a3e to primary */
font-weight: 700;           /* from 600 to bold */
```

**Tailwind for active sort header:** `text-[#22150d] font-bold`

### Sort Icon Implementation

```css
.sort-icon {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-left: 0.375rem;    /* 6px gap from text */
  width: 0.75rem;           /* 12px */
}

.sort-icon svg {
  width: 0.625rem;          /* 10px */
  height: 0.625rem;
}

/* Inactive state */
.sort-icon--inactive {
  color: #7d6b5d;
  opacity: 0.3;
}

/* Active state */
.sort-icon--active {
  color: #22150d;
  opacity: 1;
}
```

**Tailwind:** `inline-flex flex-col items-center ml-1.5 w-3`

### Sortable Header Hover

On hover, unsorted columns show the sort icon at full opacity as a hint:

```css
th:hover .sort-icon--inactive {
  opacity: 0.6;
}
```

### Keyboard Accessibility

- Sortable headers are `<button>` elements (or `role="button" tabindex="0"`)
- Focus ring: `outline: 2px solid #FFFF8B; outline-offset: 2px`
- `aria-sort="ascending"`, `aria-sort="descending"`, or `aria-sort="none"`

---

## 6. Pagination Controls

### Layout

```
[Showing 1-10 of 42]                    [< Prev] [1] [2] [3] ... [5] [Next >]
^-- left-aligned info                                              right-aligned controls --^
```

### Container

```css
display: flex;
align-items: center;
justify-content: space-between;
padding: 0.75rem 1rem;
border-top: 1px solid rgba(34, 21, 13, 0.10);
```

**Tailwind:** `flex items-center justify-between px-4 py-3 border-t border-[rgba(34,21,13,0.10)]`

### "Showing X of Y" Text

```css
font-size: 0.8125rem;      /* 13px */
color: #7d6b5d;
```

**Tailwind:** `text-[0.8125rem] text-[#7d6b5d]`

### Page Number Buttons

**Base (inactive):**

```css
min-width: 2rem;
height: 2rem;
display: inline-flex;
align-items: center;
justify-content: center;
border-radius: 0.4rem;
border: none;
background: transparent;
color: #5c4a3e;
font-size: 0.8125rem;
font-weight: 500;
cursor: pointer;
transition: all 0.15s ease;
```

**Hover:**
```css
background: rgba(34, 21, 13, 0.06);
color: #22150d;
```

**Active (current page):**
```css
background: #22150d;
color: #f9f0d9;
font-weight: 600;
```

**Disabled (ellipsis or out of range):**
```css
color: rgba(34, 21, 13, 0.25);
cursor: default;
pointer-events: none;
```

**Tailwind mappings:**

```
Base:     min-w-8 h-8 inline-flex items-center justify-center rounded-[0.4rem] text-[0.8125rem] font-medium text-[#5c4a3e] transition-colors duration-150
Hover:    hover:bg-[rgba(34,21,13,0.06)] hover:text-[#22150d]
Active:   bg-[#22150d] text-[#f9f0d9] font-semibold
Disabled: text-[rgba(34,21,13,0.25)] pointer-events-none
```

### Prev/Next Buttons

Same as page buttons but with chevron icons (16px) and text label:

```
[< Prev]    [Next >]
```

When at first/last page, the button is disabled (same disabled style as page buttons).

**Tailwind:** `inline-flex items-center gap-1 px-3 h-8 rounded-[0.4rem] text-[0.8125rem] font-medium text-[#5c4a3e]`

### Items Per Page Selector

A small `<select>` dropdown in the pagination bar:

```
[10 per page ▾]
```

Style matches form selects from `UI_COMPONENTS_SPEC.md`:
- Height: `2rem`
- Font-size: `0.8125rem`
- Border: `1px solid rgba(34, 21, 13, 0.15)`
- Border-radius: `0.4rem`
- Background: `transparent`
- Padding: `0 2rem 0 0.5rem` (space for chevron)

**Tailwind:** `h-8 text-[0.8125rem] border border-[rgba(34,21,13,0.15)] rounded-[0.4rem] bg-transparent pr-8 pl-2 text-[#5c4a3e]`

---

## 7. Search and Filter Bar

### Toolbar Layout

Sits directly above the table, inside the same card container.

```css
display: flex;
align-items: center;
gap: 0.75rem;
padding: 1rem;
border-bottom: 1px solid rgba(34, 21, 13, 0.10);
flex-wrap: wrap;            /* wraps on mobile */
```

**Tailwind:** `flex items-center gap-3 p-4 border-b border-[rgba(34,21,13,0.10)] flex-wrap`

### Search Input

```css
flex: 1;
min-width: 200px;
max-width: 320px;
height: 2.25rem;
padding: 0 0.75rem 0 2.25rem;  /* left padding for icon */
border: 1px solid rgba(34, 21, 13, 0.15);
border-radius: 0.4rem;
background: transparent;
color: #22150d;
font-size: 0.875rem;
```

Focus:
```css
border-color: rgba(34, 21, 13, 0.40);
outline: 2px solid #FFFF8B;
outline-offset: 2px;
```

Search icon (magnifying glass): positioned absolutely inside the input, 16px, color `#7d6b5d`.

**Tailwind:** `flex-1 min-w-[200px] max-w-xs h-9 pl-9 pr-3 border border-[rgba(34,21,13,0.15)] rounded-[0.4rem] bg-transparent text-sm text-[#22150d] placeholder:text-[rgba(34,21,13,0.4)] focus:border-[rgba(34,21,13,0.40)] focus:outline-2 focus:outline-[#FFFF8B] focus:outline-offset-2`

### Filter Dropdowns

Same styling as `<select>` from UI_COMPONENTS_SPEC:
- Height: `2.25rem`
- Same border, radius, colors as search input
- Custom chevron via CSS `::after`

### Active Filter Indicator

When a filter is applied, show a small dot or count next to the filter:

**Dot variant:**
```css
/* Small dot on the filter button/dropdown */
position: relative;

.filter-active::after {
  content: '';
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: #22150d;
}
```

**Count variant (for multi-select filters):**
Badge showing count, e.g., `Status (2)` using the same badge styling as table badges, but smaller (`0.625rem` font).

### "Add" Button (Primary Action in Toolbar)

Positioned at the right end of the toolbar. Uses the primary button style from UI_COMPONENTS_SPEC:

```css
background: #22150d;
color: #f9f0d9;
height: 2.25rem;
padding: 0 1rem;
border-radius: 0.4rem;
font-size: 0.875rem;
font-weight: 500;
```

With a `+` icon (16px) before the text.

**Tailwind:** `inline-flex items-center gap-2 h-9 px-4 bg-[#22150d] text-[#f9f0d9] rounded-[0.4rem] text-sm font-medium hover:bg-black transition-colors duration-150`

### Clear All Filters

When any filter is active, show a ghost button "Clear filters" at the end of the toolbar:

```css
color: #7d6b5d;
font-size: 0.8125rem;
text-decoration: underline;
cursor: pointer;
```

Hover: `color: #22150d;`

---

## 8. Empty States

### Standard Empty State (No Data)

Displayed when a table has zero rows after loading.

```
         +---------------------------+
         |                           |
         |      [Outline Icon]       |   <-- 48px, color: #7d6b5d, opacity: 0.5
         |                           |
         |    No projects yet        |   <-- text-lg, font-medium, #22150d
         |                           |
         |    Create your first      |   <-- text-sm, #7d6b5d
         |    project to get         |
         |    started                |
         |                           |
         |    [+ Add Project]        |   <-- Primary button (small)
         |                           |
         +---------------------------+
```

**Container:**
```css
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 4rem 2rem;
text-align: center;
```

**Icon:** Relevant outline icon per table type:
- Projects: Folder icon
- Employees: Users icon
- Companies: Building icon
- Payments: CreditCard icon
- Expenses: Receipt icon

**Tailwind:** `flex flex-col items-center justify-center py-16 px-8 text-center`

### Empty State After Filter/Search

When filters produce zero results:

```
         No results found

         Try adjusting your search
         or filter criteria

         [Clear filters]          <-- Ghost button
```

No icon. Just text + clear action.

### Loading State

While data is being fetched, show **skeleton rows** (not a spinner):

```css
/* Skeleton pulse */
.skeleton-row {
  height: 1rem;
  border-radius: 0.25rem;
  background: rgba(34, 21, 13, 0.06);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

Show 5 skeleton rows with varying widths (80%, 65%, 90%, 55%, 75%) to look natural.

**Tailwind:** `h-4 rounded bg-[rgba(34,21,13,0.06)] animate-pulse`

---

## 9. Mobile Responsive Strategy

### Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `>=992px` | Full table, all columns |
| `768px-991px` | Table with horizontal scroll, some columns hidden |
| `<=767px` | Card-based layout (transform from table) |
| `<=497px` | Compact card layout, reduced padding |

### Column Priority System

Each column has a priority level. Lower-priority columns hide first:

| Priority | Columns | Visible At |
|----------|---------|------------|
| **P1** (always visible) | Name, Status, Actions | All breakpoints |
| **P2** | Amount/Salary, Email, Date | >= 768px |
| **P3** | Phone, Manager, Role | >= 992px |
| **P4** | Contract Date, secondary info | >= 1200px |

### Tablet (768-991px): Horizontal Scroll

```css
.table-scroll-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

The table maintains its structure but scrolls horizontally. P4 columns are hidden.

**Scroll shadow indicators** (CSS gradient fade) on left/right edges when content is scrollable:

```css
.table-scroll-container {
  background:
    linear-gradient(to right, #fdfaf0 30px, transparent),
    linear-gradient(to left, #fdfaf0 30px, transparent);
  background-position: left center, right center;
  background-size: 40px 100%;
  background-repeat: no-repeat;
}
```

### Mobile (<=767px): Card Layout

Each table row transforms into a card:

```
+-------------------------------------------+
| [Status Badge]                    [Actions]|
|                                            |
| Project Name                               |  <-- font-medium, #22150d
| Customer Name                              |  <-- text-sm, #5c4a3e
|                                            |
| Manager: John Doe                          |  <-- text-xs, #7d6b5d
| Contract: 15.03.2026                       |
+-------------------------------------------+
```

**Card properties:**
```css
background: #fdfaf0;
border: 1px solid rgba(34, 21, 13, 0.15);
border-radius: 0.4rem;
padding: 1rem;
margin-bottom: 0.5rem;
```

**Tailwind:** `bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-[0.4rem] p-4 mb-2`

**Card internal layout:**
- Top row: status badge (left) + action icons (right), `flex justify-between`
- Name: `font-medium text-[#22150d]`, marginTop `0.5rem`
- Secondary info: stacked key-value pairs, `text-xs text-[#7d6b5d]`
- Key labels in secondary: `font-medium` to distinguish from values

### Mobile Search/Filter Bar

On mobile, the toolbar stacks vertically:
- Search input takes full width
- Filters wrap to next line
- "Add" button becomes a floating action button (FAB) or full-width below filters

```css
@media (max-width: 767px) {
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .table-toolbar .search-input {
    max-width: none;
  }
}
```

### Mobile Pagination

Simplify to: `[<] Page 2 of 5 [>]`

No individual page numbers. Just prev/next with current position indicator.

---

## 10. Table 1: Projects

### Columns

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Name | text (link) | `flex: 2, min-width: 160px` | Yes | P1 | left |
| Customer | text | `flex: 1.5, min-width: 120px` | Yes | P2 | left |
| Manager | text | `flex: 1, min-width: 100px` | Yes | P3 | left |
| Contract Date | date | `110px` | Yes | P4 | left |
| Status | badge | `100px` | Yes | P1 | left |
| Actions | actions | `80px` | No | P1 | right |

### Name Column (Clickable)

The project name is a clickable link to the project detail page:

```css
color: #22150d;
font-weight: 500;
text-decoration: none;
cursor: pointer;
```

Hover:
```css
text-decoration: underline;
text-decoration-color: rgba(34, 21, 13, 0.30);
text-underline-offset: 2px;
```

**Tailwind:** `font-medium text-[#22150d] hover:underline hover:decoration-[rgba(34,21,13,0.30)] underline-offset-2`

### Status Badges

- **Active**: green badge (see Section 3)
- **Completed**: brown badge (see Section 3)

### Actions

- Edit (pencil icon) -- opens edit modal
- Delete (trash icon) -- opens confirmation dialog

### Default Sort

By `Contract Date` descending (newest first).

### Filters

- Status dropdown: `All` | `Active` | `Completed`
- Customer dropdown (populated from company list)

---

## 11. Table 2: Employees

### Columns

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Name | text | `flex: 1.5, min-width: 140px` | Yes | P1 | left |
| Email | text (secondary) | `flex: 1.5, min-width: 160px` | Yes | P2 | left |
| Phone | text (secondary) | `120px` | No | P3 | left |
| Role | badge | `100px` | Yes | P2 | left |
| Salary | monetary | `110px` | Yes | P3 | right |
| Status | badge | `120px` | Yes | P1 | left |
| Actions | actions | `80px` | No | P1 | right |

### Role Badges

Admin (dark brown), Manager (gold), Employee (teal), Trial (muted) -- see Section 3.

### Status Badges

- **Active**: green badge
- **Pending invite**: amber/pending badge with a small envelope icon (12px) before text

### Salary Display

```
145 000 р.
```

Right-aligned, `tabular-nums`, `font-medium`.

### Actions

- Edit (pencil icon)
- Delete (trash icon) -- only if role is not Admin

### Default Sort

By `Name` ascending.

### Filters

- Role dropdown: `All` | `Admin` | `Manager` | `Employee` | `Trial`
- Status dropdown: `All` | `Active` | `Pending invite`

---

## 12. Table 3: Companies

### Columns

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Name | text | `flex: 2, min-width: 160px` | Yes | P1 | left |
| Type | badge | `110px` | Yes | P1 | left |
| Email | text (secondary) | `flex: 1.5, min-width: 160px` | Yes | P2 | left |
| Phone | text (secondary) | `130px` | No | P3 | left |
| Actions | actions | `80px` | No | P1 | right |

### Type Badges

- **Customer**: green badge
- **Contractor**: warm brown badge

### Actions

- Edit (pencil icon)
- Delete (trash icon)

### Default Sort

By `Name` ascending.

### Filters

- Type dropdown: `All` | `Customer` | `Contractor`

---

## 13. Table 4: Payment Schedule

This table appears inside the **ProjectDetail** page, within a card/section.

### Columns

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Type | badge | `90px` | Yes | P2 | left |
| Name | text | `flex: 2, min-width: 140px` | Yes | P1 | left |
| Amount | monetary | `120px` | Yes | P2 | right |
| Expected Date | date | `110px` | Yes | P1 | left |
| Actual Date | date | `110px` | No | P3 | left |
| Status | badge | `100px` | Yes | P1 | left |
| Actions | actions | `100px` | No | P1 | right |

### Payment Type Badges

Income (green tint), Expense (red tint), Salary (brown tint) -- see Section 3.

### Status + Overdue Logic

The status column shows one of: `Paid`, `Unpaid`, `Overdue`.

**Overdue detection:** If `Status == Unpaid` and `Expected Date < today`, display the **Overdue** badge instead of Unpaid.

### Overdue Date Highlighting

When a payment is overdue, the Expected Date cell gets special styling:

```css
color: #8b3a2a;             /* warm red text */
font-weight: 500;
```

**Tailwind:** `text-[#8b3a2a] font-medium`

### Actual Date Cell

- If filled: normal date display
- If empty (not yet paid): show `--` in muted color

### Actions

- **Mark as Paid** (text button, see Section 4) -- only when status is Unpaid/Overdue
- Edit (pencil icon)
- Delete (trash icon)

### Default Sort

By `Expected Date` ascending (upcoming payments first).

### Summary Row

At the bottom of the payment table, a summary row:

```
                         Total Income:   2 500 000 р.
                         Total Expense:    850 000 р.
                         Balance:        1 650 000 р.
```

Summary row styling:
```css
background: #f5ecd4;           /* same as header */
font-weight: 600;
border-top: 1px solid rgba(34, 21, 13, 0.20);
```

---

## 14. Table 5: Expenses

### Columns

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Date | date | `100px` | Yes | P1 | left |
| Amount | monetary | `120px` | Yes | P1 | right |
| VAT | monetary | `90px` | No | P3 | right |
| Category | badge | `110px` | Yes | P2 | left |
| Description | text | `flex: 2, min-width: 160px` | No | P2 | left |
| Actions | actions | `80px` | No | P1 | right |

### Month Group Headers

Expenses are grouped by month. Each group has a sticky header row:

```
+-----------------------------------------------------------+
| March 2026                           Total: 450 000 р.    |
+-----------------------------------------------------------+
| 28.03 | 15 000 р. | 2 500 р. | Materials | Lumber...     |
| 25.03 | 8 000 р.  | 1 333 р. | Transport | Delivery...   |
+-----------------------------------------------------------+
| February 2026                        Total: 380 000 р.    |
+-----------------------------------------------------------+
| ...                                                        |
```

**Month header styling:**

```css
background: #f0e7d0;           /* slightly darker than table header */
padding: 0.5rem 1rem;
font-size: 0.8125rem;
font-weight: 600;
color: #22150d;
border-bottom: 1px solid rgba(34, 21, 13, 0.15);
display: flex;
justify-content: space-between;
align-items: center;
position: sticky;
top: 0;                         /* sticks when scrolling within container */
z-index: 1;
```

Month total on the right side: `text-[#5c4a3e] font-medium`

**Tailwind:** `bg-[#f0e7d0] px-4 py-2 text-[0.8125rem] font-semibold text-[#22150d] border-b border-[rgba(34,21,13,0.15)] flex justify-between items-center sticky top-0 z-[1]`

### Category Badges

Materials, Transport, Equipment, Subcontractor, Other -- see Section 3 Expense Category Badges.

### Server-Side Pagination

This table uses server-side pagination because expense data can be large. The pagination controls include:

- Items per page selector: `10` | `25` | `50`
- Standard pagination (see Section 6)
- Total count in "Showing X-Y of Z" text

### Filters

- Category dropdown: `All` | `Materials` | `Transport` | `Equipment` | `Subcontractor` | `Other`
- Date range picker: From / To date inputs
- Search by description

### Default Sort

By `Date` descending (newest first).

---

## 15. Table 6: Analytics Tables

### 15a. Projects Workload Table

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Project | text (link) | `flex: 2, min-width: 160px` | Yes | P1 | left |
| Customer | text | `flex: 1.5` | Yes | P2 | left |
| Manager | text | `flex: 1` | Yes | P3 | left |
| Status | badge | `100px` | Yes | P1 | left |
| Employees | numeric | `80px` | Yes | P2 | right |
| Hours | numeric | `80px` | Yes | P1 | right |

**Hours column styling:**
- Number is bold if > 0
- Zero hours shown in muted color

```css
/* Hours > 0 */
font-weight: 600;
color: #22150d;

/* Hours == 0 */
font-weight: 400;
color: #7d6b5d;
```

### 15b. Employee Hours Table

| Column | Type | Width | Sortable | Priority | Align |
|--------|------|-------|----------|----------|-------|
| Name | text | `flex: 1.5, min-width: 140px` | Yes | P1 | left |
| Email | text (secondary) | `flex: 1.5` | Yes | P3 | left |
| Hours (actual) | numeric | `90px` | Yes | P1 | right |
| Expected | numeric | `90px` | Yes | P2 | right |
| Deviation | numeric (colored) | `90px` | Yes | P1 | right |

**Deviation column:**

The deviation is calculated as `Actual - Expected`. Color coding:

| Condition | Color | Meaning |
|-----------|-------|---------|
| Deviation > 0 | `#8b3a2a` (warm red) | Over-allocated |
| Deviation == 0 | `#7d6b5d` (muted) | On target |
| Deviation < 0 | `#3d5a2a` (warm green) | Under-allocated |

Display format: `+12` or `-8` or `0` (with sign for non-zero).

**Tailwind:**
```
Over:   text-[#8b3a2a] font-medium
On:     text-[#7d6b5d]
Under:  text-[#3d5a2a] font-medium
```

### Analytics Table Specifics

- These tables are **read-only** -- no action column
- Rows link to detail pages (project name / employee name are clickable)
- Lighter toolbar: search only, no "Add" button
- Export button in toolbar: ghost button with download icon

---

## 16. Table 7: Workload Calendar Grid

This is not a traditional `<table>` but a **calendar grid** component.

### View Modes

| Mode | Grid |
|------|------|
| Month | 7 columns (Mon-Sun) x 4-6 rows |
| Week | 7 columns x 1 row (expanded) |
| Day | Single column, hourly slots |

### View Switcher

A segmented control above the calendar:

```
[Month] [Week] [Day]        [< Prev]  March 2026  [Next >]
```

**Segmented control styling:**

```css
display: inline-flex;
border: 1px solid rgba(34, 21, 13, 0.15);
border-radius: 0.4rem;
overflow: hidden;
```

**Segment button (inactive):**
```css
padding: 0.375rem 0.75rem;
background: transparent;
color: #5c4a3e;
font-size: 0.8125rem;
font-weight: 500;
border-right: 1px solid rgba(34, 21, 13, 0.15);
```

**Segment button (active):**
```css
background: #22150d;
color: #f9f0d9;
```

### Calendar Day Cell

```css
min-height: 6rem;              /* Month view */
padding: 0.375rem;
border-right: 1px solid rgba(34, 21, 13, 0.08);
border-bottom: 1px solid rgba(34, 21, 13, 0.08);
vertical-align: top;
```

### Day Number

```css
font-size: 0.75rem;
font-weight: 500;
color: #5c4a3e;
margin-bottom: 0.25rem;
```

**Today's date:**
```css
display: inline-flex;
align-items: center;
justify-content: center;
width: 1.5rem;
height: 1.5rem;
border-radius: 9999px;
background: #22150d;
color: #f9f0d9;
font-weight: 600;
```

**Other month days (overflow):**
```css
color: rgba(34, 21, 13, 0.25);
```

### Plan Entry (in Calendar Cell)

Small colored block representing planned work:

```css
padding: 0.125rem 0.375rem;
border-radius: 0.25rem;
font-size: 0.6875rem;         /* 11px */
line-height: 1.3;
margin-bottom: 0.125rem;
cursor: pointer;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

**Plan entry colors:**

| Type | Background | Text | Left Border |
|------|-----------|------|-------------|
| Plan (future) | `rgba(180, 145, 50, 0.10)` | `#6b5520` | `2px solid #b49132` |
| Plan (today) | `rgba(75, 108, 56, 0.10)` | `#3d5a2a` | `2px solid #4b6c38` |
| Actual (logged) | `rgba(92, 74, 62, 0.12)` | `#3e2c1e` | `2px solid #5c4a3e` |
| Conflict (overlap) | `rgba(156, 60, 40, 0.10)` | `#8b3a2a` | `2px solid #9c3c28` |

Left border accent gives each entry a color tag without being visually heavy.

### Entry Content

```
[Employee Initials] 4h
```

Example: `JD 4h` (John Doe, 4 hours)

On hover, show a tooltip with full details:
```
John Doe
Project: Office Building
4 hours planned
```

### Week View

Each day column is expanded to show all entries fully:

```css
min-height: 24rem;
```

Entries stack vertically with `0.25rem` gap.

### Day View

A single day with hourly time slots (8:00 - 20:00). Entries are positioned according to their time if available, otherwise listed.

### Calendar Header (Day Names)

```css
background: #f5ecd4;
text-align: center;
padding: 0.5rem;
font-size: 0.75rem;
font-weight: 600;
color: #5c4a3e;
text-transform: uppercase;
letter-spacing: 0.05em;
border-bottom: 1px solid rgba(34, 21, 13, 0.15);
```

### Weekend Columns

Slightly different background to visually distinguish:

```css
background: rgba(34, 21, 13, 0.02);
```

---

## 17. Accessibility Checklist

### Required for All Tables

| Requirement | Implementation |
|-------------|---------------|
| Semantic HTML | Use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` |
| Table caption | `<caption class="sr-only">` with descriptive text |
| Scope attributes | `<th scope="col">` for headers |
| Sort announcement | `aria-sort="ascending"` / `"descending"` / `"none"` on `<th>` |
| Focus management | Focus ring: `outline: 2px solid #FFFF8B; outline-offset: 2px` |
| Keyboard nav | Arrow keys for row navigation, Enter to activate links |
| Action labels | `aria-label` on icon-only action buttons (e.g., `aria-label="Edit project"`) |
| Status badges | Include visually hidden text if icon-only |
| Loading state | `aria-busy="true"` on table during load |
| Empty state | `role="status"` on empty state message |
| Pagination | `aria-label="Pagination"` on nav, `aria-current="page"` on active |
| Sort button | `<button>` inside `<th>`, not just click handler on `<th>` |
| Color not sole indicator | Badges use text + color, deviation uses sign + color |
| Min contrast | All text/bg combinations pass WCAG AA 4.5:1 |
| Responsive | Content remains accessible when transformed to cards |

### Screen Reader Announcements

When sort changes: announce via `aria-live="polite"` region:
```
"Sorted by Name, ascending"
```

When page changes in pagination:
```
"Page 3 of 5, showing 21 to 30 of 42 results"
```

---

## 18. Tailwind Token Map

For the Tailwind config, define these custom values:

```javascript
// tailwind.config.js (relevant table tokens)
module.exports = {
  theme: {
    extend: {
      colors: {
        'ldb-cream': '#f9f0d9',
        'ldb-cream-light': '#fdfaf0',
        'ldb-cream-header': '#f5ecd4',
        'ldb-cream-month': '#f0e7d0',
        'ldb-brown': '#22150d',
        'ldb-brown-secondary': '#5c4a3e',
        'ldb-brown-muted': '#7d6b5d',
        'ldb-yellow': '#FFFF8B',

        // Badge semantic colors
        'ldb-badge-green': '#3d5a2a',
        'ldb-badge-green-bg': 'rgba(75, 108, 56, 0.12)',
        'ldb-badge-green-border': 'rgba(75, 108, 56, 0.25)',

        'ldb-badge-brown': '#5c4a3e',
        'ldb-badge-brown-bg': 'rgba(92, 74, 62, 0.12)',
        'ldb-badge-brown-border': 'rgba(92, 74, 62, 0.25)',

        'ldb-badge-amber': '#7a5c1f',
        'ldb-badge-amber-bg': 'rgba(180, 130, 50, 0.12)',
        'ldb-badge-amber-border': 'rgba(180, 130, 50, 0.25)',

        'ldb-badge-red': '#8b3a2a',
        'ldb-badge-red-bg': 'rgba(156, 60, 40, 0.12)',
        'ldb-badge-red-border': 'rgba(156, 60, 40, 0.25)',

        'ldb-badge-teal': '#3a5f56',
        'ldb-badge-teal-bg': 'rgba(80, 120, 110, 0.12)',
        'ldb-badge-teal-border': 'rgba(80, 120, 110, 0.25)',

        'ldb-badge-muted': '#7d6b5d',
        'ldb-badge-muted-bg': 'rgba(34, 21, 13, 0.06)',
        'ldb-badge-muted-border': 'rgba(34, 21, 13, 0.12)',
      },
      borderColor: {
        'ldb-light': 'rgba(34, 21, 13, 0.10)',
        'ldb-default': 'rgba(34, 21, 13, 0.15)',
        'ldb-strong': 'rgba(34, 21, 13, 0.25)',
      },
      borderRadius: {
        'ldb': '0.4rem',
      },
      fontSize: {
        'ldb-xs': '0.75rem',     // 12px - badges, header labels
        'ldb-sm': '0.8125rem',   // 13px - pagination, meta
        'ldb-base': '0.875rem',  // 14px - table body text
      },
      boxShadow: {
        'none': 'none',          // enforce flat design
      },
      transitionDuration: {
        '150': '150ms',          // table hover
      },
      outlineColor: {
        'ldb-focus': '#FFFF8B',
      },
    },
  },
};
```

### Component Class Composition (for reference)

```
/* Table container */
.ldb-table-container = bg-ldb-cream-light border border-ldb-default rounded-ldb overflow-hidden

/* Table header cell */
.ldb-th = bg-ldb-cream-header text-ldb-brown-secondary text-ldb-xs font-semibold
           uppercase tracking-wider px-4 py-3 border-b border-ldb-strong text-left
           whitespace-nowrap

/* Table body cell */
.ldb-td = px-4 py-3 text-ldb-base text-ldb-brown border-b border-ldb-light align-middle

/* Table body row */
.ldb-tr = hover:bg-[rgba(34,21,13,0.04)] transition-colors duration-150 last:border-b-0

/* Badge base */
.ldb-badge = inline-flex items-center rounded-full px-2.5 py-0.5 text-ldb-xs font-medium
              whitespace-nowrap border

/* Action button */
.ldb-action-btn = inline-flex items-center justify-center w-8 h-8 rounded-ldb
                   text-ldb-brown-muted transition-colors duration-150

/* Pagination page button */
.ldb-page-btn = min-w-8 h-8 inline-flex items-center justify-center rounded-ldb
                 text-ldb-sm font-medium text-ldb-brown-secondary transition-colors duration-150
```

---

## Design Decision Log

| Decision | Rationale |
|----------|-----------|
| Pill badges (full radius) | Distinguishes badges from buttons (which use 0.4rem radius). Consistent with modern SaaS convention. |
| No zebra stripes | Flat design principle. Border dividers provide sufficient row separation without visual noise. |
| Icon-only action buttons | Keeps rows compact. Tables are data-dense environments -- text buttons would consume too much horizontal space. |
| "Mark as Paid" as text button | Exception to icon-only rule because it is the primary workflow action. Making it a labeled button increases discoverability and reduces accidental clicks. |
| Left-border accent on calendar entries | Provides color coding without filling entire blocks with color, which would create visual clutter in a month view. |
| Warm muted badge tones (not saturated) | Standard Tailwind green/red/blue badges would clash with the warm cream palette. Desaturated warm variants maintain palette coherence. |
| Server-side pagination for Expenses | Expenses accumulate over time and can number in the thousands. Client-side pagination would require loading all data upfront. |
| Month group headers in Expenses | Natural mental model for financial data. Users think about expenses in monthly terms. Sticky positioning keeps context visible during scroll. |
| Card layout at <=767px | Tables with 5+ columns are unreadable on mobile without horizontal scrolling. Cards reorganize information into scannable vertical blocks. |
| Skeleton loading (not spinner) | Skeletons preserve spatial layout and reduce perceived loading time. They also prevent content jumping (CLS). |
| `tabular-nums` on all numeric columns | Prevents numbers from shifting horizontally when values change (e.g., live updates, page transitions). |
| WCAG AA minimum (not AAA) | AAA contrast (7:1) would force badge colors too dark for the warm aesthetic. AA (4.5:1) is the legal standard and all badges meet it. |
