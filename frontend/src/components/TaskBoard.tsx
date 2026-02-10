
import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { TaskState } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, ListFilter } from 'lucide-react';

export const TaskBoard: React.FC = () => {
    const { tasks, loading, error, createTask } = useTasks();
    const [filter, setFilter] = useState<TaskState | 'ALL'>('ALL');
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            await createTask({ title: newTaskTitle });
            setNewTaskTitle('');
        } catch (e) {
            alert("Failed to create task");
        }
    };

    const filteredTasks = tasks.filter(t => filter === 'ALL' || t.state === filter);

    if (loading && tasks.length === 0) return <div className="p-8 text-center text-text-secondary">Loading tasks...</div>;
    if (error) return <div className="p-8 text-center text-danger">{error}</div>;

    return (
        <div className="container min-h-screen">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                        Smart To-Do
                    </h1>
                    <p className="text-text-secondary text-sm mt-1">Dependency-aware task management</p>
                </div>

                <div className="flex items-center gap-4 bg-bg-secondary p-2 rounded-lg border border-border-color">
                    <ListFilter size={18} className="text-text-secondary ml-2" />
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as any)}
                        className="bg-transparent border-none w-32 focus:ring-0 text-sm"
                    >
                        <option value="ALL">All Tasks</option>
                        <option value={TaskState.TODO}>To Do</option>
                        <option value={TaskState.IN_PROGRESS}>In Progress</option>
                        <option value={TaskState.DONE}>Done</option>
                        <option value={TaskState.BLOCKED}>Blocked</option>
                    </select>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card text-center py-4">
                    <span className="text-2xl font-bold text-status-todo">{tasks.filter(t => t.state === TaskState.TODO).length}</span>
                    <p className="text-xs text-text-secondary uppercase mt-1">To Do</p>
                </div>
                <div className="card text-center py-4">
                    <span className="text-2xl font-bold text-status-progress">{tasks.filter(t => t.state === TaskState.IN_PROGRESS).length}</span>
                    <p className="text-xs text-text-secondary uppercase mt-1">In Progress</p>
                </div>
                <div className="card text-center py-4">
                    <span className="text-2xl font-bold text-status-blocked">{tasks.filter(t => t.state === TaskState.BLOCKED).length}</span>
                    <p className="text-xs text-text-secondary uppercase mt-1">Blocked</p>
                </div>
                <div className="card text-center py-4">
                    <span className="text-2xl font-bold text-status-done">{tasks.filter(t => t.state === TaskState.DONE).length}</span>
                    <p className="text-xs text-text-secondary uppercase mt-1">Done</p>
                </div>
            </div>

            <div className="card mb-8 p-4 border-accent border-opacity-30">
                <form onSubmit={handleCreate} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Add a new task..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="flex-1 bg-bg-primary"
                    />
                    <button type="submit" className="btn btn-primary">
                        <Plus size={18} className="mr-2" />
                        Add
                    </button>
                </form>
            </div>

            <div className="flex flex-col gap-4">
                {filteredTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
                {filteredTasks.length === 0 && (
                    <div className="text-center text-text-muted py-12 border border-dashed border-border-color rounded-lg">
                        No tasks found.
                    </div>
                )}
            </div>
        </div>
    );
};
