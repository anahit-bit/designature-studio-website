
import React from 'react';
import { getBlogPosts } from '../constants';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const Blog: React.FC = () => {
  const { language, t } = useLanguage();
  const posts = getBlogPosts(language);

  return (
    <section id="blog" className="pt-20 md:pt-32 pb-0 bg-white border-t border-black/5 font-body">
      <div className="max-w-[1800px] mx-auto px-8 md:px-16">
        <div className="grid lg:grid-cols-12 gap-12 items-end mb-16 md:mb-24">
          <div className="lg:col-span-8">
            <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.6em] text-black/30 mb-8">{t('blog.title')}</h2>
            <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display tracking-architectural leading-[0.95]">
              {t('blog.heading')}
            </h3>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button className="group inline-flex items-center gap-4 text-sm md:text-base font-bold uppercase tracking-[0.4em] border-b border-black/10 pb-2 hover:border-black transition-all">
              {t('btn.allInsights')}
              <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {posts.map((post) => (
            <div key={post.id} className="group cursor-pointer">
              <div className="aspect-[16/10] overflow-hidden bg-neutral-100 mb-8 relative">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                />
                <div className="absolute top-6 left-6 bg-white px-4 py-2 text-sm md:text-base font-bold uppercase tracking-widest">
                  {post.category}
                </div>
              </div>
              <p className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-black/40 mb-4">{post.date}</p>
              <h4 className="text-xl md:text-2xl font-bold font-display tracking-tight mb-6 group-hover:text-neutral-500 transition-colors">
                {post.title}
              </h4>
              <div className="w-8 h-[1px] bg-black group-hover:w-full transition-all duration-700" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
