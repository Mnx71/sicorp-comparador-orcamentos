// Viewport coordinates only. No application state or layout mutations.
(() => {
  const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
  function place({width, height, cardWidth, cardHeight, target, surface}) {
    const pad=12, gap=16, h=Math.min(cardHeight,height-2*pad);
    const centerY=target ? (target.top+target.bottom-h)/2 : pad;
    if (!target) return {x:width-cardWidth-pad,y:pad,maxHeight:height-2*pad};
    // Use space outside the existing page/dialog first, without resizing it.
    if (surface.right+gap+cardWidth<=width-pad) return {x:surface.right+gap,y:clamp(centerY,pad,height-h-pad),maxHeight:height-2*pad};
    if (surface.left-gap-cardWidth>=pad) return {x:surface.left-gap-cardWidth,y:clamp(centerY,pad,height-h-pad),maxHeight:height-2*pad};
    const above=Math.max(0,target.top-gap-pad),below=Math.max(0,height-pad-target.bottom-gap);
    const x=clamp((target.left+target.right-cardWidth)/2,pad,width-cardWidth-pad);
    if (below>=h || (above<h && below>=above)) return {x,y:target.bottom+gap,maxHeight:below};
    return {x,y:Math.max(pad,target.top-gap-Math.min(h,above)),maxHeight:above};
  }
  function manual({x,y,width,height,cardWidth,cardHeight}) {
    return {x:clamp(x,12,width-cardWidth-12),y:clamp(y,12,height-cardHeight-12)};
  }
  globalThis.SicorpTutorialPlacement=Object.freeze({place,manual});
})();
