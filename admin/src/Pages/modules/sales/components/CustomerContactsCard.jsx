// src/Pages/modules/sales/components/CustomerContactsCard.jsx

import { humanizeStatus } from '../../../../Components/utils/format';

const CustomerContactsCard = ({ contacts = [] }) => {
  const safeContacts = Array.isArray(contacts) ? contacts : [];

  if (safeContacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-6 text-center text-xs text-slate-400">
        No contacts on file.
      </div>
    );
  }

  return (
    <>
      {/* mobile: stacked cards, no horizontal scroll */}
      <div className="sm:hidden bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {safeContacts.map((contact, i) => (
          <div key={`${contact.type}-${i}`} className="px-4 py-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-slate-800">
                {contact.name || '—'}
              </span>
              <span className="font-bold text-slate-400 uppercase text-[10px] self-center">
                {humanizeStatus(contact.type)}
              </span>
            </div>
            {contact.designation && (
              <div className="flex justify-between gap-3">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Designation</span>
                <span className="text-slate-700 text-right break-words">{contact.designation}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Phone</span>
              <span className="text-slate-700">{contact.mobile || contact.phone || '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Email</span>
              <span className="text-slate-700 text-right break-words">{contact.email || '—'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* desktop/tablet: table */}
      <table className="hidden sm:table w-full text-xs border-collapse bg-white rounded-xl border border-slate-200 overflow-hidden">
        <thead>
          <tr className="bg-slate-200 text-slate-700">
            <th className="px-4 py-2.5 text-left font-bold">Type</th>
            <th className="px-4 py-2.5 text-left font-bold">Name</th>
            <th className="px-4 py-2.5 text-left font-bold">Phone</th>
            <th className="px-4 py-2.5 text-left font-bold">Email</th>
          </tr>
        </thead>
        <tbody>
          {safeContacts.map((contact, i) => (
            <tr key={`${contact.type}-${i}`} className="border-t border-slate-100">
              <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                {humanizeStatus(contact.type)}
              </td>
              <td className="px-4 py-2.5 text-slate-800 break-words">
                {contact.name || '—'}
                {contact.designation && (
                  <span className="text-slate-400 font-normal"> ({contact.designation})</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                {contact.mobile || contact.phone || '—'}
              </td>
              <td className="px-4 py-2.5 text-slate-700 break-words">
                {contact.email || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default CustomerContactsCard;