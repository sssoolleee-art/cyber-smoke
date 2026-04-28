import { useState } from 'react';
import type { PageName, NavState } from './types';
import Index from './pages/Index';
import Smoke from './pages/Smoke';
import Rings from './pages/Rings';
import Result from './pages/Result';
import Collection from './pages/Collection';
import Share from './pages/Share';

export default function App() {
  const [nav, setNav] = useState<NavState>({ page: 'index' });

  const navigate = (page: PageName, params?: Record<string, unknown>) => {
    setNav({ page, params });
  };

  const props = { navigate, params: nav.params ?? {} };

  switch (nav.page) {
    case 'smoke':      return <Smoke      {...props} />;
    case 'rings':      return <Rings      {...props} />;
    case 'result':     return <Result     {...props} />;
    case 'collection': return <Collection {...props} />;
    case 'share':      return <Share      {...props} />;
    default:           return <Index      {...props} />;
  }
}
