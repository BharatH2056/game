## 2025-06-19 — Predictive Action Engine

**Product understood as:** A text-based adventure game "Oracle Labyrinth" where users navigate a grid of rooms and collect items.

**Prediction invented:** Behavioral Markov Engine for next-action prediction and prefetching.

**Data used:** User transition history (fromState -> action -> toState).

**Impact:** The app anticipates the user's next move or action. It pre-highlights the most likely next button and simulates prefetching of the next room's assets, reducing perceived latency and guiding the user.

**Next opportunity:** Temporal patterns — predicting actions based on how much time the user spends in a room or their total session time.

## 2025-06-19 — Contextual Prediction & Vision System

**Product understood as:** Oracle Labyrinth (Predictive Adventure Game).

**Prediction invented:** Multi-layered Contextual Markov Engine.

**Data used:** Composite state (Room + Inventory) and transition dwell time.

**Impact:** Oracle now understands that a user's inventory changes their likely behavior. Predictions are 5x more weighted when context matches. Added "Vision" system which previews the next room's name directly in the UI when confidence is high.

**Next opportunity:** Session-over-session learning. Persistent storage of transition weights to allow the Oracle to "remember" a specific user's playstyle across different runs.
