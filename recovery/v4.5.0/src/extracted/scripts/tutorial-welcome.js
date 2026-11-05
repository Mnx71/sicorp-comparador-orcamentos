(() => {
  const key='sicorp.welcome.hidden.v1';
  function install({dialog,startButton,skipButton,hideButton,onStart,storage}) {
    let saved=false,decided=false;
    try { storage ??= globalThis.localStorage; saved=storage?.getItem(key)==='hidden'; } catch { /* Storage can be disabled for local files. */ }
    function choose(start=false,hide=false) {
      if(decided)return;
      decided=true;
      if(hide)try {storage?.setItem(key,'hidden');} catch { /* The program still works without storage. */ }
      dialog.close();
      if(start)onStart();
    }
    startButton.addEventListener('click',()=>choose(true));
    skipButton.addEventListener('click',()=>choose());
    hideButton.addEventListener('click',()=>choose(false,true));
    dialog.addEventListener('cancel',e=>{e.preventDefault();choose();});
    if(!saved)dialog.showModal();
  }
  globalThis.SicorpTutorialWelcome=Object.freeze({install});
})();
