// admin/src/Components/context/AuthContextObject.js
// The context object lives on its own so AuthContext.jsx can export only a
// component — which is what Fast Refresh requires to hot-reload it.
import { createContext } from 'react';

export const AuthContext = createContext(null);