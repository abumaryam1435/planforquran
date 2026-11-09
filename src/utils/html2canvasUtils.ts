const colorCache = new Map<string, string>();

export const convertColorToRgba = (colorStr: string): string => {
  if (!colorStr) return colorStr;
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('lab(') && !colorStr.includes('lch(')) {
    return colorStr;
  }
  
  const colorRegex = /(oklch|oklab|lab|lch)\((?:[^)(]+|\([^)(]*\))*\)/g;
  
  return colorStr.replace(colorRegex, (match) => {
    if (colorCache.has(match)) {
      return colorCache.get(match)!;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return match;
      ctx.fillStyle = match;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const rgba = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      colorCache.set(match, rgba);
      return rgba;
    } catch (e) {
      return match;
    }
  });
};

const colorProperties = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'text-decoration-color',
  'outline-color',
  'box-shadow',
  'text-shadow',
  'fill',
  'stroke'
];

export const patchColorsForHtml2Canvas = (container: HTMLElement) => {
  const elements = [container, ...Array.from(container.querySelectorAll('*'))] as HTMLElement[];
  const originalStyles = new Map<HTMLElement, string | null>();

  elements.forEach((el) => {
    originalStyles.set(el, el.getAttribute('style'));
    const computed = window.getComputedStyle(el);
    
    let hasColorToPatch = false;
    const patchStyles: Record<string, string> = {};

    colorProperties.forEach(prop => {
      const val = computed.getPropertyValue(prop);
      if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('lab(') || val.includes('lch('))) {
        patchStyles[prop] = convertColorToRgba(val);
        hasColorToPatch = true;
      }
    });

    if (hasColorToPatch) {
      Object.entries(patchStyles).forEach(([prop, val]) => {
        el.style.setProperty(prop, val, 'important');
      });
    }
  });

  return () => {
    elements.forEach((el) => {
      const orig = originalStyles.get(el);
      if (orig !== undefined && orig !== null) {
        el.setAttribute('style', orig);
      } else {
        el.removeAttribute('style');
      }
    });
  };
};
