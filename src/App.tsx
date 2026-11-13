import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Eye, ChevronLeft, ChevronRight, Clock3, Fish, Menu, Minus, Plus, ShoppingBag, Truck, X } from 'lucide-react';
import { gsap } from 'gsap';

type Product = { id:number; name:string; subtitle:string; price:number; unit:string; image:string; tag?:string; category:'live'|'cooked'|'sets' };
type CartLine = { product:Product; qty:number };
const products:Product[] = [
  {id:1,name:'Живые раки — мелкий',subtitle:'Компактный размер для тех, кто предпочитает небольших раков. Цена указана за 1 кг.',price:1900,unit:'кг',image:'https://images.pexels.com/photos/40784900/pexels-photo-40784900.jpeg?auto=compress&cs=tinysrgb&w=1200',tag:'Мелкий размер',category:'live'},
  {id:5,name:'Живые раки — средний',subtitle:'Универсальный вариант для стола и компании. Цена указана за 1 кг.',price:2300,unit:'кг',image:'https://images.pexels.com/photos/36851945/pexels-photo-36851945.jpeg?auto=compress&cs=tinysrgb&w=1200',tag:'Средний размер',category:'live'},
  {id:6,name:'Живые раки — крупный',subtitle:'Более крупный формат для тех, кто выбирает раков заметного размера. Цена указана за 1 кг.',price:2900,unit:'кг',image:'https://images.pexels.com/photos/40542867/pexels-photo-40542867.jpeg?auto=compress&cs=tinysrgb&w=1200',tag:'Крупный размер',category:'live'},
  {id:7,name:'Живые раки — отборный',subtitle:'Отдельная категория для особого выбора. Цена указана за 1 кг.',price:3500,unit:'кг',image:'https://images.pexels.com/photos/40604325/pexels-photo-40604325.jpeg?auto=compress&cs=tinysrgb&w=1200',tag:'Отборный размер',category:'live'},
  {id:2,name:'Классические',subtitle:'Варёные речные раки с пряным характером. Состав и степень насыщенности уточняйте перед заказом.',price:1490,unit:'кг',image:'https://images.pexels.com/photos/19503800/pexels-photo-19503800/free-photo-of-boiled-crayfish-dish.jpeg?auto=compress&cs=tinysrgb&w=1600',tag:'Бестселлер',category:'cooked'},
  {id:3,name:'Острые с перцем',subtitle:'Варёные речные раки с перцем. Остроту и состав специй уточняйте перед заказом.',price:1690,unit:'кг',image:'https://images.pexels.com/photos/19503800/pexels-photo-19503800/free-photo-of-boiled-crayfish-dish.jpeg?auto=compress&cs=tinysrgb&w=1600',category:'cooked'},
  {id:4,name:'Большой вечер',subtitle:'Набор варёных речных раков для общего стола. Состав и вес согласуются при подтверждении заказа.',price:4990,unit:'набор',image:'https://images.pexels.com/photos/19503800/pexels-photo-19503800/free-photo-of-boiled-crayfish-dish.jpeg?auto=compress&cs=tinysrgb&w=1600',tag:'Для компании',category:'sets'}
];
const money=(n:number)=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
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
  const [quickView,setQuickView]=useState<Product|null>(null),[shareMethod,setShareMethod]=useState<'share'|'copy'|'manual'|''>(''); const [cartOpen,setCartOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[activeSlide,setActiveSlide]=useState(0),[category,setCategory]=useState('all'),[checkout,setCheckout]=useState(false),[sent,setSent]=useState(false),[orderError,setOrderError]=useState(''),[quantity,setQuantity]=useState(2);
  useEffect(()=>{localStorage.setItem('rak-cart',JSON.stringify(cart))},[cart]);
  useEffect(()=>{
    const panelOpen=cartOpen||checkout||!!quickView;
    if(!panelOpen) return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(quickView) setQuickView(null);
        else if(checkout) setCheckout(false);
        else setCartOpen(false);
      }
    };
    window.addEventListener('keydown',onKeyDown);
    return ()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown)};
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
      const zoneStart=390;
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
  },[category]);
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
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id=window.setInterval(()=>setActiveSlide(s=>(s+1)%3),6500);
    return ()=>window.clearInterval(id);
  },[]);
  const count=cart.reduce((s,l)=>s+l.qty,0),total=cart.reduce((s,l)=>s+l.product.price*l.qty,0);
  // Вес в корзине и API принимается шагом 0,5 кг: калькулятор соблюдает то же правило.
  const recommendedKg=Math.max(0.5,Math.round(quantity*0.6*2)/2);
  const visible=useMemo(()=>category==='all'?products:products.filter(p=>p.category===category),[category]);
  const add=(p:Product,amount=1)=>{playAddSound();setCart(old=>{const line=old.find(l=>l.product.id===p.id);return line?old.map(l=>l.product.id===p.id?{...l,qty:Number((l.qty+amount).toFixed(1))}:l ):[...old,{product:p,qty:amount}]});};
  const change=(id:number,delta:number)=>setCart(old=>old.map(l=>l.product.id===id?{...l,qty:Number((l.qty+delta).toFixed(1))}:l).filter(l=>l.qty>0));
  const slides=[{eyebrow:'РАКОВАРНЯ · ГАСТРОНОМИЯ',title:<>Вкус, который<br/><i>невозможно</i> спутать.</>,desc:'Только речные раки — живые и варёные. Выберите размер, способ приготовления и количество для своего стола.',image:products[0].image},{eyebrow:'ОТБОРНЫЙ ПРОДУКТ · ЧЕСТНЫЙ ВКУС',title:<>Хороший повод<br/><i>собраться</i> вместе.</>,desc:'Четыре категории живых раков, классическая варка и вариант с перцем. Выбирайте то, что подходит именно вам.',image:products[2].image},{eyebrow:'МАСТЕРСТВО ПРИГОТОВЛЕНИЯ',title:<>Момент, который<br/><i>запомнится</i>.</>,desc:'Живых раков можно выбрать по размеру, а варёных — по варианту приготовления. Подробности заказа согласуем отдельно.',image:products[4].image}];
  const submitOrder=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!cart.length){setOrderError('Корзина пуста. Добавьте товары перед оформлением.');return;}
    setOrderError('');
    const form=new FormData(e.currentTarget);
    const name=String(form.get('name')||'').trim();
    const phone=String(form.get('phone')||'').trim();
    const comment=String(form.get('comment')||'').trim();
    const lines=cart.map(({product,qty})=>`— ${product.name}: ${qty.toLocaleString('ru-RU',{maximumFractionDigits:1})} ${product.unit} × ${money(product.price)} = ${money(product.price*qty)}`);
    const subject='Заявка с сайта РАКОВАРНЯ 73';
    const body=[
      'Новая заявка с сайта РАКОВАРНЯ 73',
      '',
      `Имя: ${name}`,
      `Телефон: ${phone}`,
      '',
      'Состав заказа:',
      ...lines,
      '',
      `Предварительный итог: ${money(total)}`,
      comment ? `Комментарий: ${comment}` : '',
      '',
      'Прошу связаться для подтверждения наличия, доставки и окончательной стоимости.'
    ].filter(Boolean).join('\n');
    const shareText=[subject,'',body].join('\n');
    try{
      if(typeof navigator.share==='function'){
        await navigator.share({title:subject,text:shareText});
        setShareMethod('share');
        setSent(true);
        return;
      }
      const telegramShareUrl='https://t.me/share/url?url=&text='+encodeURIComponent(shareText);
      const opened=window.open(telegramShareUrl,'_blank','noopener,noreferrer');
      if(!opened){
        if(navigator.clipboard?.writeText){
          await navigator.clipboard.writeText(shareText);
          setShareMethod('copy');
          setSent(true);
          return;
        }
        setOrderError('Браузер заблокировал открытие Telegram. Разрешите всплывающие окна и повторите отправку.');
        return;
      }
      setShareMethod('share');
      setSent(true);
    }catch(error){
      if(error instanceof DOMException && error.name==='AbortError') return;
      setOrderError('Не удалось подготовить заявку для Telegram. Попробуйте ещё раз.');
    }
  };
  return <>
    <div className="announcement">РАКОВАРНЯ 73 · ЖИВЫЕ И ВАРЁНЫЕ РАКИ <span>—</span> УЛЬЯНОВСК И ОБЛАСТЬ</div>
    <header className="header"><a className="logo" href="#top"><span className="logo-mark">Р.</span><span>РАКОВАРНЯ 73<small>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</small></span></a><nav className={menuOpen?'nav open':'nav'}><a href="#catalog" onClick={()=>setMenuOpen(false)}>Каталог</a><a href="#size-guide" onClick={()=>setMenuOpen(false)}>Размеры</a><a href="#formats" onClick={()=>setMenuOpen(false)}>Форматы</a><a href="#story" onClick={()=>setMenuOpen(false)}>О нас</a><a href="#craft" onClick={()=>setMenuOpen(false)}>Приготовление</a><a href="#delivery" onClick={()=>setMenuOpen(false)}>Доставка</a><a href="#faq" onClick={()=>setMenuOpen(false)}>FAQ</a></nav><div className="header-actions"><button className="sound-toggle" onClick={()=>setSoundEnabled(value=>!value)} aria-pressed={soundEnabled} aria-label={soundEnabled?"Выключить звук интерфейса":"Включить звук интерфейса"} title={soundEnabled?"Звук включён":"Звук выключен"}><span className="sound-indicator"/>{soundEnabled?"Звук вкл.":"Звук выкл."}</button><button className="cart-trigger" onClick={()=>setCartOpen(true)} aria-label="Открыть корзину"><ShoppingBag size={18}/><span>Корзина</span><b>{count}</b></button><button className="menu-trigger" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Меню">{menuOpen?<X/>:<Menu/>}</button></div></header>
    <main id="top">
      <section className="hero">{slides.map((slide,index)=><div key={index} className={`hero-photo hero-photo-layer ${index===activeSlide?'is-active':''}`} aria-hidden="true" style={{backgroundImage:`linear-gradient(90deg,rgba(9,13,11,.94) 0%,rgba(9,13,11,.72) 42%,rgba(9,13,11,.12) 100%),url('${slide.image}')`}}/>)}<div className="hero-grain"/><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/>{slides[activeSlide].eyebrow}</div><h1>{slides[activeSlide].title}</h1><p>{slides[activeSlide].desc}</p><div className="hero-buttons"><a className="btn btn-gold" href="#catalog">Выбрать раков <ArrowUpRight size={17}/></a><a className="text-link" href="#story">Наша философия <ArrowDown size={15}/></a></div></div><div className="hero-side"><span>{String(activeSlide+1).padStart(2,'0')} / 03</span><span className="vertical-label">FRESH CATCH · CRAFTED WITH CARE</span></div><div className="hero-bottom"><span>УЛЬЯНОВСК И ОБЛАСТЬ</span><div className="slide-controls"><button onClick={()=>setActiveSlide((activeSlide+2)%3)} aria-label="Предыдущий слайд"><ChevronLeft/></button><div className="slide-progress"><i style={{width:`${(activeSlide+1)*33.333}%`}}/></div><button onClick={()=>setActiveSlide((activeSlide+1)%3)} aria-label="Следующий слайд"><ChevronRight/></button></div><span>ПРОКРУТИТЕ ВНИЗ ↓</span></div></div><div className="hero-stamp"><span>FRESH</span><b>✳</b><span>CRAFT</span></div></section>
      <section className="ticker"><div>ЖИВОЙ УЛОВ <i>✳</i> ФИРМЕННЫЕ РЕЦЕПТЫ <i>✳</i> ЧЕСТНЫЙ ВЕС <i>✳</i> ВКУС, КОТОРЫЙ ОБЪЕДИНЯЕТ <i>✳</i> ЖИВОЙ УЛОВ <i>✳</i></div></section>
      <section className="intro section" id="story"><div className="section-index">01 <span>—</span> ФИЛОСОФИЯ</div><div className="intro-grid"><div><p className="kicker">НЕ ПРОСТО РАКИ. ЦЕЛАЯ КУЛЬТУРА ВКУСА.</p><h2>Есть вещи,<br/>которые <i>создают</i><br/>атмосферу.</h2></div><div className="intro-text"><p className="lead">В центре нашего меню — речные раки. Живые для самостоятельного приготовления и варёные для тех, кто хочет сразу накрыть стол.</p><p>Выберите размер живых раков: мелкий, средний, крупный или отборный. Для готового блюда доступны классический вариант и раки с перцем. Ассортимент без отвлекающих позиций — только раки.</p><a className="under-link" href="#craft">Узнать наш подход <ArrowUpRight size={16}/></a></div></div><div className="intro-note"><span>{String(activeSlide+1).padStart(2,'0')} / 03</span><span>PRODUCT · CRAFT · MOMENT</span></div></section>
      <section className="values"><div className="value-card value-photo"><div className="value-photo-img"/><span className="photo-caption">01 — ОТБОРНЫЙ ПРОДУКТ</span></div><div className="value-card value-dark"><span className="value-number">01</span><Fish size={27}/><h3>Свежесть<br/><i>в основе.</i></h3><p>Внимание к продукту начинается задолго до того, как он окажется на вашем столе.</p></div><div className="value-card value-green"><span className="value-number">02</span><span className="value-symbol">✳</span><h3>Вкус с<br/><i>характером.</i></h3><p>Продуманные сочетания специй и рецепты, в которых нет случайных деталей.</p></div><div className="value-card value-image-two"><div className="value-photo-img"/><span className="photo-caption">03 — ПОВОД БЫТЬ ВМЕСТЕ</span></div></section>
      <section className="catalog section" id="catalog"><div className="section-index">02 <span>—</span> КАТАЛОГ</div><div className="catalog-head"><div><p className="kicker">ВЫБИРАЙТЕ СВОЙ ВЕЧЕР</p><h2>От улова<br/>до <i>удовольствия.</i></h2></div><p className="catalog-description">В каталоге только речные раки: живые — четырёх размерных категорий, и варёные — классические или с перцем. Все цены показаны за соответствующую единицу товара.</p></div><div className="filters">{[['all','Всё'],['live','Живые раки'],['cooked','Варёные'],['sets','Наборы']].map(([id,label])=><button key={id} className={category===id?'active':''} onClick={()=>setCategory(id)}>{label}</button>)}</div><div className="product-grid">{visible.map((p,i)=><article className="product-card" key={p.id} data-category={p.category}><div className="product-image"><img src={p.image} alt={p.name} loading="lazy"/><span className="product-index">0{i+1} <i>/</i> 07</span>{p.tag&&<span className="product-tag">{p.tag}</span>}<span className="product-image-caption">РАКОВАРНЯ 73 <i>✳</i> ОТБОРНЫЙ ПРОДУКТ</span><button className="product-view" onClick={()=>setQuickView(p)} aria-label={"Подробнее о товаре: "+p.name}><Eye size={16}/><span>Подробнее</span></button></div><div className="product-info"><div className="product-title-row"><h3>{p.name}</h3><span className="product-unit">{p.unit==='кг'?'ЗА КИЛОГРАММ':'НАБОР'}</span></div><p>{p.subtitle}</p><div className="product-bottom"><div className="product-price-stack"><strong>{money(p.price)} <small>/ {p.unit}</small></strong><span className="weight-price">{p.unit==='кг'?`0,5 кг · ${money(p.price/2)}`:`Вес по согласованию · ${money(p.price)}`}</span></div><button onClick={()=>add(p)} className="add-link">В корзину <ArrowUpRight size={16}/></button></div></div></article>)}</div><div className="catalog-foot"><span>ПРОДУКТ, КОТОРОМУ НЕ НУЖНО ЛИШНИХ СЛОВ</span><span>ЦЕНЫ УКАЗАНЫ ЗА ЕДИНИЦУ ПРОДУКТА</span></div></section>
      <section className="size-guide section" id="size-guide"><div className="section-index">02A <span>—</span> ГИД ПО РАЗМЕРАМ</div><div className="section-heading"><div><p className="kicker">РАЗМЕР ОДНОГО РАКА</p><h2>Выбирайте<br/><i>свой формат.</i></h2></div><p className="section-intro">Для ориентира показываем распространённую градацию по весу одной особи. Это справочная шкала, а не обещание наличия каждой категории: доступный размер и цену подтвердим перед заказом.</p></div><div className="size-guide-grid"><article><span>01</span><b>20–30 г</b><small>Небольшой размер</small><em>Ориентировочно 30–40 шт. в 1 кг</em></article><article><span>02</span><b>30–50 г</b><small>Средний формат</small></article><article><span>03</span><b>50–70 г</b><small>Крупнее среднего</small></article><article><span>04</span><b>70–90 г</b><small>Крупный размер</small></article><article><span>05</span><b>90–110 г</b><small>Очень крупный</small></article><article><span>06</span><b>110+ г</b><small>Максимальный формат</small></article></div><p className="size-guide-note">Вес указан для одной особи. Количество раков в килограмме зависит от размера и фактической партии. В нашем каталоге цены и категории остаются отдельными — уточняйте наличие нужного размера при оформлении.</p></section>
      <section className="craft" id="craft"><div className="craft-image"><img src="https://images.pexels.com/photos/19503800/pexels-photo-19503800/free-photo-of-boiled-crayfish-dish.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Фирменная подача варёных речных раков" loading="lazy"/></div><div className="craft-content"><div className="section-index">03 <span>—</span> МАСТЕРСТВО</div><p className="kicker">РЕЦЕПТ — ЭТО ВНИМАНИЕ К ДЕТАЛЯМ</p><h2>Вкус рождается<br/>из <i>мастерства.</i></h2><p className="craft-copy">Выберите живых раков нужного размера или готовый вариант варки. Вкус раков можно раскрывать разными сочетаниями: укропом, чесноком, душистым перцем, томатами или лаймом. Это идеи вкусовых акцентов, а не обещание конкретного состава: ингредиенты наших вариантов и наличие уточняются при подтверждении заказа.</p><div className="craft-steps"><div><b>01</b><span>Отбор продукта</span></div><div><b>02</b><span>Подготовка и специи</span></div><div><b>03</b><span>Приготовление</span></div><div><b>04</b><span>Подача к столу</span></div></div><a className="btn btn-outline" href="#catalog">Выбрать вкус <ArrowUpRight size={17}/></a></div></section>
      <section className="calculator section"><div className="section-index">04 <span>—</span> ПЛАНИРУЕМ ВЕЧЕР</div><div className="calc-grid"><div><p className="kicker">СКОЛЬКО РАКОВ НУЖНО?</p><h2>Рассчитайте<br/><i>своё количество.</i></h2><p className="calc-description">Укажите количество гостей, чтобы получить ориентир по весу. Это приблизительный расчёт: аппетит, формат встречи и выбранный размер раков могут изменить количество.</p></div><div className="calc-panel"><span className="calc-label">ГОСТЕЙ ЗА СТОЛОМ</span><div className="calc-control"><button onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Уменьшить"><Minus/></button><strong>{String(quantity).padStart(2,'0')}</strong><button onClick={()=>setQuantity(Math.min(30,quantity+1))} aria-label="Увеличить"><Plus/></button></div><div className="calc-result"><div><span>Рекомендуемое количество</span><b>{recommendedKg.toFixed(1).replace('.',',')} кг</b></div><div><span>Ориентир по классическим ракам</span><b>{money(Math.ceil(recommendedKg*1490))}</b></div></div><button className="btn btn-gold full" onClick={()=>{add(products.find(p=>p.id===2)!,recommendedKg);setCartOpen(true)}}>Добавить в корзину <ArrowUpRight size={17}/></button><small className="calc-disclaimer">Расчёт ориентировочный. Стоимость рассчитана по цене классических варёных раков в каталоге; наличие и итог заказа подтверждаются отдельно.</small></div></div></section>
      <section className="delivery" id="delivery"><div className="delivery-bg"/><div className="delivery-inner"><div className="section-index">05 <span>—</span> ДОСТАВКА</div><div className="delivery-content"><div><p className="kicker">ВАШ ВЕЧЕР — НАША ЗАБОТА</p><h2>От нас — вкус.<br/>От вас — <i>повод.</i></h2></div><div className="delivery-points"><div><Truck/><span><b>Доставка по городу и области</b><small>Зона, стоимость и время доставки согласуются при подтверждении заказа.</small></span></div><div><Clock3/><span><b>Приготовление под заказ</b><small>Возможность и срок приготовления согласуются при оформлении заказа.</small></span></div><div><ShoppingBag/><span><b>Заказы для мероприятий</b><small>Количество раков для встречи или мероприятия можно указать в заказе.</small></span></div></div></div></div></section>
      
      <section className="formats section" id="formats"><div className="section-index">06 <span>—</span> ФОРМАТЫ</div><div className="section-heading"><div><p className="kicker">ПОДХОДЯЩИЙ ВАРИАНТ ДЛЯ КАЖДОГО ПОВОДА</p><h2>Выберите формат<br/><i>своего вечера.</i></h2></div><p className="section-intro">Не нужно разбираться в сложном меню. Выберите подходящий вариант — состав и детали заказа можно уточнить при подтверждении.</p></div><div className="format-grid"><article className="format-card"><span className="format-no">01 / НАЧАТЬ С ПРОСТОГО</span><h3>Классический<br/><i>вкус.</i></h3><p>Варёные раки — готовый вариант для стола без самостоятельного приготовления.</p><strong>от 1 490 ₽ <small>/ кг</small></strong><a href="#catalog" onClick={()=>setCategory('cooked')}>Выбрать варёных <ArrowUpRight size={15}/></a></article><article className="format-card format-card-featured"><span className="format-no">02 / ДЛЯ КОМПАНИИ</span><h3>Большой<br/><i>вечер.</i></h3><p>Набор варёных раков для общей встречи. Вес и состав согласуем перед подтверждением.</p><strong>4 990 ₽ <small>/ набор</small></strong><a href="#catalog" onClick={()=>setCategory('sets')}>Посмотреть набор <ArrowUpRight size={15}/></a></article><article className="format-card"><span className="format-no">03 / ВАШ ВЫБОР</span><h3>Живые<br/><i>раки.</i></h3><p>Четыре размерные категории — от мелкого до отборного размера.</p><strong>от 1 900 ₽ <small>/ кг</small></strong><a href="#catalog" onClick={()=>setCategory('live')}>Выбрать размер <ArrowUpRight size={15}/></a></article></div></section>
      <section className="order-process section" id="order-process"><div className="section-index">07 <span>—</span> КАК ЗАКАЗАТЬ</div><div className="section-heading"><div><p className="kicker">ЧЕТЫРЕ ПОНЯТНЫХ ШАГА</p><h2>От выбора<br/>до <i>вашего стола.</i></h2></div><p className="section-intro">Заявка не отправляется автоматически: вы проверяете состав заказа и сами выбираете чат для отправки подготовленного сообщения.</p></div><div className="process-grid"><div className="process-item"><b>01</b><h3>Выберите раков</h3><p>Укажите категорию, количество и добавьте позиции в корзину.</p></div><div className="process-item"><b>02</b><h3>Проверьте заказ</h3><p>Посмотрите состав и предварительную сумму перед отправкой.</p></div><div className="process-item"><b>03</b><h3>Отправьте заявку</h3><p>Заполните имя и телефон, затем выберите Telegram или другой доступный способ отправки.</p></div><div className="process-item"><b>04</b><h3>Подтвердите детали</h3><p>Наличие, итоговую стоимость, время и условия доставки согласуем отдельно.</p></div></div></section>
      <section className="guest-notes section"><div className="guest-notes-copy"><p className="kicker">ДОВЕРИЕ — В ДЕТАЛЯХ</p><h2>Никаких<br/><i>выдуманных оценок.</i></h2><p>Мы не публикуем придуманные отзывы и рейтинги. Когда появятся подтверждённые отзывы покупателей и разрешение на публикацию, добавим сюда реальные впечатления.</p><a className="under-link" href="tel:+79631282558">Связаться с нами <ArrowUpRight size={16}/></a></div><div className="guest-facts"><div><b>04</b><span>размера живых раков</span></div><div><b>02</b><span>варианта варёных раков</span></div><div><b>01</b><span>понятный каталог без лишних позиций</span></div></div></section>
      <section className="faq-section section" id="faq"><div className="section-index">08 <span>—</span> ВОПРОСЫ</div><div className="section-heading"><div><p className="kicker">ПЕРЕД ТЕМ КАК ЗАКАЗАТЬ</p><h2>Коротко<br/><i>о главном.</i></h2></div><p className="section-intro">Основные условия собрали в одном месте. Если остались вопросы — напишите или позвоните перед оформлением.</p></div><div className="faq-list"><details><summary>Какие раки есть в каталоге?<span>+</span></summary><p>Живые раки представлены четырьмя категориями: мелкие, средние, крупные и отборные. Из варёных доступны классические и с перцем. Также есть набор «Большой вечер».</p></details><details><summary>Как размер влияет на вкус раков?<span>+</span></summary><p>Размер помогает выбрать формат подачи и количество раков на столе. На итоговый вкус сильнее влияют свежесть продукта, способ приготовления, время варки и сочетание специй. Если сомневаетесь, подскажем подходящий вариант при подтверждении заказа.</p></details><details><summary>Как рассчитывается стоимость?<span>+</span></summary><p>Для позиций с единицей «кг» цена указана за килограмм. Для живых раков доступен заказ с шагом 0,5 кг. Набор «Большой вечер» указан по цене за набор; его вес согласуется отдельно.</p></details><details><summary>Можно ли заказать доставку?<span>+</span></summary><p>Доставка предусмотрена по Ульяновску и области. Возможность, зона, стоимость и время доставки согласуются при подтверждении заявки.</p></details><details><summary>Когда будет готов заказ?<span>+</span></summary><p>Наличие и срок приготовления зависят от выбранных позиций. Эти детали подтверждаются при обработке заявки — не считаем заказ подтверждённым до согласования.</p></details><details><summary>Как отправить заказ через сайт?<span>+</span></summary><p>Добавьте товары в корзину, заполните контактные данные и нажмите отправку. Откроется системное меню или Telegram с подготовленным текстом. Вы сами выбираете получателя и подтверждаете отправку.</p></details><details><summary>Можно ли оформить заказ на мероприятие?<span>+</span></summary><p>Да, укажите нужное количество и формат встречи в комментарии к заказу. Состав, наличие и условия согласуем отдельно.</p></details></div></section>
      <section className="contact-panel section" id="contacts"><div><p className="kicker">РАКОВАРНЯ 73 · УЛЬЯНОВСК</p><h2>Остались<br/><i>вопросы?</i></h2><p>Позвоните, чтобы уточнить наличие, размер раков и условия доставки. Или соберите заказ в корзине — контактные данные можно указать при оформлении.</p></div><div className="contact-actions"><a className="contact-phone" href="tel:+79631282558">+7 963 128-25-58 <ArrowUpRight size={18}/></a><button className="btn btn-gold" onClick={()=>setCartOpen(true)}>Собрать заказ <ShoppingBag size={17}/></button><span>УЛЬЯНОВСК И ОБЛАСТЬ · УСЛОВИЯ ПОДТВЕРЖДАЮТСЯ ПЕРЕД ЗАКАЗОМ</span></div></section>
      <section className="final-cta" id="contacts"><p className="kicker">ХОРОШИЙ ВЕЧЕР НАЧИНАЕТСЯ С ПРОСТОГО</p><h2>Пора собирать<br/><i>своих.</i></h2><button className="btn btn-gold" onClick={()=>setCartOpen(true)}>Перейти к заказу <ArrowUpRight/></button><div className="cta-bottom"><span>РАКОВАРНЯ 73 · УЛЬЯНОВСК</span><span>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</span></div></section>
    </main>
    <footer className="footer"><a className="logo" href="#top"><span className="logo-mark">Р.</span><span>РАКОВАРНЯ 73<small>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</small></span></a><p>Настоящий продукт.<br/>Правильное приготовление.</p><div className="footer-links"><a href="#catalog">Каталог</a><a href="#formats">Форматы</a><a href="#order-process">Как заказать</a><a href="#faq">Вопросы</a><a href="#delivery">Доставка</a><a href="/terms.html">Условия заказа</a><a href="/privacy.html">Персональные данные</a></div><div className="footer-bottom"><span>© 2026 РАКОВАРНЯ 73</span><span>УЛЬЯНОВСК · ПРЕДВАРИТЕЛЬНЫЙ КАТАЛОГ И ЦЕНЫ</span><a href="#top">НАВЕРХ ↑</a></div></footer>
    {quickView&&<div className="overlay quick-view-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setQuickView(null)}}><section className="quick-view-modal" role="dialog" aria-modal="true" aria-label={"Товар: "+quickView.name}><button className="close-btn quick-view-close" onClick={()=>setQuickView(null)} aria-label="Закрыть"><X/></button><div className="quick-view-photo"><img src={quickView.image} alt={quickView.name}/><span>РАКОВАРНЯ 73 · ВЫБОР ПРОДУКТА</span></div><div className="quick-view-copy"><span className="kicker">{quickView.category==="live"?"ЖИВЫЕ РЕЧНЫЕ РАКИ":"ВАРЁНЫЕ РЕЧНЫЕ РАКИ"}</span><h3>{quickView.name}</h3><p>{quickView.subtitle}</p><strong>{money(quickView.price)} <small>/ {quickView.unit}</small></strong><button className="btn btn-gold full" onClick={()=>{add(quickView);setQuickView(null);setCartOpen(true)}}>Добавить в корзину <ArrowUpRight/></button><small className="quick-view-note">Количество, наличие и итоговая стоимость подтверждаются при согласовании заказа.</small></div></section></div>}
    {cartOpen&&<div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Корзина"><div className="drawer-head"><div><span className="kicker">ВАШ ВЫБОР</span><h3>Корзина <sup>{count}</sup></h3></div><button className="close-btn" onClick={()=>setCartOpen(false)} aria-label="Закрыть"><X/></button></div>{cart.length===0?<div className="empty-cart"><ShoppingBag size={34}/><h4>Пока здесь пусто</h4><p>Добавьте любимые позиции из каталога — и соберём ваш заказ.</p><button className="btn btn-gold" onClick={()=>setCartOpen(false)}>В каталог <ArrowRight/></button></div>:<><div className="cart-lines">{cart.map(l=><div className="cart-line" key={l.product.id}><img src={l.product.image} alt=""/><div className="cart-line-info"><b>{l.product.name}</b><span>{money(l.product.price)} / {l.product.unit}</span><div className="qty"><button onClick={()=>change(l.product.id,l.product.unit==='кг'?-0.5:-1)} aria-label="Уменьшить"><Minus size={13}/></button><span>{l.qty.toLocaleString('ru-RU',{maximumFractionDigits:1})} {l.product.unit}</span><button onClick={()=>change(l.product.id,l.product.unit==='кг'?0.5:1)} aria-label="Увеличить"><Plus size={13}/></button></div></div><strong>{money(l.product.price*l.qty)}</strong></div>)}</div><div className="cart-total"><span>ИТОГО</span><b>{money(total)}</b></div><button className="btn btn-gold full" onClick={()=>setCheckout(true)}>Оформить заказ <ArrowUpRight/></button><p className="cart-note">Цены предварительные. Наличие, вес, доставка и итоговая сумма подтверждаются менеджером перед приготовлением.</p></>}</aside></div>}
    {checkout&&<div className="overlay modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setCheckout(false);setSent(false)}}}><div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="close-btn modal-close" onClick={()=>{setCheckout(false);setSent(false)}} aria-label="Закрыть"><X/></button>{sent?<div className="success-state"><div className="success-icon"><Check/></div><h3>{shareMethod==='share'?'Telegram готов к отправке':'Заявка скопирована'}</h3><p>{shareMethod==='share'?'Открылось окно Telegram с подготовленным заказом. Выберите чат получателя и нажмите «Отправить».':'Заявка скопирована. Откройте Telegram, выберите чат получателя и вставьте текст заказа.'}</p><button className="btn btn-gold full" onClick={()=>{setCheckout(false);setCartOpen(false);setSent(false)}}>Понятно</button></div>:<><p className="kicker">ПОСЛЕДНИЙ ШАГ</p><h3 id="checkout-title">Оформление<br/><i>заказа.</i></h3><p className="modal-total">Ваш заказ на сумму <b>{money(total)}</b></p><div className="checkout-steps" aria-label="Этапы оформления"><span className="step-done"><b>01</b> КОРЗИНА</span><i/><span className="step-current"><b>02</b> КОНТАКТЫ</span><i/><span><b>03</b> TELEGRAM</span></div><form onSubmit={submitOrder}><label>Ваше имя<input required name="name" autoComplete="name" placeholder="Как к вам обращаться?"/></label><label>Телефон<input required name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" pattern="[+0-9() -]{10,}"/></label><label>Комментарий<textarea name="comment" placeholder="Адрес, удобное время и пожелания" rows={3}/></label><label className="consent"><input type="checkbox" required/> <span>Согласен на обработку персональных данных и ознакомлен с <a href="/privacy.html" target="_blank" rel="noreferrer">политикой конфиденциальности</a></span></label>{orderError&&<p className="form-error" role="alert">{orderError}</p>}<button className="btn btn-gold full" type="submit">Отправить в Telegram <ArrowUpRight/></button><small>Telegram откроет выбор чата с подготовленным текстом. Выберите получателя и подтвердите отправку. Автоматическая отправка без Telegram-бота не поддерживается.</small></form></>}</div></div>}
    <div className="mobile-bottom"><button onClick={()=>setCartOpen(true)}><ShoppingBag size={18}/> Корзина <b>{count}</b></button><a href="#catalog">Выбрать раков <ArrowUpRight size={17}/></a></div>
  </>;
}
