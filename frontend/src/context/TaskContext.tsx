
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
            // Propagate through ALL tasks to ensure consistency with backend data
            await propagateUpdates(data.map(t => t.id), data);
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

            // If should be blocked, set to BLOCKED
            if (shouldBeBlocked && task.state !== TaskState.BLOCKED) {
                newState = TaskState.BLOCKED;
            } else if (!shouldBeBlocked && task.state === TaskState.BLOCKED) {
                // If should not be blocked, set to TODO (Default actionable state)
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
                // Even if my state didn't change *here*, I might have been queued because
                // I changed *before* calling propagateUpdates (e.g. manual user action).
                // So my dependents need to re-evaluate based on my current state.

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
            await api.createTask(payload);
            await refreshTasks(); // Refresh to ensure ID and order
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

            // 3. Propagate ALL tasks to ensure total consistency
            await propagateUpdates(data.map(t => t.id), data);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const removeDependency = async (taskId: number, blockerId: number) => {
        try {
            await api.removeDependency(taskId, blockerId);
            const data = await api.getTasks();

            // Propagate ALL tasks to ensure total consistency
            await propagateUpdates(data.map(t => t.id), data);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await api.deleteTask(id);
            const data = await api.getTasks();
            // Validate all remaining tasks
            await propagateUpdates(data.map(t => t.id), data);
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
