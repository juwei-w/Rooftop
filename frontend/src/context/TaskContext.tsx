
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TaskState, type Task, type CreateTaskPayload, type UpdateTaskPayload } from '../types';
import * as api from '../api';

interface TaskContextType {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    refreshTasks: () => Promise<void>;
    createTask: (payload: CreateTaskPayload) => Promise<void>;
    updateTask: (id: number, payload: UpdateTaskPayload) => Promise<void>;
    addDependency: (taskId: number, blockerId: number) => Promise<void>;
    removeDependency: (taskId: number, blockerId: number) => Promise<void>;
    deleteTask: (id: number) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (!context) throw new Error('useTasks must be used within a TaskProvider');
    return context;
};

// Helper: Check if task is blocked
const isBlocked = (task: Task, tasksMap: Map<number, Task>): boolean => {
    if (task.blockers.length === 0) return false;
    return task.blockers.some(blockerId => {
        const blocker = tasksMap.get(blockerId);
        // If blocker not found (deleted?), we assume it's NOT blocking (safer for system health)
        if (!blocker) return false;
        return blocker.state !== TaskState.DONE;
    });
};

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshTasks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getTasks();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch tasks');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshTasks();
    }, [refreshTasks]);

    // Propagation Logic
    const propagateUpdates = async (initialIds: number[], currentTasks: Task[]) => {
        const queue = [...initialIds];
        const visited = new Set<number>();

        // Create a map of mutable task objects for local calculation
        const tasksMap = new Map(currentTasks.map(t => [t.id, { ...t }]));
        const updatesToSync: { id: number, state: TaskState }[] = [];

        while (queue.length > 0) {
            const taskId = queue.shift()!;
            if (visited.has(taskId)) continue;
            visited.add(taskId);

            const task = tasksMap.get(taskId);
            if (!task) continue;

            // 1. Evaluate this task's state
            const shouldBeBlocked = isBlocked(task, tasksMap);
            let newState = task.state;

            if (shouldBeBlocked && task.state !== TaskState.BLOCKED) {
                newState = TaskState.BLOCKED;
            } else if (!shouldBeBlocked && task.state === TaskState.BLOCKED) {
                // If unblocked, revert to TODO (Default actionable state)
                newState = TaskState.TODO;
            }

            // 2. If state changed, update and queue dependents
            if (newState !== task.state) {
                // Update local map
                task.state = newState;
                tasksMap.set(taskId, task);

                // Queue for sync
                updatesToSync.push({ id: taskId, state: newState });

                // Queue dependents for evaluation
                for (const depId of task.dependents) {
                    if (!visited.has(depId)) {
                        queue.push(depId);
                    }
                }
            } else {
                // Even if I didn't change, my state might affect my dependents?
                // No, if I didn't change, my dependents don't need update.
                // Wait, if I was passed in 'initialIds' because I changed (externally),
                // I should queue my dependents regardless of whether I changed *again* here.
                // But 'propagateUpdates' is usually called *after* a change.
                // If I am in 'initialIds', it means I need evaluation.
                // If my state is already correct (e.g. TODO), I don't change.
                // BUT my dependents might depend on my *current* state.
                // If I transitioned TODO->DONE before calling this, and passed myself as initialId...
                // Then `newState === task.state` (DONE).
                // I returned DONE. 
                // Dependents need to know I am DONE.
                // So I MUST queue dependents if I am in initialIds OR if I changed.
                // Improved logic: If taskId is in initialIds, forcing check of dependents is handled by caller logic?
                // No. Caller passes "Tasks that changed".
                // So if I am in queue, I should probably check my dependents?
                // Wait, if I am in queue, it means *my* blockers might have changed.
                // If my state remains same, my dependents don't need update.
                // EXCEPTION: The caller changed me (DONE) and wants me to propagate.
                // In that case, `newState` (calc) vs `task.state` (current).
                // If I am DONE, `isBlocked` is false (assumed not blocked).
                // `newState` = DONE.
                // `task.state` = DONE.
                // No change detected. dependents NOT queued.
                // BUG!
                // Fix: `propagateUpdates` should take `initialIds` as "Tasks that definitely changed/need eval".
                // Actually, better:
                // `updateTask` -> Updates local -> calls `propagateUpdates([id])`.
                // Inside `propagateUpdates`:
                // We assume tasks in `initialIds` MIGHT have changed recently.
                // BUT we need to trigger their dependents.
                // So: split logic.
                // Or just `queue.push(...task.dependents)` for all visited tasks?
                // Yes, structurally safer. If I visit T, I check T's dependents.
                // Optimized: Only if T's state is "meaningful" for dependents (DONE vs NOT DONE).
                // Simplest: If I visit T, I check its dependents.
                // `visited` prevents loops.

                for (const depId of task.dependents) {
                    if (!visited.has(depId)) queue.push(depId);
                }
            }
        }

        // Apply updates to local state
        setTasks(Array.from(tasksMap.values()));

        // Sync with backend (Best effort, parallel)
        if (updatesToSync.length > 0) {
            await Promise.all(updatesToSync.map(u => api.updateTask(u.id, { state: u.state })));
        }
    };

    const createTask = async (payload: CreateTaskPayload) => {
        try {
            const newTask = await api.createTask(payload);
            setTasks(prev => [...prev, newTask]);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateTask = async (id: number, payload: UpdateTaskPayload) => {
        try {
            // 1. Update backend first (source of truth)
            const updatedTask = await api.updateTask(id, payload);

            // 2. Update local
            let newTasks = tasks.map(t => t.id === id ? updatedTask : t);

            // 3. Propagate (recurse)
            // We pass the updated task ID to start the chain
            await propagateUpdates([id], newTasks);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const addDependency = async (taskId: number, blockerId: number) => {
        try {
            // 1. Backend update
            await api.addDependency(taskId, blockerId);

            // 2. Fetch fresh data to ensure we have correct blockers/dependents lists
            // (Backend manages the edges)
            const data = await api.getTasks();

            // 3. Propagate
            // Adding a blocker might block 'taskId'. So we evaluate 'taskId'.
            await propagateUpdates([taskId], data);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const removeDependency = async (taskId: number, blockerId: number) => {
        try {
            await api.removeDependency(taskId, blockerId);
            const data = await api.getTasks();

            // Removing a blocker might unblock 'taskId'. Evaluate 'taskId'.
            await propagateUpdates([taskId], data);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await api.deleteTask(id);
            const data = await api.getTasks();
            // Deleting a task might unblock its dependents.
            // Since we don't know who depended on it (it's gone),
            // We rely on the fresh 'data'.
            // We should ideally evaluate ALL tasks, or at least those that were blocked.
            // For safety/simplicity, let's evaluate ALL blocked tasks.
            const blockedTasks = data.filter(t => t.state === TaskState.BLOCKED).map(t => t.id);
            if (blockedTasks.length > 0) {
                await propagateUpdates(blockedTasks, data);
            } else {
                setTasks(data);
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    return (
        <TaskContext.Provider value={{ tasks, loading, error, refreshTasks, createTask, updateTask, addDependency, removeDependency, deleteTask }}>
            {children}
        </TaskContext.Provider>
    );
};
