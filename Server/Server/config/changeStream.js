import mongoose from 'mongoose';
import { getIo } from './realtime.js';

function findModelNameForCollection(collectionName) {
  const models = mongoose.models;
  for (const name of Object.keys(models)) {
    try {
      const model = models[name];
      if (model && model.collection && model.collection.collectionName === collectionName) {
        return name;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export function initChangeStream() {
  const conn = mongoose.connection;
  if (!conn) {
    console.warn('ChangeStream: mongoose connection not available');
    return null;
  }

  try {
    const changeStream = conn.watch([], { fullDocument: 'updateLookup' });
    console.log('ChangeStream: watching MongoDB change stream');

    changeStream.on('change', (change) => {
      try {
        const collection = change.ns?.coll || null;
        const op = change.operationType;
        const fullDoc = change.fullDocument || null;

        const modelName = collection ? findModelNameForCollection(collection) || collection : '*';

        const payload = {
          model: modelName,
          operation: op,
          doc: fullDoc,
          ns: change.ns,
          raw: change,
        };

        const io = getIo();
        if (io) {
          io.emit('db_change', payload);
        }

        // also log lightly for visibility in dev
        if (process.env.NODE_ENV === 'development') {
          console.log('ChangeStream event ->', payload.model, payload.operation);
        }
      } catch (e) {
        console.error('ChangeStream handler error', e);
      }
    });

    changeStream.on('error', (err) => {
      console.error('ChangeStream error:', err);
      try { changeStream.close(); } catch (e) {}
    });

    return changeStream;
  } catch (err) {
    console.warn('ChangeStream not available (requires replica set).', err && err.message || err);
    return null;
  }
}

export default initChangeStream;
