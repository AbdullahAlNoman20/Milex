// src/Components/Shared/SelectWithOther.jsx
import { useState, useEffect, useCallback } from 'react';

const OTHER_VALUE = '__OTHER__';
const MAX_OTHER_LENGTH = 120;

const SelectWithOther = ({
  options = [],
  value = '',
  onChange,
  // Called with a typed-in value so the page can offer it in every other
  // copy of the same dropdown straight away, before anything is submitted.
  onAddCustom,
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
      // No trimming per keystroke — that silently ate spaces mid-word while
      // typing. Length is capped by maxLength on the input; the server
      // trims and strips tags on write.
      const clean = e.target.value.slice(0, MAX_OTHER_LENGTH);
      setOtherText(clean);
      onChange?.(clean);
    },
    [onChange]
  );

  // Announced on blur rather than per keystroke, so a half-typed word never
  // becomes an option — and so the spelling can still be corrected freely up
  // to the moment attention leaves the field.
  const handleOtherBlur = useCallback(() => {
    const clean = otherText.trim();
    if (clean) onAddCustom?.(clean);
  }, [otherText, onAddCustom]);

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
          onBlur={handleOtherBlur}
        />
      )}
    </div>
  );
};

export default SelectWithOther;