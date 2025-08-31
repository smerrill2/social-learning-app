# Pager System — Current vs Expected

Scope: How `MockFeed.tsx`, `SimpleTile.tsx`, and `DynamicFeedNavigator.tsx` are meant to work together for a horizontal pager experience, what currently happens, and what should happen.

## Current Behavior

- Entry surface: `MockFeed.tsx` renders the feed (hero + tiles) with a vertical `Animated.ScrollView` and a fixed search header.
  - Handles tile question presses via `handleQuestionClick` which sets `initialQuestionIntent` and toggles an overlay: `isExpanded = true` (social-learning-app/mobile/src/components/MockFeed.tsx:162, social-learning-app/mobile/src/components/MockFeed.tsx:506).
- Question trigger: `SimpleTile.tsx` exposes `onQuestionClick(question, event?)` and calls it from the "Ask" button (social-learning-app/mobile/src/components/SimpleTile.tsx:41).
- Overlay navigator: `DynamicFeedNavigator.tsx` mounts as a full-screen overlay when `isExpanded` is true.
  - Initializes with no pages: `screens: []` (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:35).
  - If `initialQuestionIntent` exists, it immediately creates a first page of type `'question-result'` and animates to it; there is no page 0 tiles page (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:142, social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:87-94, social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:120-126).
  - Horizontal paging is driven by a `PanGestureHandler`. Swiping right on the first result page calls `onClose()` and dismisses the overlay (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:182-187).
  - Connection lines are currently disabled (commented out) (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:340-346).
  - Position mapping: click coordinates are converted into "world" space by adding `currentScreenIndex * SCREEN_WIDTH` (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:72-76). Target positions for the new page are measured with `measureInWindow` and offset by `index * SCREEN_WIDTH` (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:243-247).

Net effect today:
- Pressing a tile’s question button opens a separate overlay that starts on a result page (index 0), not a true pager with a feed at page 0. Swiping back closes the overlay rather than returning to a tiles page within the same pager.

## Intended Behavior (Target)

- Single horizontal pager that includes the feed as page 0, then zero or more generated Q/A result pages to the right.
  - Page 0: tiles/feed page (the content currently rendered by `MockFeed` tiles section).
  - Page 1..N: question result pages created on demand.
- Tapping a question on a tile on page 0 should:
  - Add a new `'question-result'` page to the right.
  - Animate to the new page.
  - Optionally draw a short-lived connection/arc from the originating button on the tiles page to the search/input area on the new page.
- Swiping right from the first result page should return to page 0 (tiles), not close the experience. Closing should only occur when explicitly dismissed from page 0 (or via a dedicated close gesture/UI).
- Shared query state: the "Ask Anything" input in the feed and the query displayed on the result page should be consistent (initial question propagates).
- Smooth gestures: vertical scrolling on a page should not fight the horizontal pager swipe; the pager should take precedence only on horizontal intent.


## User Flow

- The user should start by opening up the app, and land on the hero of the mockFeed page.
- When scrolling down the search should animated on screen to the absolute/header to the top of the screen, and during that transition, the contents of the simpleTile should come in. 
- User can scroll adnauseum. However once they stumble across a simpeltile they want to review, ie., ask a question, or click the blue highlighted question button, the pager system should begin.
-Once this happes, the screen should slide to the right, and open the pager system in the bottom like iOS home screen with the dots on the bottom.
- The line Renderer, simulataneously with the pager system, should *flow* to the top of the next screen where the question is. And it should be the same question as the simpleTile's generated text. 
- The user then can then swipe back and forth between page 0 and page 1. Yet they can open more questions and continue adding more questions.


## Gaps and Mismatches

- Missing tiles page in the pager:
  - `DynamicFeedNavigator` never creates a `'tiles'` page; it starts at the first result screen. This breaks the mental model of a pager that includes the feed at index 0.
- Overlay dismissal on back swipe:
  - Swiping right on index 0 closes the overlay (social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:182-187). Expected: navigate back to tiles page within the same pager.
- Duplicated/unsynced search UIs:
  - Feed’s fixed header search is separate from the result page’s search bar; state does not propagate.
- Connection lines disabled:
  - The visual link from the pressed tile to the result target is commented out, removing onboarding/context affordance.
