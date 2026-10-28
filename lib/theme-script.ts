// Sin "use client": el layout (componente de servidor) inserta este script en <head>.
export const THEME_KEY = "amanos.theme.v1";
export const THEME_COLORS = { light: "#4372C9", dark: "#0E131E" };

/** Corre antes de pintar, para que el modo oscuro no parpadee al cargar. También ajusta la barra del navegador. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',d?'${THEME_COLORS.dark}':'${THEME_COLORS.light}')});}catch(e){}})();`;
