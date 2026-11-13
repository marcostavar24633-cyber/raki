import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, Fish, Menu, Minus, Plus, ShoppingBag, Truck, X } from 'lucide-react';
import { gsap } from 'gsap';

type Product = { id:number; name:string; subtitle:string; price:number; unit:string; image:string; tag?:string; category:'live'|'cooked'|'sets' };
type CartLine = { product:Product; qty:number };
const products:Product[] = [
  {id:1,name:'Раки живые',subtitle:'Отборные, крепкие, свежий улов',price:1290,unit:'кг',image:'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1000&q=85',tag:'Живой продукт',category:'live'},
  {id:2,name:'Классические',subtitle:'Варка на фирменном пряном отваре',price:1490,unit:'кг',image:'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1000&q=85',tag:'Бестселлер',category:'cooked'},
  {id:3,name:'Острые с перцем',subtitle:'Яркий характер и долгое послевкусие',price:1690,unit:'кг',image:'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1000&q=85',category:'cooked'},
  {id:4,name:'Большой вечер',subtitle:'Гастрономический набор для компании',price:4990,unit:'набор',image:'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1000&q=85',tag:'Для компании',category:'sets'}
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
  const [cartOpen,setCartOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[activeSlide,setActiveSlide]=useState(0),[category,setCategory]=useState('all'),[checkout,setCheckout]=useState(false),[sent,setSent]=useState(false),[orderError,setOrderError]=useState(''),[quantity,setQuantity]=useState(2);
  useEffect(()=>{localStorage.setItem('rak-cart',JSON.stringify(cart))},[cart]);
  useEffect(()=>{
    const panelOpen=cartOpen||checkout;
    if(!panelOpen) return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(checkout) setCheckout(false);
        else setCartOpen(false);
      }
    };
    window.addEventListener('keydown',onKeyDown);
    return ()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown)};
  },[cartOpen,checkout]);
  useEffect(()=>{
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion) return;
    const intro=gsap.fromTo('.hero-copy > *',{y:34,opacity:0},{y:0,opacity:1,duration:1,stagger:.12,ease:'power3.out',delay:.2});
    const photo=gsap.fromTo('.hero-photo',{scale:1.12},{scale:1,duration:1.8,ease:'power2.out'});
    return ()=>{intro.kill();photo.kill()};
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
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id=window.setInterval(()=>setActiveSlide(s=>(s+1)%3),6500);
    return ()=>window.clearInterval(id);
  },[]);
  const count=cart.reduce((s,l)=>s+l.qty,0),total=cart.reduce((s,l)=>s+l.product.price*l.qty,0);
  // Вес в корзине и API принимается шагом 0,5 кг: калькулятор соблюдает то же правило.
  const recommendedKg=Math.max(0.5,Math.round(quantity*0.6*2)/2);
  const visible=useMemo(()=>category==='all'?products:products.filter(p=>p.category===category),[category]);
  const add=(p:Product,amount=1)=>setCart(old=>{const line=old.find(l=>l.product.id===p.id);return line?old.map(l=>l.product.id===p.id?{...l,qty:Number((l.qty+amount).toFixed(1))}:l):[...old,{product:p,qty:amount}]});
  const change=(id:number,delta:number)=>setCart(old=>old.map(l=>l.product.id===id?{...l,qty:Number((l.qty+delta).toFixed(1))}:l).filter(l=>l.qty>0));
  const slides=[{eyebrow:'РАКОВАРНЯ · ГАСТРОНОМИЯ',title:<>Вкус, который<br/><i>невозможно</i> спутать.</>,desc:'Живые и варёные раки. Настоящий продукт, правильное приготовление и удовольствие, которым хочется делиться.'},{eyebrow:'ОТБОРНЫЙ ПРОДУКТ · ЧЕСТНЫЙ ВКУС',title:<>Хороший повод<br/><i>собраться</i> вместе.</>,desc:'Выбирайте свежий улов, фирменные рецепты и наборы для вечера в хорошей компании.'},{eyebrow:'МАСТЕРСТВО ПРИГОТОВЛЕНИЯ',title:<>Момент, который<br/><i>запомнится</i>.</>,desc:'Точная работа со вкусом, выразительные специи и внимание к каждой детали.'}];
  const submitOrder=(e:React.FormEvent<HTMLFormElement>)=>{
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
    ].filter(Boolean).join('\\n');
    window.location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  return <>
    <div className="announcement">РАКОВАРНЯ 73 · ЖИВЫЕ И ВАРЁНЫЕ РАКИ <span>—</span> УЛЬЯНОВСК И ОБЛАСТЬ</div>
    <header className="header"><a className="logo" href="#top"><span className="logo-mark">Р.</span><span>РАКОВАРНЯ 73<small>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</small></span></a><nav className={menuOpen?'nav open':'nav'}><a href="#catalog" onClick={()=>setMenuOpen(false)}>Каталог</a><a href="#story" onClick={()=>setMenuOpen(false)}>О нас</a><a href="#craft" onClick={()=>setMenuOpen(false)}>Приготовление</a><a href="#delivery" onClick={()=>setMenuOpen(false)}>Доставка</a><a href="#contacts" onClick={()=>setMenuOpen(false)}>Контакты</a></nav><div className="header-actions"><button className="cart-trigger" onClick={()=>setCartOpen(true)} aria-label="Открыть корзину"><ShoppingBag size={18}/><span>Корзина</span><b>{count}</b></button><button className="menu-trigger" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Меню">{menuOpen?<X/>:<Menu/>}</button></div></header>
    <main id="top">
      <section className="hero"><div className="hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(9,13,11,.94) 0%,rgba(9,13,11,.72) 42%,rgba(9,13,11,.12) 100%),url('https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=2200&q=90')`}}/><div className="hero-grain"/><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/>{slides[activeSlide].eyebrow}</div><h1>{slides[activeSlide].title}</h1><p>{slides[activeSlide].desc}</p><div className="hero-buttons"><a className="btn btn-gold" href="#catalog">Выбрать раков <ArrowUpRight size={17}/></a><a className="text-link" href="#story">Наша философия <ArrowDown size={15}/></a></div></div><div className="hero-side"><span>{String(activeSlide+1).padStart(2,'0')} / 03</span><span className="vertical-label">FRESH CATCH · CRAFTED WITH CARE</span></div><div className="hero-bottom"><span>УЛЬЯНОВСК И ОБЛАСТЬ</span><div className="slide-controls"><button onClick={()=>setActiveSlide((activeSlide+2)%3)} aria-label="Предыдущий слайд"><ChevronLeft/></button><div className="slide-progress"><i style={{width:`${(activeSlide+1)*33.333}%`}}/></div><button onClick={()=>setActiveSlide((activeSlide+1)%3)} aria-label="Следующий слайд"><ChevronRight/></button></div><span>ПРОКРУТИТЕ ВНИЗ ↓</span></div></div><div className="hero-stamp"><span>FRESH</span><b>✳</b><span>CRAFT</span></div></section>
      <section className="ticker"><div>ЖИВОЙ УЛОВ <i>✳</i> ФИРМЕННЫЕ РЕЦЕПТЫ <i>✳</i> ЧЕСТНЫЙ ВЕС <i>✳</i> ВКУС, КОТОРЫЙ ОБЪЕДИНЯЕТ <i>✳</i> ЖИВОЙ УЛОВ <i>✳</i></div></section>
      <section className="intro section" id="story"><div className="section-index">01 <span>—</span> ФИЛОСОФИЯ</div><div className="intro-grid"><div><p className="kicker">НЕ ПРОСТО РАКИ. ЦЕЛАЯ КУЛЬТУРА ВКУСА.</p><h2>Есть вещи,<br/>которые <i>создают</i><br/>атмосферу.</h2></div><div className="intro-text"><p className="lead">Вечер становится особенным, когда на столе появляется то, ради чего хочется собраться вместе.</p><p>Мы выбираем продукт, бережно относимся к приготовлению и не усложняем главное — настоящий вкус. От живого улова до готового блюда, которое хочется разделить с близкими.</p><a className="under-link" href="#craft">Узнать наш подход <ArrowUpRight size={16}/></a></div></div><div className="intro-note"><span>{String(activeSlide+1).padStart(2,'0')} / 03</span><span>PRODUCT · CRAFT · MOMENT</span></div></section>
      <section className="values"><div className="value-card value-photo"><div className="value-photo-img"/><span className="photo-caption">01 — ОТБОРНЫЙ ПРОДУКТ</span></div><div className="value-card value-dark"><span className="value-number">01</span><Fish size={27}/><h3>Свежесть<br/><i>в основе.</i></h3><p>Внимание к продукту начинается задолго до того, как он окажется на вашем столе.</p></div><div className="value-card value-green"><span className="value-number">02</span><span className="value-symbol">✳</span><h3>Вкус с<br/><i>характером.</i></h3><p>Продуманные сочетания специй и рецепты, в которых нет случайных деталей.</p></div><div className="value-card value-image-two"><div className="value-photo-img"/><span className="photo-caption">03 — ПОВОД БЫТЬ ВМЕСТЕ</span></div></section>
      <section className="catalog section" id="catalog"><div className="section-index">02 <span>—</span> КАТАЛОГ</div><div className="catalog-head"><div><p className="kicker">ВЫБИРАЙТЕ СВОЙ ВЕЧЕР</p><h2>От улова<br/>до <i>удовольствия.</i></h2></div><p className="catalog-description">Каждая позиция — повод собраться за одним столом. Выберите любимый вкус или откройте для себя новый.</p></div><div className="filters">{[['all','Всё'],['live','Живые раки'],['cooked','Варёные'],['sets','Наборы']].map(([id,label])=><button key={id} className={category===id?'active':''} onClick={()=>setCategory(id)}>{label}</button>)}</div><div className="product-grid">{visible.map((p,i)=><article className="product-card" key={p.id}><div className="product-image"><img src={p.image} alt={p.name} loading="lazy"/><span className="product-index">0{i+1} / 04</span>{p.tag&&<span className="product-tag">{p.tag}</span>}<button className="quick-add" onClick={()=>add(p)} aria-label={`Добавить ${p.name}`}><Plus/></button></div><div className="product-info"><div><h3>{p.name}</h3><p>{p.subtitle}</p></div><div className="product-bottom"><strong>{money(p.price)} <small>/ {p.unit}</small></strong><button onClick={()=>add(p)} className="add-link">В корзину <ArrowUpRight size={16}/></button></div></div></article>)}</div><div className="catalog-foot"><span>ПРОДУКТ, КОТОРОМУ НЕ НУЖНО ЛИШНИХ СЛОВ</span><span>ЦЕНЫ УКАЗАНЫ ЗА ЕДИНИЦУ ПРОДУКТА</span></div></section>
      <section className="craft" id="craft"><div className="craft-image"><img src="https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1600&q=85" alt="Гастрономическая подача морепродуктов" loading="lazy"/></div><div className="craft-content"><div className="section-index">03 <span>—</span> МАСТЕРСТВО</div><p className="kicker">РЕЦЕПТ — ЭТО ВНИМАНИЕ К ДЕТАЛЯМ</p><h2>Вкус рождается<br/>из <i>мастерства.</i></h2><p className="craft-copy">Правильная температура, выверенное время, ароматный отвар и баланс специй. Мы верим, что хороший продукт не требует сложных объяснений — только бережного отношения.</p><div className="craft-steps"><div><b>01</b><span>Отбор продукта</span></div><div><b>02</b><span>Подготовка и специи</span></div><div><b>03</b><span>Приготовление</span></div><div><b>04</b><span>Подача к столу</span></div></div><a className="btn btn-outline" href="#catalog">Выбрать вкус <ArrowUpRight size={17}/></a></div></section>
      <section className="calculator section"><div className="section-index">04 <span>—</span> ПЛАНИРУЕМ ВЕЧЕР</div><div className="calc-grid"><div><p className="kicker">СКОЛЬКО РАКОВ НУЖНО?</p><h2>Рассчитайте<br/><i>своё количество.</i></h2><p className="calc-description">Ориентир для компании: примерно 0,5–0,7 кг на человека. Итог зависит от аппетита и формата встречи.</p></div><div className="calc-panel"><span className="calc-label">ГОСТЕЙ ЗА СТОЛОМ</span><div className="calc-control"><button onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Уменьшить"><Minus/></button><strong>{String(quantity).padStart(2,'0')}</strong><button onClick={()=>setQuantity(Math.min(30,quantity+1))} aria-label="Увеличить"><Plus/></button></div><div className="calc-result"><div><span>Рекомендуемое количество</span><b>{recommendedKg.toFixed(1).replace('.',',')} кг</b></div><div><span>Ориентир по классическим ракам</span><b>{money(Math.ceil(recommendedKg*1490))}</b></div></div><button className="btn btn-gold full" onClick={()=>{add(products[1],recommendedKg);setCartOpen(true)}}>Добавить в корзину <ArrowUpRight size={17}/></button><small className="calc-disclaimer">Расчёт ориентировочный. Цены в каталоге — стартовая модель для прототипа и будут уточнены перед публикацией.</small></div></div></section>
      <section className="delivery" id="delivery"><div className="delivery-bg"/><div className="delivery-inner"><div className="section-index">05 <span>—</span> ДОСТАВКА</div><div className="delivery-content"><div><p className="kicker">ВАШ ВЕЧЕР — НАША ЗАБОТА</p><h2>От нас — вкус.<br/>От вас — <i>повод.</i></h2></div><div className="delivery-points"><div><Truck/><span><b>Доставка по городу и области</b><small>Условия и доступные интервалы уточняются при заказе.</small></span></div><div><Clock3/><span><b>Приготовление под заказ</b><small>Свежесть и качество — в центре внимания.</small></span></div><div><ShoppingBag/><span><b>Заказы для мероприятий</b><small>Подберём количество для вашей компании.</small></span></div></div></div></div></section>
      <section className="final-cta" id="contacts"><p className="kicker">ХОРОШИЙ ВЕЧЕР НАЧИНАЕТСЯ С ПРОСТОГО</p><h2>Пора собирать<br/><i>своих.</i></h2><button className="btn btn-gold" onClick={()=>setCartOpen(true)}>Перейти к заказу <ArrowUpRight/></button><div className="cta-bottom"><span>РАКОВАРНЯ 73 · УЛЬЯНОВСК</span><span>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</span></div></section>
    </main>
    <footer className="footer"><a className="logo" href="#top"><span className="logo-mark">Р.</span><span>РАКОВАРНЯ 73<small>КУЛЬТУРА НАСТОЯЩЕГО ВКУСА</small></span></a><p>Настоящий продукт.<br/>Правильное приготовление.</p><div className="footer-links"><a href="#catalog">Каталог</a><a href="#story">О нас</a><a href="#delivery">Доставка</a><a href="/terms.html">Условия заказа</a><a href="/privacy.html">Персональные данные</a></div><div className="footer-bottom"><span>© 2026 РАКОВАРНЯ 73</span><span>УЛЬЯНОВСК · ПРЕДВАРИТЕЛЬНЫЙ КАТАЛОГ И ЦЕНЫ</span><a href="#top">НАВЕРХ ↑</a></div></footer>
    {cartOpen&&<div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Корзина"><div className="drawer-head"><div><span className="kicker">ВАШ ВЫБОР</span><h3>Корзина <sup>{count}</sup></h3></div><button className="close-btn" onClick={()=>setCartOpen(false)} aria-label="Закрыть"><X/></button></div>{cart.length===0?<div className="empty-cart"><ShoppingBag size={34}/><h4>Пока здесь пусто</h4><p>Добавьте любимые позиции из каталога — и соберём ваш заказ.</p><button className="btn btn-gold" onClick={()=>setCartOpen(false)}>В каталог <ArrowRight/></button></div>:<><div className="cart-lines">{cart.map(l=><div className="cart-line" key={l.product.id}><img src={l.product.image} alt=""/><div className="cart-line-info"><b>{l.product.name}</b><span>{money(l.product.price)} / {l.product.unit}</span><div className="qty"><button onClick={()=>change(l.product.id,l.product.unit==='кг'?-0.5:-1)} aria-label="Уменьшить"><Minus size={13}/></button><span>{l.qty.toLocaleString('ru-RU',{maximumFractionDigits:1})}</span><button onClick={()=>change(l.product.id,l.product.unit==='кг'?0.5:1)} aria-label="Увеличить"><Plus size={13}/></button></div></div><strong>{money(l.product.price*l.qty)}</strong></div>)}</div><div className="cart-total"><span>ИТОГО</span><b>{money(total)}</b></div><button className="btn btn-gold full" onClick={()=>setCheckout(true)}>Оформить заказ <ArrowUpRight/></button><p className="cart-note">Цены предварительные. Наличие, вес, доставка и итоговая сумма подтверждаются менеджером перед приготовлением.</p></>}</aside></div>}
    {checkout&&<div className="overlay modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setCheckout(false);setSent(false)}}}><div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="close-btn modal-close" onClick={()=>{setCheckout(false);setSent(false)}} aria-label="Закрыть"><X/></button>{sent?<div className="success-state"><div className="success-icon"><Check/></div><h3>Черновик заявки подготовлен</h3><p>Открылось ваше почтовое приложение с готовой заявкой и составом заказа. Проверьте адрес получателя и нажмите «Отправить». До этого заявка не считается отправленной.</p><button className="btn btn-gold full" onClick={()=>{setCheckout(false);setCartOpen(false);setSent(false)}}>Понятно</button></div>:<><p className="kicker">ПОСЛЕДНИЙ ШАГ</p><h3 id="checkout-title">Оформление<br/><i>заказа.</i></h3><p className="modal-total">Ваш заказ на сумму <b>{money(total)}</b></p><form onSubmit={submitOrder}><label>Ваше имя<input required name="name" autoComplete="name" placeholder="Как к вам обращаться?"/></label><label>Телефон<input required name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" pattern="[+0-9() -]{10,}"/></label><label>Комментарий<textarea name="comment" placeholder="Адрес, удобное время и пожелания" rows={3}/></label><label className="consent"><input type="checkbox" required/> <span>Согласен на обработку персональных данных и ознакомлен с <a href="/privacy.html" target="_blank" rel="noreferrer">политикой конфиденциальности</a></span></label>{orderError&&<p className="form-error" role="alert">{orderError}</p>}<button className="btn btn-gold full" type="submit"  >Отправить заявку по email <ArrowUpRight/></button><small>Откроется почтовое приложение. Вам останется указать адрес получателя (если он не подставлен) и отправить письмо вручную.</small></form></>}</div></div>}
    <div className="mobile-bottom"><button onClick={()=>setCartOpen(true)}><ShoppingBag size={18}/> Корзина <b>{count}</b></button><a href="#catalog">Выбрать раков <ArrowUpRight size={17}/></a></div>
  </>;
}
