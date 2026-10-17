import { useState, useEffect, useRef } from 'react';
import { graniteEvent, closeView } from '@apps-in-toss/web-framework';
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

  // 내비게이션 바 뒤로가기: 흡연장(첫 화면)이면 미니앱 종료, 그 외 화면은 흡연장으로
  const pageRef = useRef(nav.page);
  pageRef.current = nav.page;
  useEffect(() => {
    try {
      const cleanup = graniteEvent.addEventListener('backEvent', {
        onEvent: () => {
          if (pageRef.current === 'index') void closeView();
          else setNav({ page: 'index' });
        },
      });
      return () => { cleanup?.(); };
    } catch { return undefined; }
  }, []);

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
