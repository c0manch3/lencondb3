# LenconDB Frontend -- Functional Specification

> Extracted from the complete source at `frontend/src/` on 2026-03-28.
> This document is the authoritative reference for rebuilding the frontend from scratch.

---

## Table of Contents

1. [Technology Stack & Architecture](#1-technology-stack--architecture)
2. [Auth System](#2-auth-system)
3. [Routing Structure](#3-routing-structure)
4. [Navigation (TopNav)](#4-navigation-topnav)
5. [Page Specifications](#5-page-specifications)
   - 5.1 LoginPage
   - 5.2 AcceptInvitePage
   - 5.3 ResetPasswordPage
   - 5.4 ProjectsPage
   - 5.5 ProjectDetailPage
   - 5.6 WorkloadPage
   - 5.7 EmployeesPage
   - 5.8 CompaniesPage
   - 5.9 AnalyticsPage
   - 5.10 ExpensesPage
   - 5.11 ProfilePage
   - 5.12 SmtpSettingsPage
   - 5.13 NotFoundPage
6. [Role-Based Access Control Matrix](#6-role-based-access-control-matrix)
7. [All API Endpoints](#7-all-api-endpoints)
8. [TypeScript Types & Interfaces](#8-typescript-types--interfaces)
9. [i18n Structure](#9-i18n-structure)
10. [Shared Hooks & Utilities](#10-shared-hooks--utilities)

---

## 1. Technology Stack & Architecture

| Layer | Technology |
|---|---|
| Framework | React 18 (StrictMode) |
| Routing | react-router-dom v6 (BrowserRouter) |
| State | React Context + useReducer (AuthContext) |
| Forms | react-hook-form + zod (LoginPage), manual state elsewhere |
| HTTP | axios (custom `api` instance with interceptors) |
| i18n | i18next + react-i18next + i18next-browser-languagedetector |
| Toasts | react-hot-toast |
| Charts | recharts (BarChart, PieChart, AreaChart) |
| PDF | jsPDF (dynamically imported) |
| Excel | xlsx (sheetjs, dynamically imported) |
| Styling | Tailwind CSS with custom brown/cream/accent palette |
| Animations | GSAP + Lenis smooth scroll (loaded in MainLayout only) |
| Code splitting | React.lazy + Suspense for all page components |

### Application Shell

```
<StrictMode>
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <UnsavedChangesProvider>
          <App />
          <Toaster position="top-right" duration={4000} />
        </UnsavedChangesProvider>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
</StrictMode>
```

### API Base URL

- Configured via `VITE_API_URL` env var
- Fallback: `http://localhost:3000`
- All API calls use prefix `/api`
- Timeout: 30 seconds

---

## 2. Auth System

### Token Management

- **Access token**: stored in `localStorage` key `accessToken`
- **Refresh token**: stored in `localStorage` key `refreshToken`
- On login: both tokens saved; user object dispatched to AuthContext
- On logout: both tokens removed from localStorage; state reset

### AuthContext (useReducer)

Actions:
| Action | Effect |
|---|---|
| `SET_CREDENTIALS` | Sets user + accessToken, saves to localStorage, isAuthenticated = true |
| `SET_USER` | Updates user object only |
| `SET_LOADING` | Sets loading flag |
| `LOGOUT` | Removes both tokens, clears user, isAuthenticated = false |
| `REFRESH_TOKEN` | Updates accessToken only |

State shape:
```ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### Request Interceptor

- Attaches `Authorization: Bearer <accessToken>` header to every request

### Response Interceptor (Token Refresh)

- On 401 response (not from `/auth/login` or `/auth/refresh`):
  1. Reads refreshToken from localStorage
  2. POST `/api/auth/refresh` with `{ refreshToken }`
  3. Saves new accessToken
  4. Retries original request
  5. If refresh fails: clears both tokens, redirects to `/login`
- On timeout: user-friendly message "Request timed out..."
- On network error: message "Unable to connect to server..."

### App Initialization

On mount, if `accessToken` exists in localStorage but `user` is null:
1. POST `/api/auth/check` to validate token
2. If valid: dispatch `SET_CREDENTIALS`
3. If invalid: dispatch `LOGOUT`
4. Shows `<LoadingSpinner>` during initialization

---

## 3. Routing Structure

### Public Routes (no auth required)

| Route | Component | Description |
|---|---|---|
| `/login` | LoginPage | Login form |
| `/invite/:token` | AcceptInvitePage | Accept invitation and set password |
| `/reset-password/:token` | ResetPasswordPage | Reset password via token |

### Protected Routes (auth required, wrapped in `<ProtectedRoute>`)

All nested inside `<MainLayout>` (TopNav + Outlet).

| Route | Component | Allowed Roles | Description |
|---|---|---|---|
| `/` | Redirect to `/projects` | All | Default redirect |
| `/projects` | ProjectsPage | All | Project list |
| `/projects/:id` | ProjectDetailPage | All | Project detail with tabs |
| `/employees` | EmployeesPage | Admin, Manager | Employee list + CRUD |
| `/companies` | CompaniesPage | Admin, Manager | Company list + CRUD |
| `/workload` | WorkloadPage | All | Workload calendar |
| `/analytics` | AnalyticsPage | Admin, Manager, Trial | Analytics dashboards |
| `/expenses` | ExpensesPage | Admin | Expense management |
| `/smtp-settings` | SmtpSettingsPage | Admin | SMTP configuration |
| `/profile` | ProfilePage | All | User profile + change password |

### 404 Route

| Route | Component |
|---|---|
| `*` | NotFoundPage |

### ProtectedRoute Behavior

- If not authenticated: redirects to `/login?redirect=<encodedCurrentPath>`
- `RoleRoute`: if user's role not in `allowedRoles`, redirects to `/projects`

### ScrollToTop

- Resets `window.scrollTo(0, 0)` on every pathname change

---

## 4. Navigation (TopNav)

### Navigation Items

| Key | Path | Icon | Visible To |
|---|---|---|---|
| projects | /projects | folder | All |
| employees | /employees | users | Admin, Manager |
| companies | /companies | building | Admin, Manager |
| workload | /workload | calendar | All |
| analytics | /analytics | bar-chart | Admin, Manager, Trial |
| expenses | /expenses | currency | Admin |
| smtpSettings | /smtp-settings | mail | Admin |

### Overdue Badge

- Displayed on the **expenses** nav item as a red circle with count
- Only visible to Admin users
- Shows number of overdue payments
- Tooltip shows count + total amount in RUB
- Data polled every 5 minutes via `useOverdueBadge` hook
- API: `GET /api/expenses/overdue-summary`

### User Dropdown (Desktop)

- Shows avatar (initials circle) + first name
- Dropdown items:
  - User name + role display
  - "Profile" link to `/profile`
  - "Logout" button (dispatches LOGOUT, navigates to /login)

### Mobile Menu

- Full-screen slide-down overlay on `< lg` breakpoints
- All nav items with same role filtering
- User section at bottom with avatar, name, role, profile link, logout button
- Body scroll locked when open
- Closes on Escape key

### Unsaved Changes Integration

- Navigation clicks go through `attemptNavigation()` -- if a form is dirty, navigation is blocked and a confirmation dialog appears

---

## 5. Page Specifications

### 5.1 LoginPage

**Route:** `/login`
**Permissions:** Public (unauthenticated only)

**Features:**
- Login form with email + password
- ASCII art background decoration
- Redirect after login to `?redirect=` param or `/projects`
- Loading spinner during submission

**Fields & Validation (Zod schema):**

| Field | Type | Validation | i18n Key |
|---|---|---|---|
| email | email | Required, must be valid email | `auth.invalidEmail` |
| password | password | Required, min 6 characters | `auth.passwordMinLength` |

**API Endpoints:**
- `POST /api/auth/login` with `{ email, password }` -> `{ user, accessToken, refreshToken }`

**Post-login:**
1. Dispatch `SET_CREDENTIALS` with user + accessToken
2. Save refreshToken to localStorage
3. Toast success
4. Navigate to redirect URL or `/projects`

**Error handling:** Toast "Invalid credentials" on failure

---

### 5.2 AcceptInvitePage

**Route:** `/invite/:token`
**Permissions:** Public

**Features:**
- Token validation on mount
- Password creation form
- Redirect to login on success

**Flow:**
1. Extract `token` from URL params
2. `GET /api/invite/validate/:token` -- returns `{ valid, firstName, message }`
3. If invalid: show error message
4. If valid: show welcome message with `firstName` and password form

**Fields & Validation (Zod schema):**

| Field | Type | Validation |
|---|---|---|
| password | password | Required, min 8 characters |
| confirmPassword | password | Must match password |

**API Endpoints:**
- `GET /api/invite/validate/:token`
- `POST /api/invite/accept` with `{ token, password }`

**On success:** Toast "Password created. Log in", navigate to `/login`

---

### 5.3 ResetPasswordPage

**Route:** `/reset-password/:token`
**Permissions:** Public

**Features:**
- Identical flow to AcceptInvitePage but for password reset
- Token validation on mount
- Different UI text ("Hello" vs "Welcome", "Reset password" vs "Create password")

**Fields & Validation:** Same as AcceptInvitePage (password min 8, confirmPassword must match)

**API Endpoints:**
- `GET /api/invite/validate/:token`
- `POST /api/invite/reset-password` with `{ token, password }`

**On success:** Toast "Password changed. Log in", navigate to `/login`

---

### 5.4 ProjectsPage

**Route:** `/projects`
**Permissions:** All authenticated users (view). Admin/Manager can create/edit. Only Admin can delete.

**Features:**
- Project list table with sortable columns
- Status filter (All / Active / Completed) -- defaults to **Active**
- Text search (searches name, customer name, manager name)
- Client-side pagination (10 items per page)
- URL-driven state (status, page, sortBy, sortOrder in search params)
- SessionStorage persistence of filter state for back-navigation
- Add project modal (Admin/Manager)
- Edit project modal (Admin can edit any; Manager can edit only their managed projects)
- Delete project modal (Admin only)
- Unsaved changes warning on add form
- Click row -> navigate to `/projects/:id`

**Table Columns:**

| Column | Sortable | Sort Key |
|---|---|---|
| Project Name | Yes | `name` |
| Customer | Yes | `customer` |
| Manager | Yes | `manager` |
| Contract Date | Yes | `contractDate` |
| Status | Yes | `status` |
| Actions | No | -- (Admin/Manager only) |

**Default sort:** `createdAt` descending

**Add Project Modal Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| name | text | Yes | Min 3, max 200 chars |
| customer | select (Customer-type companies) | No | -- |
| manager | select (Manager/Admin users) | Yes | Must select |
| type | select (main/additional) | No | Default "main" |
| mainProjectId | select (main projects) | No | Only shown when type="additional" |
| contractDate | date | Yes | -- |
| expirationDate | date | Yes | Must be after contractDate |
| cost | number | No | Min 0, step 0.01 (in RUB) |

**Edit Project Modal Fields:**

| Field | Type |
|---|---|
| name | text |
| status | select (Active/Completed) |
| contractDate | date |
| expirationDate | date |
| cost | number (optional) |

**Role-Based Behavior:**
- **Admin:** Can add, edit any project, delete any project
- **Manager:** Can add, edit only their managed projects. Cannot delete.
- **Employee/Trial:** View only. No add/edit/delete buttons.

**API Endpoints:**
- `GET /api/project?limit=1000` -- fetch all projects
- `GET /api/company?limit=1000` -- fetch companies for customer dropdown
- `GET /api/auth?limit=1000` -- fetch users for manager dropdown (filtered to Manager/Admin roles)
- `POST /api/project/create` -- create project
- `PATCH /api/project/:id` -- update project
- `DELETE /api/project/:id` -- delete project

---

### 5.5 ProjectDetailPage

**Route:** `/projects/:id`
**Permissions:** All authenticated users (view). Admin/Manager for write operations.

**Features:**
- Breadcrumbs: Home > Projects > {project name}
- 3 tabs: Overview, Payments (count), Workload
- Tab state synced with URL hash (`#overview`, `#payments`, `#workload`)

#### Overview Tab

Displays two cards side by side:

**Project Info Card:**
- Status (badge: Active=green, Completed=gray)
- Type (main/additional)
- Contract date
- Expiration date
- Cost (if set, formatted as RUB currency)

**Customer & Manager Card:**
- Customer name
- Customer type
- Manager name
- Manager email

**Additional sections (conditional):**
- If project has `mainProject`: shows linked main project card (clickable link)
- If project has `additionalProjects[]`: lists linked additional projects with status badges

#### Payments Tab

**Permissions:** Visible to all. Add/delete/mark-paid: Admin/Manager only.

**Features:**
- Payment schedule table
- Add payment modal
- Mark as paid
- Delete payment
- Summary row (project cost, total amount, total percentage)
- Overdue highlighting (red background for overdue rows)

**Table Columns:**

| Column | Content |
|---|---|
| Name | Payment name + description |
| Type | Badge: Advance (brown), MainPayment (purple), FinalPayment (green), Other (gray) |
| Amount | RUB currency + percentage |
| Expected Date | Date, red if overdue; shows actual payment date if paid |
| Status | Badge: Paid (green), Overdue (red), Pending (yellow) |
| Actions | "Mark Paid" (if unpaid) + "Delete" |

**Add Payment Modal Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| type | select (Advance/MainPayment/FinalPayment/Other) | Yes | Default "Advance" |
| name | text | Yes | Not empty |
| amount | number (RUB) | Yes | Must be > 0; total payments cannot exceed project cost |
| expectedDate | date | Yes | -- |
| description | textarea | No | -- |

**Business Logic:**
- Percentage is auto-calculated: `(amount / project.cost) * 100`
- Cannot add payment if project has no cost set
- Total payments cannot exceed project cost
- Overdue = expectedDate < today AND not paid

**API Endpoints:**
- `GET /api/payment-schedule?projectId=:id&limit=1000`
- `POST /api/payment-schedule/create`
- `PATCH /api/payment-schedule/:id/mark-paid`
- `DELETE /api/payment-schedule/:id`

#### Workload Tab

**Permissions:** Admin, Manager, Trial (canViewWorkload)

**Features:**
- Shows all employees who logged actual hours against this project
- Table with employee name, email, total hours, reports count, "View Reports" button
- Summary: total employees + total hours
- Employee reports modal: list of individual daily reports with date, hours, description, day notes, total day hours

**API Endpoints:**
- `GET /api/project/:id/workload/employees`
- Response: `{ projectId, projectName, totalProjectHours, employeeCount, employeeWorkload[] }`

#### Team Management (Overview Tab, loaded when tab="overview")

**Permissions:** Admin/Manager

**Features:**
- Team member list (name, email, phone, role, remove button)
- Add team member dropdown (available users not yet on team)
- Remove team member

**API Endpoints:**
- `GET /api/project/:id/users` -- team members
- `GET /api/project/:id/available-users` -- users not on team
- `POST /api/project/:id/users/:userId` -- add member
- `DELETE /api/project/:id/users/:userId` -- remove member

---

### 5.6 WorkloadPage

**Route:** `/workload`
**Permissions:** All authenticated users

**Features:**
- Calendar with 3 view modes: Day (mobile), Week (tablet), Month (desktop)
- Responsive: auto-selects view based on screen width (<640=day, <1024=week, else month)
- Manual view mode override available
- Touch/swipe navigation on mobile
- Project and employee filter dropdowns
- Plan CRUD (add/edit/delete workload plans)
- Actual hours logging with project distribution
- Export (CSV, XLSX, PDF)

#### Calendar Navigation

- Month view: prev/next month, "Today" button
- Week view: prev/next week, "This Week" button
- Day view: prev/next day, "Today" button
- All views: swipe left/right on touch devices

#### Filters

| Filter | Available To | Description |
|---|---|---|
| Project | All | Filters plans/actuals by project. Managers see only managed projects; Admins see all |
| Employee | Admin, Manager | Filters by specific employee. Employees always see only their own data |

#### Workload Plan CRUD

**Add Plan Modal Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| date | text (readonly) | -- | Pre-filled, disabled |
| employee | select | Yes (managers only) | Employees auto-assigned to self |
| project | select | Yes | Pre-filled if project filter active |
| hours | number | No | 0-24, step 0.5 |

**Edit Plan Modal Fields:**

| Field | Type | Required |
|---|---|---|
| date | text (readonly) | -- |
| employee | text (readonly) | -- |
| project | select | Yes |
| hours | number | No |

**Plan Date Rules:**
- Can only ADD plans for today or future dates
- Can only EDIT plans for today or future dates
- Can only DELETE plans for today or future dates
- Past dates: read-only

**Plan Permission Rules:**
- **Admin:** Can create/edit/delete any plan
- **Manager:** Can create plans for any employee on managed projects; can edit/delete only plans they created
- **Employee:** Can create plans for themselves; can edit/delete only plans they created

**API Endpoints:**
- `GET /api/workload-plan/calendar?startDate=&endDate=&projectId=&userId=`
- `POST /api/workload-plan/create` with `{ userId, projectId, date, hours? }`
- `PATCH /api/workload-plan/:id` with `{ projectId, hours }`
- `DELETE /api/workload-plan/:id`

#### Log Actual Hours Modal

**Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| date | text (readonly) | -- | Pre-filled |
| totalHours | number | Yes | > 0, <= 24 |
| notes | textarea | No | Free text |
| distributions[] | repeatable group | No | -- |

Each distribution:

| Field | Type | Required |
|---|---|---|
| projectId | select | Yes (if row exists) |
| hours | number | Yes (if row exists) |
| description | text | No |

**Validation:**
- Total hours must be > 0 and <= 24
- Sum of distribution hours cannot exceed total hours
- Can only log for today or past dates (not future)

**API Endpoints:**
- `POST /api/workload-actual/create` with `{ date, hoursWorked, userText?, distributions[]? }`
- `GET /api/workload-actual/my?startDate=&endDate=` -- current user's actuals
- `GET /api/workload-actual?userId=&startDate=&endDate=&limit=` -- paginated actuals (manager view)

#### View Actual Modal

Displays a read-only view of an actual hours entry:
- Date, total hours worked, user notes
- Distributions list: project name, hours, description

#### Date Employees Modal

Shows all employees with work on a specific date (when viewing "All Employees" mode):
- Lists plan entries or actual entries depending on whether the date is past/future
- Managers can edit/delete plans from this modal

#### Export Modal (Admin/Manager only)

**Fields:**

| Field | Type | Options |
|---|---|---|
| employee | select | All employees (Employees + Managers) |
| type | select | Plan / Actual |
| dateFrom | date | Default: first day of current month |
| dateTo | date | Default: last day of current month |
| format | select | CSV / XLSX / PDF |

**Export behavior:**
- Fetches data from API: `GET /api/workload-plan?startDate=&endDate=&userId=&limit=10000` or `GET /api/workload-actual?...`
- Generates file client-side using jsPDF (PDF), xlsx library (XLSX), or Blob (CSV)
- CSV includes BOM for Excel compatibility, uses tab delimiter, escapes CSV injection
- Downloads file with name pattern: `workload-{type}-{dateFrom}-to-{dateTo}.{ext}`

---

### 5.7 EmployeesPage

**Route:** `/employees`
**Permissions:** Admin, Manager

**Features:**
- Employee list table
- Click row -> detail modal
- Invite new employee (Admin only)
- Edit employee (Admin only, from detail modal)
- Delete employee (Admin only)
- Resend invite / copy invite link / initiate password reset (Admin only, from detail modal)

**Table Columns:**

| Column | Content |
|---|---|
| Name | Avatar (initials) + full name |
| Email | Email address |
| Phone | Phone number |
| Role | Badge: Admin (purple), Manager (brown), Employee (green), Trial (gray) |
| Status | Badge: Active (green) / Pending (amber) -- Admin only column |
| Actions | Delete button -- Admin only column |

**Detail Modal:**
- Displays: name, email, phone, role, salary (if set, RUB), Telegram ID, date of birth
- Action buttons (Admin only, for Pending status users):
  - "Resend Invite" -- `POST /api/invite/resend/:userId`
  - "Copy Invite Link" -- same endpoint, copies URL to clipboard
- Action button (Admin only, for Active users):
  - "Reset Password" -- `POST /api/invite/initiate-reset/:userId`
- "Edit" button -> opens edit modal
- Cannot delete yourself (button disabled when `employee.id === user.id`)

**Invite (Create) Modal Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| firstName | text | Yes | Not empty |
| lastName | text | Yes | Not empty |
| email | email | Yes | Valid email (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) |
| phone | text | No | If provided: numeric with optional + prefix, 7-15 digits |
| role | select | Yes | Admin / Manager / Employee / Trial. Default: Employee |
| salary | number | No | -- |

**API Endpoints:**
- `GET /api/auth?limit=1000` -- fetch all users
- `POST /api/invite/create` -- create user + send invite
  - Request: `{ firstName, lastName, email, phone?, role, salary? }`
  - Response: `{ emailSent: boolean, inviteUrl?: string }`
  - If `emailSent=false`: copies inviteUrl to clipboard
- `POST /api/invite/resend/:userId` -- resend invite
- `POST /api/invite/initiate-reset/:userId` -- password reset
- `PATCH /api/auth/:userId` -- update employee
- `DELETE /api/auth/:userId` -- delete employee

**Edit Employee Modal Fields:**

| Field | Type | Required |
|---|---|---|
| firstName | text | Yes |
| lastName | text | Yes |
| phone | text | No |
| role | select | Yes |
| salary | number | No |
| telegramId | text | No |
| dateBirth | date | No |

**Role-Based Behavior:**
- **Admin:** Full CRUD, invite, resend, reset password, change roles
- **Manager:** View only (list + detail modal). No invite/edit/delete buttons.

---

### 5.8 CompaniesPage

**Route:** `/companies`
**Permissions:** Admin, Manager

**Features:**
- Company list table
- Text search (by name, email, contact person)
- Click row -> detail modal
- Add company (Admin only)
- Edit company (Admin only, from detail modal)
- Delete company (Admin only, from detail modal)

**Table Columns:**

| Column | Content |
|---|---|
| Company Name | Bold text |
| Type | Badge: Customer (brown) / Contractor (orange) |
| Contact Person | Text or "-" |
| Email | Text or "-" |
| Phone | Text or "-" |

**Detail Modal:**
- Displays: name, type badge, contact person, email, phone, address, postal code
- Action buttons (Admin only): Edit, Delete, Close

**Add Company Modal Fields:**

| Field | Type | Required |
|---|---|---|
| name | text | Yes (not empty) |
| type | select (Customer/Contractor) | Yes, default "Customer" |
| contactPerson | text | No |
| email | email | No |
| phone | text | No |
| address | text | No |

**Edit Company Modal Fields:**
Same as add, plus `postalCode` field.

**API Endpoints:**
- `GET /api/company?limit=1000`
- `POST /api/company/create`
- `PATCH /api/company/:id`
- `DELETE /api/company/:id`

**Note:** `contactPerson` is displayed in UI but the create API does not persist it. Only name, type, address, phone, email are sent.

**Role-Based Behavior:**
- **Admin:** Full CRUD
- **Manager:** View only (list + detail modal). No add/edit/delete buttons.

---

### 5.9 AnalyticsPage

**Route:** `/analytics`
**Permissions:** Admin, Manager, Trial

**Features:**
- 3 tabs: Projects Workload, Employee Hours, Finance
- Date range picker with "Apply" button (projects/employees tabs)
- Comparison mode toggle
- Project status filter (All/Active/Completed, default Active)
- PDF export (projects + employees tabs)
- Employee reports drill-down modal
- Session storage persistence for date ranges

#### Projects Workload Tab

**Summary Cards:**
- Total Projects, Active Projects, Completed Projects, Total Hours Worked

**Table Columns:**
- Project name, Customer, Manager, Status badge, Team size, Planned days, Actual hours, Progress %
- Comparison column (if enabled): shows delta values

**Project Status Filter:** All / Active (default) / Completed

#### Employee Hours Tab

**Period Info:**
- Working days, expected hours per employee

**Summary Cards:**
- Total Employees, Average Hours Worked, Underworking count, Overworking count

**Table Columns:**
- Employee name, email, Hours Worked, Expected Hours, Deviation (hours + percentage), Deviation status badge
- Click "View Reports" -> opens modal

**Employee Reports Modal:**
- Fetches actual workload entries for selected employee within date range
- Shows: date, total hours, user notes, distributions (project, hours, description)

#### Finance Tab

Separate component (`FinanceTab`) with its own date range.

**Features:**
- Own date picker (default: 3 months back to today)
- Session storage persistence
- 4 summary cards: Total Income, Total Expenses, VAT, Balance
- 3 charts:
  - Monthly Income/Expenses Bar Chart (recharts `BarChart`)
  - Expense by Category Pie Chart (recharts `PieChart`)
  - Cumulative Balance Area Chart (recharts `AreaChart`)
- Income by Project table
- Expenses by Category table

**API Endpoints:**
- `GET /api/analytics/projects-workload?compareDate=`
- `GET /api/analytics/employee-work-hours?startDate=&endDate=&compareDate=`
- `GET /api/workload-actual?userId=&startDate=&endDate=&limit=1000` -- for employee reports
- `GET /api/analytics/finance/summary?startDate=&endDate=`
- `GET /api/analytics/finance/monthly?startDate=&endDate=`
- `GET /api/analytics/finance/expenses-by-category?startDate=&endDate=`
- `GET /api/analytics/finance/income-by-project?startDate=&endDate=`

**PDF Export:**
- jsPDF generated client-side
- Contains: title, date range, summary stats, projects table (top 15), employees table
- Filename: `analytics-report-{startDate}-to-{endDate}.pdf`

---

### 5.10 ExpensesPage

**Route:** `/expenses`
**Permissions:** Admin only

**Features:**
- Expense list grouped by month
- Server-side pagination (25 items per page)
- Filters: category, date range (with "Apply"/"Reset" buttons)
- Add/Edit/Delete expense modals
- Import from Excel (`.xlsx`)
- Export to Excel (`.xlsx`)
- Overdue payments banner (dismissible per session)

**Overdue Banner:**
- Shows count + total amount of overdue payments
- Lists projects with overdue amounts
- Links to project detail payment tab
- Dismissible (persisted in sessionStorage)
- Data from `useOverdueBadge` hook

**Table Structure:**
- Grouped by month with month header + subtotal
- Columns: Date, Amount (RUB), VAT (RUB), Category badge, Description, Created By, Actions (Edit/Delete)

**Expense Categories:**
```
Salary, IncomeTax, InsuranceContrib, SocialInsurance,
SimplifiedTax, VAT, Penalty, IndividualTax,
Rent, Services, Other
```

**Add/Edit Expense Form Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| date | date | Yes | Default: today (for add) |
| amount | number | Yes | Must be > 0 |
| vatAmount | number | No | >= 0 |
| category | select (all categories) | Yes | Default "Salary" |
| description | text | No | -- |

**Import:**
- File upload (accepts `.xlsx`)
- `POST /api/expenses/import` with `multipart/form-data`
- Response: `{ imported: number, errors: { row: number, message: string }[] }`
- Shows success count and error count separately

**Export:**
- `GET /api/expenses/export/excel` with current filter params
- Returns blob, downloaded as `expenses_{date}.xlsx`

**Pagination:**
- Server-driven: `{ data, total, page, limit, totalPages }`
- Max 5 visible page buttons with prev/next

**API Endpoints:**
- `GET /api/expenses?page=&limit=25&category=&startDate=&endDate=`
- `POST /api/expenses/create`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `POST /api/expenses/import` (multipart)
- `GET /api/expenses/export/excel?category=&startDate=&endDate=`
- `GET /api/expenses/overdue-summary` (for banner)

---

### 5.11 ProfilePage

**Route:** `/profile`
**Permissions:** All authenticated users

**Features:**
- Display user info (read-only): name, email, phone, role
- Change password section (expandable)

**Change Password Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| currentPassword | password | Yes | -- |
| newPassword | password | Yes | Min 8 characters |
| confirmPassword | password | Yes | Must match newPassword |

**Change Password Flow:**
1. Validate client-side (min 8 chars, passwords match)
2. `PATCH /api/auth/change-password` with `{ currentPassword, newPassword }`
3. On success: toast, clear form, close section
4. After 1.5 seconds: dispatch LOGOUT, navigate to `/login`

**API Endpoints:**
- `PATCH /api/auth/change-password`

---

### 5.12 SmtpSettingsPage

**Route:** `/smtp-settings`
**Permissions:** Admin only

**Features:**
- View current SMTP config (display mode)
- Edit SMTP config (edit mode)
- Create new config if none exists (starts in edit mode)
- Send test email
- Delete SMTP config

**View Mode Fields:**
- Host, Port, SSL/TLS (Yes/No), Username, Password (masked), From Email, From Name

**Edit Mode Fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| host | text | Yes | Not empty |
| port | number | Yes | 1-65535 |
| secure | checkbox | No | Default true |
| username | text | Yes | Not empty |
| password | password | Yes (new config) / No (edit) | Empty = keep current on edit |
| fromEmail | email | Yes | Valid email regex |
| fromName | text | No | Default "LenconDB" |

**API Endpoints:**
- `GET /api/smtp/config` -- get current config (returns null if none)
- `POST /api/smtp/config` -- create or update config
- `DELETE /api/smtp/config/:id` -- delete config
- `POST /api/smtp/test` -- send test email to current user

**Delete Warning:** "Email sending will be disabled. Invitations and password resets will only work via link copying."

---

### 5.13 NotFoundPage

**Route:** `*` (catch-all)
**Permissions:** Public

**Features:**
- Large "404" display
- Error message text
- "Go Home" link to `/`

---

## 6. Role-Based Access Control Matrix

| Feature | Admin | Manager | Employee | Trial |
|---|---|---|---|---|
| **Projects - View list** | All | All | All | All |
| **Projects - Add** | Yes | Yes | No | No |
| **Projects - Edit** | Any | Own managed only | No | No |
| **Projects - Delete** | Yes | No | No | No |
| **Project Detail - View** | Yes | Yes | Yes | Yes |
| **Project Payments - View** | Yes | Yes | Yes | Yes |
| **Project Payments - Manage** | Yes | Yes | No | No |
| **Project Workload Tab** | Yes | Yes | No | Yes |
| **Project Team - Manage** | Yes | Yes | No | No |
| **Employees - Page access** | Yes | Yes | No | No |
| **Employees - Invite/Edit/Delete** | Yes | No | No | No |
| **Companies - Page access** | Yes | Yes | No | No |
| **Companies - Add/Edit/Delete** | Yes | No | No | No |
| **Workload - View** | All (own) | All | Own only | -- |
| **Workload - Add plan** | Any employee | Any employee (managed projects) | Self only | No |
| **Workload - Edit/Delete plan** | Any | Own created only | Own created only | No |
| **Workload - Log actual hours** | Yes | Yes | Yes | No |
| **Workload - Export** | Yes | Yes | No | No |
| **Analytics - Page access** | Yes | Yes | No | Yes |
| **Expenses - Page access** | Yes | No | No | No |
| **SMTP Settings - Page access** | Yes | No | No | No |
| **Profile - View/Change password** | Yes | Yes | Yes | Yes |
| **Overdue badge (nav)** | Yes | No | No | No |

---

## 7. All API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/register` | Register new user (unused in UI) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/check` | Validate current token, return user |
| PATCH | `/api/auth/change-password` | Change password |
| GET | `/api/auth?limit=1000` | List all users (paginated) |
| PATCH | `/api/auth/:id` | Update user |
| DELETE | `/api/auth/:id` | Delete user |

### Invite

| Method | Path | Description |
|---|---|---|
| GET | `/api/invite/validate/:token` | Validate invite/reset token |
| POST | `/api/invite/accept` | Accept invite (set password) |
| POST | `/api/invite/reset-password` | Reset password via token |
| POST | `/api/invite/create` | Create user + send invite |
| POST | `/api/invite/resend/:userId` | Resend invite |
| POST | `/api/invite/initiate-reset/:userId` | Initiate password reset |

### Projects

| Method | Path | Description |
|---|---|---|
| GET | `/api/project?limit=1000` | List all projects |
| GET | `/api/project/:id` | Get single project |
| POST | `/api/project/create` | Create project |
| PATCH | `/api/project/:id` | Update project |
| DELETE | `/api/project/:id` | Delete project |
| GET | `/api/project/:id/users` | Get project team members |
| GET | `/api/project/:id/available-users` | Get users not on team |
| POST | `/api/project/:id/users/:userId` | Add team member |
| DELETE | `/api/project/:id/users/:userId` | Remove team member |
| GET | `/api/project/:id/workload/employees` | Get project workload by employee |

### Companies

| Method | Path | Description |
|---|---|---|
| GET | `/api/company?limit=1000` | List all companies |
| POST | `/api/company/create` | Create company |
| PATCH | `/api/company/:id` | Update company |
| DELETE | `/api/company/:id` | Delete company |

### Payment Schedule

| Method | Path | Description |
|---|---|---|
| GET | `/api/payment-schedule?projectId=&limit=1000` | List payments for project |
| POST | `/api/payment-schedule/create` | Create payment |
| PATCH | `/api/payment-schedule/:id/mark-paid` | Mark payment as paid |
| DELETE | `/api/payment-schedule/:id` | Delete payment |

### Workload Plan

| Method | Path | Description |
|---|---|---|
| GET | `/api/workload-plan/calendar?startDate=&endDate=&projectId=&userId=` | Calendar data |
| GET | `/api/workload-plan?startDate=&endDate=&userId=&limit=` | Paginated list (export) |
| POST | `/api/workload-plan/create` | Create plan |
| PATCH | `/api/workload-plan/:id` | Update plan |
| DELETE | `/api/workload-plan/:id` | Delete plan |

### Workload Actual

| Method | Path | Description |
|---|---|---|
| GET | `/api/workload-actual/my?startDate=&endDate=` | Current user's actuals |
| GET | `/api/workload-actual?userId=&startDate=&endDate=&limit=` | Paginated actuals |
| POST | `/api/workload-actual/create` | Log actual hours |

### Expenses

| Method | Path | Description |
|---|---|---|
| GET | `/api/expenses?page=&limit=&category=&startDate=&endDate=` | List expenses (paginated) |
| POST | `/api/expenses/create` | Create expense |
| PATCH | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| POST | `/api/expenses/import` | Import from Excel (multipart) |
| GET | `/api/expenses/export/excel?category=&startDate=&endDate=` | Export to Excel |
| GET | `/api/expenses/overdue-summary` | Overdue payments summary |

### Analytics

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/projects-workload?compareDate=` | Projects workload data |
| GET | `/api/analytics/employee-work-hours?startDate=&endDate=&compareDate=` | Employee hours data |
| GET | `/api/analytics/finance/summary?startDate=&endDate=` | Finance summary |
| GET | `/api/analytics/finance/monthly?startDate=&endDate=` | Monthly dynamics |
| GET | `/api/analytics/finance/expenses-by-category?startDate=&endDate=` | Expenses breakdown |
| GET | `/api/analytics/finance/income-by-project?startDate=&endDate=` | Income by project |

### SMTP

| Method | Path | Description |
|---|---|---|
| GET | `/api/smtp/config` | Get SMTP config |
| POST | `/api/smtp/config` | Create/update config |
| DELETE | `/api/smtp/config/:id` | Delete config |
| POST | `/api/smtp/test` | Send test email |

---

## 8. TypeScript Types & Interfaces

### Core Types (from `types/index.ts`)

```ts
type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Trial';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  telegramId?: string;
  salary?: number;
  dateBirth?: string;
  createdAt: string;
  updatedAt: string;
}

type CompanyType = 'Customer' | 'Contractor';

interface Company {
  id: string;
  name: string;
  type: CompanyType;
  address?: string;
  phone?: string;
  email?: string;
  account?: string;
  bank?: string;
  bik?: string;
  corrAccount?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  postalCode?: string;
  createdAt: string;
  updatedAt: string;
}

type ProjectType = 'main' | 'additional';
type ProjectStatus = 'Active' | 'Completed';

interface Project {
  id: string;
  name: string;
  contractDate: string;
  expirationDate: string;
  type: ProjectType;
  status: ProjectStatus;
  customerId: string;
  managerId: string;
  mainProjectId?: string;
  customer?: Company;
  manager?: User;
  mainProject?: Project;
  createdAt: string;
  updatedAt: string;
}

interface WorkloadPlan {
  id: string;
  userId: string;
  projectId: string;
  managerId: string;
  date: string;
  hours?: number | null;
  user?: User;
  project?: Project;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

interface ProjectWorkloadDistribution {
  id: string;
  workloadActualId: string;
  projectId: string;
  hours: number;
  description?: string;
  project?: Project;
}

interface WorkloadActual {
  id: string;
  userId: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  user?: User;
  distributions?: ProjectWorkloadDistribution[];
  createdAt: string;
  updatedAt: string;
}

type PaymentType = 'Advance' | 'MainPayment' | 'FinalPayment' | 'Other';

interface PaymentSchedule {
  id: string;
  projectId: string;
  type: PaymentType;
  name: string;
  amount: number;
  percentage?: number;
  expectedDate: string;
  actualDate?: string;
  isPaid: boolean;
  description?: string;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

type ExpenseCategory =
  | 'Salary' | 'IncomeTax' | 'InsuranceContrib' | 'SocialInsurance'
  | 'SimplifiedTax' | 'VAT' | 'Penalty' | 'IndividualTax'
  | 'Rent' | 'Services' | 'Other';

interface Expense {
  id: string;
  date: string;
  amount: number;
  vatAmount: number | null;
  category: ExpenseCategory;
  description: string | null;
  deletedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { firstName: string; lastName: string };
}

interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  totalVat: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

interface MonthlyDynamicsItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  cumulativeBalance: number;
}

interface ExpenseByCategoryItem {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

interface IncomeByProjectItem {
  projectId: string;
  projectName: string;
  total: number;
  paymentsCount: number;
}
```

### Workload View Types (from `components/workload/types.ts`)

```ts
interface WorkloadPlanEntry {
  id: string;
  user: { id: string; firstName: string; lastName: string };
  project: { id: string; name: string };
  manager: { id: string; firstName: string; lastName: string };
  hours?: number | null;
}

interface WorkloadActualEntry {
  id: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  distributions?: {
    id: string;
    projectId: string;
    project: { id: string; name: string };
    hours: number;
    description?: string;
  }[];
}

interface WorkloadActualEntryWithUser extends WorkloadActualEntry {
  user: { id: string; firstName: string; lastName: string };
}

type CalendarData = Record<string, WorkloadPlanEntry[]>;
type ActualCalendarData = Record<string, WorkloadActualEntry>;
type AllEmployeesActualData = Record<string, WorkloadActualEntryWithUser[]>;

interface ActualDistribution {
  projectId: string;
  hours: string;
  description: string;
}

type ViewMode = 'day' | 'week' | 'month';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}
```

### Auth Context Types (from `store/AuthContext.tsx`)

```ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_CREDENTIALS'; payload: { user: User; accessToken: string } }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: string };
```

---

## 9. i18n Structure

### Configuration

- Default language: `ru` (Russian)
- Fallback language: `ru`
- Languages: `en`, `ru`
- Detection: i18next-browser-languagedetector
- Interpolation: escapeValue disabled (React handles XSS)

### Translation Files

```
src/i18n/locales/
  en/translation.json
  ru/translation.json
```

### Key Namespaces (inferred from usage)

| Namespace | Example Keys |
|---|---|
| `auth.*` | loginSubtitle, email, password, passwordPlaceholder, passwordMinLength, invalidEmail, loginButton, signingIn, loginSuccess, invalidCredentials, logout |
| `navigation.*` | projects, employees, companies, workload, analytics, expenses, smtpSettings, profile, main, closeMenu, menu |
| `projects.*` | title, addProject, editProject, deleteProject, newProject, createProject, projectName, customer, manager, contractDate, expirationDate, projectType, mainProjectType, additionalProjectType, active, completed, searchProjects, filterByStatus, showingProjects, fillRequiredFields, createSuccess, updateSuccess, deleteSuccess, loadError, createError, updateError, deleteError, deleteConfirmMessage, deleteConfirmWarning, unsavedChanges, unsavedChangesLeaveMessage, unsavedChangesCloseMessage, overview, information, customerAndManager, mainProject, additionalProjects, notFound, backToProjects |
| `payments.*` | title, schedule, add, addPayment, name, type, amount, expectedDate, status, paid, overdue, pending, markPaid, paymentType, paymentName, description, totalAmount, totalPercentage, projectCost, noPayments, loadError, addSuccess, addError, deleteSuccess, deleteError, markPaidSuccess, markPaidError, deleteConfirm, nameRequired, amountRequired, amountPositive, expectedDateRequired, types.advance, types.mainpayment, types.finalpayment, types.other |
| `workload.*` | title, addPlanned, editPlanned, logHours, date, employee, project, hours, planHours, notes, totalHours, selectEmployee, selectProject, selectProjectRequired, futureDatesOnly, cannotDeletePast, cannotEditPast, cannotLogFutureHours, workloadSaved, workloadDeleted, createFailed, updateFailed, deleteFailed, logHoursFailed, hoursLoggedSuccess, distributeToProjects, addProject, hoursPlaceholder, notesPlaceholder, descriptionOptional, enterHoursRequired, hoursPositiveRequired, hoursExceed24, distributionExceedsTotal, exportTypePlan, exportTypeActual, exportPeriod, exportSuccess, exportNoData, projectWorkload, totalProjectHours, reportsByEmployee, viewReports, reports, dayNotes, totalDayHours, totalHoursOnProject, reportEntries, noReportsYet, employeesCanLog, onlyManagerCanEdit, onlyManagerCanDelete, allEmployeesAssigned, noManagedProjects, selectEmployeeAndProject |
| `employees.*` | title, email, phone, role, roleAdmin, roleManager, roleEmployee, roleTrial, employeeUpdated, employeeDeleted, noEmployees |
| `companies.*` | title, addCompany, editCompany, deleteCompany, companyName, type, customer, contractor, contactPerson, email, phone, address, postalCode, searchCompanies, companyDetails, createCompany, companyCreated, companyUpdated, companyDeleted, loadError, createError, updateError, deleteError, nameRequired, confirmDelete, noCompanies, noSearchResults |
| `analytics.*` | title, loadError, loadReportsError, noDataToExport, exportPdf, pdfExportSuccess, pdfReportTitle, reportGenerated, period, summary, totalProjects, activeProjects, completedProjects, totalEmployees, averageHoursPerEmployee, projectWorkload, employeeHours, project, status, team, hours, progress, employee, hoursWorked, expected, deviation |
| `expenses.*` | loadError, fillRequiredFields, date, expenseCreated, expenseUpdated, expenseDeleted, createError, updateError, deleteError, importSuccess, importErrors, importError, exportError, pageOf, categories.Salary, categories.IncomeTax, etc. |
| `finance.*` | startDate, endDate, loadError, invalidDateRange, overdueTooltip |
| `profile.*` | title, name, email, phone, role, security, changePassword, currentPassword, newPassword, confirmPassword, enterCurrentPassword, enterNewPassword, confirmNewPassword, updatePassword, passwordChanged, passwordChangeFailed, passwordMinLength, passwordMismatch |
| `common.*` | loading, status, actions, name, edit, delete, save, cancel, close, create, creating, saving, deleting, all, previous, next, reset, remove, optional, na, notSet, error, home, export, saveChanges, actionCannotBeUndone, fixFormErrors |
| `errors.*` | somethingWentWrong, pageNotFound, pageNotFoundMessage, goHome |
| `validation.*` | required, email, phone |

---

## 10. Shared Hooks & Utilities

### useOverdueBadge

- **File:** `hooks/useOverdueBadge.ts`
- **Used by:** TopNav (badge on expenses link), ExpensesPage (banner)
- **Behavior:** Polls `GET /api/expenses/overdue-summary` every 5 minutes for Admin users only
- **Returns:** `{ count: number, totalAmount: number, projects: OverdueProject[] }`

### useUnsavedChangesWarning

- **File:** `hooks/useUnsavedChangesWarning.tsx`
- **Provider:** `UnsavedChangesProvider` (wraps entire app)
- **Used by:** ProjectsPage (add form), TopNav (nav clicks)
- **Features:**
  - Tracks `isDirty` boolean
  - `attemptNavigation(path)`: returns false and shows dialog if dirty
  - `beforeunload` event listener for browser close/refresh
  - Auto-resets dirty state on pathname change

### UnsavedChangesDialog

- **File:** `components/common/UnsavedChangesDialog.tsx`
- **Props:** `isOpen`, `onConfirm`, `onCancel`, `title`, `message`

### useSmoothScroll

- **File:** `hooks/useSmoothScroll.ts`
- **Used by:** MainLayout only
- **Purpose:** GSAP/Lenis smooth scrolling on authenticated pages

### useScrollReveal

- **File:** `hooks/useScrollReveal.ts`
- **Used by:** MainLayout only
- **Purpose:** GSAP scroll-triggered reveal animations

### ErrorBoundary

- **File:** `components/ErrorBoundary.tsx`
- **Wraps:** Entire application
- **Purpose:** Catches React rendering errors

### AsciiBackground

- **File:** `components/AsciiBackground.tsx`
- **Used by:** LoginPage only
- **Purpose:** Decorative ASCII art background layer

### Date Utility Functions (workload/types.ts)

| Function | Description |
|---|---|
| `isFutureDate(date)` | Returns true if date >= today |
| `isFutureDateString(dateStr)` | String variant |
| `isTodayOrPast(date)` | Returns true if date <= today |
| `isTodayOrPastString(dateStr)` | String variant |
| `isToday(date)` | Returns true if date is exactly today |
| `isPastDate(date)` | Returns true if date < today |
| `isPastDateString(dateStr)` | String variant |
| `formatDateKey(date)` | Formats Date to "YYYY-MM-DD" string |

---

## End of Specification
