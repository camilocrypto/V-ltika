'use strict';
window.Voltika = (() => {
  const places = {
    baq: ['Plaza Baquedano','Providencia',322,238], cost: ['Costanera Center','Providencia',776,90],
    moneda: ['Palacio de La Moneda','Santiago Centro',108,320], bellas: ['Museo de Bellas Artes','Santiago Centro',238,213],
    bust: ['Parque Bustamante','Providencia',351,317], ines: ['Metro Inés de Suárez','Providencia',625,304],
    pedro: ['Metro Pedro de Valdivia','Providencia',631,148], chile: ['Metro Universidad de Chile','Santiago Centro',174,344]
  };
  const joints = {a:[179,294],b:[254,269],c:[392,218],d:[464,196],e:[526,168],f:[686,127],g:[420,295],h:[495,275],i:[566,252],j:[610,206],k:[265,202],m:[720,109],n:[589,157]};
  const coords = Object.fromEntries(Object.entries(places).map(([k,v]) => [k,v.slice(2)]));
  Object.assign(coords,joints);
  const edges=[
    ['moneda','a',0.64],['a','chile',0.48],['a','b',0.73],['b','baq',0.67],['bellas','k',0.25],['k','baq',0.58],['bellas','b',0.61],
    ['baq','c',0.70],['c','d',0.70],['d','e',0.70],['e','n',0.61],['n','pedro',0.41],['pedro','f',0.54],['f','m',0.37],['m','cost',0.57],
    ['baq','bust',0.78],['bust','g',0.68],['g','h',0.73],['h','i',0.72],['i','ines',0.79],['i','j',0.69],
    ['j','pedro',0.64],['h','d',0.82],['j','ines',0.92],['g','c',0.81]
  ];
  const CLP_PER_XLM = 200, DISCOUNT = 0.20;
  const clp = n => '$'+Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const dec = (v,d=1) => Number(v).toFixed(d).replace('.',',');
  function route(from,to) {
    if(!places[from] || !places[to] || from===to) return null;
    const costs={[from]:0}, prior={}, queue=new Set(Object.keys(coords));
    while(queue.size) {
      const here=[...queue].reduce((a,b)=>(costs[a]??Infinity)<=(costs[b]??Infinity)?a:b);
      if(here===to)break;
      queue.delete(here);
      for(const [a,b,length] of edges){
        const next=a===here?b:b===here?a:null;
        if(!next || !queue.has(next))continue;
        const cost=costs[here]+length;
        if(cost<(costs[next]??Infinity)){costs[next]=cost;prior[next]=here;}
      }
    }
    const ids=[to];while(ids[0]!==from)ids.unshift(prior[ids[0]]);
    const km=costs[to], minutes=Math.max(3,Math.round(km*2.5+1));
    const base=Math.round((1150+km*440)/50)*50, reduced=Math.round(base*(1-DISCOUNT));
    const distanceCharge=Math.round(km*440);
    return {pts:ids.map(x=>coords[x]),km,minutes,base,reduced,xlm:reduced/CLP_PER_XLM,saved:base-reduced,
      baseCharge:1150,distanceCharge,rounding:base-1150-distanceCharge,rate:CLP_PER_XLM};
  }
  return {places,coords,edges,route,clp,dec,CLP_PER_XLM,DISCOUNT};
})();
