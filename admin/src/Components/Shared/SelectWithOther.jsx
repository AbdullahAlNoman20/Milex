// src/Components/Shared/SelectWithOther.jsx
import { useState, useEffect, useCallback } from 'react';
import { sanitizeText } from '../utils/sanitize';

const OTHER_VALUE = '__OTHER__';
const MAX_OTHER_LENGTH = 120;

const SelectWithOther = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  disabled = false,
  id,
  name,
  className = '',
}) => {
  const isKnownOption = options.includes(value);
  const [isOtherMode, setIsOtherMode] = useState(value !== '' && !isKnownOption);
  const [otherText, setOtherText] = useState(isOtherMode ? value : '');

  useEffect(() => {
    const knownNow = options.includes(value);
    if (value === '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOtherMode(false);
      setOtherText('');
    } else if (!knownNow) {
      setIsOtherMode(true);
      setOtherText(value);
    } else {
      setIsOtherMode(false);
    }
  }, [value, options]);

  const handleSelectChange = useCallback(
    (e) => {
      const selected = e.target.value;
      if (selected === OTHER_VALUE) {
        setIsOtherMode(true);
        onChange?.('');
        return;
      }
      setIsOtherMode(false);
      onChange?.(selected);
    },
    [onChange]
  );

  const handleOtherInput = useCallback(
    (e) => {
      const clean = sanitizeText(e.target.value, { maxLength: MAX_OTHER_LENGTH });
      setOtherText(clean);
      onChange?.(clean);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <select
        id={id}
        name={name}
        disabled={disabled}
        className={`w-full border border-slate-200 p-2.5 rounded text-sm bg-white outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${className}`}
        value={isOtherMode ? OTHER_VALUE : value || ''}
        onChange={handleSelectChange}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other</option>
      </select>
      {isOtherMode && (
        <input
          type="text"
          disabled={disabled}
          maxLength={MAX_OTHER_LENGTH}
          placeholder="Please specify"
          className="w-full border border-emerald-300 p-2.5 rounded text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
          value={otherText}
          onChange={handleOtherInput}
        />
      )}
    </div>
  );
};

export default SelectWithOther;