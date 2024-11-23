import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useQueryClient } from 'react-query';
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, MessageSquare, X, Plus } from 'lucide-react';

interface Reply {
  id: number;
  content: string;
  timestamp: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  timestamp: string;
  replies: Reply[];
}

const Announcements = () => {
  const user = useAuthStore((state) => state.user);
  const { data: announcements = [], isLoading } = useQuery('announcements', getAnnouncements);
  const queryClient = useQueryClient();

  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [showNewAnnouncementForm, setShowNewAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [showReplyForm, setShowReplyForm] = useState({});
  const [newReply, setNewReply] = useState({});
  const [showAll, setShowAll] = useState(false);

  const handleAddAnnouncement = async () => {
    try {
      await addAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        timestamp: new Date().toISOString(),
      });
      setNewAnnouncement({ title: '', content: '' });
      setShowNewAnnouncementForm(false);
    } catch (error) {
      console.error('Failed to add announcement:', error);
    }
  };

  const handleUpdateAnnouncement = async (id: number, updates: Partial<Announcement>) => {
    try {
      await updateAnnouncement({ id, ...updates });
      setEditingAnnouncement(null);
    } catch (error) {
      console.error('Failed to update announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(id);
      } catch (error) {
        console.error('Failed to delete announcement:', error);
      }
    }
  };

  const handleAddReply = async (announcementId: number) => {
    try {
      await updateAnnouncement({
        id: announcementId,
        replies: [
          ...(announcements.find(a => a.id === announcementId)?.replies || []),
          {
            content: newReply[announcementId],
            timestamp: new Date().toISOString(),
          },
        ],
      });
      setNewReply(prev => ({ ...prev, [announcementId]: '' }));
      setShowReplyForm(prev => ({ ...prev, [announcementId]: false }));
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const displayedAnnouncements = showAll ? announcements : announcements.slice(0, 5);

  return (
    <div className="space-y-8">
      {user?.role === 'admin' && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Create New Announcement</h3>
          <form onSubmit={handleAddAnnouncement} className="space-y-4">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
              <textarea
                placeholder="Content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                rows={4}
              />
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Create Announcement
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Announcements</h2>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">{announcement.title}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(announcement.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{announcement.content}</p>
                  <div className="mt-4 space-y-4">
                    {announcement.replies?.map((reply) => (
                      <div key={reply.id} className="pl-4 border-l-2 border-gray-200">
                        <div className="flex justify-between">
                          <span className="font-medium">{reply.username}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(reply.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Announcements;