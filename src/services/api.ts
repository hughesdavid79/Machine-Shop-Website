import { API_ROUTES, getAuthHeaders } from '../config/api';

export const login = async (username: string, password: string) => {
  console.log('Login attempt:', { username });
  
  try {
    const url = API_ROUTES.LOGIN;
    console.log('Sending request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Login failed:', { status: response.status, error: errorData });
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Login successful:', { username: data.user.username, role: data.user.role });
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getInventory = async () => {
  const response = await fetch(API_ROUTES.INVENTORY, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch inventory');
  }

  return response.json();
};

export const addInventoryItem = async (item: {
  name: string;
  description: string;
  quantity: number;
  threshold: number;
}) => {
  const response = await fetch(API_ROUTES.INVENTORY, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error('Failed to add inventory item');
  }

  return response.json();
};

export const updateInventoryItem = async (id: number, updates: Partial<{
  name: string;
  description: string;
  quantity: number;
  threshold: number;
}>) => {
  console.log('Updating inventory item:', { id, updates });
  const response = await fetch(`${API_ROUTES.INVENTORY}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    console.error('Failed to update inventory:', response.statusText);
    throw new Error(`Failed to update inventory: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Item updated:', data);
  return data;
};

export const deleteInventoryItem = async (id: number) => {
  const response = await fetch(`${API_ROUTES.INVENTORY}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete inventory item');
  }

  return response.json();
};

export const getBarrels = async () => {
  const response = await fetch(API_ROUTES.BARRELS, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch barrels');
  }

  return response.json();
};

export const updateBarrel = async (id: number, updates: Partial<{
  threshold: number;
  filled: boolean;
}>) => {
  const response = await fetch(`${API_ROUTES.BARRELS}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update barrel');
  }

  return response.json();
};

export const getAnnouncements = async () => {
  const response = await fetch(API_ROUTES.ANNOUNCEMENTS, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch announcements');
  }

  return response.json();
};

export const addAnnouncement = async (data: {
  title: string;
  content: string;
  timestamp: string;
}) => {
  const response = await fetch(API_ROUTES.ANNOUNCEMENTS, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to add announcement');
  }

  return response.json();
};

export const updateAnnouncement = async ({ id, ...updates }: {
  id: number;
  title?: string;
  content?: string;
  replies?: Reply[];
}) => {
  const response = await fetch(`${API_ROUTES.ANNOUNCEMENTS}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update announcement');
  }

  return response.json();
};

export const deleteAnnouncement = async (id: number) => {
  const response = await fetch(`${API_ROUTES.ANNOUNCEMENTS}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete announcement');
  }

  return response.json();
};

export const addReply = (announcementId: number, content: string) => {
  return withDB(async (db) => {
    const timestamp = new Date().toISOString();
    return db.add('replies', { announcementId, content, timestamp });
  });
};

export const toggleBarrel = async ({ id, filled }: { id: number; filled: boolean }) => {
  const response = await fetch(`${API_ROUTES.BARRELS}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filled }),
  });

  if (!response.ok) {
    throw new Error('Failed to update barrel');
  }

  return response.json();
};