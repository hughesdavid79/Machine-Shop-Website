import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useQueryClient } from 'react-query';
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, addReply, updateReply, deleteReply } from '../services/api';
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
  const [showNewAnnouncementForm, setShowNewAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [replyForms, setReplyForms] = useState<Record<number, string>>({});
  const [editingReply, setEditingReply] = useState<{ id: number; announcementId: number } | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  const handleAddAnnouncement = async () => {
    try {
      await addAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        timestamp: new Date().toISOString(),
      });
      await queryClient.invalidateQueries('announcements');
      setNewAnnouncement({ title: '', content: '' });
      setShowNewAnnouncementForm(false);
    } catch (error) {
      console.error('Failed to add announcement:', error);
    }
  };

  const handleEditAnnouncement = async (id: number) => {
    try {
      await updateAnnouncement({
        id,
        title: editForm.title,
        content: editForm.content,
      });
      await queryClient.invalidateQueries('announcements');
      setEditingAnnouncement(null);
    } catch (error) {
      console.error('Failed to update announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(id);
        await queryClient.invalidateQueries('announcements');
      } catch (error) {
        console.error('Failed to delete announcement:', error);
      }
    }
  };

  const handleAddReply = async (announcementId: number) => {
    try {
      const content = replyForms[announcementId];
      if (!content?.trim()) return;

      await addReply(announcementId, { content });
      await queryClient.invalidateQueries('announcements');
      setReplyForms(prev => ({ ...prev, [announcementId]: '' }));
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handleEditReply = async (announcementId: number, replyId: number, content: string) => {
    try {
      await updateReply(announcementId, replyId, content);
      await queryClient.invalidateQueries('announcements');
      setEditingReply(null);
      setEditReplyContent('');
    } catch (error) {
      console.error('Failed to update reply:', error);
    }
  };

  const handleDeleteReply = async (announcementId: number, replyId: number) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        await deleteReply(announcementId, replyId);
        await queryClient.invalidateQueries('announcements');
      } catch (error) {
        console.error('Failed to delete reply:', error);
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8 p-4">
      {user?.role === 'admin' && (
        <div className="mb-6">
          <button
            onClick={() => setShowNewAnnouncementForm(true)}
            className="btn btn-warning flex items-center gap-2"
          >
            <Plus size={16} /> New Announcement
          </button>
          
          {showNewAnnouncementForm && (
            <div className="mt-4 p-4 bg-white shadow-lg border-2 border-warning rounded-lg">
              <input
                type="text"
                placeholder="Title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered input-warning w-full mb-2"
              />
              <textarea
                placeholder="Content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered textarea-warning w-full mb-2"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewAnnouncementForm(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button onClick={handleAddAnnouncement} className="btn btn-warning">
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Announcements List */}
      {announcements.map(announcement => (
        <div key={announcement.id} className="bg-white shadow-lg border rounded-lg p-6">
          {editingAnnouncement === announcement.id ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
              />
              <textarea
                value={editForm.content}
                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingAnnouncement(null)} className="btn btn-ghost">
                  Cancel
                </button>
                <button onClick={() => handleEditAnnouncement(announcement.id)} className="btn btn-primary">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">{announcement.title}</h3>
                {user?.role === 'admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingAnnouncement(announcement.id);
                      setEditForm({ title: announcement.title, content: announcement.content });
                    }} className="btn btn-ghost btn-sm">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="btn btn-ghost btn-sm text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2">{announcement.content}</p>
            </>
          )}

          {/* Replies Section */}
          <div className="mt-4 space-y-2">
            {announcement.replies?.map((reply) => (
              <div key={reply.id} className="ml-8 mt-2 p-2 bg-gray-50 rounded">
                {editingReply?.id === reply.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editReplyContent}
                      onChange={(e) => setEditReplyContent(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditReply(announcement.id, reply.id, editReplyContent)}
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingReply(null);
                          setEditReplyContent('');
                        }}
                        className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{reply.content}</p>
                    {(user?.role === 'admin' || user?.id === reply.user_id) && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => {
                            setEditingReply({ id: reply.id, announcementId: announcement.id });
                            setEditReplyContent(reply.content);
                          }}
                          className="text-sm text-blue-500 hover:text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReply(announcement.id, reply.id)}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <textarea
                placeholder="Write a reply..."
                value={replyForms[announcement.id] || ''}
                onChange={(e) => setReplyForms(prev => ({ ...prev, [announcement.id]: e.target.value }))}
                className="textarea textarea-bordered textarea-warning w-full text-sm"
              />
              <button
                onClick={() => handleAddReply(announcement.id)}
                className="btn btn-warning btn-sm mt-2"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Announcements;