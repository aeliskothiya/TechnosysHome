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
