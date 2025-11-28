# PHASE 1: Shared Utilities Extraction - Technical Specification

**Status**: Ready to Begin  
**Risk Level**: LOW (0 breaking changes)  
**Estimated Time**: 2-3 hours  
**Complexity**: Straightforward refactoring

---

## 📌 Phase 1 Overview

Extract three groups of duplicated utility functions into reusable modules:

1. **Password utilities** (2 duplicates)
2. **Date formatting** (scattered usage)
3. **Payment status text** (mixed with rent-cycle logic)

No component changes, no API changes, no state changes. Pure refactoring.

---

## 🔍 What's Duplicated (Find & Extract)

### 1. Password Utilities (EXACT DUPLICATES)

**Location 1**: `client/src/components/dashboard/landlord/settings/SettingsTab.tsx` (lines 26-50)
```typescript
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

function getPasswordRequirements(password: string) {
  return [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: password.length >= 12, label: 'At least 12 characters' },
    { met: /[a-z]/.test(password), label: 'Lowercase letter' },
    { met: /[A-Z]/.test(password), label: 'Uppercase letter' },
    { met: /[0-9]/.test(password), label: 'Number' },
    { met: /[^a-zA-Z0-9]/.test(password), label: 'Special character' },
  ];
}
```

**Location 2**: `client/src/components/dashboard/tenant/TenantSettingsTab.tsx` (lines ~16-40)
```typescript
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  // EXACT SAME CODE
}

function getPasswordRequirements(password: string) {
  // EXACT SAME CODE
}
```

**Action**: Extract to new file, remove from both locations.

---

### 2. Date Utilities (Scattered)

**Location 1**: `client/src/components/dashboard/landlord/tabs/DashboardTab.tsx`
```typescript
new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
```

**Location 2**: `client/src/pages/tenant-dashboard.tsx`
```typescript
new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short' })
```

**Location 3**: Multiple components
```typescript
// Various date formatting across components
new Date(...).toLocaleDateString('en-US', ...)
```

**Action**: Create utility function like `formatDueDate(date)` that handles all these cases.

---

### 3. Payment Status Text

**Location**: `client/src/lib/rent-cycle-utils.ts`
```typescript
export function formatRentStatusText(
  daysRemaining: number,
  rentStatus: string,
  advancePaymentDays?: number,
  debtAmount?: number,
  monthsOwed?: number
): string {
  // Logic that determines "Paid", "Partial", "Due Soon", etc.
}
```

**Current Problem**: This logic is in rent-cycle-utils but used in payment-utils too. Mixed concerns.

**Action**: Consolidate into payment-status-utils.ts, clean imports.

---

## 📝 Step-by-Step Implementation

### Step 1: Create `client/src/lib/password-utils.ts`

```typescript
/**
 * Password validation utilities
 * Centralized password strength checking and requirements validation
 */

export interface PasswordStrengthResult {
  score: number;           // 0-6
  label: 'Weak' | 'Medium' | 'Strong' | '';
  color: 'bg-red-500' | 'bg-amber-500' | 'bg-emerald-500' | '';
}

export interface PasswordRequirement {
  met: boolean;
  label: string;
}

/**
 * Check password strength and return score, label, and color
 * @param password - Password to check
 * @returns Object with score (0-6), label, and Tailwind color class
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

/**
 * Get password requirements checklist
 * @param password - Password to validate against requirements
 * @returns Array of requirements with met status
 */
export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: password.length >= 12, label: 'At least 12 characters' },
    { met: /[a-z]/.test(password), label: 'Lowercase letter' },
    { met: /[A-Z]/.test(password), label: 'Uppercase letter' },
    { met: /[0-9]/.test(password), label: 'Number' },
    { met: /[^a-zA-Z0-9]/.test(password), label: 'Special character' },
  ];
}
```

### Step 2: Create `client/src/lib/date-utils.ts`

```typescript
/**
 * Date formatting utilities
 * Centralized date formatting for consistent display
 */

/**
 * Format date as "MMM D" (e.g., "Jan 15")
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatDueDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date as full date string (e.g., "Jan 15, 2025")
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatFullDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date as month name only (e.g., "January")
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatMonthName(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'long' });
  } catch {
    return 'Invalid date';
  }
}
```

### Step 3: Create/Update `client/src/lib/payment-status-utils.ts`

