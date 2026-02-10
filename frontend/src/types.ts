
export enum TaskState {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
    BLOCKED = 'BLOCKED',
    BACKLOG = 'BACKLOG'
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    state: TaskState;
    blockers: number[];
    dependents: number[];
    created_at: string;
    updated_at: string;
    completed_at?: string;
    due_date?: string;
}

export interface CreateTaskPayload {
    title: string;
    description?: string;
    due_date?: string;
    state?: TaskState;
}

export interface UpdateTaskPayload {
    title?: string;
    description?: string;
    due_date?: string;
    state?: TaskState;
}
