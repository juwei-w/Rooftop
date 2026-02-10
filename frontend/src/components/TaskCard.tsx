
import React, { useState } from 'react';
import { TaskState, type Task } from '../types';
import { useTasks } from '../context/TaskContext';
import { CheckCircle, Circle, Clock, Ban, GripVertical, X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskCardProps {
    task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const { updateTask, addDependency, removeDependency, deleteTask } = useTasks();
    const [showDetails, setShowDetails] = useState(false);
    const [blockerIdInput, setBlockerIdInput] = useState('');

    const statusIcons: Record<TaskState, React.ReactNode> = {
        [TaskState.TODO]: <Circle className="w-4 h-4" />,
        [TaskState.IN_PROGRESS]: <Clock className="w-4 h-4" />,
        [TaskState.DONE]: <CheckCircle className="w-4 h-4" />,
        [TaskState.BLOCKED]: <Ban className="w-4 h-4" />,
        [TaskState.BACKLOG]: <GripVertical className="w-4 h-4" />,
    };

    const statusColors: Record<TaskState, string> = {
        [TaskState.TODO]: 'status-todo',
        [TaskState.IN_PROGRESS]: 'status-progress',
        [TaskState.DONE]: 'status-done',
        [TaskState.BLOCKED]: 'status-blocked',
        [TaskState.BACKLOG]: 'status-backlog',
    };



    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateTask(task.id, { state: e.target.value as TaskState });
    };

    const handleAddBlocker = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(blockerIdInput);
        if (!isNaN(id)) {
            await addDependency(task.id, id);
            setBlockerIdInput('');
        }
    };

    return (
        <div className={cn("card flex flex-col gap-2 relative group", task.state === TaskState.DONE && "opacity-75")}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full bg-opacity-10 min-w-[32px] flex items-center justify-center", statusColors[task.state] || 'bg-gray-100')}>
                        {statusIcons[task.state]}
                    </div>
                    <div>
                        <h3 className={cn("font-semibold", task.state === TaskState.DONE && "line-through text-text-muted")}>
                            {task.title}
                            <span className="text-xs text-text-muted font-normal ml-2">#{task.id}</span>
                        </h3>
                        <span className={cn("status-badge inline-block mt-1", statusColors[task.state])}>
                            {task.state.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={task.state}
                        onChange={handleStatusChange}
                        disabled={task.state === TaskState.BLOCKED}
                        className={cn("w-32 text-sm", task.state === TaskState.BLOCKED && "opacity-50 cursor-not-allowed")}
                    >
                        <option value={TaskState.TODO}>Todo</option>
                        <option value={TaskState.IN_PROGRESS}>In Progress</option>
                        <option value={TaskState.DONE}>Done</option>
                        <option value={TaskState.BLOCKED} disabled>Blocked</option>
                    </select>
                    <button onClick={() => setShowDetails(!showDetails)} className="btn btn-secondary text-xs">
                        {showDetails ? 'Hide' : 'Details'}
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="btn btn-secondary text-status-blocked hover:bg-red-900/20 p-2" title="Delete Task">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {showDetails && (
                <div className="mt-4 border-t border-border-color pt-4 text-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <p className="text-text-muted font-semibold flex items-center gap-2">
                                <Ban size={14} />
                                Blocked By (Dependencies)
                            </p>
                            {task.blockers.length === 0 ? (
                                <p className="text-text-muted italic text-xs">No dependencies</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {task.blockers.map(bid => (
                                        <span key={bid} className="inline-flex items-center gap-1 bg-bg-hover px-2 py-1 rounded text-xs border border-border-color">
                                            ID: {bid}
                                            <button onClick={() => removeDependency(task.id, bid)} className="hover:text-danger ml-1 p-0.5 rounded-full hover:bg-bg-primary transition-colors">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleAddBlocker} className="flex gap-2 mt-2">
                                <input
                                    type="number"
                                    placeholder="Add ID"
                                    className="w-20 py-1 px-2 text-xs"
                                    value={blockerIdInput}
                                    onChange={e => setBlockerIdInput(e.target.value)}
                                />
                                <button type="submit" className="btn btn-secondary text-xs py-1 px-2 h-full">Add</button>
                            </form>
                        </div>

                        <div className="flex-1 space-y-2">
                            <p className="text-text-muted font-semibold flex items-center gap-2">
                                <CheckCircle size={14} />
                                Blocks (Dependents)
                            </p>
                            {task.dependents.length === 0 ? (
                                <p className="text-text-muted italic text-xs">None</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {task.dependents.map(did => (
                                        <span key={did} className="inline-flex items-center gap-1 bg-bg-hover px-2 py-1 rounded text-xs border border-border-color">
                                            ID: {did}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 text-xs text-text-muted flex justify-end gap-4">
                        <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                        {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
