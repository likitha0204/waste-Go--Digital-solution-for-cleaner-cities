import { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';
import API_URL from '../config';
import { FiMessageSquare, FiSend } from 'react-icons/fi';

const ChatWindow = ({ socket, username, room, currentUserId, broadcast = false, chatTitle }) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  const sendMessage = async () => {
    if (currentMessage !== '') {
      const messageData = {
        room: room,
        author: username,
        authorId: currentUserId, // Include ID for robust check
        message: currentMessage,
        time:
          new Date(Date.now()).getHours() +
          ':' +
          new Date(Date.now()).getMinutes().toString().padStart(2, '0'),
      };

      if (broadcast) {
        await socket.emit('broadcast_message', messageData);
      } else {
        await socket.emit('send_message', messageData);
      }
      
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage('');
    }
  };

  useEffect(() => {
    // Fetch historical messages
    const fetchHistory = async () => {
        if (!room) return;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const roomStr = String(room);
            const response = await fetch(`${API_URL}/api/messages/${roomStr}`, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setMessageList(data);
            }
        } catch (err) {
            console.error('Error fetching chat history:', err);
        }
    };

    if (room) fetchHistory();

    // Socket Logic
    if (socket) {
        if (room) {
             const roomStr = String(room);
             socket.emit('join_room', roomStr);
        }
        socket.emit('join_room', 'broadcast');
    }

    socket.off('receive_message'); 
    socket.on('receive_message', (data) => {
      const msgRoom = String(data.room);
      const currentRoom = String(room);
      
      if (msgRoom === currentRoom || msgRoom === 'broadcast') {
        setMessageList((list) => [...list, data]);
      }
    });

    return () => socket.off('receive_message');
  }, [socket, room]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-icon">
          <FiMessageSquare />
        </div>
        <div className="chat-header-info">
            <h3>{chatTitle ? chatTitle : (broadcast ? 'System Broadcast' : `Chat with ${room ? 'Admin' : 'User'}`)}</h3>

        </div>
      </div>
      
      <div className="chat-body">
          {messageList.length === 0 && (
              <div className="date-separator">
                  <span>Today</span>
              </div>
          )}

          {messageList.map((messageContent, index) => {
            // Check by ID if available, otherwise fallback to name
            const isMyMessage = (messageContent.authorId && currentUserId && messageContent.authorId === currentUserId) || messageContent.author === username;
            
            const isBroadcast = messageContent.room === 'broadcast';
            
            return (
              <div
                key={index}
                className={`message-wrapper ${isMyMessage ? 'sent' : 'received'} ${isBroadcast ? 'broadcast' : ''}`}
              >
                <div className="message-bubble">
                  {isBroadcast && !isMyMessage && <strong style={{color: '#B45309', display: 'block', marginBottom: '4px'}}>📢 {messageContent.author}</strong>}
                  {messageContent.message}
                </div>
                <div className="message-time">
                    {messageContent.time}
                    {isMyMessage && <span>• Sent</span>}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        <input
          type="text"
          className="chat-input"
          value={currentMessage}
          placeholder="Type a message..."
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button className="send-button" onClick={sendMessage}>
            <FiSend />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
