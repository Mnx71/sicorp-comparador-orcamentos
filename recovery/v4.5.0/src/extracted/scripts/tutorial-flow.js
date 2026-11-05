// A cursor per page/dialog, independent of previously acknowledged cards.
(() => {
  function create() {
    const routes=new Map();
    let route='';
    const record=()=>routes.get(route);
    const current=(key=route)=>{const r=routes.get(key);return r?.steps.find(t=>t.id===r.id)||null;};
    function sync(steps,key) {
      route=key;
      const saved=routes.get(key)||{id:steps[0]?.id,steps:[]};
      const previous=saved.steps;
      let index=steps.findIndex(t=>t.id===saved.id);
      if(index<0){
        const before=previous.findIndex(t=>t.id===saved.id);
        const following=previous.slice(before+1).find(t=>steps.some(n=>n.id===t.id));
        index=following?steps.findIndex(t=>t.id===following.id):0;
      }
      // Only a real loss of a previously valid prerequisite moves backwards.
      const invalid=steps.findIndex((t,i)=>i<index&&!t.ready&&previous.some(p=>p.id===t.id&&p.ready));
      if(invalid>=0)index=invalid;
      else {
        const now=steps[index],old=previous.find(t=>t.id===now?.id);
        if(now?.autoAdvance&&now.ready&&old&&!old.ready&&index<steps.length-1)index++;
      }
      saved.steps=steps;saved.id=steps[index]?.id;routes.set(key,saved);
      return current();
    }
    function next(){const r=record(),i=r?.steps.findIndex(t=>t.id===r.id);if(!r||i<0||!r.steps[i].ready||i>=r.steps.length-1)return false;r.id=r.steps[i+1].id;return true;}
    function previous(){const r=record(),i=r?.steps.findIndex(t=>t.id===r.id);if(!r||i<=0)return false;r.id=r.steps[i-1].id;return true;}
    function reset(key){routes.delete(key);}
    function goTo(key,id){const saved=routes.get(key)||{steps:[]};saved.id=id;routes.set(key,saved);}
    function clear(){routes.clear();route='';}
    return Object.freeze({sync,current,next,previous,reset,goTo,clear});
  }
  globalThis.SicorpTutorialNavigation=Object.freeze({create});
})();