```typescript
/**
 * Payment status text generation
 * Consolidated payment status logic
 * (Consolidates from rent-cycle-utils and payment-utils)
 */

export interface RentCycleData {
  daysRemaining?: number;
  rentStatus?: string;
  advancePaymentDays?: number;
  debtAmount?: number;
  monthsOwed?: number;
}

/**
 * Generate human-readable rent status text
 * @param daysRemaining - Days until rent is due
 * @param rentStatus - Current rent status
 * @param advancePaymentDays - Days paid in advance
 * @param debtAmount - Amount owed
 * @param monthsOwed - Number of months behind
 * @returns Human-readable status text
 */
export function formatRentStatusText(
  daysRemaining: number = 0,
  rentStatus: string = 'active',
  advancePaymentDays: number = 0,
  debtAmount: number = 0,
  monthsOwed: number = 0
): string {
  if (rentStatus === 'paid_in_advance') {
    if (monthsOwed && monthsOwed > 0) {
      return `Paid ${monthsOwed > 1 ? monthsOwed + ' months' : monthsOwed + ' month'} ahead`;
    }
    if (advancePaymentDays && advancePaymentDays > 0) {
      return `${advancePaymentDays} days ahead`;
    }
    return 'Paid in advance';
  }
  
  if (rentStatus === 'paid') {
    return 'Paid';
  }
  
  if (rentStatus === 'partial') {
    if (debtAmount) {
      return `KSH ${debtAmount.toLocaleString()} due`;
    }
    return 'Partial payment';
  }
  
  if (rentStatus === 'active' && daysRemaining) {
    if (daysRemaining > 0) {
      return `${daysRemaining} days remaining`;
    }
    return 'Overdue';
  }
  
  return 'Active';
}

/**
 * Get color for rent status
 * @param rentStatus - Current rent status
 * @returns Tailwind color class
 */
export function getRentStatusColor(
  rentStatus: string
): 'text-green-600' | 'text-amber-600' | 'text-red-600' | 'text-blue-600' {
  switch (rentStatus) {
    case 'paid':
    case 'paid_in_advance':
      return 'text-green-600';
    case 'partial':
      return 'text-amber-600';
    case 'overdue':
      return 'text-red-600';
    case 'active':
    default:
      return 'text-blue-600';
  }
}
```

### Step 4: Update `client/src/components/dashboard/landlord/settings/SettingsTab.tsx`

**Find this**:
```typescript
// Lines 26-50
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  // ...entire function
}

function getPasswordRequirements(password: string) {
  // ...entire function
}
```

**Replace with**:
```typescript
import { getPasswordStrength, getPasswordRequirements } from '@/lib/password-utils';
```

Keep everything else the same. The functions are now imported, not defined locally.

### Step 5: Update `client/src/components/dashboard/tenant/TenantSettingsTab.tsx`

**Find this**:
```typescript
// Around line 16-40
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  // ...entire function
}

function getPasswordRequirements(password: string) {
  // ...entire function
}
```

**Replace with**:
```typescript
import { getPasswordStrength, getPasswordRequirements } from '@/lib/password-utils';
```

### Step 6: Update date usage in `client/src/pages/tenant-dashboard.tsx`

**Find these**:
```typescript
new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short' })
new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
```

**Replace with**:
```typescript
import { formatDueDate, formatMonthName } from '@/lib/date-utils';

// Then use:
formatMonthName(tenantProperty.rentCycle.nextDueDate)
formatDueDate(tenantProperty.rentCycle.nextDueDate)
```

---

## ✅ Validation Checklist (Phase 1)

After making all changes above:

```typescript
// 1. BUILD TEST
npm run build
// Expected: Success in ~30-60 seconds
// If fails: Check imports, typos in new files

// 2. LINT TEST
npm run lint
// Expected: No errors (warnings okay)
// If fails: Check file formatting, unused imports

// 3. DEV SERVER TEST
npm run dev
// Expected: Starts without errors
// Access http://localhost:5173

// 4. MANUAL TESTING
// Test 1: Tenant Settings
  - Go to Tenant Dashboard → Settings → Security tab
  - Try entering password: "Test123!"
  - Verify: Password strength bar shows
  - Verify: Requirements checklist displays
  - Verify: No console errors

// Test 2: Landlord Settings
  - Go to Landlord Dashboard → Settings → Security
  - Try entering password: "Test123!"
  - Verify: Password strength bar shows
  - Verify: Requirements checklist displays
  - Verify: No console errors

// Test 3: Date Formatting
  - Go to Tenant Dashboard → My Apartment
  - Check: Next Due Date displays correctly (e.g., "Jan 15")
  - Go to Dashboard → My Apartment card
  - Check: Last Payment date displays correctly
  - Verify: No date formatting errors

// Test 4: Developer Tools
  - Open DevTools Console
  - Verify: No red errors
  - Verify: No warnings about missing imports
  - Check Network tab: Same API calls as before
  - Check React Query DevTools: Same query keys as before
```

