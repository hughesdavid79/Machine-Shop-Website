interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  announcementId: string;
}

declare module '*.jpg';
declare module '*.jpeg';
declare module '*.png';
declare module '*.svg'; 