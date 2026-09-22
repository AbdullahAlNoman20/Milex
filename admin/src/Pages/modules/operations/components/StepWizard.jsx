// src/Pages/modules/operations/components/StepWizard.jsx
// Generic step-by-step wizard shell: progress bar + Back/Next/Submit.
// The parent owns step index, content, and per-step validation.
const StepWizard = ({ steps, currentStep, onBack, onNext, onSubmit, isSubmitting }) => {
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        {steps.map((s, idx) => (
          <div key={s.title} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                idx === currentStep
                  ? 'bg-emerald-600 text-white'
                  : idx < currentStep
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <span className={`text-[10px] sm:text-xs font-bold whitespace-nowrap ${idx === currentStep ? 'text-slate-800' : 'text-slate-400'}`}>
              {s.title}
            </span>
            {idx < steps.length - 1 && <div className="w-4 sm:w-6 h-0.5 bg-slate-200 shrink-0" />}
          </div>
        ))}
      </div>

      <div>{steps[currentStep].content}</div>

      <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          disabled={currentStep === 0 || isSubmitting}
          className="text-sm font-bold text-slate-500 disabled:opacity-30 px-4 py-2 hover:text-slate-700 transition"
        >
          Back
        </button>
        {isLastStep ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default StepWizard;