# Coding Conventions

**Analysis Date:** 2026-05-09

## Naming Patterns

**Files:**
- Components: PascalCase in `src/components/` directory (e.g., `JournalForm.tsx`, `EntityForm.tsx`, `TrialBalance.tsx`)
- Utility files: camelCase (e.g., `utils.ts`, `constants.ts`, `types.ts`)
- Index file: standard `main.tsx` for entry point

**Functions:**
- React components: PascalCase (e.g., `EntityCard`, `JournalForm`, `StatCard`)
- Regular functions: camelCase (e.g., `handleSaveEntry`, `addLine`, `validateForm`, `updateLine`)
- Event handlers: `handle*` prefix (e.g., `handleSubmit`, `handleChange`, `handleBulkArchive`, `handleUpdateEntity`)

**Variables:**
- State variables: camelCase (e.g., `isSelected`, `formData`, `activeEntityId`, `showNewJournal`)
- Boolean variables: prefix with `is`, `has`, or `show` (e.g., `isBalanced`, `isEdit`, `isSidebarOpen`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_ENTITIES`, `CHART_OF_ACCOUNTS`)
- Style classes: use CSS variable names with dashes (e.g., `--bg`, `--ink`, `--line`, `--line-strong`)

**Types:**
- Interfaces: PascalCase with `I` prefix not used; simple names (e.g., `Entity`, `Account`, `JournalEntry`, `JournalFormProps`)
- Type unions: descriptive names (e.g., `AccountType`, `View`)
- Export interfaces with explicit `export interface` keyword

## Code Style

**Formatting:**
- Uses Tailwind CSS for styling exclusively
- Line length: practical maximum ~100-120 characters
- CSS custom properties for theme colors: `var(--bg)`, `var(--ink)`, `var(--line)`
- Font families defined in CSS theme: `--font-sans` (Inter) and `--font-mono` (JetBrains Mono)

**Linting:**
- ESLint is configured but only used for type-checking via `tsc --noEmit`
- No explicit Prettier config found; formatting follows TypeScript conventions
- TypeScript version: ~5.8.2 with strict mode enabled

**Key TypeScript Settings:**
```
target: ES2022
module: ESNext
jsx: react-jsx
skipLibCheck: true
isolatedModules: true
experimentalDecorators: true
paths: { "@/*": ["./*"] }  // Root alias for imports
```

## Import Organization

**Order:**
1. React and React hooks at top (e.g., `import React, { useState, useEffect }`)
2. Third-party libraries (lucide-react icons, motion, recharts)
3. Local type imports (`import { JournalEntry, Entity } from './types'`)
4. Component imports (`import { JournalForm } from './components/JournalForm'`)
5. Utility/helper imports (`import { cn } from './lib/utils'`)
6. Constants imports (`import { CHART_OF_ACCOUNTS } from './constants'`)

**Example from `App.tsx` (lines 6-51):**
```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { LucideIcon, BookOpen, ... } from 'lucide-react';
import { JournalEntry, Entity, AuditLog, Account } from './types';
import { JournalForm } from './components/JournalForm';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CHART_OF_ACCOUNTS } from './constants';
```

**Path Aliases:**
- `@/*` resolves to project root (configured in `tsconfig.json`)
- Used sparingly in config but not widely used in import paths

## Error Handling

**Patterns:**
- Try-catch blocks in localStorage operations (lines 231-265 in `App.tsx`):
  ```typescript
  try {
    setEntities(JSON.parse(savedEntities));
  } catch (e) {
    console.error('Failed to parse saved entities', e);
  }
  ```

- Form validation via explicit `validate()` functions that return error objects:
  ```typescript
  const validate = (data: Entity) => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) {
      newErrors.name = 'Entity name is required';
    }
    return Object.keys(newErrors).length === 0;
  };
  ```

- Field-level validation with real-time error updates (`EntityForm.tsx` lines 73-96)
- Balance validation for journal entries (debit === credit requirement):
  ```typescript
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;
  ```

- Console.error() for error logging (no external error tracking library detected)

**UI Error Display:**
- Error messages shown inline with form fields using conditional rendering
- Errors stored in state as `Record<string, string>` mapping field names to messages
- "Touched" tracking to avoid showing validation errors before user interaction

## Logging

**Framework:** console (no external logging library)

**Patterns:**
- `console.error()` for error logging in catch blocks:
  ```typescript
  console.error('Failed to parse saved entities', e);
  ```
- No debug logging detected in application code
- Error messages are descriptive and prefixed with context (e.g., "Failed to parse saved entities")

## Comments

**When to Comment:**
- License headers on files: Apache-2.0 SPDX header at top of main files
  ```typescript
  /**
   * @license
   * SPDX-License-Identifier: Apache-2.0
   */
  ```
- Inline comments for complex logic minimal; code is generally self-documenting
- Section dividers in JSX for major component regions (e.g., `{/* Mobile Sidebar Overlay */}`)
- No comment density issues; comments used sparingly and purposefully

**JSDoc/TSDoc:**
- Not used in component code; interfaces and types are self-explanatory
- No complex function documentation found

## Function Design

**Size:** 
- Components typically 100-200 lines for simple containers, larger for complex views
- `App.tsx` is large (~1100 lines) as it contains multiple views and state management
- Helper functions kept small (5-30 lines)

**Parameters:**
- React components use explicit interface props (e.g., `EntityCardProps`, `JournalFormProps`)
- Props destructured in function signature: `({ accounts, onSave, onCancel })`
- Event handlers pass `React.MouseEvent` or `React.FormEvent` explicitly

**Return Values:**
- Components return JSX wrapped in `motion.div` for animations when needed
- Functions return typed values (e.g., validation functions return `boolean`)
- Calculations explicitly return numbers or strings

## Module Design

**Exports:**
- Named exports for components: `export const EntityForm: React.FC<EntityFormProps> = ...`
- Type exports with `export interface` and `export type`
- Default export for main `App` component only

**File Structure:**
- `src/types.ts` - All TypeScript interfaces centralized (Account, Entity, JournalEntry, etc.)
- `src/constants.ts` - All constant data (CHART_OF_ACCOUNTS, tax labels)
- `src/lib/utils.ts` - Utility functions (cn for className merging)
- `src/components/` - All React components in this directory
- `src/App.tsx` - Main application component with routing/state management
- `src/main.tsx` - Vite entry point

**Barrel Files:**
- Not used in this codebase

---

*Convention analysis: 2026-05-09*
