import { ref, watch, type Ref } from 'vue';

type Opts = {
    duration?: number; //ms, default 600
    precision?: number; //decimales, default 0
    easing?: (t: number) => number;
};

// easing por defecto (suave)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useTweenNumber (source: Ref<number>, opts: Opts = {}) {
    const {
        duration = 600,
        precision = 0,
        easing = easeOutCubic,
    } = opts;

    const display = ref(source.value);
    let raf = 0;
    let start = 0;
    let from = source.value;
    let to = source.value;

    function step(ts: number) {
        if (!start) start = ts;
        const t = Math.min(1, (ts - start) / duration);
        const v = from + (to - from) * easing(t);
        display.value = Number(v.toFixed(precision));
        if (t < 1) raf = requestAnimationFrame(step);
    }

    function run(nv: number) {
        cancelAnimationFrame(raf);
        start = 0;
        from = display.value;
        to = nv;
        raf = requestAnimationFrame(step);
    }

    // Observa cambios (sin opciones)
    watch(source, (nv) => run (nv));

    // Primer "Tween" (Reemplaza a inmediate:true)
    run(source.value);

    return display;
}



