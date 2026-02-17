# Phase 4A-Vanilla: CSS-Only Adaptation Proposal

## Current Structure Analysis

### HTML Structure (from `cabinet.js`):
```html
<div id="cabinet-app">
  <div class="cabinet">
    <aside class="cabinet-sidebar">
      <div class="cabinet-sidebar__user">...</div>
      <nav class="cabinet-sidebar__nav">
        <a class="cabinet-sidebar__link">...</a>
      </nav>
      <div class="cabinet-sidebar__footer">...</div>
    </aside>
    <main class="cabinet-content">
      <div class="cabinet-content__header">...</div>
      <div class="cabinet-content__body">...</div>
    </main>
  </div>
</div>
```

### Existing Selectors in `cabinet.css`:

**Desktop Layout (lines 72-95):**
- `.cabinet` - `display: flex` (row), `min-height: 600px`
- `.cabinet-sidebar` - `width: 280px`, `min-width: 280px`
- `.cabinet-content` - `flex: 1`
- `.cabinet-content__body` - `flex: 1`, `overflow-y: auto`

**Mobile Layout (lines 237-252):**
- `.cabinet` - `flex-direction: column`
- `.cabinet-sidebar` - `width: 100%`, `min-width: 100%`
- `.cabinet-sidebar__nav` - `display: flex`, `flex-wrap: wrap`, `padding: 8px`
- `.cabinet-sidebar__link` - `flex: 1`, `min-width: 80px`, `justify-content: center`
- `.cabinet-sidebar__link span` - `display: none` (hides text)
- `.cabinet-content__header, .cabinet-content__body` - `padding: 16px`

## Phase 4A-Vanilla Goals

1. ✅ **Mobile stacked layout** - Already implemented
2. ✅ **Sidebar horizontal navigation** - Already implemented
3. ⚠️ **Prevent flex overflow using `min-width: 0`** - Missing
4. ✅ **Full width content** - Already implemented
5. 📝 **Improve mobile sidebar navigation** - Show text labels (Phase 4A style)

## Proposed CSS Changes

### Location: `frontend/cabinet/cabinet.css`

### Changes to Desktop Layout (before mobile media query):

**1. Add `min-width: 0` to `.cabinet-content` (line ~92-95):**
```css
/* КОНТЕНТ */
.cabinet-content { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  background: var(--cabinet-white);
  min-width: 0; /* Prevent flex overflow */
}
```

**2. Add `min-width: 0` to `.cabinet-content__body` (line ~95):**
```css
.cabinet-content__body { 
  flex: 1; 
  padding: 24px 32px; 
  overflow-y: auto;
  min-width: 0; /* Prevent flex overflow */
}
```

### Changes to Mobile Layout (inside `@media (max-width: 768px)`, lines 237-252):

**1. Improve `.cabinet` container (line 238):**
```css
.cabinet { 
  flex-direction: column;
  min-height: 100vh; /* Full height on mobile */
  height: auto; /* Allow content to grow */
}
```

**2. Update `.cabinet-sidebar__nav` (line 240):**
```css
.cabinet-sidebar__nav { 
  display: flex; 
  flex-direction: row; /* Explicit horizontal */
  flex-wrap: wrap; 
  gap: 8px; /* Better spacing */
  padding: 12px 16px; /* More padding */
}
```

**3. Update `.cabinet-sidebar__link` (line 241):**
```css
.cabinet-sidebar__link { 
  flex: 1 1 auto; 
  min-width: 80px; /* Minimum touch target */
  padding: 10px 14px; /* Better padding */
  justify-content: center; 
  font-size: 14px; /* Slightly larger */
  white-space: nowrap; /* Prevent text wrapping */
}
```

**4. Show text labels (line 242):**
```css
.cabinet-sidebar__link span { 
  display: inline; /* Show text (Phase 4A style) */
}
```

**5. Update `.cabinet-content` (add after line 247):**
```css
.cabinet-content {
  width: 100%;
  min-width: 0; /* Prevent overflow */
  box-sizing: border-box;
}
```

## Complete CSS Diff

```diff
--- a/frontend/cabinet/cabinet.css
+++ b/frontend/cabinet/cabinet.css
@@ -89,7 +89,8 @@
 /* КОНТЕНТ */
-.cabinet-content { flex: 1; display: flex; flex-direction: column; background: var(--cabinet-white); }
+.cabinet-content { flex: 1; display: flex; flex-direction: column; background: var(--cabinet-white); min-width: 0; }
 .cabinet-content__header { padding: 24px 32px; border-bottom: 1px solid var(--cabinet-border); }
 .cabinet-content__title { margin: 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
-.cabinet-content__body { flex: 1; padding: 24px 32px; overflow-y: auto; }
+.cabinet-content__body { flex: 1; padding: 24px 32px; overflow-y: auto; min-width: 0; }
 
 /* ЧАТ */
@@ -236,9 +237,10 @@
 /* АДАПТИВНОСТЬ */
 @media (max-width: 768px) {
-    .cabinet { flex-direction: column; }
+    .cabinet { flex-direction: column; min-height: 100vh; height: auto; }
     .cabinet-sidebar { width: 100%; min-width: 100%; }
-    .cabinet-sidebar__nav { display: flex; flex-wrap: wrap; padding: 8px; }
-    .cabinet-sidebar__link { flex: 1; min-width: 80px; padding: 10px 12px; justify-content: center; font-size: 12px; }
-    .cabinet-sidebar__link span { display: none; }
+    .cabinet-sidebar__nav { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; padding: 12px 16px; }
+    .cabinet-sidebar__link { flex: 1 1 auto; min-width: 80px; padding: 10px 14px; justify-content: center; font-size: 14px; white-space: nowrap; }
+    .cabinet-sidebar__link span { display: inline; }
     .cabinet-sidebar__link svg { width: 24px; height: 24px; }
     .cabinet-sidebar__footer { display: none; }
     .cabinet-sidebar__user { padding: 16px; }
     .cabinet-sidebar__avatar { width: 48px; height: 48px; font-size: 18px; }
     .cabinet-content__header, .cabinet-content__body { padding: 16px; }
+    .cabinet-content { width: 100%; min-width: 0; box-sizing: border-box; }
     .cabinet-form__row { flex-direction: column; }
     .cabinet-chat__message { max-width: 90%; }
```

## Summary

**Selectors to modify:**
1. `.cabinet-content` (desktop) - Add `min-width: 0`
2. `.cabinet-content__body` (desktop) - Add `min-width: 0`
3. `.cabinet` (mobile) - Add `min-height: 100vh`, `height: auto`
4. `.cabinet-sidebar__nav` (mobile) - Improve spacing and layout
5. `.cabinet-sidebar__link` (mobile) - Add `min-width: 0`, improve padding, show text
6. `.cabinet-sidebar__link span` (mobile) - Change from `display: none` to `display: inline`
7. `.cabinet-content` (mobile) - Add `width: 100%`, `min-width: 0`

**Safety:**
- ✅ CSS-only changes
- ✅ No JS changes required
- ✅ No HTML structure changes
- ✅ Desktop layout unchanged (only adds `min-width: 0`)
- ✅ Mobile layout improvements align with Phase 4A goals

