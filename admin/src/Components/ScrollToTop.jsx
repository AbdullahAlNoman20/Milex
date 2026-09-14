// src/Components/ScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // `'instant' in window` was always false, so this silently fell back to
    // 'auto' on every browser. 'auto' is the correct, universally supported
    // value for a jump with no animation.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

export default ScrollToTop;