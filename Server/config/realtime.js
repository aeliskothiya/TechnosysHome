import mongoose from 'mongoose';
import { Server } from 'socket.io';

let io = null;

export function initRealtime(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Allow technician/client to join a room equal to their Mongo _id for targeted emits
    socket.on('register-technician', (technicianId) => {
      if (!technicianId) return;
      try {
        socket.join(String(technicianId));
      } catch (e) {
        // Silent fail
      }
    });

    socket.on('register-customer', (customerId) => {
      if (!customerId) return;
      try {
        socket.join(String(customerId));
      } catch (e) {
        // Silent fail
      }
    });

    // Chat-specific socket events
    socket.on('join-chat', (data) => {
      const { chatId, userId } = data;
      if (!chatId || !userId) return;
      
      try {
        const chatRoom = `chat-${chatId}`;
        socket.join(chatRoom);
        
        // Notify user they joined successfully
        socket.emit('chat-joined', { chatId, userId });
      } catch (e) {
        console.error('join-chat error:', e);
      }
    });

    socket.on('leave-chat', (data) => {
      const { chatId } = data;
      if (!chatId) return;
      
      try {
        const chatRoom = `chat-${chatId}`;
        socket.leave(chatRoom);
      } catch (e) {
        console.error('leave-chat error:', e);
      }
    });

    socket.on('send-message', async (data) => {
      const { chatId, message } = data;
      if (!chatId || !message) return;

      try {
        const chatRoom = `chat-${chatId}`;
        
        // Broadcast to all users in this chat room (including sender)
        io.to(chatRoom).emit('new-message', {
          chatId,
          message,
        });
      } catch (e) {
        console.error('send-message error:', e);
      }
    });

    socket.on('message-read', (data) => {
      const { chatId, messageIds, userId, userType } = data;
      if (!chatId || !messageIds) return;

      try {
        const chatRoom = `chat-${chatId}`;
        socket.to(chatRoom).emit('messages-read', {
          chatId,
          messageIds,
          readBy: userType,
          readAt: new Date(),
        });
      } catch (e) {
        console.error('message-read error:', e);
      }
    });

    socket.on('disconnect', () => {
      // Cleanup handled automatically by socket.io
    });
  });

  // Attach hooks to any already-registered models
  attachHooksToRegisteredModels();

  // Monkey-patch mongoose.model so future model registrations also get hooks
  const origModel = mongoose.model.bind(mongoose);
  mongoose.model = function (name, schema, collection, skipInit) {
    const model = origModel(name, schema, collection, skipInit);
    attachHooksToModel(model);
    return model;
  };

  return io;
}

export function getIo() {
  return io;
}

function attachHooksToRegisteredModels() {
  Object.values(mongoose.models).forEach(attachHooksToModel);
}

function attachHooksToModel(model) {
  if (!model || !model.schema) return;
  if (model.schema.__realtimeAttached) return;

  // Emit on save
  model.schema.post('save', function (doc) {
    if (io) io.emit('db_change', { model: model.modelName, operation: 'save', doc });
  });

  // Emit on remove (document.remove())
  model.schema.post('remove', function (doc) {
    if (io) io.emit('db_change', { model: model.modelName, operation: 'remove', doc });
  });

  // Emit on findOneAndUpdate / findByIdAndUpdate
  model.schema.post('findOneAndUpdate', function (doc) {
    if (io) io.emit('db_change', { model: model.modelName, operation: 'update', doc });
  });

  // Emit on findOneAndDelete / findByIdAndDelete
  model.schema.post('findOneAndDelete', function (doc) {
    if (io) io.emit('db_change', { model: model.modelName, operation: 'delete', doc });
  });

  // Flag so we don't attach twice
  model.schema.__realtimeAttached = true;
}
