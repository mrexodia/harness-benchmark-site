from playwright.sync_api import sync_playwright
import os, time, json

os.makedirs('/tmp/shots', exist_ok=True)
URL = 'http://127.0.0.1:8000/'

ASCII_JS = r"""
([canvasId, step, tx0, ty0, tx1, ty1]) => {
  const cv = document.getElementById(canvasId);
  const ctx = cv.getContext('2d');
  const img = ctx.getImageData(0,0,cv.width,cv.height).data;
  const A = [
    ['w',104,182,186],['W',23,68,85],['s',221,197,138],['g',108,156,72],
    ['G',52,84,64],['d',138,90,52],['D',61,38,20],['k',232,185,138],
    ['y',217,181,89],['b',79,134,179],['o',242,242,242],['r',224,71,63],
    ['x',15,25,32],['p',192,138,232],['c',95,224,192],['m',106,90,192],
    ['l',240,210,90],
  ];
  const rows=[];
  for(let y=ty0;y<ty1;y+=step){
    let s='';
    for(let x=tx0;x<tx1;x+=step){
      const i=(y*cv.width+x)*4;
      const r=img[i],g=img[i+1],b=img[i+2],a=img[i+3];
      if(a<20){ s+=' '; continue; }
      let best='?',bd=1e9;
      for(const [ch,ar,ag,ab] of A){
        const d=(r-ar)**2+(g-ag)**2+(b-ab)**2;
        if(d<bd){bd=d;best=ch;}
      }
      s+=best;
    }
    rows.push(s);
  }
  return rows.join('\n');
}
"""

def ascii(pg, cid='scene', step=6, box=None):
    cv = pg.evaluate("(id)=>{const c=document.getElementById(id);return [c.width,c.height]}", cid)
    x0,y0,x1,y1 = box or (0,0,cv[0],cv[1])
    return pg.evaluate(ASCII_JS, [cid, step, x0, y0, x1, y1])

def state(pg):
    return pg.evaluate("() => window.fishing.state")

def wait_state(pg, s, timeout=6000):
    pg.wait_for_function("(s)=>window.fishing.state===s", arg=s, timeout=timeout)

def log(pg):
    return pg.evaluate("() => window.fishing.log")

def press(pg):
    pg.keyboard.press('Space')

errors = []

