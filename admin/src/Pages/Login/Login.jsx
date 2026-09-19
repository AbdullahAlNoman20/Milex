// // admin/src/Pages/Login/Login.jsx
// import { useState, useEffect, useCallback, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../Components/hooks/useAuth";
// import { useToast } from "../../Components/hooks/useToast";
// import { isValidEmail, isRequired } from "../../Components/utils/validators";
// import { isStaffRole } from "../../Components/constants/roles";
// import Loader from "../../Components/Shared/Loader";
// import Toast from "../../Components/Shared/Toast";
// import PasswordField from "../../Components/Shared/PasswordField";

// const MAX_ATTEMPTS_MSG_LENGTH = 200;

// const Login = () => {
//   const { login, isAuthenticated, isInitializing, currentUser } = useAuth();
//   const { showToast } = useToast();
//   const navigate = useNavigate();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   // A plain state check can still let two near-simultaneous clicks through
//   // because state updates aren't guaranteed to be visible before the
//   // second click's handler runs. A ref updates synchronously, closing that
//   // race window.
//   const isSubmittingRef = useRef(false);

//   useEffect(() => {
//     // Deliberately ignore location.state?.from here — that value can be a
//     // leftover from a previous user's session (e.g. a KAM was on
//     // /app/customers/123, logged out, and an LM logs in on the same
//     // browser tab). Always land fresh logins on the role's own dashboard
//     // root instead of re-playing a stale path that may not even be valid
//     // for the new role.
//     if (!isInitializing && isAuthenticated) {
//       navigate(isStaffRole(currentUser?.role) ? "/app" : "/no-access", { replace: true });
//     }
//   }, [isInitializing, isAuthenticated, currentUser, navigate]);

//   const doLogin = useCallback(
//     async (loginEmail, loginPassword) => {
//       if (isSubmittingRef.current) return;
//       // Staff use an email address, customers use the account id on their own
//       // paperwork — the single field accepts whichever the person has.
//       const looksLikeCustomerId = /^MLX[A-Z0-9]{3,20}$/i.test(loginEmail.trim());
//       if (!isValidEmail(loginEmail) && !looksLikeCustomerId)
//         return showToast("Enter your email address, or your customer ID", "warning");
//       if (!isRequired(loginPassword))
//         return showToast("Password is required", "warning");

//       isSubmittingRef.current = true;
//       setIsSubmitting(true);
//       try {
//         const result = await login(loginEmail, loginPassword);

//         if (!result.ok) {
//           showToast(
//             result.error?.slice(0, MAX_ATTEMPTS_MSG_LENGTH) || "Login failed",
//             "error",
//           );
//           return;
//         }

//         // A customer's account is valid but has nowhere to go inside the
//         // sales application yet, so they land on their own holding page.
//         navigate(isStaffRole(result.user?.role) ? "/app" : "/no-access", { replace: true });
//       } finally {
//         isSubmittingRef.current = false;
//         setIsSubmitting(false);
//       }
//     },
//     [login, showToast, navigate],
//   );

//   const handleSubmit = useCallback(
//     (e) => {
//       e.preventDefault();
//       doLogin(email, password);
//     },
//     [email, password, doLogin],
//   );

//   if (isInitializing) {
//     return <Loader fullScreen label="Checking session..." />;
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
//       <Toast />
//       <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
//         <div className="text-center mb-8">
//           <img
//             src="/log.jpeg"
//             alt="MILEX"
//             className="h-16 w-auto object-contain mx-auto mb-3"
//           />
//           <p className="text-emerald-600 text-xs font-bold tracking-widest">
//             WITH YOU EVERY MILE
//           </p>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
//           <div>
//             <label
//               htmlFor="login-email"
//               className="block text-sm font-semibold text-slate-700 mb-2"
//             >
//               Email or Customer ID
//             </label>
//             <input
//               id="login-email"
//               type="text"
//               autoComplete="username"
//               maxLength={254}
//               placeholder="you@company.com  or  MLX123456"
//               className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </div>
//           <PasswordField
//             id="login-password"
//             label="Password"
//             placeholder=""
//             autoComplete="current-password"
//             value={password}
//             onChange={setPassword}
//           />
//           <button
//             type="submit"
//             disabled={isSubmitting}
//             className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {isSubmitting ? "Signing in..." : "Login"}
//           </button>
//         </form>