---

## 🔄 Git Workflow for Phase 1

```bash
# Step 1: Make sure we're on the feature branch
git status
# Expected output: branch feature/paystack-integration

# Step 2: Create new files
touch client/src/lib/password-utils.ts
touch client/src/lib/date-utils.ts
touch client/src/lib/payment-status-utils.ts

# Step 3: Add content to files (copy-paste from above)
# Use VS Code or your editor

# Step 4: Update imports in existing files
# Modify SettingsTab.tsx
# Modify TenantSettingsTab.tsx
# Modify tenant-dashboard.tsx

# Step 5: Verify everything still works
npm run build
npm run lint
npm run dev

# Step 6: Stage changes
git add -A

# Step 7: Review what changed
git diff --cached
# Should see:
#   - 3 new files created (password-utils, date-utils, payment-status-utils)
#   - 3 files modified (imports changed)

# Step 8: Commit
git commit -m "Phase 1: Extract shared utilities (password, date, payment-status)

- Created lib/password-utils.ts (centralized password validation)
- Created lib/date-utils.ts (centralized date formatting)
- Created lib/payment-status-utils.ts (centralized payment status logic)
- Updated SettingsTab.tsx to import from password-utils
- Updated TenantSettingsTab.tsx to import from password-utils
- Updated tenant-dashboard.tsx to use date-utils functions
- Zero breaking changes, all tests passing"

# Step 9: Push to GitHub
git push origin feature/paystack-integration

# Step 10: Verify on GitHub
# Go to GitHub → RentEase → feature/paystack-integration
# See commit appear in the timeline
```

---

## 🚨 If Something Goes Wrong

### Error: "npm run build fails"

**Debug**:
```bash
npm run build 2>&1 | head -20  # Show first 20 lines of error
```

**Common causes**:
- Missing import statement
- Typo in function name
- Syntax error in new file

**Fix**:
```bash
# Check syntax
npx tsc --noEmit
# Shows TypeScript errors with line numbers

# If can't fix quickly, revert
git checkout -- client/src/lib/
git checkout -- client/src/components/
git checkout -- client/src/pages/
```

### Error: "npm run lint fails"

**Debug**:
```bash
npm run lint -- --format=json | jq
```

**Common causes**:
- Unused imports
- Formatting issues
- Missing trailing newlines

**Fix**:
```bash
npm run lint -- --fix
# Auto-fixes most issues
```

### Error: "Settings tab shows no password strength"

**Debug**:
```javascript
// In browser DevTools Console
import { getPasswordStrength } from '@/lib/password-utils'
getPasswordStrength('Test123!')
// Should output: { score: 5, label: 'Strong', color: 'bg-emerald-500' }
```

**Common causes**:
- Import not added
- Function not exported
- Component not re-rendered

**Fix**:
- Verify import is added at top of file
- Check function is exported in lib/password-utils.ts
- Refresh browser (Cmd+Shift+R to clear cache)

---

## 📊 Phase 1 Success Criteria

✅ **All of these must be true**:

```
□ npm run build succeeds
□ npm run lint passes
□ No console errors in DevTools
□ Password strength validation works (both places)
□ Date formatting displays correctly
□ All tabs functional
□ Can refresh page without errors
□ Can sign out and back in
□ Real-time updates (WebSocket) still work
□ Dark/Light mode toggle works
□ Mobile view responsive
□ No unintended changes (only new files + imports)
```

---

## 🎯 What's Next After Phase 1

Once Phase 1 is complete and all validation passes:

1. **Celebrate** - You just successfully refactored without breaking anything! 🎉
2. **Document** - Add note to REFACTORING_PLAN.md marking Phase 1 complete
3. **Review** - Go through git diff one more time
4. **Commit** - Make sure Phase 1 is committed to GitHub
5. **Prepare** - Read Phase 2 documentation
6. **Begin** - Start Phase 2 (Custom Hooks)

---

## 💡 Tips

- **Work incrementally**: Do one file at a time
- **Test after each file**: Don't create all files, then test
- **Use your IDE**: Let TypeScript help catch errors (red squiggles)
- **Commit often**: After each major change, commit
- **Ask questions**: If anything is unclear, ask before proceeding

---

**You're ready! Let's make Phase 1 perfect. 🚀**
