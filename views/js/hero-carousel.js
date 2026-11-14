'use strict';
(()=>{
 const hero=document.querySelector('.modern-hero-carousel');if(!hero)return;
 const slides=Array.from(hero.querySelectorAll('.hero-slide')),indicators=Array.from(hero.querySelectorAll('.hero-indicator'));
 const prev=document.getElementById('heroPrev'),next=document.getElementById('heroNext'),caption=document.getElementById('heroPhotoCaption');
 let current=0,timer;
 function show(index){
  current=(index+slides.length)%slides.length;
  slides.forEach((slide,i)=>{slide.classList.toggle('active',i===current);slide.setAttribute('aria-hidden',String(i!==current));});
  indicators.forEach((button,i)=>{button.classList.toggle('active',i===current);button.setAttribute('aria-pressed',String(i===current));});
  if(caption){caption.textContent=slides[current].dataset.title+' →';caption.href=slides[current].dataset.href;}
 }
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function stop(){clearInterval(timer);}
 function start(){stop();if(slides.length>1&&!reduced&&!document.hidden)timer=setInterval(()=>show(current+1),5000);}
 if(!slides.length)return;
 [prev,next].forEach(button=>{if(button)button.disabled=slides.length<2;});
 if(prev)prev.onclick=()=>{show(current-1);start();};if(next)next.onclick=()=>{show(current+1);start();};
 indicators.forEach((button,i)=>{button.onclick=()=>{show(i);start();};});
 slides.forEach(slide=>{const photo=slide.querySelector('img');if(photo)photo.addEventListener('error',()=>{if(!photo.dataset.fallback){photo.dataset.fallback='true';photo.src='/images/most-rated.jpg';}});});
 hero.addEventListener('mouseenter',stop);hero.addEventListener('mouseleave',start);
 hero.addEventListener('focusin',stop);hero.addEventListener('focusout',start);
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
 let touchX;
 hero.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX;},{passive:true});
 hero.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchX;if(Math.abs(distance)>50){show(current+(distance<0?1:-1));start();}},{passive:true});
 show(0);start();
})();
