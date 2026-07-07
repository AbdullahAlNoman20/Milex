// src/Components/Shared/FormField.jsx
import React, { useId } from 'react';

const FormField = ({
  label,
  required = false,
  optional = false,
  error,
  hint,
  children,
  htmlFor,
}) => {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;

  return (
    <div className="mb-1">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-bold text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {optional && <span className="text-slate-400 font-normal ml-1">(Optional)</span>}
        </label>
      )}
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            id: fieldId,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined,
          })
        : children}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-[10px] text-red-600 mt-1 font-semibold">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="text-[10px] text-slate-400 mt-1">
          {hint}
        </p>
      )}
    </div>
  );
};

export default FormField;