import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// File management functions
export const uploadFiles = (formData) => {
    return api.post('/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const askFiles = (data) => {
    return api.post('/files/ask', data);
};

export const getFileSession = () => {
    return api.get('/files/session');
};

export const deleteFileSession = () => {
    return api.delete('/files/session');
};

// Conversation management functions
export const exportConversation = (conversationId, format = 'json') => {
    return api.get(`/conversations/${conversationId}/export?format=${format}`, {
        responseType: 'blob' // Important: This tells axios to handle the response as a binary blob
    });
};

// Profile management functions
export const getProfile = () => {
    return api.get('/profile');
};

export const updateProfile = (data) => {
    return api.put('/profile', data);
};

// Admin management functions
export const getAdminStats = () => {
    return api.get('/admin/stats');
};

export const getAllUsers = () => {
    return api.get('/admin/users');
};

export const getUserDetails = (userId) => {
    return api.get(`/admin/users/${userId}`);
};

export const deleteUser = (userId) => {
    return api.delete(`/admin/users/${userId}`);
};

export default api;