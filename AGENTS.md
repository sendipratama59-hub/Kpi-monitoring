# Custom Agent Instructions

Whenever you update the UI or features that require adding, modifying, or removing tables or columns in Supabase, you **MUST MUST MUST** also update the `SQL_SCRIPT` constant in `src/components/features/SetupDatabase.tsx` to reflect these database schema changes.

This is critical because the user relies on the "DB Setup" menu (`SetupDatabase` component) to deploy the schema changes to their Supabase instance. If you add a column to a table without adding the corresponding `ALTER TABLE` or `CREATE TABLE` query inside `SQL_SCRIPT`, the application will crash during database queries!

Rule:
- ANY time you modify how a feature interacts with the database (e.g., adding `latitude` and `longitude` to the survey, adding a `foto_toko` field), immediately after completing the feature, edit `src/components/features/SetupDatabase.tsx` and ensure `SQL_SCRIPT` accurately contains the SQL commands to create/migrate those columns.
- For new columns on existing tables, use `ALTER TABLE IF EXISTS table_name ADD COLUMN IF NOT EXISTS column_name data_type;` inside the `SQL_SCRIPT`, so clicking "Execute Query Now" acts as a safe migration.

## Refactoring & Component Size Rule

- **File Size Limits:** NEVER let a single UI component or file grow excessively large (e.g., beyond 400-500 lines) when adding new features or menus.
- **Component Breakdown:** When creating a new menu or heavily expanding an existing one (like `SurveyChannel.tsx`), ALWAYS proactively break it down into smaller, modular, and focused sub-components.
  - *Examples:* Separate out the Tables (e.g., `SurveyTable.tsx`), Forms (e.g., `SurveyForm.tsx`), Export/Share logic, or Modals into their own files.
- **Directory Structure:** Place these related sub-components in a logical directory structure, grouped by feature, like `/src/components/features/SurveyChannel/`.
- **Proactive Refactoring:** This ensures the codebase remains maintainable, scalable, and easy to read for both humans and AI. If a file starts getting too long during a task, stop and refactor it into smaller parts before proceeding.

## Pagination Rule (Server & Local)

- **Supabase Limit:** Supabase by default limits `select()` queries to 1,000 rows.
- **Server-side Fetching:** When fetching data from tables that can grow large (like `database_barang`, `salesman_customer`, `survey_channel`), you **MUST** use a loop with `.range(from, to)` (e.g., `while(hasMore)`) to automatically fetch all records in chunks of 1,000 if the application relies on full client-side filtering and search.
- **Local/Client Pagination:** Always implement client-side local pagination in the UI table (e.g., showing 50 or 100 rows per page with "Prev"/"Next" buttons) to prevent browser rendering lag and make the table readable.
- **DO NOT** assume `.select('*')` will return more than 1,000 rows on its own without `.range()`.

## Global Responsive Design & UI Sizing Rule

- **Mobile-First Layout:** You MUST prioritize mobile layouts. Always use Tailwind breakpoints (`sm:`, `md:`, `lg:`) to adjust content for larger screens. Use `flex-col sm:flex-row` for structural container alignments.
- **Button Groups & Flex Containers:** Any flex container with multiple UI elements (like Buttons, Tabs, or Filters) MUST use `flex-wrap gap-2` (or `gap-4`) to ensure elements wrap cleanly to the next line on smaller screens. Avoid ugly overflow or tightly cramped spacing.
- **Responsive Tables:** EVERY table MUST be wrapped in a `<div className="overflow-x-auto w-full">` wrapper so it can scroll horizontally on mobile devices without breaking the entire page layout.
- **Forms & Grids:** Input grids must reliably collapse on small screens: use `grid grid-cols-1 sm:grid-cols-2 gap-4` rather than assuming a multi-column layout applies globally. 
- **Fluid Sizing:** NEVER use fixed pixel widths (e.g., `w-[600px]`, `min-w-[800px]`) for structural elements or modals. Always use `w-full` combined with max-width classes (e.g., `w-full max-w-2xl`).

## Anti-Destructive Refactoring & File Deletion Rule

- **No Unprompted Deletions:** NEVER delete existing features, menus, or important files unless explicitly commanded by the user.
- **Error Fixing Overrides:** If you encounter persistent build or runtime errors while processing a user's request, DO NOT unilaterally delete entire files, components, or feature blocks as a "quick fix" or to bypass the error.
- **Stop and Ask:** If the only way to resolve a deeply embedded bug or error is to remove or completely rewrite a major feature, you MUST stop execution, explain the situation to the user, and wait for their explicit permission before proceeding.
- **Preserve User Code:** Always prioritize the preservation of functional UI components and previously built logic. Treat existing files as locked unless the user's specific prompt requires editing them.