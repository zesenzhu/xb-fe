import React from 'react';

export default function FooterICP() {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="w-full py-4 flex flex-col items-center justify-center text-center z-10 select-none">
      <div className="text-[11px] text-slate-400 dark:text-zinc-600 flex flex-col sm:flex-row items-center gap-1 sm:gap-4 transition-colors">
        <span>&copy; {currentYear} 小宝修仙 版权所有</span>
        <a 
          href="https://beian.miit.gov.cn/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-slate-600 dark:hover:text-zinc-400 hover:underline transition-colors"
        >
          粤ICP备2026076899号-1
        </a>
      </div>
    </div>
  );
}
