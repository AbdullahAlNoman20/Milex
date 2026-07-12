// src/Pages/modules/sales/components/CustomerContactsCard.jsx
import React from 'react';
import { humanizeStatus } from '../../../../Components/utils/format';

const CustomerContactsCard = ({ contacts = [] }) => {
  const safeContacts = Array.isArray(contacts) ? contacts : [];

  if (safeContacts.length === 0) {
    return <p className="text-xs text-slate-400">No contacts on file.</p>;
  }

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 text-xs divide-y divide-slate-200">
      {safeContacts.map((contact, i) => (
        <div key={`${contact.type}-${i}`} className="flex flex-wrap gap-2 p-4 items-center hover:bg-white transition">
          <span className="font-bold text-slate-800 w-full sm:w-1/3 text-xs">{humanizeStatus(contact.type)}</span>
          <span className="w-full sm:w-1/3 text-slate-600">
            {contact.name} {contact.designation && `(${contact.designation})`}
          </span>
          <span className="w-full sm:w-1/3 sm:text-right text-slate-400 font-medium">
            {contact.mobile}
            {contact.email ? ` | ${contact.email}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CustomerContactsCard;