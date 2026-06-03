import { collection, doc } from 'firebase/firestore';

export function getPublicCollection(db, appId, collectionName) {
  return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
}

export function getPublicDoc(db, appId, collectionName, docId) {
  return doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
}
