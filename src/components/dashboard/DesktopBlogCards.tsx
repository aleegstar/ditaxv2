import React from 'react';
import { BookOpen } from 'lucide-react';
import blogRechtsformen from '@/assets/blog-rechtsformen-new.webp';
import blogSaeule3a from '@/assets/blog-saeule-3a.webp';
import blogWeiterbildung from '@/assets/blog-weiterbildung.webp';

interface BlogPost {
  image: string;
  title: string;
  tags: { label: string }[];
  href: string;
}

const POSTS: BlogPost[] = [
  {
    image: blogRechtsformen,
    title: 'Rechtsformen in der Schweiz: Welche passt zu deinem Vorhaben?',
    tags: [{ label: 'Unternehmen' }, { label: 'Gründung' }],
    href: '#',
  },
  {
    image: blogSaeule3a,
    title: 'Steuern sparen mit der Säule 3a: So profitierst du doppelt',
    tags: [{ label: 'Vorsorge' }],
    href: '#',
  },
  {
    image: blogWeiterbildung,
    title: 'Weiterbildungskosten absetzen: So sparst du Steuern',
    tags: [{ label: 'Steuern sparen' }, { label: 'Studierende' }],
    href: '#',
  },
];

export const DesktopBlogCards: React.FC = () => {
  return (
    <section className="hidden md:block mt-12 mb-8">
      <div className="flex items-center gap-2 mb-5">
        <BookOpen className="w-[18px] h-[18px] text-slate-700" strokeWidth={1.75} />
        <h2 className="text-[19px] font-medium tracking-[-0.012em] text-slate-900">
          Steuerberatung
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {POSTS.map((post) => (
          <a
            key={post.title}
            href={post.href}
            className="group rounded-3xl bg-white border border-slate-200 overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-all"
          >
            <div className="p-2">
              <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={post.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="px-5 pt-3 pb-5 flex flex-col gap-3 flex-1">
              <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-slate-900 line-clamp-2">
                {post.title}
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {post.tags.map((tag) => (
                  <span
                    key={tag.label}
                    className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[12px] font-medium"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default DesktopBlogCards;
