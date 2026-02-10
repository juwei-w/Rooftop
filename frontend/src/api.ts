
import axios from 'axios';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from './types';

const API_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
});

export const getTasks = async (): Promise<Task[]> => {
    const response = await api.get<Task[]>('/tasks');
    return response.data;
};

export const createTask = async (data: CreateTaskPayload): Promise<Task> => {
    const response = await api.post<Task>('/tasks', data);
    return response.data;
};

export const updateTask = async (id: number, data: UpdateTaskPayload): Promise<Task> => {
    const response = await api.patch<Task>(`/tasks/${id}`, data);
    return response.data;
};

export const deleteTask = async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
};

export const addDependency = async (taskId: number, blockerId: number): Promise<void> => {
    await api.post(`/dependencies/${taskId}/blockers/${blockerId}`);
};

export const removeDependency = async (taskId: number, blockerId: number): Promise<void> => {
    await api.delete(`/dependencies/${taskId}/blockers/${blockerId}`);
};
