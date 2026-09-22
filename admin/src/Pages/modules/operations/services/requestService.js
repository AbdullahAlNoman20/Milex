// src/Pages/modules/operations/services/requestService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { createShipment, generateAwbNumber } from './shipmentService';
import { fetchClients } from './clientService';

const COLLECTION_KEY = 'shipmentRequests';
const SEED_URL = '/data/operationsShipmentRequests.json';

export const REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const fetchRequests = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const fetchRequestsByMode = async (mode) => {
  const records = await fetchRequests();
  return records.filter((r) => r.mode === mode);
};

export const fetchRequestsByClientEmail = async (email) => {
  if (typeof email !== 'string' || !email.trim()) return [];
  const records = await fetchRequests();
  return records.filter(
    (r) => typeof r.clientEmail === 'string' && r.clientEmail.toLowerCase() === email.trim().toLowerCase()
  );
};

export const createRequest = async (draft) => {
  if (!draft || typeof draft !== 'object') throw new Error('Invalid request data');
  if (draft.mode !== 'IMPORT' && draft.mode !== 'EXPORT') throw new Error('Invalid request mode');
  if (typeof draft.clientEmail !== 'string' || !draft.clientEmail.trim()) {
    throw new Error('Client email is required');
  }

  const records = await fetchRequests();
  const now = new Date().toISOString();
  const record = {
    id: nextId(records),
    mode: draft.mode,
    clientEmail: draft.clientEmail.trim(),
    clientName: draft.clientName || '',
    party: draft.party || {},
    parcel: draft.parcel || {},
    shipmentType: draft.shipmentType || 'NON_DOCUMENT',
    packaging: draft.packaging || '',
    services: Array.isArray(draft.services) ? draft.services : [],
    status: REQUEST_STATUS.PENDING,
    reviewNote: '',
    generatedAwbNumber: null,
    headMessage: null,
    headMessageAt: null,
    headMessageRead: false,
    clientReplies: [],
    createdAt: now,
    updatedAt: now,
  };

  saveCollection(COLLECTION_KEY, [...records, record]);
  return record;
};

export const updateRequestStatus = async (id, status, reviewNote = '') => {
  if (!Object.values(REQUEST_STATUS).includes(status)) throw new Error('Invalid status value');
  const records = await fetchRequests();
  let updatedRecord = null;

  const updated = records.map((r) => {
    if (String(r.id) !== String(id)) return r;
    updatedRecord = {
      ...r,
      status,
      reviewNote: typeof reviewNote === 'string' ? reviewNote.slice(0, 500) : '',
      updatedAt: new Date().toISOString(),
    };
    return updatedRecord;
  });

  if (!updatedRecord) throw new Error('Request not found');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};

// Approve a client request: builds a shipment record automatically (own
// company as the counter-party, real client profile if one is on file),
// generates a fresh AWB number, and links it back onto the request.
// Operations Head asks the client for a missing document / extra info on a
// specific request. Shows up on the client's Notifications indicator and
// highlighted on that request in My Requests.
export const sendHeadMessageToClient = async (id, message) => {
  if (typeof message !== 'string' || !message.trim()) throw new Error('Message cannot be empty');
  const records = await fetchRequests();
  let updatedRecord = null;
  const updated = records.map((r) => {
    if (String(r.id) !== String(id)) return r;
    updatedRecord = {
      ...r,
      headMessage: message.trim().slice(0, 500),
      headMessageAt: new Date().toISOString(),
      headMessageRead: false,
      updatedAt: new Date().toISOString(),
    };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Request not found');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};

export const markHeadMessageRead = async (id) => {
  const records = await fetchRequests();
  let updatedRecord = null;
  const updated = records.map((r) => {
    if (String(r.id) !== String(id)) return r;
    if (!r.headMessage || r.headMessageRead) { updatedRecord = r; return r; }
    updatedRecord = { ...r, headMessageRead: true };
    return updatedRecord;
  });
  if (updatedRecord) saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};

export const addClientReply = async (id, replyText) => {
  if (typeof replyText !== 'string' || !replyText.trim()) throw new Error('Reply cannot be empty');
  const records = await fetchRequests();
  let updatedRecord = null;
  const updated = records.map((r) => {
    if (String(r.id) !== String(id)) return r;
    const clientReplies = [...(r.clientReplies || []), { text: replyText.trim().slice(0, 500), at: new Date().toISOString() }];
    updatedRecord = { ...r, clientReplies, updatedAt: new Date().toISOString() };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Request not found');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};

export const approveRequestAndCreateShipment = async (id, actorName = 'System') => {
  const records = await fetchRequests();
  const request = records.find((r) => String(r.id) === String(id));
  if (!request) throw new Error('Request not found');
  if (request.status !== REQUEST_STATUS.PENDING) throw new Error('This request has already been processed');

  const clients = await fetchClients();
  const clientRecord = clients.find(
    (c) => typeof c.email === 'string' && c.email.toLowerCase() === request.clientEmail?.toLowerCase()
  );

  const ownParty = {
    companyName: clientRecord?.accountName || request.clientName || 'MILEX Client',
    contactPerson: clientRecord?.contactPerson || request.clientName || '',
    contactPhone: clientRecord?.mobile || '',
    contactEmail: request.clientEmail,
    address: clientRecord?.address || '',
    city: clientRecord?.area || 'Dhaka',
    postCode: '',
    country: 'Bangladesh',
  };

  const awbNumber = await generateAwbNumber(request.mode);
  const pickup = request.mode === 'EXPORT' ? ownParty : request.party;
  const receiver = request.mode === 'EXPORT' ? request.party : ownParty;

  const shipment = await createShipment(
    {
      awbNumber,
      refNo: `REQ-${request.id}`,
      costCarriedBy: ownParty.companyName,
      bookingDate: new Date().toISOString().slice(0, 10),
      shipmentMode: request.mode,
      clientEmail: request.clientEmail,
      pickup,
      receiver,
      parcel: request.parcel,
      documents: [],
      shipmentType: request.shipmentType || 'NON_DOCUMENT',
      packaging: request.packaging || '',
      services: request.services || [],
      paymentTransportBy: 'Sender',
      paymentDutiesBy: 'Recipient',
    },
    actorName
  );

  const updatedRequests = records.map((r) =>
    String(r.id) === String(id)
      ? { ...r, status: REQUEST_STATUS.APPROVED, generatedAwbNumber: awbNumber, updatedAt: new Date().toISOString() }
      : r
  );
  saveCollection(COLLECTION_KEY, updatedRequests);

  return { request: updatedRequests.find((r) => String(r.id) === String(id)), shipment };
};