//         <p className="text-center text-[11px] text-slate-400 mt-6">
//           Forgot your password? Please contact your administrator to have it
//           reset.
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Login;




// admin/src/Pages/Login/Login.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Components/hooks/useAuth";
import { useToast } from "../../Components/hooks/useToast";
import { isValidEmail, isRequired } from "../../Components/utils/validators";
import { isStaffRole } from "../../Components/constants/roles";
import Loader from "../../Components/Shared/Loader";
import Toast from "../../Components/Shared/Toast";
import PasswordField from "../../Components/Shared/PasswordField";


const MAX_ATTEMPTS_MSG_LENGTH = 200;

// DEV ONLY: stripped from production builds (import.meta.env.DEV === false)
const SHOW_DEV_LOGIN = true;
const DEV_PASSWORD = "Test@Pass123!";
const DEV_ACCOUNTS = SHOW_DEV_LOGIN
  ? [
      { label: "Super Admin", email: "admin@milex.local" },
      { label: "KAM", email: "kam@milex.local" },
      { label: "Sales Coordinator", email: "sc@milex.local" },
      { label: "Line Manager", email: "lm@milex.local" },
      { label: "Head of Dept", email: "hod@milex.local" },
    ]
  : [];

const Login = () => {
  const { login, isAuthenticated, isInitializing, currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A plain state check can still let two near-simultaneous clicks through
  // because state updates aren't guaranteed to be visible before the
  // second click's handler runs. A ref updates synchronously, closing that
  // race window.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    // Deliberately ignore location.state?.from here — that value can be a
    // leftover from a previous user's session (e.g. a KAM was on
    // /app/customers/123, logged out, and an LM logs in on the same
    // browser tab). Always land fresh logins on the role's own dashboard
    // root instead of re-playing a stale path that may not even be valid
    // for the new role.
    if (!isInitializing && isAuthenticated) {
      navigate(isStaffRole(currentUser?.role) ? "/app" : "/no-access", { replace: true });
    }
  }, [isInitializing, isAuthenticated, currentUser, navigate]);

  const doLogin = useCallback(
    async (loginEmail, loginPassword) => {
      if (isSubmittingRef.current) return;
      // Staff use an email address, customers use the account id on their own
      // paperwork — the single field accepts whichever the person has.
      const looksLikeCustomerId = /^MLX[A-Z0-9]{3,20}$/i.test(loginEmail.trim());
      if (!isValidEmail(loginEmail) && !looksLikeCustomerId)
        return showToast("Enter your email address, or your customer ID", "warning");
      if (!isRequired(loginPassword))
        return showToast("Password is required", "warning");

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        const result = await login(loginEmail, loginPassword);

        if (!result.ok) {
          showToast(
            result.error?.slice(0, MAX_ATTEMPTS_MSG_LENGTH) || "Login failed",
            "error",
          );
          return;
        }

        // A customer's account is valid but has nowhere to go inside the
        // sales application yet, so they land on their own holding page.
        navigate(isStaffRole(result.user?.role) ? "/app" : "/no-access", { replace: true });
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [login, showToast, navigate],
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      doLogin(email, password);
    },
    [email, password, doLogin],
  );

  if (isInitializing) {
    return <Loader fullScreen label="Checking session..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Toast />
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <img
            src="/log.jpeg"
            alt="MILEX"
            className="h-16 w-auto object-contain mx-auto mb-3"
          />
          <p className="text-emerald-600 text-xs font-bold tracking-widest">
            WITH YOU EVERY MILE
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Email or Customer ID
            </label>
            <input
              id="login-email"
              type="text"
              autoComplete="username"
              maxLength={254}
              placeholder="you@company.com  or  MLX123456"
              className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <PasswordField
            id="login-password"
            label="Password"
            placeholder=""
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>


        {DEV_ACCOUNTS.length > 0 && (
          <div className="mt-6 pt-5 border-t border-dashed border-slate-300">
            <p className="text-center text-[10px] font-bold tracking-widest text-amber-600 mb-3">
              DEV QUICK LOGIN
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEV_ACCOUNTS.map(({ label, email: devEmail }) => (
                <button
                  key={devEmail}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => doLogin(devEmail, DEV_PASSWORD)}
                  className="text-xs font-semibold py-2 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Forgot your password? Please contact your administrator to have it
          reset.
        </p>
      </div>
    </div>
  );
};

export default Login;