- Coordinate assumptions will break once a tiles page exists:
  - Current conversion uses `currentScreenIndex` (which is 0 for the first result page). With a tiles page at index 0, the originating press comes from page 0 and the first result will be at index 1; contracts need to reflect that.
- Potential gesture contention:
  - Vertical ScrollViews inside pages plus the outer `PanGestureHandler` require coordination (`simultaneousHandlers`, thresholds) to avoid accidental swipes.

## Minimal Spec for “Should Happen”

1) Pager Model
- screens[0] = { id: 'tiles', type: 'tiles' }
- screens[1..N] = { id: 'result-*', type: 'question-result', question, sourcePosition, targetPosition }

2) Event Contract
- From tiles (page 0): onQuestionClick(question, event?)
  - Compute `fromWorld = { x: event.pageX + 0 * SCREEN_WIDTH, y: event.pageY }`.
  - Push a new result screen: index = screens.length (will be 1 if no results yet).
  - After mount/measure, set `toWorld = { x: index * SCREEN_WIDTH + measuredX, y: measuredY }`.
  - Optionally create a transient connection line from `fromWorld` to `toWorld`.

3) Navigation
- Swipe right from index > 0 → go to index - 1.
- Swipe right from index 0 → close overlay (or stay, depending on product choice). Key difference: the tiles page is index 0, not a result page.

4) Shared Search State
- If the feed header accepts a typed query, pass it to the navigator when creating a result page.
- Result page shows the query and any generation state; follow-ups add more result pages.

5) Gestures
- Prefer `activeOffsetX` and `failOffsetY` (or `simultaneousHandlers`) to distinguish horizontal pager intent from vertical scrolling inside pages.

## Recommended Refactor Plan

- Extract a presentational tiles page component (no overlay logic):
  - New: `TilesPage.tsx` containing the tiles list and the question button wiring (extracted from MockFeed’s content area and `SimpleTile`).
  - It should accept `onQuestionClick` and not manage `isExpanded`.
- Initialize `DynamicFeedNavigator` with a tiles page:
  - Seed `screens` with one `{ type: 'tiles' }` screen.
  - In `renderScreen`, when `type === 'tiles'`, render `TilesPage`.
  - Route tile question presses to `handleQuestionClick` to create a result page at index 1 and slide to it.
- Keep `MockFeed` responsible only for the hero/entry surface and toggling the overlay; remove tiles duplication from under the overlay.
  - When opening the overlay, no `initialQuestionIntent` is necessary for basic open; still support it if the entry comes from an immediate tile press on the feed (optional fast-path).
- Reinstate `ConnectionLineRenderer` with the new indices:
  - When creating a result page at index k, set `fromScreenIndex = 0` (tiles) and `toScreenIndex = k`.
- Adjust back-swipe behavior:
  - If `currentScreenIndex > 0` → navigate back.
  - If `currentScreenIndex === 0` → close overlay.
- Centralize query state:
  - Pass the initial question to the result screen; allow follow-up taps to append new result pages via `handleQuestionClick`.

## Acceptance Criteria

- Page 0 is the tiles page; result pages append to the right.
- Tapping a tile question animates to a new result page and (optionally) draws a connecting line from the tile to the result search bar.
- Back-swipe from result page returns to tiles; back-swipe from tiles closes.
- Feed and result search state stay in sync when initiating a query.
- Horizontal swipes don’t interfere with reasonable vertical scrolling on each page.

## Key Code References

- `social-learning-app/mobile/src/components/MockFeed.tsx:162`: Forwards tile question events, sets overlay state.
- `social-learning-app/mobile/src/components/MockFeed.tsx:506`: Mounts `DynamicFeedNavigator` as full-screen overlay.
- `social-learning-app/mobile/src/components/SimpleTile.tsx:41`: Calls `onQuestionClick` for the demo question.
- `social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:35`: Starts with `screens: []` (no tiles page).
- `social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:66-94`: Creates a result screen and computes world coordinates.
- `social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:182-187`: Back-swipe on first page closes overlay (should return to tiles page instead).
- `social-learning-app/mobile/src/components/navigation/DynamicFeedNavigator.tsx:340-346`: Connection lines renderer disabled.

---

Notes:
- Introducing a tiles page inside the navigator avoids the current overlay/result-only flow and aligns behavior with a true pager.
- Extracting tiles content into a dedicated component prevents circular imports between `MockFeed` and `DynamicFeedNavigator`.

