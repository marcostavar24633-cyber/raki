import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Check, Eye, ChevronLeft, ChevronRight, Clock3, Fish, Menu, Minus, Plus, ShoppingBag, Truck, Phone, X } from 'lucide-react';
import { gsap } from 'gsap';

type Product = { id:number; name:string; subtitle:string; price:number; unit:string; image:string; tag?:string; category:'live' };
type CartLine = { product:Product; qty:number };
type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    theme?: 'light' | 'dark' | 'auto';
    callback: (token: string) => void;
    'error-callback'?: () => void;
    'expired-callback'?: () => void;
  }) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }
let turnstileScriptPromise: Promise<void> | null = null;
const loadTurnstileScript = () => {
  if (window.turnstile) return Promise.resolve();
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise<void>((resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Не удалось загрузить проверку безопасности.')), { once: true });
    });
  }
  return turnstileScriptPromise;
};

const asset=(path:string)=>`${import.meta.env.BASE_URL}${path.replace(/^\/raki\//,'')}`;
const products:Product[] = [
  {id:1,name:'Живые раки — мелкие',subtitle:'Мелкие речные раки. Цена указана за 1 кг.',price:1900,unit:'кг',image:asset('/raki/Рак с укропом на керамической тарелке мелкий.png'),tag:'Мелкий размер · ≈ 30 шт. / 1 кг',category:'live'},
  {id:5,name:'Живые раки — средние',subtitle:'Средние речные раки. Цена указана за 1 кг.',price:2300,unit:'кг',image:asset('/raki/Аппетитный рак с укропом на тарелке средний.png'),tag:'Средний размер · ≈ 20 шт. / 1 кг',category:'live'},
  {id:6,name:'Живые раки — крупные',subtitle:'Крупные речные раки. Цена указана за 1 кг.',price:2900,unit:'кг',image:asset('/raki/Аппетитный рак с укропом на тарелке крупный.png'),tag:'Крупный размер · ≈ 12 шт. / 1 кг',category:'live'},
  {id:7,name:'Живые раки — отборные',subtitle:'Отборные речные раки. Цена указана за 1 кг.',price:3500,unit:'кг',image:asset('/raki/Аппетитный рак с укропом на тарелке отборный.png'),tag:'Отборный размер · ≈ 7 шт. / 1 кг',category:'live'}
];
const money=(n:number)=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const MAX_CART_KG=100;
const restoreCart=():CartLine[]=>{
  try{
    const raw=JSON.parse(localStorage.getItem('rak-cart')||'[]');
    if(!Array.isArray(raw)) return [];
    return raw.flatMap((line:unknown)=>{
      if(!line || typeof line!=='object') return [];
      const candidate=line as {product?:{id?:unknown};qty?:unknown};
      const product=products.find(item=>item.id===candidate.product?.id);
      const qty=Number(candidate.qty);
      if(!product || !Number.isFinite(qty) || qty<=0 || qty>100) return [];
      if(product.unit==='кг' && Math.round(qty*2)!==qty*2) return [];
      if(product.unit!=='кг' && !Number.isInteger(qty)) return [];
      return [{product,qty}];
    });
  }catch{return []}
};
export default function App(){
  const [cart,setCart]=useState<CartLine[]>(restoreCart);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  const [turnstileToken,setTurnstileToken]=useState('');
  const resetTurnstile = () => {
    setTurnstileToken('');
    if (turnstileWidgetRef.current && window.turnstile) window.turnstile.reset(turnstileWidgetRef.current);
  };


  const [cartNotice,setCartNotice]=useState('');
  const [soundEnabled,setSoundEnabled]=useState(false);
  const playAddSound=()=>{
    if(!soundEnabled) return;
    try{
      const AudioContextClass=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!AudioContextClass) return;
      const context=new AudioContextClass();
      const now=context.currentTime;
      [660,880].forEach((frequency,index)=>{
        const oscillator=context.createOscillator();
        const gain=context.createGain();
        oscillator.type='sine'; oscillator.frequency.setValueAtTime(frequency,now+index*.075);
        gain.gain.setValueAtTime(.0001,now+index*.075);
        gain.gain.exponentialRampToValueAtTime(.045,now+index*.075+.018);
        gain.gain.exponentialRampToValueAtTime(.0001,now+index*.075+.19);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(now+index*.075); oscillator.stop(now+index*.075+.2);
      });
      window.setTimeout(()=>{void context.close()},450);
    }catch{/* Audio is optional; ordering must never depend on it. */}
  };
  const [quickView,setQuickView]=useState<Product|null>(null),[shareMethod,setShareMethod]=useState<'share'|'copy'|'manual'|'manual-no-telegram'|'phone'|'server'|''>(''); const [orderText,setOrderText]=useState(''); const [cartOpen,setCartOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[activeSlide,setActiveSlide]=useState(0),[checkout,setCheckout]=useState(false),[sent,setSent]=useState(false),[isSubmitting,setIsSubmitting]=useState(false),[orderError,setOrderError]=useState(''),[quantity,setQuantity]=useState(2);
  useEffect(() => {
    if (!checkout || import.meta.env.BASE_URL !== '/' || !turnstileSiteKey || !turnstileContainerRef.current) return;
    let disposed = false;
    let widgetId: string | null = null;
    loadTurnstileScript().then(() => {
      if (disposed || !turnstileContainerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'dark',
        callback: (token) => setTurnstileToken(token),
        'error-callback': () => { setTurnstileToken(''); setOrderError('Не удалось выполнить проверку безопасности. Обновите проверку и попробуйте снова.'); },
        'expired-callback': () => { setTurnstileToken(''); setOrderError('Проверка безопасности истекла. Пройдите её ещё раз.'); }
      });
      turnstileWidgetRef.current = widgetId;
    }).catch(() => {
      if (!disposed) setOrderError('Не удалось загрузить проверку безопасности. Обновите страницу и попробуйте снова.');
    });
    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      if (turnstileWidgetRef.current === widgetId) turnstileWidgetRef.current = null;
      setTurnstileToken('');
    };
  }, [checkout, turnstileSiteKey]);
  useEffect(()=>{try{localStorage.setItem('rak-cart',JSON.stringify(cart))}catch{/* Storage may be disabled; cart remains usable for this session. */}},[cart]);
  useEffect(()=>{
    const root=document.documentElement;
    root.style.setProperty('--value-photo-image',`url("${asset('/raki/Гора свежих раков на мокром камне-2.png')}")`);
    root.style.setProperty('--value-photo-image-two',`url("${asset('/raki/Макросъёмка речного рака на мокром камне-4.png')}")`);
    root.style.setProperty('--delivery-image',`url("${asset('/raki/Раки с укропом и лимоном в чугунной сковороде-1.png')}")`);
  },[]);
  useEffect(()=>{
    if(!menuOpen) return;
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape') setMenuOpen(false)};
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  },[menuOpen]);
  useEffect(()=>{
    const panelOpen=cartOpen||checkout||!!quickView;
    if(!panelOpen) return;
    const previousOverflow=document.body.style.overflow;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    document.body.style.overflow='hidden';
    const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
    const dialog=dialogs[dialogs.length-1];
    const getFocusable=()=>dialog?Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getAttribute('aria-hidden')!=='true'): [];
    const focusFrame=window.requestAnimationFrame(()=>{
      const focusable=getFocusable();
      (focusable[0]||dialog)?.focus();
    });
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(quickView) setQuickView(null);
        else if(checkout) setCheckout(false);
        else setCartOpen(false);
        return;
      }
      if(event.key==='Tab'&&dialog){
        const focusable=getFocusable();
        if(!focusable.length){event.preventDefault();dialog.focus();return;}
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    window.addEventListener('keydown',onKeyDown);
    return ()=>{
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow=previousOverflow;
      window.removeEventListener('keydown',onKeyDown);
      if(previousFocus?.isConnected) previousFocus.focus();
    };
  },[cartOpen,checkout,quickView]);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero=document.querySelector<HTMLElement>('.hero');
    if(!hero) return;
    let frame=0;
    let pointerX=0;
    let pointerY=0;
    const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const update=()=>{
      frame=0;
      const rect=hero.getBoundingClientRect();
      const distance=Math.max(-100,Math.min(100,-rect.top*.22));
      hero.style.setProperty('--hero-parallax-y',distance+'px');
      hero.style.setProperty('--hero-parallax-x',pointerX+'px');
      hero.style.setProperty('--hero-pointer-y',pointerY+'px');
    };
    const schedule=()=>{if(!frame) frame=requestAnimationFrame(update)};
    const onMove=(event:PointerEvent)=>{
      if(!finePointer) return;
      const rect=hero.getBoundingClientRect();
      pointerX=((event.clientX-rect.left)/rect.width-.5)*-14;
      pointerY=((event.clientY-rect.top)/rect.height-.5)*-10;
      schedule();
    };
    const onLeave=()=>{pointerX=0;pointerY=0;schedule()};
    update();
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    hero.addEventListener('pointermove',onMove,{passive:true});
    hero.addEventListener('pointerleave',onLeave);
    return ()=>{
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
      hero.removeEventListener('pointermove',onMove);
      hero.removeEventListener('pointerleave',onLeave);
      if(frame) cancelAnimationFrame(frame);
      hero.style.removeProperty('--hero-parallax-y');
      hero.style.removeProperty('--hero-parallax-x');
      hero.style.removeProperty('--hero-pointer-y');
    };
  },[]);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets=gsap.utils.toArray<HTMLElement>('.hero-copy .eyebrow, .hero-copy h1, .hero-copy > p, .hero-copy .hero-buttons');
    gsap.fromTo(targets,{y:26,opacity:0,filter:'blur(5px)'},{y:0,opacity:1,filter:'blur(0px)',duration:.85,stagger:.11,ease:'power3.out',overwrite:true});
    gsap.fromTo('.hero-stamp',{scale:.82,opacity:0,rotate:-8},{scale:1,opacity:1,rotate:12,duration:1,ease:'back.out(1.5)',delay:.18,overwrite:true});
  },[activeSlide]);
  useEffect(()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce) return;
    const items=Array.from(document.querySelectorAll<HTMLElement>('.values .value-photo-img,.craft-image img'));
    if(!items.length) return;
    let frame=0;
    const update=()=>{
      frame=0;
      items.forEach(item=>{
        const rect=item.parentElement?.getBoundingClientRect();
        if(!rect) return;
        const offset=(rect.top+rect.height/2-window.innerHeight/2)/window.innerHeight;
        item.style.setProperty('--scroll-parallax-y',`${Math.max(-22,Math.min(22,offset*-28))}px`);
      });
    };
    const onScroll=()=>{if(!frame) frame=requestAnimationFrame(update)};
    update();
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    return ()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);if(frame)cancelAnimationFrame(frame)};
  },[]);
  useEffect(()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce || !('IntersectionObserver' in window)) return;
    const nodes=Array.from(document.querySelectorAll<HTMLElement>('main .section,main .craft,main .delivery,main .final-cta,main .intro,main .catalog,main .calculator,main .values,main .product-card,main .value-card'));
    nodes.forEach(node=>node.classList.add('reveal-ready'));
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      entry.target.classList.toggle('is-visible',entry.isIntersecting);
    }),{threshold:.08,rootMargin:'-8% 0px -8% 0px'});
    nodes.forEach(node=>observer.observe(node));
    return ()=>{observer.disconnect();nodes.forEach(node=>node.classList.remove('reveal-ready','is-visible'))};
  },[]);
  useEffect(()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce) return;
    // Cover the entire visible site: header, all main sections, footer and floating UI.
    // Each selected element is evaluated by its own lower edge as it enters the top fade zone.
    const selector='main,main *,footer,footer *,[role="dialog"],[role="dialog"] *,[role="complementary"],[role="complementary"] *';
    const textTargets='h1,h2,h3,h4,h5,h6,p,li,a,button,span,strong,em,b,small,label,blockquote,figcaption,summary,dt,dd';
    const visualTargets='section,article,aside,nav,form,figure,details,img,picture,video,canvas,[role="dialog"],[role="complementary"],.product-card,.format-card,.process-item,.value-card,.contact-panel,.craft-image,.quick-view-photo,.hero-photo-layer,.hero-stamp';
    const allNodes=Array.from(document.querySelectorAll<HTMLElement>(selector));
    // Include text elements even when nested inside a section/card, plus each major visual block.
    const nodes=allNodes.filter(node=>node.matches(textTargets+', '+visualTargets));
    nodes.forEach(node=>node.dataset.scrollTextFade='true');
    let frame=0;
    const update=()=>{
      frame=0;
      const zoneStart=200;
      const zoneEnd=50;
      nodes.forEach(node=>{
        const rect=node.getBoundingClientRect();
        // Use the bottom edge so a paragraph/card does not disappear when only its first line enters the zone.
        const edge=rect.bottom;
        const progress=Math.max(0,Math.min(1,(zoneStart-edge)/(zoneStart-zoneEnd)));
        const eased=progress*progress*progress*(progress*(progress*6-15)+10);
        const opacity=1-eased;
        const slowOffset=Math.min(54,Math.max(0,zoneStart-edge)*.18);
        node.style.setProperty('--scroll-text-opacity',opacity.toFixed(3));
        node.style.setProperty('--scroll-slow-offset',slowOffset.toFixed(1)+'px');
      });
    };
    const requestUpdate=()=>{if(!frame) frame=requestAnimationFrame(update)};
    update();
    window.addEventListener('scroll',requestUpdate,{passive:true});
    window.addEventListener('resize',requestUpdate);
    return ()=>{
      window.removeEventListener('scroll',requestUpdate);
      window.removeEventListener('resize',requestUpdate);
      if(frame) cancelAnimationFrame(frame);
      nodes.forEach(node=>{
        delete node.dataset.scrollTextFade;
        node.style.removeProperty('--scroll-text-opacity');
        node.style.removeProperty('--scroll-slow-offset');
      });
    };
  },[]);
  useEffect(()=>{
    const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!finePointer || reducedMotion) return;
    const cards=Array.from(document.querySelectorAll<HTMLElement>('.product-card'));
    const move=(event:PointerEvent)=>{
      const card=event.currentTarget as HTMLElement;
      const rect=card.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width;
      const y=(event.clientY-rect.top)/rect.height;
      card.style.setProperty('--tilt-x',((.5-y)*3.2).toFixed(2)+'deg');
      card.style.setProperty('--tilt-y',((x-.5)*3.2).toFixed(2)+'deg');
      card.style.setProperty('--card-spot-x',(x*100).toFixed(1)+'%');
      card.style.setProperty('--card-spot-y',(y*100).toFixed(1)+'%');
    };
    const reset=(event:PointerEvent)=>{
      const card=event.currentTarget as HTMLElement;
      card.style.setProperty('--tilt-x','0deg');
      card.style.setProperty('--tilt-y','0deg');
    };
    cards.forEach(card=>{card.addEventListener('pointermove',move);card.addEventListener('pointerleave',reset)});
    return ()=>cards.forEach(card=>{card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',reset)});
  },[]);
  useEffect(()=>{
    const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!finePointer || reducedMotion) return;
    const dot=document.createElement('span');
    const ring=document.createElement('span');
    dot.className='lux-cursor-dot'; ring.className='lux-cursor-ring';
    document.body.append(dot,ring); document.body.classList.add('has-lux-cursor');
    let frame=0, x=window.innerWidth/2, y=window.innerHeight/2;
    const move=(event:PointerEvent)=>{x=event.clientX;y=event.clientY;const image=(event.target as HTMLElement|null)?.closest('.product-image') as HTMLElement|null;if(image){const rect=image.getBoundingClientRect();image.style.setProperty('--spot-x',(x-rect.left)+'px');image.style.setProperty('--spot-y',(y-rect.top)+'px');}dot.style.transform='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%)';if(!frame) frame=requestAnimationFrame(()=>{ring.style.transform='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%)';frame=0;});};
    const hover=(event:PointerEvent)=>{const target=event.target as HTMLElement|null;document.body.classList.toggle('cursor-hover',!!target?.closest('a,button,[role=button],input,textarea'));};
    window.addEventListener('pointermove',move,{passive:true}); document.addEventListener('pointerover',hover);
    return ()=>{window.removeEventListener('pointermove',move);document.removeEventListener('pointerover',hover);if(frame)cancelAnimationFrame(frame);dot.remove();ring.remove();document.body.classList.remove('has-lux-cursor','cursor-hover');};
  },[]);
  // Hero slides change only after explicit user action; this avoids unsolicited motion.
  const count=cart.reduce((s,l)=>s+l.qty,0),total=cart.reduce((s,l)=>s+l.product.price*l.qty,0);
  // Вес в корзине и API принимается шагом 0,5 кг: калькулятор соблюдает то же правило.
  const recommendedKg=Math.max(0.5,Math.round(quantity*0.6*2)/2);
  const visible=products;
  const add=(p:Product,amount=1)=>{
    const current=cart.find(l=>l.product.id===p.id)?.qty||0;
    if(p.unit==='кг'&&current+amount>MAX_CART_KG){setCartNotice(`Максимум — ${MAX_CART_KG} кг одной категории. Уменьшите количество, чтобы добавить ещё.`);return;}
    setCartNotice('');playAddSound();
    setCart(old=>{const line=old.find(l=>l.product.id===p.id);return line?old.map(l=>l.product.id===p.id?{...l,qty:Number((l.qty+amount).toFixed(1))}:l ):[...old,{product:p,qty:amount}]});
  };
  const change=(id:number,delta:number)=>{
    const line=cart.find(l=>l.product.id===id);
    if(line&&delta>0&&line.product.unit==='кг'&&line.qty+delta>MAX_CART_KG){setCartNotice(`Максимум — ${MAX_CART_KG} кг одной категории.`);return;}
    setCartNotice('');
    setCart(old=>old.map(l=>l.product.id===id?{...l,qty:Number((l.qty+delta).toFixed(1))}:l).filter(l=>l.qty>0));
  };
  const slides=[{eyebrow:'РАКОВАРНЯ · ГАСТРОНОМИЯ',title:<>Вкус, который<br/><i>невозможно</i> спутать.</>,desc:'Свежие речные раки для хорошего вечера. Выберите категорию и количество для своего стола.',image:asset('/raki/%D0%90%D0%BF%D0%BF%D0%B5%D1%82%D0%B8%D1%82%D0%BD%D0%B0%D1%8F%20%D1%82%D0%B0%D1%80%D0%B5%D0%BB%D0%BA%D0%B0%20%D1%80%D0%B0%D0%BA%D0%BE%D0%B2%20%D1%81%20%D1%83%D0%BA%D1%80%D0%BE%D0%BF%D0%BE%D0%BC%20%D0%B8%20%D0%BB%D0%B8%D0%BC%D0%BE%D0%BD%D0%BE%D0%BC.png')},{eyebrow:'ОТБОРНЫЙ ПРОДУКТ · ЧЕСТНЫЙ ВКУС',title:<>Хороший повод<br/><i>собраться</i> вместе.</>,desc:'Отборный речной продукт, внимание к деталям и вкус, ради которого собираются за одним столом.',image:asset('/raki/%D0%A0%D0%B0%D0%BA%D0%B8%20%D1%81%20%D1%83%D0%BA%D1%80%D0%BE%D0%BF%D0%BE%D0%BC%20%D0%B8%20%D0%BB%D0%B8%D0%BC%D0%BE%D0%BD%D0%BE%D0%BC%20%D0%BD%D0%B0%20%D1%82%D1%91%D0%BC%D0%BD%D0%BE%D0%B9%20%D1%82%D0%B0%D1%80%D0%B5%D0%BB%D0%BA%D0%B5.png')},{eyebrow:'МАСТЕРСТВО ПРИГОТОВЛЕНИЯ',title:<>Момент, который<br/><i>запомнится</i>.</>,desc:'Для самостоятельного приготовления — фирменный рецепт от «Ехал Грека».',image:asset('/raki/%D0%A0%D0%B0%D0%BA%D0%B8%20%D1%81%20%D1%83%D0%BA%D1%80%D0%BE%D0%BF%D0%BE%D0%BC%20%D0%B8%20%D1%81%D0%BF%D0%B5%D1%86%D0%B8%D1%8F%D0%BC%D0%B8.png')}];
  // Подготавливаем следующий слайд заранее, но не загружаем все три фоновых фото при первом открытии.
  useEffect(()=>{
    const nextSlide=new Image();
    nextSlide.decoding='async';
    nextSlide.src=slides[(activeSlide+1)%slides.length].image;
  },[activeSlide]);
  const submitOrder=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(isSubmitting) return;
    if(!cart.length){setOrderError('Корзина пуста. Добавьте товары перед оформлением.');return;}
    if(import.meta.env.BASE_URL==='/' && (!turnstileSiteKey || !turnstileToken)){
      setOrderError(!turnstileSiteKey ? 'Защита формы ещё не настроена. Попробуйте связаться с нами по телефону.' : 'Пройдите проверку безопасности перед отправкой заказа.');
      return;
    }
    setOrderError('');
    const form=new FormData(e.currentTarget);
    const name=String(form.get('name')||'').trim();
    const phone=String(form.get('phone')||'').trim();
    const comment=String(form.get('comment')||'').trim();
    const phoneDigits=phone.replace(/\D/g,'');
    if(!name){setOrderError('Укажите, пожалуйста, ваше имя.');return;}
    if(phoneDigits.length<10||phoneDigits.length>15){setOrderError('Проверьте номер телефона: введите от 10 до 15 цифр.');return;}
    const lines=cart.map(({product,qty})=>'— '+product.name+': '+qty.toLocaleString('ru-RU',{maximumFractionDigits:1})+' '+product.unit+' × '+money(product.price)+' = '+money(product.price*qty));
    const shareText=[
      'Заявка с сайта РАКОВАРНЯ «ЕХАЛ ГРЕКА»','',
      'Имя: '+name,'Телефон: '+phone,'','Состав заказа:',...lines,'',
      'Предварительный итог: '+money(total),
      comment ? 'Комментарий: '+comment : '',
      '','Прошу связаться для подтверждения наличия, доставки и окончательной стоимости.'
    ].filter(Boolean).join('\n');
    setOrderText(shareText);
    const prepareManualFallback=async(message:string)=>{
      try{if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareText);}catch{/* Manual selection remains available. */}
      setShareMethod('manual');
      setOrderError(message);
      setSent(true);
    };
    // GitHub Pages is hosted under /raki/ and has no Functions runtime.
    if(import.meta.env.BASE_URL!=='/'){
      await prepareManualFallback('Автоматическая отправка недоступна на этой версии сайта. Заявка не отправлена: скопируйте текст и отправьте его продавцу вручную.');
      return;
    }
    setIsSubmitting(true);
    try{
      const response=await fetch('/api/order',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,phone,comment,turnstileToken,items:cart.map(({product,qty})=>({productId:product.id,quantity:qty}))})
      });
      let result:{ok?:boolean;error?:string}={};
      try{result=await response.json() as {ok?:boolean;error?:string};}catch{/* Invalid response is treated as failure. */}
      if(!response.ok||result.ok!==true){
        resetTurnstile();
        await prepareManualFallback(result.error||'Сервер не подтвердил доставку заказа. Заявка не отправлена автоматически; отправьте подготовленный текст вручную.');
        return;
      }
      setShareMethod('server');
      setSent(true);
      setCart([]);
      setCartNotice('');
    }catch{
      resetTurnstile();
      await prepareManualFallback('Не удалось связаться с сервером. Заявка не отправлена автоматически; корзина сохранена, отправьте текст вручную.');
    }finally{
      setIsSubmitting(false);
    }
  };
  return <>
    <div className="announcement">РАКОВАРНЯ «ЕХАЛ ГРЕКА» <span>—</span> РЕЧНЫЕ РАКИ · УЛЬЯНОВСК</div>
    <header className="header"><a className="logo logo-image-only" href="#top"><img decoding="async" className="logo-cart" src={asset('/raki/ehal-greka-header.png')} alt="РАКОВАРНЯ ЕХАЛ ГРЕКА · УЛЬЯНОВСК — логотип с повозкой и лошадью"/></a><nav id="site-navigation" aria-label="Основная навигация" className={menuOpen?'nav open':'nav'}><a href="#catalog" onClick={()=>setMenuOpen(false)}>Каталог</a><a href="#story" onClick={()=>setMenuOpen(false)}>О нас</a><a href="#craft" onClick={()=>setMenuOpen(false)}>Приготовление</a><a href="#delivery" onClick={()=>setMenuOpen(false)}>Доставка</a><a href="#faq" onClick={()=>setMenuOpen(false)}>FAQ</a></nav><div className="header-actions"><button className="sound-toggle" onClick={()=>setSoundEnabled(value=>!value)} aria-pressed={soundEnabled} aria-label={soundEnabled?"Выключить звук интерфейса":"Включить звук интерфейса"} title={soundEnabled?"Звук включён":"Звук выключен"}><span className="sound-indicator"/>{soundEnabled?"Звук вкл.":"Звук выкл."}</button><button className="cart-trigger" onClick={()=>setCartOpen(true)} aria-label="Открыть корзину"><ShoppingBag size={18}/><span>Корзина</span><b>{count}</b></button><button className="menu-trigger" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Меню" aria-expanded={menuOpen} aria-controls="site-navigation">{menuOpen?<X/>:<Menu/>}</button></div></header>
    <main id="top">
      <section className="hero">{slides.map((slide,index)=><div key={index} className={`hero-photo hero-photo-layer ${index===activeSlide?'is-active':''}`} aria-hidden="true" style={{backgroundImage:index===activeSlide?`linear-gradient(90deg,rgba(9,13,11,.94) 0%,rgba(9,13,11,.72) 42%,rgba(9,13,11,.12) 100%),url('${slide.image}')`:'none'}}/>)}<div className="hero-grain"/><div className="hero-inner"><div className="hero-copy" aria-live="polite" aria-atomic="true"><div className="eyebrow"><span className="eyebrow-line"/>{slides[activeSlide].eyebrow}</div><h1>{slides[activeSlide].title}</h1><p>{slides[activeSlide].desc}</p><div className="hero-buttons"><a className="btn btn-gold" href="#catalog">Выбрать раков </a><a className="text-link" href="#story">Наша философия <ArrowDown size={15}/></a></div></div><div className="hero-side"><span>{String(activeSlide+1).padStart(2,'0')} / 03</span><span className="vertical-label">FRESH CATCH · CRAFTED WITH CARE</span></div><div className="hero-bottom"><span>УЛЬЯНОВСК И ОБЛАСТЬ</span><div className="slide-controls"><button onClick={()=>setActiveSlide((activeSlide+2)%3)} aria-label="Предыдущий слайд"><ChevronLeft/></button><div className="slide-progress"><i style={{width:`${(activeSlide+1)*33.333}%`}}/></div><button onClick={()=>setActiveSlide((activeSlide+1)%3)} aria-label="Следующий слайд"><ChevronRight/></button></div><span>ПРОКРУТИТЕ ВНИЗ ↓</span></div></div><div className="hero-stamp"><span>FRESH</span><b>✳</b><span>CRAFT</span></div></section>
      <section className="ticker"><div>ЖИВОЙ УЛОВ <i>✳</i> ФИРМЕННЫЕ РЕЦЕПТЫ <i>✳</i> ЧЕСТНЫЙ ВЕС <i>✳</i> ВКУС, КОТОРЫЙ ОБЪЕДИНЯЕТ <i>✳</i> ЖИВОЙ УЛОВ <i>✳</i></div></section>
      <section className="intro section" id="story"><div className="section-index">01 <span>—</span> ФИЛОСОФИЯ</div><div className="intro-grid"><div><p className="kicker">НЕ ПРОСТО РАКИ. ЦЕЛАЯ КУЛЬТУРА ВКУСА.</p><h2>Есть вещи,<br/>которые <i>создают</i><br/>атмосферу.</h2></div><div className="intro-text"><p className="lead">В центре нашего меню — речные раки. Мы уделяем внимание свежести продукта, качеству и тому, чтобы каждый заказ стал хорошим поводом собраться за столом.</p><a className="under-link" href="#craft">Узнать наш подход </a></div></div><div className="intro-note"><span>{String(activeSlide+1).padStart(2,'0')} / 03</span><span>PRODUCT · CRAFT · MOMENT</span></div></section>
      <section className="values"><div className="value-card value-photo"><div className="value-photo-img"/><span className="photo-caption">01 — ОТБОРНЫЙ ПРОДУКТ</span></div><div className="value-card value-dark"><span className="value-number">01</span><Fish size={27}/><h3>Свежесть<br/><i>в основе.</i></h3><p>Внимание к продукту начинается задолго до того, как он окажется на вашем столе.</p></div><div className="value-card value-green"><span className="value-number">02</span><span className="value-symbol">✳</span><h3>Вкус с<br/><i>характером.</i></h3><p>Продуманные сочетания специй и рецепты, в которых нет случайных деталей.</p></div><div className="value-card value-image-two"><div className="value-photo-img"/><span className="photo-caption">03 — ПОВОД БЫТЬ ВМЕСТЕ</span></div></section>
      <section className="catalog section" id="catalog"><div className="section-index">02 <span>—</span> КАТАЛОГ</div><div className="catalog-head"><div><p className="kicker">ВЫБИРАЙТЕ СВОЙ ВЕЧЕР</p><h2>От улова<br/>до <i>удовольствия.</i></h2></div><p className="catalog-description">Выберите и закажите живых речных раков в Ульяновске: четыре категории по размеру. Цена указана за 1 кг, наличие и итоговую стоимость подтвердим перед заказом.</p></div><div className="product-grid">{visible.map((p,i)=><article className="product-card" key={p.id} data-category={p.category}><div className="product-image"><img src={p.image} alt={p.name+" — на фото варёный рак"} loading="lazy" decoding="async"/><span className="product-index">0{i+1} <i>/</i> 04</span>{p.tag&&<span className="product-tag">{p.tag}</span>}<span className="product-image-caption">ЕХАЛ ГРЕКА <i>✳</i> РЕЧНЫЕ РАКИ</span><button className="product-view" onClick={()=>setQuickView(p)} aria-label={"Подробнее о товаре: "+p.name}><Eye size={16}/><span>Подробнее</span></button></div><div className="product-info"><div className="product-title-row"><h3>{p.name}</h3><span className="product-unit">ЗА КИЛОГРАММ</span></div><p>{p.subtitle}</p><div className="product-count">≈ {([30,20,12,7] as const)[i]} шт. в 1 кг</div><div className="product-bottom"><div className="product-price-stack"><strong>{money(p.price)} <small>/ {p.unit}</small></strong><span className="weight-price">{`0,5 кг · ${money(p.price/2)}`}</span></div><div className="product-actions"><button onClick={()=>add(p)} className="add-link">В корзину</button><a className="product-call" href="tel:+79510937272" aria-label="Позвонить и заказать " title="Позвонить и заказать"><Phone size={14}/><span>Позвонить</span></a></div></div><span className="product-photo-note">На фото — варёный рак</span></div></article>)}</div><div className="catalog-foot"><span>КОЛИЧЕСТВО В 1 КГ УКАЗАНО ПРИМЕРНО</span><span>ФАКТИЧЕСКОЕ ЧИСЛО ЗАВИСИТ ОТ ВЕСА РАКОВ</span></div></section>
      
      <section className="choice-section section" id="choice"><div className="section-index">03 <span>—</span> КАК ВЫБРАТЬ</div><div className="choice-heading"><div><p className="kicker">ДВА ФОРМАТА — ОДНО УДОВОЛЬСТВИЕ</p><h2>Живые или<br/><i>варёные?</i></h2></div><p>Выбирайте формат под свой вечер: приготовить раков самостоятельно или получить готовое блюдо. Если хотите заказать уже варёных раков, заранее уточните возможность и время приготовления по телефону.</p></div><div className="choice-grid"><article className="choice-card choice-live"><img src={asset('/raki/%D0%93%D0%BE%D1%80%D0%B0%20%D1%81%D0%B2%D0%B5%D0%B6%D0%B8%D1%85%20%D1%80%D0%B0%D0%BA%D0%BE%D0%B2%20%D0%BD%D0%B0%20%D0%BC%D0%BE%D0%BA%D1%80%D0%BE%D0%BC%20%D0%BA%D0%B0%D0%BC%D0%BD%D0%B5-2.png')} alt="Кучка живых речных раков" loading="lazy" decoding="async"/><div className="choice-card-content"><span className="choice-number">01 / САМОСТОЯТЕЛЬНОЕ ПРИГОТОВЛЕНИЕ</span><h3>Живые раки</h3><p>Для тех, кто любит сам выбрать специи, настроить вкус и устроить приготовление частью вечера. В каталоге представлены живые раки четырёх размеров.</p><a className="under-link" href="#catalog">Выбрать размер</a></div></article><article className="choice-card choice-boiled"><img src={asset('/raki/%D0%9A%D0%B0%D1%81%D1%82%D1%80%D1%8E%D0%BB%D1%8F%20%D1%81%20%D1%80%D0%B0%D0%BA%D0%B0%D0%BC%D0%B8%20%D0%B8%20%D1%83%D0%BA%D1%80%D0%BE%D0%BF%D0%BE%D0%BC.png')} alt="Варёные раки на чугунной сковороде" loading="lazy" decoding="async"/><div className="choice-card-content"><span className="choice-number">02 / ГОТОВО К ПОДАЧЕ</span><h3>Варёные раки</h3><p>Подойдут, если хочется сразу накрыть стол и наслаждаться вкусом без самостоятельной готовки. Услуга варки — дополнительно 100 ₽. Возможность и время приготовления уточняйте при заказе.</p><a className="under-link" href="tel:+79510937272">Уточнить по телефону</a></div></article></div></section>
      <section className="craft" id="craft"><div className="craft-image"><img src={asset('/raki/%D0%A0%D0%B0%D0%BA%D0%B8%20%D1%81%20%D1%83%D0%BA%D1%80%D0%BE%D0%BF%D0%BE%D0%BC%20%D0%B8%20%D0%BB%D0%B8%D0%BC%D0%BE%D0%BD%D0%BE%D0%BC%20%D0%B2%20%D1%87%D1%83%D0%B3%D1%83%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BA%D0%BE%D0%B2%D0%BE%D1%80%D0%BE%D0%B4%D0%B5-1.png')} alt="Раки с укропом на чугунной сковороде" loading="lazy" decoding="async"/></div><div className="craft-content"><div className="section-index">04 <span>—</span> РЕЦЕПТ</div><p className="kicker">ФИРМЕННЫЙ СПОСОБ ПРИГОТОВЛЕНИЯ</p><h2>Как сварить<br/><i>рачков вкусно.</i></h2><p className="craft-copy">На 1 кг живых раков: 2 литра воды, 2 столовые ложки соли, 1 столовая ложка укропа, чеснок по вкусу, перец горошком и лавровый лист. По желанию добавьте другие специи.</p><div className="craft-steps"><div><b>01</b><span>Вскипятите воду со специями 1–2 минуты</span></div><div><b>02</b><span>Добавьте живых раков</span></div><div><b>03</b><span>Варите в кипящей воде 7–9 минут</span></div><div><b>04</b><span>Подавайте к столу</span></div></div><a className="btn btn-outline" href="#catalog">Выбрать раков </a></div></section>
      <section className="calculator section"><div className="section-index">05 <span>—</span> ПЛАНИРУЕМ ВЕЧЕР</div><div className="calc-grid"><div><p className="kicker">СКОЛЬКО РАКОВ НУЖНО?</p><h2>Рассчитайте<br/><i>своё количество.</i></h2><p className="calc-description">Укажите количество гостей, чтобы получить ориентир по весу. Это приблизительный расчёт: аппетит, формат встречи и выбранный размер раков могут изменить количество.</p></div><div className="calc-panel"><span className="calc-label">ГОСТЕЙ ЗА СТОЛОМ</span><div className="calc-control"><button onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Уменьшить"><Minus/></button><strong>{String(quantity).padStart(2,'0')}</strong><button onClick={()=>setQuantity(Math.min(30,quantity+1))} aria-label="Увеличить"><Plus/></button></div><div className="calc-result"><div><span>Рекомендуемое количество</span><b>{recommendedKg.toFixed(1).replace('.',',')} кг</b></div><div><span>Ориентир по мелким ракам</span><b>{money(Math.ceil(recommendedKg*1900))}</b></div></div><button className="btn btn-gold full" onClick={()=>{add(products[0],recommendedKg);setCartOpen(true)}}>Добавить в корзину </button><small className="calc-disclaimer">Расчёт ориентировочный. Стоимость рассчитана по цене мелких раков; итог зависит от выбранной категории.</small></div></div></section>
      <section className="delivery" id="delivery"><div className="delivery-bg"/><div className="delivery-inner"><div className="section-index">06 <span>—</span> ДОСТАВКА</div><div className="delivery-content"><div><p className="kicker">ВАШ ВЕЧЕР — НАША ЗАБОТА</p><h2>От нас — вкус.<br/>От вас — <i>повод.</i></h2></div><div className="delivery-points"><div><Truck/><span><b>Доставка Яндекс Go</b><small>Стоимость рассчитывается по тарифам Яндекса и зависит от маршрута. Точную сумму приложение покажет при оформлении доставки.</small></span></div><div><Clock3/><span><b>Приготовление под заказ</b><small>Возможность и срок приготовления согласуются при оформлении заказа.</small></span></div><div><ShoppingBag/><span><b>Самовывоз</b><small>Адрес: пр-т Туполева, 33А, Ульяновск.</small></span></div></div></div></div></section>
      
      
      <section className="order-process section" id="order-process"><div className="section-index">07 <span>—</span> КАК ЗАКАЗАТЬ</div><div className="section-heading"><div><p className="kicker">ЧЕТЫРЕ ПОНЯТНЫХ ШАГА</p><h2>От выбора<br/>до <i>вашего стола.</i></h2></div><p className="section-intro">Заявка не отправляется автоматически: вы проверяете состав заказа и сами выбираете чат для отправки подготовленного сообщения.</p></div><div className="process-grid"><div className="process-item"><b>01</b><h3>Выберите раков</h3><p>Укажите категорию, количество и добавьте позиции в корзину.</p></div><div className="process-item"><b>02</b><h3>Проверьте заказ</h3><p>Посмотрите состав и предварительную сумму перед отправкой.</p></div><div className="process-item"><b>03</b><h3>Отправьте заявку</h3><p>Заполните имя и телефон. Откроется профиль Telegram, а текст заказа скопируется отдельно — вставьте его в чат и отправьте вручную.</p></div><div className="process-item"><b>04</b><h3>Подтвердите детали</h3><p>Наличие, итоговую стоимость, время и условия доставки согласуем отдельно.</p></div></div></section>
      <section className="guest-notes section"><div className="guest-notes-copy"><p className="kicker">ДОВЕРИЕ — В ДЕТАЛЯХ</p><h2>Никаких<br/><i>выдуманных оценок.</i></h2><p>Мы не публикуем придуманные отзывы и рейтинги. Когда появятся подтверждённые отзывы покупателей и разрешение на публикацию, добавим сюда реальные впечатления.</p><a className="under-link" href="tel:+79510937272">Связаться с нами </a></div><div className="guest-facts"><div><b>01</b><span>понятный каталог без лишних позиций</span></div><div><b>100%</b><span>внимания к речным ракам и качеству продукта</span></div></div></section>
      <section className="faq-section section" id="faq"><div className="section-index">08 <span>—</span> ВОПРОСЫ</div><div className="section-heading"><div><p className="kicker">ПЕРЕД ТЕМ КАК ЗАКАЗАТЬ</p><h2>Коротко<br/><i>о главном.</i></h2></div><p className="section-intro">Основные условия собрали в одном месте. Если остались вопросы — напишите или позвоните перед оформлением.</p></div><div className="faq-list"><details><summary>Где купить живых раков в Ульяновске?<span>+</span></summary><p>Выберите подходящий размер в каталоге раковарни «Ехал Грека». Доступен самовывоз по адресу пр-т Туполева, 33А, а доставку можно оформить через Яндекс Go. Наличие и итоговую стоимость подтвердим отдельно. Для оформления соберите корзину, заполните контакты и вручную отправьте подготовленное сообщение в Telegram.</p></details><details><summary>Какие раки есть в каталоге?<span>+</span></summary><p>В каталоге четыре категории речных раков: мелкие, средние, крупные и отборные. Наборов, икры и других морепродуктов нет.</p></details><details><summary>Как размер влияет на вкус раков?<span>+</span></summary><p>Размер помогает выбрать формат подачи и количество раков на столе. На итоговый вкус сильнее влияют свежесть продукта, способ приготовления, время варки и сочетание специй. Если сомневаетесь, подскажем подходящий вариант при подтверждении заказа.</p></details><details><summary>Как рассчитывается стоимость?<span>+</span></summary><p>Все цены указаны за 1 кг. Заказ можно оформить с шагом 0,5 кг.</p></details><details><summary>Можно ли заказать доставку?<span>+</span></summary><p>Доставка выполняется через Яндекс Go по действующим тарифам сервиса. Стоимость зависит от маршрута и отображается при оформлении доставки.</p></details><details><summary>Когда будет готов заказ?<span>+</span></summary><p>Наличие и срок приготовления зависят от выбранных позиций. Эти детали подтверждаются при обработке заявки — не считаем заказ подтверждённым до согласования.</p></details><details><summary>Как отправить заказ через сайт?<span>+</span></summary><p>Добавьте товары в корзину, заполните контактные данные и нажмите отправку. Откроется ссылка на Telegram раковарни, а текст заказа скопируется отдельно. Вставьте его в чат и отправьте вручную. Доступность профиля по номеру зависит от настроек приватности Telegram.</p></details><details><summary>Можно ли оформить заказ на мероприятие?<span>+</span></summary><p>Наборы не предусмотрены. Можно выбрать нужное количество раков по весу.</p></details></div></section>
      <section className="contact-panel section" id="contacts"><div><p className="kicker">РАКОВАРНЯ «ЕХАЛ ГРЕКА» · УЛЬЯНОВСК · ПР-Т ТУПОЛЕВА, 33А</p><h2>Остались<br/><i>вопросы?</i></h2><p>Позвоните, чтобы уточнить наличие, размер раков и условия доставки. Или соберите заказ в корзине — контактные данные можно указать при оформлении.</p></div><div className="contact-actions"><a className="contact-phone" href="tel:+79510937272">+7 (951) 093-72-72 </a><button className="btn btn-gold" onClick={()=>setCartOpen(true)}>Собрать заказ <ShoppingBag size={17}/></button><span>пр-т Туполева, 33А · ДОСТАВКА ЯНДЕКС GO</span></div></section>
      <section className="final-cta" id="final-cta"><p className="kicker">ХОРОШИЙ ВЕЧЕР НАЧИНАЕТСЯ С ПРОСТОГО</p><h2>Пора собирать<br/><i>своих.</i></h2><button className="btn btn-gold" onClick={()=>setCartOpen(true)}>Перейти к заказу </button><div className="cta-bottom"><span>РАКОВАРНЯ «ЕХАЛ ГРЕКА» · УЛЬЯНОВСК</span><span>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</span></div></section>
    </main>
    <footer className="footer"><a className="logo" href="#top"><span className="logo-mark">Р.</span><span>РАКОВАРНЯ «ЕХАЛ ГРЕКА»<small>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</small></span></a><p>Настоящий продукт.<br/>Правильное приготовление.</p><div className="footer-links"><a href="#catalog">Каталог</a><a href="#choice">Форматы</a><a href="#order-process">Как заказать</a><a href="#faq">Вопросы</a><a href="#delivery">Доставка</a><a href={`${import.meta.env.BASE_URL}terms.html`}>Условия заказа</a><a href={`${import.meta.env.BASE_URL}privacy.html`}>Персональные данные</a></div><div className="footer-bottom"><span>© 2026 РАКОВАРНЯ «ЕХАЛ ГРЕКА»</span><span>УЛЬЯНОВСК · ПРЕДВАРИТЕЛЬНЫЙ КАТАЛОГ И ЦЕНЫ</span><a href="#top">НАВЕРХ ↑</a></div></footer>
    {quickView&&<div className="overlay quick-view-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setQuickView(null)}}><section className="quick-view-modal" role="dialog" aria-modal="true" aria-label={"Товар: "+quickView.name}><button className="close-btn quick-view-close" onClick={()=>setQuickView(null)} aria-label="Закрыть"><X/></button><div className="quick-view-photo"><img decoding="async" src={quickView.image} alt={quickView.name}/><span>РАКОВАРНЯ «ЕХАЛ ГРЕКА» · ВЫБОР ПРОДУКТА</span></div><div className="quick-view-copy"><span className="kicker">НА ФОТО — ВАРЁНЫЙ РАК · В ПРОДАЖЕ ЖИВЫЕ</span><h3>{quickView.name}</h3><p>{quickView.subtitle}</p><strong>{money(quickView.price)} <small>/ {quickView.unit}</small></strong><button className="btn btn-gold full" onClick={()=>{add(quickView);setQuickView(null);setCartOpen(true)}}>Добавить в корзину </button><small className="quick-view-note">Количество, наличие и итоговая стоимость подтверждаются при согласовании заказа.</small></div></section></div>}
    {cartOpen&&<div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Корзина"><div className="drawer-head"><div><span className="kicker">ВАШ ВЫБОР</span><h3>Корзина <sup>{count}</sup></h3></div><button className="close-btn" onClick={()=>setCartOpen(false)} aria-label="Закрыть"><X/></button></div>{cart.length===0?<div className="empty-cart"><ShoppingBag size={34}/><h4>Пока здесь пусто</h4><p>Добавьте любимые позиции из каталога — и соберём ваш заказ.</p><button className="btn btn-gold" onClick={()=>setCartOpen(false)}>В каталог </button></div>:<><div className="cart-lines">{cart.map(l=><div className="cart-line" key={l.product.id}><img decoding="async" src={l.product.image} alt=""/><div className="cart-line-info"><b>{l.product.name}</b><span>{money(l.product.price)} / {l.product.unit}</span><div className="qty"><button onClick={()=>change(l.product.id,l.product.unit==='кг'?-0.5:-1)} aria-label="Уменьшить"><Minus size={13}/></button><span>{l.qty.toLocaleString('ru-RU',{maximumFractionDigits:1})} {l.product.unit}</span><button onClick={()=>change(l.product.id,l.product.unit==='кг'?0.5:1)} aria-label="Увеличить" disabled={l.product.unit==='кг'&&l.qty>=MAX_CART_KG} title={l.product.unit==='кг'&&l.qty>=MAX_CART_KG?`Максимум ${MAX_CART_KG} кг`:undefined}><Plus size={13}/></button></div></div><strong>{money(l.product.price*l.qty)}</strong></div>)}</div>{cartNotice&&<p className="form-error" role="status" aria-live="polite">{cartNotice}</p>}<div className="cart-total"><span>ИТОГО</span><b>{money(total)}</b></div><button className="btn btn-gold full" onClick={()=>setCheckout(true)}>Оформить заказ </button><p className="cart-note">Цены предварительные. Наличие, вес, доставка и итоговая сумма подтверждаются менеджером перед приготовлением.</p></>}<a className="btn btn-outline full cart-call" href="tel:+79510937272"><Phone size={17}/> Позвонить и оформить заказ</a></aside></div>}
    {checkout&&<div className="overlay modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setCheckout(false);setSent(false)}}}><div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="close-btn modal-close" onClick={()=>{setCheckout(false);setSent(false)}} aria-label="Закрыть"><X/></button>{sent?<div className="success-state"><div className="success-icon"><Check/></div><h3>{shareMethod==='server'?'Заявка доставлена менеджеру':'Заявка подготовлена к отправке'}</h3><p>{shareMethod==='server'?'Сервер подтвердил, что Telegram принял сообщение. Менеджер свяжется с вами для подтверждения наличия, доставки и окончательной стоимости.':orderError}</p>{shareMethod!=='server'&&<><a className="btn btn-outline full" href="https://t.me/+79510937272" target="_blank" rel="noreferrer">Открыть Telegram продавца</a><label className="manual-order-copy">ТЕКСТ ЗАКАЗА<textarea readOnly value={orderText} rows={8} onFocus={e=>e.currentTarget.select()} aria-label="Текст заказа для ручного копирования"/><small>Выделите текст, скопируйте и отправьте в Telegram. Корзина сохранена до подтверждения отправки.</small></label></>}<button className="btn btn-gold full" onClick={()=>{setCheckout(false);setCartOpen(false);setSent(false)}}>Понятно</button></div>:<><p className="kicker">ПОСЛЕДНИЙ ШАГ</p><h3 id="checkout-title">Оформление<br/><i>заказа.</i></h3><p className="modal-total">Ваш заказ на сумму <b>{money(total)}</b></p><div className="checkout-steps" aria-label="Этапы оформления"><span className="step-done"><b>01</b> КОРЗИНА</span><i/><span className="step-current"><b>02</b> КОНТАКТЫ</span><i/><span><b>03</b> TELEGRAM</span></div><form onSubmit={submitOrder}><label>Ваше имя<input required name="name" autoComplete="name" placeholder="Как к вам обращаться?"/></label><label>Телефон<input required name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" pattern="[+0-9() -]{10,}"/></label><label>Комментарий<textarea name="comment" placeholder="Адрес, удобное время и пожелания" rows={3}/></label>{import.meta.env.BASE_URL==='/'&&<div className="turnstile-field"><span>ПРОВЕРКА БЕЗОПАСНОСТИ</span>{turnstileSiteKey?<div ref={turnstileContainerRef} className="turnstile-container"/>:<p className="form-error">Проверка ещё не настроена. Автоматическая отправка временно недоступна.</p>}</div>}<label className="consent"><input type="checkbox" required/> <span>Согласен на обработку персональных данных и ознакомлен с <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">политикой конфиденциальности</a></span></label>{orderError&&<p className="form-error" role="alert">{orderError}</p>}<button className="btn btn-gold full" type="submit" disabled={isSubmitting}>{isSubmitting?'Отправляем…':'Отправить заказ'}</button><small>На серверной версии заявка передаётся менеджеру через Telegram. На GitHub Pages отправьте подготовленный текст вручную.</small></form></>}</div></div>}
    <div className="mobile-bottom"><button onClick={()=>setCartOpen(true)}><ShoppingBag size={18}/> Корзина <b>{count}</b></button><a href="#catalog">Выбрать раков </a></div>
  </>;
}
