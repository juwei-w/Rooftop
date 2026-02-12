
# Smart To-Do List (Front-end Assessment)

A React + TypeScript application for managing tasks with complex dependency logic.

[**Watch the Demo Video**](https://youtu.be/2KIpCbLJXLM)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Backend service running on port 8000 (Docker)

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗 Architecture & Logic

### State Management
The application uses a **Context-based architecture** (`TaskContext`) to manage global state. This was chosen for simplicity and effectiveness. 

### Dependency Propagation
The core challenge was implementing the **Recursive Propagation** of task states. Since the backend acts as a simple store without business logic for propagation, the frontend handles this responsibility.

**Algorithm:**
1.  **Blocker Check**: A derived `isBlocked(task)` function checks if *any* of a task's blockers are not `DONE`.
2.  **Propagation Loop**: When a task state changes (or a dependency is added/removed):
    *   The changed task is added to a processing queue.
    *   We use a **Breadth-First Search (BFS)** approach to visit affected tasks.
    *   For each visited task, we re-evaluate its state:
        *   If it *should* be blocked but isn't -> Update to `BLOCKED`.
        *   If it is blocked but *shouldn't* be -> Update to `TODO` (Actionable).
    *   If a task's state changes, its **dependents** are added to the queue for evaluation.
    *   A `visited` set prevents infinite loops in case of cyclic dependencies.
3.  **Batch Sync**: Visual updates are applied immediately to the local state for responsiveness, while API updates are batched and sent in parallel to ensure the backend stays in sync.

### Styling
- **Design System**: A custom minimalist dark theme using CSS variables (inspired by GitHub Dark / Linear).
- **Icons**: `lucide-react` for clean, consistent iconography.
- **Responsiveness**: Fully responsive layout suitable for mobile and desktop.

## 🛠 Improvements (With more time)
- **Optimistic UI**: Properly handle revert-on-failure for the complex propagation chains.
- **Cycle Detection**: Explicitly detect and warn users about dependency cycles (A -> B -> A) before they are created.
- **Testing**: Add unit tests for the `propagateUpdates` logic to cover edge cases (e.g., diamond dependencies, existing cycles).
- **Virtualization**: Use `react-window` if the task list grows to thousands of items.