def cycle(pg):
    wait_state(pg, 'ready', 4000)
    t0 = time.time()
    press(pg)
    wait_state(pg, 'waiting', 2000)
    wait_state(pg, 'bite', 6000)
    press(pg)
    wait_state(pg, 'reeling', 2000)
    wait_state(pg, 'reveal', 4000)
    t1 = time.time()
    return t1 - t0

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':1280,'height':720})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(URL, wait_until='networkidle')
    pg.wait_for_timeout(500)

    print('== interface ==')
    print('pickRarity boundaries:', pg.evaluate("""()=>({
      a:window.fishing.pickRarity(0),
      b:window.fishing.pickRarity(0.4499),
      c:window.fishing.pickRarity(0.45),
      d:window.fishing.pickRarity(0.6999),
      e:window.fishing.pickRarity(0.70),
      f:window.fishing.pickRarity(0.8499),
      g:window.fishing.pickRarity(0.85),
      h:window.fishing.pickRarity(0.9299),
      i:window.fishing.pickRarity(0.93),
      j:window.fishing.pickRarity(0.9799),
      k:window.fishing.pickRarity(0.98),
      l:window.fishing.pickRarity(0.9999),
    })"""))

    # distribution over many samples
    dist = pg.evaluate("""()=>{
      const c={Common:0,Uncommon:0,Rare:0,Epic:0,Legendary:0,Ancient:0};
      for(let i=0;i<100000;i++) c[window.fishing.pickRarity(Math.random())]++;
      return c;
    }""")
    print('distribution/100000:', dist)

    # ready visual
    pg.screenshot(path='/tmp/shots/ready.png')
    print('\n== SCENE ready (crop left/dock) ==')
    print(ascii(pg, 'scene', 4, (0, 40, 200, 180)))
    print('\n== UI banner ==')
    print(ascii(pg, 'ui', 3, (0, 0, 420, 110)))

    # --- catch cycle ---
    t = cycle(pg)
    print(f'\ncycle time: {t:.2f}s')
    pg.screenshot(path='/tmp/shots/reveal.png')
    print('log after 1 catch:', log(pg))
    print('\n== UI reveal ==')
    print(ascii(pg, 'ui', 6, (360, 150, 920, 560)))

    # --- bite cue visual (do a cast and grab bite frame) ---
    pg.wait_for_timeout(1300)
    press(pg)  # dismiss
    wait_state(pg, 'ready', 2000)
    press(pg)
    wait_state(pg, 'bite', 6000)
    pg.screenshot(path='/tmp/shots/bite.png')
    print('\n== SCENE bite (water region) ==')
    print(ascii(pg, 'scene', 4, (140, 30, 320, 150)))
    press(pg)
    wait_state(pg, 'reveal', 4000)
    pg.wait_for_timeout(1300)
    press(pg)
    wait_state(pg, 'ready', 2000)

    # --- miss cycle ---
    n0 = len(log(pg))
    press(pg)
    wait_state(pg, 'bite', 6000)
    # do nothing, let window expire
    wait_state(pg, 'ready', 3000)
    pg.wait_for_timeout(100)
    n1 = len(log(pg))
    print(f'\nmiss test: log {n0} -> {n1} (should be equal)')
    pg.screenshot(path='/tmp/shots/miss.png')

    # --- timers pause while document.hidden ---
    pg.evaluate("()=>{window.__hidden=false; try{Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__hidden});}catch(e){}}")
    press(pg)
    wait_state(pg, 'waiting', 3000)
    pg.evaluate("()=>{window.__hidden=true;}")
    pg.wait_for_timeout(4500)
    hidden_state = state(pg)
    pg.evaluate("()=>{window.__hidden=false;}")
    print(f'hidden pause test: state after 4.5s hidden during waiting = {hidden_state!r} (should be "waiting")')
    wait_state(pg, 'bite', 6000)
    press(pg)
    wait_state(pg, 'reveal', 8000)
    pg.wait_for_timeout(1300); press(pg); wait_state(pg, 'ready', 2000)

    # --- duplicate / overlap input protection ---
    n2 = len(log(pg))
    press(pg)
    wait_state(pg, 'waiting', 2000)
    for _ in range(12):
        press(pg); pg.wait_for_timeout(15)
    waiting_after_spam = state(pg)
    wait_state(pg, 'bite', 7000)
    for _ in range(12):
        press(pg); pg.wait_for_timeout(12)
    wait_state(pg, 'reeling', 2000)
    wait_state(pg, 'reveal', 8000)
    for _ in range(6):
        press(pg); pg.wait_for_timeout(15)
    n3 = len(log(pg))
    print(f'overlap test: waiting stayed {waiting_after_spam!r}; log {n2} -> {n3} (should be +1)')
    pg.wait_for_timeout(1400); press(pg); wait_state(pg, 'ready', 2000)

    # --- force each rarity through the public hook ---
    print('\n== forced rarities ==')
    for rarity in ['Common','Uncommon','Rare','Epic','Legendary','Ancient']:
        pg.evaluate("(r)=>{window.fishing.pickRarity=()=>r}", rarity)
        wait_state(pg, 'ready', 3000)
        press(pg)
        wait_state(pg, 'waiting', 2000)
        wait_state(pg, 'bite', 6000)
        press(pg)
        wait_state(pg, 'reveal', 8000)
        got = log(pg)[0]
        print(f'{rarity:10s} -> {got}')
        pg.screenshot(path=f'/tmp/shots/reveal_{rarity}.png')
        pg.wait_for_timeout(1300)
        press(pg)
        wait_state(pg, 'ready', 2000)
    # restore
    pg.evaluate("""()=>{ window.fishing.pickRarity = (u)=>{ let a=0; for(const [n,p] of [['Common',.45],['Uncommon',.25],['Rare',.15],['Epic',.08],['Legendary',.05],['Ancient',.02]]){a+=p; if(u<a) return n;} return 'Ancient'; }; }""")

    print('\nlog size total:', len(log(pg)))
    print('newest first?', [e['name'] for e in log(pg)[:3]])

    # --- legend + log panel visual at step 2 ---
    print('\n== UI bottom-left log ==')
    print(ascii(pg, 'ui', 4, (0, 520, 400, 720)))
    print('\n== UI bottom-right legend ==')
    print(ascii(pg, 'ui', 4, (1000, 520, 1280, 720)))

    print('\n== ERRORS ==')
    print(errors)
    b.close()
