
'use client';

import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from '@/components/ui/announcement';
import { ArrowUpRight } from 'lucide-react';

const Example = () => (
  <div className="flex flex-col w-full h-screen items-center justify-center gap-4">
    <Announcement themed className="bg-orange-100 text-orange-700">
      <AnnouncementTag>Warning</AnnouncementTag>
      <AnnouncementTitle>
        Approaching your limit
        <ArrowUpRight size={16} className="shrink-0 opacity-70" />
      </AnnouncementTitle>
    </Announcement>
  </div>
);

export { Example };
