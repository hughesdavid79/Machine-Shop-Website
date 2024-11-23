import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useQueryClient } from 'react-query';
import { addReply } from '../services/api';
import { formatDate } from '../utils/formatDate';

const AnnouncementCard = ({ announcement, onDelete, onEdit }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [newReply, setNewReply] = useState('');
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const handleAddReply = async () => {
    try {
      await addReply(announcement.id, { content: newReply });
      setNewReply('');
      queryClient.invalidateQueries('announcements');
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  return (
    <div className="card mb-4 shadow-sm">
      <div className="card-body">
        <h5 className="card-title">{announcement.title}</h5>
        <p className="card-text">{announcement.content}</p>
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Posted by {announcement.author} on {formatDate(announcement.timestamp)}
          </small>
          {user?.role === 'admin' && (
            <div>
              <button 
                className="btn btn-warning me-2" 
                onClick={() => onEdit(announcement)}
              >
                Edit
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => onDelete(announcement.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-3">
          <button 
            className="btn btn-warning btn-sm"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? 'Hide Replies' : 'Show Replies'}
          </button>
          
          {showReplies && (
            <div className="mt-3">
              <div className="mb-3">
                <textarea
                  className="form-control"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Write a reply..."
                />
                <button 
                  className="btn btn-warning btn-sm mt-2"
                  onClick={handleAddReply}
                  disabled={!newReply.trim()}
                >
                  Add Reply
                </button>
              </div>
              
              {announcement.replies?.map((reply) => (
                <div key={reply.id} className="card mb-2">
                  <div className="card-body py-2">
                    <p className="mb-1">{reply.content}</p>
                    <small className="text-muted">
                      {reply.username} - {formatDate(reply.timestamp)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard; 